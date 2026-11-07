"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IMPORT_MAX_BATCH_BYTES, IMPORT_MAX_ROWS, IMPORT_TABLES, type IdRefs, type ImportResult } from "@/lib/desktop-import-shared";

type Row = Record<string, unknown>;
type Backup = { backupVersion: number; exportedAt?: string; data: Record<string, Row[]>; files?: Record<string, string> };
type Summary = { imported: number; skipped: number; filesFailed: number; errors: string[] };

const MIME: Record<string, string> = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip", txt: "text/plain", md: "text/markdown",
};

function walk(value: unknown, visit: (text: string) => void) {
  if (typeof value === "string") visit(value);
  else if (Array.isArray(value)) value.forEach((item) => walk(item, visit));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => walk(item, visit));
}

function replaceStrings<T>(value: T, swap: (text: string) => string): T {
  if (typeof value === "string") return swap(value) as T;
  if (Array.isArray(value)) return value.map((item) => replaceStrings(item, swap)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceStrings(item, swap)])) as T;
  }
  return value;
}

async function post<T>(body: unknown): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch("/api/import-desktop", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (response.ok) return response.json() as Promise<T>;
    if (attempt >= 1 || response.status < 500) throw new Error((await response.json().catch(() => null))?.error ?? "导入失败，请重试");
  }
}

function batches(rows: Row[]): { batch: Row[]; oversize: number }[] {
  const encoder = new TextEncoder();
  const result: { batch: Row[]; oversize: number }[] = [];
  let batch: Row[] = [];
  let bytes = 0;
  let oversize = 0;
  for (const row of rows) {
    const size = encoder.encode(JSON.stringify(row)).length;
    if (size * 2 > IMPORT_MAX_BATCH_BYTES) { oversize++; continue; }
    if (batch.length && (bytes + size > IMPORT_MAX_BATCH_BYTES / 2 || batch.length >= IMPORT_MAX_ROWS)) {
      result.push({ batch, oversize: 0 });
      batch = [];
      bytes = 0;
    }
    batch.push(row);
    bytes += size;
  }
  if (batch.length || oversize) result.push({ batch, oversize });
  return result;
}

