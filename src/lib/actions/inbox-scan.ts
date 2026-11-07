"use server";

import { scanInboxForSession } from "@/lib/inbox-scan-core";

export async function scanInboxNow() {
  return scanInboxForSession();
}
