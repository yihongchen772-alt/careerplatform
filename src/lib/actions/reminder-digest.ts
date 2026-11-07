"use server";

import { sendDigestForSession } from "@/lib/reminder-digest-core";

export async function sendReminderDigestNow() {
  return sendDigestForSession();
}
