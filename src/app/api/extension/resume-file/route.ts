import path from "path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { withExtensionUser } from "@/lib/extension-auth";
import { readStoredFile } from "@/lib/local-storage";
import { resumeUploadName } from "@/lib/resume-used";

// The extension gets the bytes and attaches them with a DataTransfer in the page.
export async function GET(request: Request) {
  return withExtensionUser(request, async () => {
    const user = await requireUser();
    const id = new URL(request.url).searchParams.get("resumeVersionId");
    if (!id) return NextResponse.json({ error: "没选简历" }, { status: 400 });
    const resume = await db.resumeVersion.findFirst({ where: { id, userId: user.id }, select: { fileUrl: true } });
    const file = resume?.fileUrl ? await readStoredFile(resume.fileUrl) : null;
    if (!resume?.fileUrl || !file) return NextResponse.json({ error: "选中的简历没有可上传的文件" }, { status: 404 });
    // What HR sees: 「姓名-简历.pdf」, not the storage file name.
    const filename = resumeUploadName(user.name, path.extname(new URL(resume.fileUrl).pathname).toLowerCase());
    return new NextResponse(new Uint8Array(file.buffer), {
      headers: { "Content-Type": file.mimeType, "X-File-Name": encodeURIComponent(filename) },
    });
  });
}
