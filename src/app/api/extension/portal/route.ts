import { NextResponse } from "next/server";
import { withExtensionUser } from "@/lib/extension-auth";

export async function POST(request: Request) {
  return withExtensionUser(request, () => NextResponse.json({ error: "云版暂不支持设为进度页" }, { status: 400 }));
}
