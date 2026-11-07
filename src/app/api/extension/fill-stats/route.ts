import { NextResponse } from "next/server";
import { withExtensionUser } from "@/lib/extension-auth";

// Per-site fill counters are a desktop diagnostic; nothing is stored here.
export async function POST(request: Request) {
  return withExtensionUser(request, () => NextResponse.json({ ok: true }));
}
