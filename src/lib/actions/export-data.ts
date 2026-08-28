"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { toActionResult, type ActionResult } from "@/lib/action-result";

/**
 * Bumped whenever the export shape changes incompatibly, so a future import
 * feature (or the user reading the file themselves) can tell what it's
 * looking at.
 */
const EXPORT_VERSION = 1;

export type ExportedData = {
  exportVersion: number;
  exportedAt: string;
  data: {
    companies: unknown[];
    positions: unknown[];
    applications: unknown[];
    stageHistory: unknown[];
    resumeVersions: unknown[];
    attachments: unknown[];
    interviewPreps: unknown[];
    interviewQAs: unknown[];
    personalTasks: unknown[];
    interviewSessions: unknown[];
    interviewMessages: unknown[];
    questionBanks: unknown[];
    personalityTestResults: unknown[];
    careerFitAnalysis: unknown | null;
  };
};

/**
 * Everything this user owns, as one self-contained JSON file — "导出我的数据"
 * on the settings page. Unlike the local single-user build's full-database
 * backup, this is scoped to the current userId throughout: the web app is
 * multi-tenant, so a bare table dump would leak other users' rows.
 *
 * Companies are shared reference data (not owned by any one user), so they're
 * included only for the companies this user's own positions/applications
 * actually reference — enough to make the export self-describing without
 * pulling in the whole shared directory. AiKey is deliberately excluded: it's
 * encrypted with a server-side secret and unreadable outside this app, so
 * exporting it would hand the user a useless ciphertext blob.
 */
export async function exportMyData(): Promise<ActionResult<ExportedData>> {
  return toActionResult(async () => {
    const sessionUser = await requireUser();
    const userId = sessionUser.id;

    const [
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
    ] = await Promise.all([
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

    return {
      exportVersion: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        companies,
        positions,
        applications,
        stageHistory,
        resumeVersions,
        attachments,
        interviewPreps,
        interviewQAs,
        personalTasks,
        interviewSessions,
        interviewMessages,
        questionBanks,
        personalityTestResults,
        careerFitAnalysis,
      },
    };
  });
}
