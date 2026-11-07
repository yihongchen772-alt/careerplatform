import { randomBytes } from "crypto";
import path from "path";
import { del, put } from "@vercel/blob";

// Same call surface as the desktop build's disk store, backed by Vercel Blob:
// a serverless filesystem doesn't outlive the request. Browser uploads go
// straight to Blob via /api/blob/* because Vercel caps a function's request
// body around 4.5MB; only files the server produces itself are put() here.

const MAX_READ_BYTES = 50 * 1024 * 1024;

/**
 * Stored URLs reach here from user-editable rows, so only our own Blob store
 * is ever fetched. Anything else would let a crafted fileUrl make the server
 * request an arbitrary address and hand the response to the caller.
 */
export function isStoredFileUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
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
  buffer: Buffer,
  mimeType: string
): Promise<{ url: string; filename: string }> {
  const ext = EXT_BY_MIME[mimeType] ?? "";
  const filename = `${randomBytes(16).toString("hex")}${ext}`;
  const blob = await put(filename, buffer, { access: "public", contentType: mimeType, addRandomSuffix: true });
  return { url: blob.url, filename };
}

export async function readStoredFile(
  url: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!isStoredFileUrl(url)) return null;
  const mimeType = mimeTypeForExtension(path.extname(new URL(url).pathname));
  if (!mimeType) return null;

  try {
    const res = await fetch(url, { redirect: "error" });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_READ_BYTES) return null;
    return { buffer, mimeType };
  } catch {
    return null;
  }
}

/** Best-effort delete, given a stored file URL. */
export async function deleteLocalFileByUrl(url: string): Promise<void> {
  if (!isStoredFileUrl(url)) return;
  try {
    await del(url);
  } catch {
    // already gone, or never existed: nothing left to roll back
  }
}
