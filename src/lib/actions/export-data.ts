"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { toActionResult, type ActionResult } from "@/lib/action-result";

/**
 * Matches the local desktop build's own backup format exactly (same
 * `backupVersion` field, same singular per-table keys) — see
 * careerplatform-local's src/lib/actions/backup.ts. That app's "恢复备份"
 * import already knows how to read this shape and remaps whatever userId it
 * finds onto its fixed single local user, so a file downloaded here can be
 * fed straight into the desktop app's restore flow to move a web account's
 * data onto that machine.
 */
const BACKUP_VERSION = 1;

export type ExportedBackup = {
  backupVersion: number;
  exportedAt: string;
  data: Record<string, unknown[]>;
  files: Record<string, string>;
};

/**
 * Everything this user owns, as one self-contained JSON file — "导出我的数据"
 * on the settings page. Unlike the local single-user build's full-database
 * backup, every query here is scoped to the current userId: the web app is
 * multi-tenant, so a bare table dump would leak other users' rows.
 *
 * Companies are shared reference data (not owned by any one user), so
 * they're included only for the companies this user's own positions/
 * applications actually reference — enough to make the export
 * self-describing without pulling in the whole shared directory. AiKey is
 * deliberately excluded: it's encrypted with a server-side secret and
 * unreadable outside this app, so exporting it would hand the user a
 * useless ciphertext blob. The user row's passwordHash is stripped for the
 * same reason a bcrypt hash never needs to leave the server — the desktop
 * build that's the intended reader of this file has no login at all.
 */
export async function exportMyData(): Promise<ActionResult<ExportedBackup>> {
  return toActionResult(async () => {
    const sessionUser = await requireUser();
    const userId = sessionUser.id;

    const [
      user,
      positions,
      applications,
      resumeVersions,
      attachments,
      interviewPreps,
      interviewQAs,
      personalTasks,
      interviewSessionsRaw,
      questionBanks,
      personalityTestResults,
      careerFitAnalysis,
      contacts,
      jobLeads,
      examSessions,
    ] = await Promise.all([
      db.user.findUniqueOrThrow({ where: { id: userId } }),
      db.position.findMany({ where: { userId } }),
      db.application.findMany({ where: { userId } }),
      db.resumeVersion.findMany({ where: { userId } }),
      db.attachment.findMany({ where: { userId } }),
      db.interviewPrep.findMany({ where: { userId } }),
      db.interviewQA.findMany({ where: { userId } }),
      db.personalTask.findMany({ where: { userId } }),
      db.interviewSession.findMany({ where: { userId }, include: { messages: true } }),
      db.questionBank.findMany({ where: { userId } }),
      db.personalityTestResult.findMany({ where: { userId } }),
      db.careerFitAnalysis.findUnique({ where: { userId } }),
      db.contact.findMany({ where: { userId } }),
      db.jobLead.findMany({ where: { userId } }),
      db.examSession.findMany({ where: { userId } }),
    ]);

    const applicationIds = applications.map((a) => a.id);
    const stageHistory = applicationIds.length
      ? await db.stageHistory.findMany({ where: { applicationId: { in: applicationIds } } })
      : [];

    const companyIds = Array.from(
      new Set([...positions.map((p) => p.companyId), ...applications.map((a) => a.companyId)])
    );
    const companies = companyIds.length
      ? await db.company.findMany({ where: { id: { in: companyIds } } })
      : [];

    const interviewMessages = interviewSessionsRaw.flatMap((s) => s.messages);
    const interviewSessions = interviewSessionsRaw.map(({ messages: _messages, ...s }) => s);

    const { passwordHash: _passwordHash, ...userSafe } = user;

    return {
      backupVersion: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        user: [userSafe],
        company: companies,
        position: positions,
        application: applications,
        stageHistory,
        attachment: attachments,
        resumeVersion: resumeVersions,
        interviewPrep: interviewPreps,
        interviewQA: interviewQAs,
        personalTask: personalTasks,
        contact: contacts,
        interviewSession: interviewSessions,
        interviewMessage: interviewMessages,
        personalityTestResult: personalityTestResults,
        careerFitAnalysis: careerFitAnalysis ? [careerFitAnalysis] : [],
        jobLead: jobLeads,
        questionBank: questionBanks,
        examSession: examSessions,
      },
      files: {},
    };
  });
}
