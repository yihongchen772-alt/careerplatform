import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { IMPORT_TABLES, type IdRefs, type ImportResult, type ImportTable } from "@/lib/desktop-import-shared";

// A backup is an untrusted file. Nothing in it decides which rows it touches:
// each id is rebuilt from (this account, table, old id), so a crafted file can
// only ever reference this account's own imported rows, and importing the same
// file twice lands on the same ids and is skipped.
export function importedId(userId: string, table: string, oldId: string): string {
  return `d${createHash("sha256").update(`${userId}:${table}:${oldId}`).digest("hex").slice(0, 24)}`;
}

type Field = (typeof Prisma.dmmf.datamodel.models)[number]["fields"][number];
const lower = (name: string) => name[0].toLowerCase() + name.slice(1);
const MODELS = new Map(Prisma.dmmf.datamodel.models.map((model) => [lower(model.name), model]));
const IMPORTED = new Set<string>(IMPORT_TABLES);

/** Id columns that carry no database relation, so the schema can't reveal them. */
const LOOSE_REFS: Partial<Record<ImportTable, Record<string, string>>> = {
  pendingApplicationChange: { resumeVersionId: "resumeVersion" },
  jobLead: { promotedPositionId: "position" },
  examSession: { bankId: "questionBank" },
  personalTask: { mailEventId: "calendarEvent" },
};
const RESET_FIELDS = new Set(["claimToken", "claimUntil", "portalId"]);
// Unique across all accounts, so the same backup in two accounts would collide
// and drop those rows. Scoped per account; only their presence matters after this.
const SCOPED_KEYS = new Set(["captureKey", "sourceMailKey"]);
const FILE_FIELDS: Partial<Record<ImportTable, string>> = { resumeVersion: "fileUrl", attachment: "url" };
const USER_BLOCKED = /^(id|email|emailVerified|image|passwordHash|createdAt|updatedAt)$|Encrypted|Token|Hash|smtp|webdav|Claim|lastBackup|autoBackup/i;

function isBlobUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function mapJson(value: unknown, swap: (text: string) => string): unknown {
  if (typeof value === "string") return swap(value);
  if (Array.isArray(value)) return value.map((item) => mapJson(item, swap));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapJson(item, swap)]));
  }
  return value;
}

function jsonSwapper(userId: string, refs: IdRefs, companies: Record<string, string>) {
  return (text: string) => {
    const table = Object.hasOwn(refs, text) ? refs[text] : undefined;
    if (!table) return text;
    if (table === "company") return companies[text] ?? text;
    return IMPORTED.has(table) ? importedId(userId, table, text) : text;
  };
}

function foreignKeys(fields: readonly Field[]): Map<string, { target: string; required: boolean }> {
  const keys = new Map<string, { target: string; required: boolean }>();
  for (const field of fields) {
    if (field.kind !== "object" || !field.relationFromFields?.length) continue;
    const name = field.relationFromFields[0];
    const scalar = fields.find((candidate) => candidate.name === name);
    keys.set(name, { target: lower(field.type), required: Boolean(scalar?.isRequired) });
  }
  return keys;
}

/** One row rebuilt for this account, or null when it can't exist without a parent we skip. */
function rebuildRow(userId: string, table: ImportTable, row: Record<string, unknown>, companies: Record<string, string>, refs: IdRefs) {
  const model = MODELS.get(table);
  if (!model || typeof row.id !== "string") return null;
  const keys = foreignKeys(model.fields);
  const swap = jsonSwapper(userId, refs, companies);
  const loose = LOOSE_REFS[table] ?? {};
  const data: Record<string, unknown> = {};

  for (const field of model.fields) {
    if (field.kind === "object") continue;
    const value = row[field.name];
    if (value === undefined) continue;
    if (field.name === "id") { data.id = importedId(userId, table, row.id); continue; }
    if (RESET_FIELDS.has(field.name)) continue;
    if (SCOPED_KEYS.has(field.name)) { data[field.name] = value == null ? null : importedId(userId, field.name, String(value)); continue; }

    const key = keys.get(field.name);
    if (key) {
      if (key.target === "user") { data[field.name] = userId; continue; }
      if (value == null) { data[field.name] = null; continue; }
      const mapped = key.target === "company" ? companies[String(value)]
        : IMPORTED.has(key.target) ? importedId(userId, key.target, String(value)) : undefined;
      if (mapped) data[field.name] = mapped;
      else if (key.required) return null;
      continue;
    }
    if (loose[field.name]) { data[field.name] = value == null ? null : importedId(userId, loose[field.name], String(value)); continue; }
    if (field.type === "Json") { if (value !== null) data[field.name] = mapJson(value, swap); continue; }
    data[field.name] = value;
  }

  const fileField = FILE_FIELDS[table];
  if (fileField && data[fileField] != null && !isBlobUrl(data[fileField])) {
    const required = model.fields.find((field) => field.name === fileField)?.isRequired;
    if (required) return null;
    data[fileField] = null;
  }
  return data;
}

