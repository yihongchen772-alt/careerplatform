import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requestUser } from "@/lib/request-user";

// Plain module: the extension has no session cookie, so every /api/extension/*
// call carries the pairing code from 设置 → 浏览器插件, which identifies the account.

export const EXTENSION_TOKEN_HEADER = "x-jobcompass-token";

export function hashExtensionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** 24 random bytes, grouped for readability when copied by hand. */
export function newExtensionToken(): string {
  return randomBytes(24).toString("base64url").replace(/(.{8})(?=.)/g, "$1-");
}

/** Runs `handler` as the account this pairing code belongs to, or returns the 401. */
export async function withExtensionUser(request: Request, handler: () => Response | Promise<Response>): Promise<Response> {
  const token = request.headers.get(EXTENSION_TOKEN_HEADER)?.trim();
  if (!token) {
    return NextResponse.json({ error: "插件还没配对：在求职罗盘网站的设置 → 浏览器插件里生成配对码" }, { status: 401 });
  }
  const user = await db.user.findFirst({ where: { extensionTokenHash: hashExtensionToken(token) }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "配对码无效或已重新生成，请在插件里重新填写" }, { status: 401 });
  return requestUser.run(user.id, handler);
}
