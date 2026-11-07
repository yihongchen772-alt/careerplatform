import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { readOwnedFile } from "@/lib/local-storage";

const INLINE_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string; filename: string }> }
): Promise<NextResponse> {
  const user = await requireUser();
  const { userId, filename } = await params;

  // 404, not 403: don't confirm that someone else's file exists.
  const file = user.id === userId ? await readOwnedFile(userId, filename) : null;
  if (!file) return NextResponse.json({ error: "文件不存在" }, { status: 404 });

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": INLINE_TYPES.has(file.mimeType) ? "inline" : "attachment",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
