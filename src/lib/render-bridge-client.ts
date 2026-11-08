import { printPdf, readFeishuBase as readSheet, renderPageText as render, type SheetRows } from "@/lib/headless";

// Same calls the desktop build makes to its Electron bridge, served here by
// headless Chromium (src/lib/headless.ts), so callers didn't need to change.

export type { SheetRows };

/**
 * The desktop app can render inside the 网申浏览器's logged-in session or a
 * separate search session. The cloud build has neither, so every page is read
 * anonymously in a fresh context and those options only document intent.
 */
export async function renderPageText(
  url: string,
  options: { useApplicationSession?: boolean; useSearchSession?: boolean } = {}
): Promise<string> {
  void options;
  return render(url);
}

export function readFeishuBase(url: string): Promise<SheetRows> {
  return readSheet(url);
}

/**
 * The desktop reader keeps the sheet's cookies to ask for just its revision.
 * Nothing survives between requests here, so the caller reads the whole sheet.
 */
export async function feishuBaseRevision(url: string): Promise<number | null> {
  void url;
  return null;
}

export async function printResumePdf(html: string): Promise<Buffer> {
  const pdf = await printPdf(html);
  if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("生成 PDF 失败：输出不是 PDF");
  return pdf;
}
