import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { importCompanies, importProfile, importRows } from "@/lib/desktop-import";
import { IMPORT_MAX_ROWS, IMPORT_TABLES } from "@/lib/desktop-import-shared";

export const maxDuration = 60;

const text = (max: number) => z.string().max(max).nullish();
const rows = z.array(z.record(z.string(), z.unknown())).max(IMPORT_MAX_ROWS);
const idMap = z.record(z.string().max(100), z.string().max(100));

const request = z.discriminatedUnion("step", [
  z.object({
    step: z.literal("companies"),
    companies: z.array(z.object({ id: z.string().max(100), name: z.string().trim().min(1).max(200), careerUrl: text(2000), sector: text(100), industry: text(100) })).max(IMPORT_MAX_ROWS),
    aliases: z.array(z.object({ companyId: z.string().max(100), alias: z.string().trim().min(1).max(200) })).max(IMPORT_MAX_ROWS),
  }),
  z.object({ step: z.literal("profile"), row: z.record(z.string(), z.unknown()), companies: idMap, refs: idMap }),
  z.object({ step: z.literal("rows"), table: z.enum(IMPORT_TABLES), rows, companies: idMap, refs: idMap }),
]);

export async function POST(httpRequest: Request): Promise<NextResponse> {
  const user = await requireUser();
  const input = request.safeParse(await httpRequest.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "备份内容格式不正确" }, { status: 400 });

  const body = input.data;
  if (body.step === "companies") {
    return NextResponse.json({ companies: await importCompanies(user.id, body.companies, body.aliases) });
  }
  if (body.step === "profile") {
    await importProfile(user.id, body.row, body.companies, body.refs);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json(await importRows(user.id, body.table, body.rows, body.companies, body.refs));
}
