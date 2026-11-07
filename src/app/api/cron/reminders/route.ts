import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findStaleApplications, findUpcomingPositionDeadlines } from "@/lib/reminders";
import { sendReminderDigestEmail } from "@/lib/email";
import { scanInboxOnLaunch } from "@/lib/inbox-scan-core";

// Stops starting new mailbox scans here; Vercel cuts the function at maxDuration.
export const maxDuration = 60;
const SCAN_BUDGET_MS = 45_000;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  // Without the first check an unset secret would accept "Bearer undefined".
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const users = await db.user.findMany({ select: { id: true, email: true } });

  let sent = 0;
  for (const user of users) {
    const [applications, positions] = await Promise.all([
      db.application.findMany({
        where: { userId: user.id },
        include: { company: true },
      }),
      db.position.findMany({
        where: { userId: user.id, status: { not: "APPLIED" } },
        include: { company: true },
      }),
    ]);

    const stale = findStaleApplications(applications);
    const upcoming = findUpcomingPositionDeadlines(positions);

    if (stale.length === 0 && upcoming.length === 0) continue;

    try {
      await sendReminderDigestEmail(user.email, { stale, upcoming });
      sent++;
    } catch (error) {
      console.error(`Failed to send reminder digest to ${user.email}:`, error);
    }
  }

  // The desktop app scans from its tray timer; here the daily job stands in.
  // Mail on the cloud build is read at most once a day (or by 立即检查).
  const scanners = await db.mailAccount.findMany({ where: { enabled: true }, distinct: ["userId"], select: { userId: true } });
  const started = Date.now();
  let scanned = 0;
  for (const { userId } of scanners) {
    if (Date.now() - started > SCAN_BUDGET_MS) break;
    await scanInboxOnLaunch(userId);
    scanned++;
  }

  return NextResponse.json({ usersChecked: users.length, emailsSent: sent, inboxesScanned: scanned, inboxesPending: scanners.length - scanned });
}
