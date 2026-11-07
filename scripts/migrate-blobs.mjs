// Copies files still on Vercel Blob to UPLOADS_DIR and repoints their rows.
// Safe to re-run: moved rows no longer match. Dry run unless --apply is given.
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const apply = process.argv.includes("--apply");
const uploads = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");
const db = new PrismaClient();
const BLOB = "blob.vercel-storage.com";

const resumes = await db.resumeVersion.findMany({
  where: { fileUrl: { contains: BLOB } },
  select: { id: true, userId: true, fileUrl: true },
});
const attachments = await db.attachment.findMany({
  where: { url: { contains: BLOB } },
  select: { id: true, userId: true, url: true },
});
const jobs = [
  ...resumes.map((r) => ({ url: r.fileUrl, userId: r.userId, save: (url) => db.resumeVersion.update({ where: { id: r.id }, data: { fileUrl: url } }) })),
  ...attachments.map((a) => ({ url: a.url, userId: a.userId, save: (url) => db.attachment.update({ where: { id: a.id }, data: { url } }) })),
];

let moved = 0;
let failed = 0;
for (const job of jobs) {
  try {
    const parsed = new URL(job.url);
    if (!parsed.hostname.endsWith(`.public.${BLOB}`)) throw new Error("unexpected host");
    if (!/^[A-Za-z0-9_-]+$/.test(job.userId)) throw new Error("unexpected user id");
    const res = await fetch(job.url, { method: apply ? "GET" : "HEAD", redirect: "error" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (apply) {
      const ext = path.extname(parsed.pathname).toLowerCase();
      const name = `${randomBytes(16).toString("hex")}${ext}`;
      await mkdir(path.join(uploads, job.userId), { recursive: true });
      await writeFile(path.join(uploads, job.userId, name), Buffer.from(await res.arrayBuffer()));
      await job.save(`/api/files/${job.userId}/${name}`);
    }
    moved++;
  } catch (error) {
    failed++;
    console.error(`failed: ${error.message}`);
  }
}
console.log(`${apply ? "moved" : "reachable (dry run)"}: ${moved}, failed: ${failed}, total: ${jobs.length}`);
await db.$disconnect();
process.exit(failed ? 1 : 0);
