import { lookup } from "node:dns/promises";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Browser, HTTPRequest, Page } from "puppeteer-core";
import { isPublicAddress } from "@/lib/job-capture";

// Headless Chromium for what the desktop app does in hidden Electron windows:
// reading pages that only fill in with JavaScript, the 飞书 sheet reader, and
// printing resumes to PDF. Locally set CHROME_EXECUTABLE_PATH to any Chrome.

// The bundled build has no CJK font; without one every Chinese character in a
// rendered PDF would be a box. Fetched once per instance into the folder the
// bundle's fontconfig reads.
const CJK_FONT_URL = "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@Sans2.004/Sans/SubsetOTF/SC/NotoSansSC-Regular.otf";
const RENDER_TIMEOUT_MS = 20000;
// SPA content often keeps populating after load; same settle as the desktop bridge.
const SETTLE_MS = 3000;

let browser: Promise<Browser> | null = null;

async function ensureCjkFont(dir: string) {
  const file = path.join(dir, "NotoSansSC-Regular.otf");
  if (await stat(file).then(() => true, () => false)) return;
  const res = await fetch(CJK_FONT_URL, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`中文字体下载失败（${res.status}）`);
  await mkdir(dir, { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

async function launch(): Promise<Browser> {
  const puppeteer = await import("puppeteer-core");
  const local = process.env.CHROME_EXECUTABLE_PATH;
  if (local) return puppeteer.launch({ executablePath: local, headless: true });
  const { default: chromium } = await import("@sparticuz/chromium");
  chromium.setGraphicsMode = false;
  const executablePath = await chromium.executablePath();
  await ensureCjkFont(process.env.FONTCONFIG_PATH ?? "/tmp/fonts");
  return puppeteer.launch({ executablePath, args: chromium.args, headless: true });
}

/** One browser per warm instance; each call gets its own incognito context. */
async function withPage<T>(run: (page: Page) => Promise<T>): Promise<T> {
  browser ??= launch().catch((error) => { browser = null; throw error; });
  let instance = await browser;
  if (!instance.connected) {
    browser = launch();
    instance = await browser;
  }
  const context = await instance.createBrowserContext();
  try {
    return await run(await context.newPage());
  } finally {
    await context.close().catch(() => {});
  }
}

/**
 * Every request a rendered page makes goes through here: the URLs come from
 * users, and this browser sits inside our network, so anything that resolves
 * to a private or loopback address is refused, redirects included.
 */
async function allowPublicOnly(page: Page) {
  const verdicts = new Map<string, Promise<boolean>>();
  const isPublicHost = (host: string) => {
    let verdict = verdicts.get(host);
    if (!verdict) {
      verdict = lookup(host.replace(/^\[|\]$/g, ""), { all: true }).then(
        (addresses) => addresses.length > 0 && addresses.every((a) => isPublicAddress(a.address)),
        () => false
      );
      verdicts.set(host, verdict);
    }
    return verdict;
  };
  await page.setRequestInterception(true);
  page.on("request", (request: HTTPRequest) => {
    if (request.isInterceptResolutionHandled()) return;
    let url: URL;
    try { url = new URL(request.url()); } catch { void request.abort(); return; }
    if (url.protocol === "data:" || url.protocol === "blob:") { void request.continue(); return; }
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) { void request.abort(); return; }
    // Images and media add nothing to the text and cost time.
    if (["image", "media", "font"].includes(request.resourceType())) { void request.abort(); return; }
    void isPublicHost(url.hostname).then((ok) => (ok ? request.continue() : request.abort()), () => request.abort());
  });
}

/** The visible text of a page after its scripts have run. */
export async function renderPageText(url: string): Promise<string> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("只支持网页链接");
  return withPage(async (page) => {
    await allowPublicOnly(page);
    await page.goto(parsed.toString(), { waitUntil: "domcontentloaded", timeout: RENDER_TIMEOUT_MS });
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    const text = await page.evaluate(() => (document.body ? document.body.innerText : ""));
    return typeof text === "string" ? text : "";
  });
}

/** An A4 PDF of our own resume page: no scripts, nothing fetched. */
export async function printPdf(html: string): Promise<Buffer> {
  return withPage(async (page) => {
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", (request: HTTPRequest) => {
      if (request.isInterceptResolutionHandled()) return;
      void (request.url().startsWith("data:") ? request.continue() : request.abort());
    });
    await page.setContent(html, { waitUntil: "load", timeout: RENDER_TIMEOUT_MS });
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    return Buffer.from(pdf);
  });
}

// ── 飞书多维表格 (shared by link), as the desktop reader does it ─────────────

const SHEET_TIMEOUT_MS = 45000;
const MAX_ROWS = 50000;

export type SheetRows = { name: string; rev: number | null; columns: string[]; rows: { id: string; cells: Record<string, string> }[] };

