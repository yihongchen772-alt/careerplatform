import { NextResponse } from "next/server";
import { withExtensionUser } from "@/lib/extension-auth";

// Form samples are a desktop diagnostic written to a local folder; the cloud
// build keeps nothing, and the extension treats this as a normal "not saved".
export async function POST(request: Request) {
  return withExtensionUser(request, () => NextResponse.json({ saved: false }));
}
