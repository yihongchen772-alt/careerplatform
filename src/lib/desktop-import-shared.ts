// What a desktop backup brings into a cloud account, in foreign-key order.
// Left out on purpose: `user` and `company` have their own steps; aiKey and
// mailAccount are encrypted with a key only that desktop has; company aliases
// beyond new companies, portals and radar rows are shared between accounts.
export const IMPORT_TABLES = [
  "agentConversation", "agentMemory", "agentBrief", "dailyDigest", "weeklyReview",
  "resumeComparisonSummary", "interviewIntelligence", "jobLead", "resumeVersion", "position",
  "applicationDraft", "pendingApplicationChange", "application", "stageHistory",
  "interviewNoteExtract", "stagePostmortem", "attachment", "positionMatch", "resumeTailoring",
  "resumeDrill", "skillGapAnalysis", "autofillAnswer", "applicationMemory", "interviewPrep",
  "groupInterviewPrep", "coverLetter", "interviewQA", "interviewBrief", "personalTask",
  "contact", "interviewSession", "interviewMessage", "personalityTestResult", "careerFitAnalysis",
  "questionBank", "examSession", "desktopNote", "calendarEvent", "eventReminder", "journeyEntry",
] as const;

export type ImportTable = (typeof IMPORT_TABLES)[number];

export const IMPORT_MAX_ROWS = 2000;
/** Stays under Vercel's ~4.5MB request cap once wrapped in the request JSON. */
export const IMPORT_MAX_BATCH_BYTES = 3 * 1024 * 1024;

/** String values that are row ids from the backup, mapped to the table they belong to. */
export type IdRefs = Record<string, string>;
export type ImportResult = { imported: number; skipped: number; errors: string[] };