type Writer = {
  createMany: (args: { data: unknown[]; skipDuplicates: boolean }) => Promise<{ count: number }>;
  create: (args: { data: unknown }) => Promise<unknown>;
  findUnique: (args: { where: { id: string }; select: { id: true } }) => Promise<unknown>;
};

export async function importRows(
  userId: string,
  table: ImportTable,
  rows: Record<string, unknown>[],
  companies: Record<string, string>,
  refs: IdRefs
): Promise<ImportResult> {
  const built = rows.map((row) => rebuildRow(userId, table, row, companies, refs));
  const data = built.filter((row) => row !== null);
  let skipped = built.length - data.length;
  const errors: string[] = [];
  const writer = (db as unknown as Record<string, Writer>)[table];

  try {
    const { count } = await writer.createMany({ data, skipDuplicates: true });
    return { imported: count, skipped: skipped + data.length - count, errors };
  } catch {
    // One orphaned row shouldn't sink its batch: retry singly and keep what fits.
    let imported = 0;
    for (const row of data) {
      if (await writer.findUnique({ where: { id: String(row.id) }, select: { id: true } })) { skipped++; continue; }
      try {
        await writer.create({ data: row });
        imported++;
      } catch (error) {
        skipped++;
        if (errors.length < 3) errors.push(`${table}: ${error instanceof Error ? error.message.split("\n").pop()?.slice(0, 160) : "写入失败"}`);
      }
    }
    return { imported, skipped, errors };
  }
}

export type CompanyInput = { id: string; name: string; careerUrl?: string | null; sector?: string | null; industry?: string | null };

/**
 * Company is shared by every account, so a match by name or alias reuses the
 * existing row untouched, and only names nobody has get created.
 */
export async function importCompanies(
  userId: string,
  companies: CompanyInput[],
  aliases: { companyId: string; alias: string }[]
): Promise<Record<string, string>> {
  const names = [...new Set(companies.map((company) => company.name))];
  const [existing, aliased] = await Promise.all([
    db.company.findMany({ where: { name: { in: names } }, select: { id: true, name: true } }),
    db.companyAlias.findMany({ where: { alias: { in: names } }, select: { companyId: true, alias: true } }),
  ]);
  const known = new Map<string, string>([
    ...aliased.map((row) => [row.alias, row.companyId] as const),
    ...existing.map((row) => [row.name, row.id] as const),
  ]);
  const created = new Set<string>();
  const map: Record<string, string> = {};

  for (const company of companies) {
    let id = known.get(company.name);
    if (!id) {
      id = importedId(userId, "company", company.name);
      await db.company.createMany({
        data: [{ id, name: company.name, careerUrl: company.careerUrl, sector: company.sector, industry: company.industry, verified: false, addedByUserId: userId }],
        skipDuplicates: true,
      });
      // Lost a race on the unique name: use whichever row won.
      id = (await db.company.findUnique({ where: { name: company.name }, select: { id: true } }))?.id ?? id;
      known.set(company.name, id);
      created.add(company.id);
    }
    map[company.id] = id;
  }

  const newAliases = aliases.filter((row) => created.has(row.companyId));
  if (newAliases.length) {
    await db.companyAlias.createMany({ data: newAliases.map((row) => ({ companyId: map[row.companyId], alias: row.alias })), skipDuplicates: true });
  }
  return map;
}

/** Profile and preferences only: never identity, login or anything encrypted. */
export async function importProfile(userId: string, row: Record<string, unknown>, companies: Record<string, string>, refs: IdRefs): Promise<void> {
  const model = MODELS.get("user");
  if (!model) return;
  const swap = jsonSwapper(userId, refs, companies);
  const data: Record<string, unknown> = {};
  for (const field of model.fields) {
    if (field.kind === "object" || USER_BLOCKED.test(field.name)) continue;
    const value = row[field.name];
    if (value === undefined || value === null) continue;
    data[field.name] = field.type === "Json" ? mapJson(value, swap) : value;
  }
  await db.user.update({ where: { id: userId }, data });
}