export function isBaseLink(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && /(^|\.)(feishu\.cn|larksuite\.com)$/.test(url.hostname) && /^\/(?:share\/)?base\/[A-Za-z0-9]+/.test(url.pathname);
  } catch {
    return false;
  }
}

// Runs inside the sheet's page, kept as source so the bundler can't rewrite it.
// Copied from the desktop reader (electron/feishu-base.js) as plain source.
const READ_ALL_ROWS = "async function readAllRows(clientvarsUrl, maxRows) {\n  const inflate = async (b64) => {\n    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));\n    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(\"gzip\"));\n    return JSON.parse(await new Response(stream).text());\n  };\n  const getJson = async (url) => {\n    const res = await fetch(url, { credentials: \"include\" });\n    const body = await res.json();\n    if (body.code !== 0) throw new Error(`飞书返回错误 ${body.code}：${body.msg || \"\"}`);\n    return body.data;\n  };\n  const vars = await getJson(clientvarsUrl);\n  const table = await inflate(vars.table);\n  const fields = table.fieldMap || {};\n  const options = {};\n  for (const [id, field] of Object.entries(fields)) options[id] = Object.fromEntries(((field.property || {}).options || []).map((o) => [o.id, o.name]));\n  const day = (ms) => new Date(ms + 8 * 3600000).toISOString().slice(0, 10);\n  const text = (id, value) => {\n    const type = fields[id].type;\n    if (value == null) return \"\";\n    if (type === 3 || type === 4) return (Array.isArray(value) ? value : [value]).map((v) => options[id][v] || \"\").filter(Boolean).join(\"、\");\n    if (type === 5) return typeof value === \"number\" ? day(value) : \"\";\n    if (type === 7) return value ? \"是\" : \"\";\n    if (typeof value === \"number\") return String(value);\n    if (typeof value === \"string\") return value;\n    if (Array.isArray(value)) return value.map((seg) => (seg && typeof seg === \"object\" ? (seg.type === \"url\" || type === 15 ? seg.link || seg.text : seg.text) || \"\" : \"\")).join(\"\").trim();\n    return \"\";\n  };\n  const records = { ...(table.recordMap || {}) };\n  const total = Math.min(table.recordCount || 0, maxRows);\n  if (Object.keys(records).length < total) {\n    const base = new URL(clientvarsUrl);\n    // The first load asks for the default table with an empty tableID; the answer names it.\n    const tableId = base.searchParams.get(\"tableID\") || (table.meta || {}).id;\n    const viewId = base.searchParams.get(\"viewID\") || vars.currentView || \"\";\n    const pageUrl = new URL(base.pathname.replace(/clientvars$/, \"records\"), base.origin);\n    for (let offset = 0; offset < total; offset += 3000) {\n      for (const [key, value] of Object.entries({ tableId, viewId, tableRev: String((table.meta || {}).rev ?? \"\"), depRev: \"{}\", viewLazyLoad: \"true\", offset: String(offset), limit: \"3000\", tableID: tableId, viewID: viewId, removeFmlExtra: \"true\" })) pageUrl.searchParams.set(key, value);\n      const page = await inflate((await getJson(pageUrl)).records);\n      const got = Object.keys(page.recordMap || {}).length;\n      Object.assign(records, page.recordMap);\n      if (!got) break;\n    }\n  }\n  const names = Object.fromEntries(Object.entries(fields).map(([id, field]) => [id, field.name]));\n  const rows = Object.entries(records).slice(0, maxRows).map(([id, row]) => {\n    const cells = {};\n    for (const [fieldId, cell] of Object.entries(row || {})) {\n      if (!names[fieldId]) continue;\n      const value = text(fieldId, cell && cell.value);\n      if (value) cells[names[fieldId]] = value;\n    }\n    return { id, cells };\n  });\n  return { name: document.title.replace(/\\s*-\\s*飞书.*$/, \"\").trim(), rev: (table.meta || {}).rev ?? null, columns: Object.values(names), rows };\n}";

export async function readFeishuBase(url: string): Promise<SheetRows> {
  if (!isBaseLink(url)) throw new Error("只支持飞书多维表格的分享链接（https://…feishu.cn/base/…）");
  return withPage(async (page) => {
    await allowPublicOnly(page);
    let clientvarsUrl: string | null = null;
    const seen = new Promise<void>((resolve) => {
      page.on("request", (request: HTTPRequest) => {
        if (!clientvarsUrl && /\/space\/api\/v1\/bitable\/.*\/clientvars\?/.test(request.url())) {
          clientvarsUrl = request.url();
          resolve();
        }
      });
    });
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("飞书表格打开超时：检查链接是否完整")), SHEET_TIMEOUT_MS));
    await Promise.race([page.goto(url, { waitUntil: "domcontentloaded", timeout: SHEET_TIMEOUT_MS }).then(() => seen), timeout]);
    return (await page.evaluate(`(${READ_ALL_ROWS})(${JSON.stringify(clientvarsUrl)}, ${MAX_ROWS})`)) as SheetRows;
  });
}