async function uploadFiles(files: Record<string, string>, onDone: () => void) {
  const stored: Record<string, string> = {};
  let failed = 0;
  const queue = Object.entries(files);
  async function worker() {
    for (let next = queue.pop(); next; next = queue.pop()) {
      const [name, base64] = next;
      try {
        const type = MIME[name.split(".").pop()?.toLowerCase() ?? ""];
        if (!type) throw new Error("unsupported");
        const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
        const blob = await upload(name, new Blob([bytes], { type }), { access: "public", handleUploadUrl: "/api/blob/upload-library" });
        stored[`/api/files/${name}`] = blob.url;
      } catch {
        failed++;
      }
      onDone();
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  return { stored, failed };
}

export function ImportDesktopCard() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<Backup | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  async function choose(file: File) {
    setSummary(null);
    try {
      const parsed = JSON.parse(await file.text()) as Backup;
      if (parsed.backupVersion !== 1 || !parsed.data || !Array.isArray(parsed.data.application)) throw new Error("bad");
      setBackup(parsed);
    } catch {
      toast.error("这不是求职罗盘的备份文件");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  async function run() {
    if (!backup) return;
    const totals: Summary = { imported: 0, skipped: 0, filesFailed: 0, errors: [] };
    try {
      const files = backup.files ?? {};
      const fileTotal = Object.keys(files).length;
      let filesDone = 0;
      setProgress(`正在上传文件 0/${fileTotal}`);
      const { stored, failed } = await uploadFiles(files, () => setProgress(`正在上传文件 ${++filesDone}/${fileTotal}`));
      totals.filesFailed = failed;
      const swapUrl = (text: string) => (Object.hasOwn(stored, text) ? stored[text] : text);

      const data = replaceStrings(backup.data, swapUrl);
      const index = new Map<string, string>();
      for (const table of [...IMPORT_TABLES, "company"]) {
        for (const row of data[table] ?? []) if (typeof row.id === "string") index.set(row.id, table);
      }
      const refsOf = (rows: Row[]) => {
        const refs: IdRefs = {};
        for (const row of rows) for (const value of Object.values(row)) {
          if (value && typeof value === "object") walk(value, (text) => { const table = index.get(text); if (table) refs[text] = table; });
        }
        return refs;
      };

      setProgress("正在对应公司");
      const rawCompanies = (data.company ?? []) as (Row & { id: string; name: string })[];
      const companies: Record<string, string> = {};
      for (let at = 0; at < rawCompanies.length; at += 500) {
        const part = rawCompanies.slice(at, at + 500);
        const ids = new Set(part.map((row) => row.id));
        const aliases = (data.companyAlias ?? []).filter((row) => ids.has(String(row.companyId))).map((row) => ({ companyId: String(row.companyId), alias: String(row.alias) }));
        const result = await post<{ companies: Record<string, string> }>({
          step: "companies",
          companies: part.map(({ id, name, careerUrl, sector, industry }) => ({ id, name, careerUrl, sector, industry })),
          aliases,
        });
        Object.assign(companies, result.companies);
      }

      setProgress("正在写入资料");
      const profile = data.user?.[0];
      if (profile) await post({ step: "profile", row: profile, companies: {}, refs: refsOf([profile]) });

      for (const [position, table] of IMPORT_TABLES.entries()) {
        const rows = data[table];
        if (!rows?.length) continue;
        setProgress(`正在导入数据 ${position + 1}/${IMPORT_TABLES.length}`);
        for (const { batch, oversize } of batches(rows)) {
          totals.skipped += oversize;
          if (!batch.length) continue;
          const refs = refsOf(batch);
          const used = Object.fromEntries(Object.entries(companies).filter(([id]) => batch.some((row) => row.companyId === id) || id in refs));
          const result = await post<ImportResult>({ step: "rows", table, rows: batch, companies: used, refs });
          totals.imported += result.imported;
          totals.skipped += result.skipped;
          totals.errors.push(...result.errors);
        }
      }
      setSummary(totals);
      setBackup(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "导入失败，请重试");
      setSummary(totals);
    } finally {
      setProgress(null);
    }
  }

  const counts = backup?.data;
  return (
    <Card>
      <CardHeader>
        <CardTitle>导入桌面版数据</CardTitle>
        <CardDescription>
          选择桌面版导出的备份文件，把投递、岗位、简历和附件搬到这个账号。现有数据会保留，同一份备份重复导入不会产生重复记录。
          AI Key 和邮箱授权码需要在这里重新填写。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <input ref={input} type="file" accept=".json,application/json" className="hidden" aria-label="选择备份文件" onChange={(event) => { const file = event.target.files?.[0]; if (file) void choose(file); }} />
        {counts && !progress && (
          <p className="text-sm text-muted-foreground">
            备份里有投递 {counts.application?.length ?? 0} 条、岗位 {counts.position?.length ?? 0} 个、简历 {counts.resumeVersion?.length ?? 0} 份、附件 {Object.keys(backup?.files ?? {}).length} 个。
          </p>
        )}
        {progress && <p className="text-sm text-muted-foreground" role="status">{progress}，请不要关闭页面…</p>}
        {summary && (
          <div className="text-sm" role="status">
            <p>已导入 {summary.imported} 条，跳过 {summary.skipped} 条{summary.filesFailed ? `，${summary.filesFailed} 个文件上传失败` : ""}。再次导入同一份备份时，已有记录会计入跳过。</p>
            {summary.errors.slice(0, 3).map((error) => <p key={error} className="mt-1 text-xs text-muted-foreground">{error}</p>)}
          </div>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={!!progress} onClick={() => input.current?.click()}><Upload />选择备份文件</Button>
          {backup && <Button type="button" disabled={!!progress} onClick={() => void run()}>开始导入</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
