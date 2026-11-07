import { randomBytes } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

// Files live on the server's disk and are served by this app, not a storage
// CDN: foreign storage hostnames can be unreachable from mainland China, which
// would leave the site open but every resume broken. Each user has their own
// folder, and /api/files only serves a folder to its owner.
function uploadsDir(): string {
  return process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");
}

const MAX_READ_BYTES = 50 * 1024 * 1024;
const STORED_URL = /^\/api\/files\/([A-Za-z0-9_-]+)\/([a-f0-9]{32}\.[a-z0-9]+)$/;

/** Rows written before the move off Vercel Blob, until scripts/migrate-blobs.mjs has run. */
function isLegacyBlobUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Only exact stored-file names resolve; that rules out traversal without touching the disk. */
function pathForStoredFile(userId: string, filename: string): string | null {
  const match = STORED_URL.exec(`/api/files/${userId}/${filename}`);
  return match ? path.join(uploadsDir(), match[1], match[2]) : null;
}

export const ALLOWED_UPLOAD_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

/**
 * The 资料库 holds more than resumes and screenshots — certificates, slide
 * decks, portfolio archives and past written-test papers all live there, and
 * those arrive as Office files or zips. Kept as a separate list so the
 * resume/JD upload paths, where a .zip would be meaningless, stay narrow.
 */
export const ALLOWED_LIBRARY_MIME = [
  ...ALLOWED_UPLOAD_MIME,
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain",
  "text/markdown",
];

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/zip": ".zip",
  "text/plain": ".txt",
  "text/markdown": ".md",
};

export function mimeTypeForExtension(ext: string): string | undefined {
  return Object.entries(EXT_BY_MIME).find(([, e]) => e === ext.toLowerCase())?.[0];
}

export async function saveLocalFile(
  userId: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ url: string; filename: string }> {
  const ext = EXT_BY_MIME[mimeType] ?? "";
  const filename = `${randomBytes(16).toString("hex")}${ext}`;
  const file = pathForStoredFile(userId, filename);
  if (!file) throw new Error("文件名无效");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buffer);
  return { url: `/api/files/${userId}/${filename}`, filename };
}

export async function readOwnedFile(
  userId: string,
  filename: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const file = pathForStoredFile(userId, filename);
  const mimeType = mimeTypeForExtension(path.extname(filename));
  if (!file || !mimeType) return null;
  try {
    return { buffer: await readFile(file), mimeType };
  } catch {
    return null;
  }
}

/**
 * Stored URLs reach here from user-editable rows, so nothing but our own file
 * routes and the old Blob host is ever read: anything else would let a crafted
 * fileUrl make the server fetch an arbitrary address.
 */
export async function readStoredFile(
  url: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const stored = STORED_URL.exec(url);
  if (stored) return readOwnedFile(stored[1], stored[2]);
  if (!isLegacyBlobUrl(url)) return null;

  const mimeType = mimeTypeForExtension(path.extname(new URL(url).pathname));
  if (!mimeType) return null;
  try {
    const res = await fetch(url, { redirect: "error" });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return buffer.length > MAX_READ_BYTES ? null : { buffer, mimeType };
  } catch {
    return null;
  }
}

/** Best-effort delete, given a stored file URL. */
export async function deleteLocalFileByUrl(url: string): Promise<void> {
  const stored = STORED_URL.exec(url);
  const file = stored && pathForStoredFile(stored[1], stored[2]);
  if (!file) return;
  try {
    await unlink(file);
  } catch {
    // already gone, or never existed: nothing left to roll back
  }
}
