-- CreateEnum
CREATE TYPE "RadarJobEventType" AS ENUM ('NEW', 'UPDATED', 'REMOVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApplicationStage" ADD VALUE 'WITHDRAWN';
ALTER TYPE "ApplicationStage" ADD VALUE 'CANCELLED';
ALTER TYPE "ApplicationStage" ADD VALUE 'AI_INTERVIEW';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "agentAiModel" TEXT,
ADD COLUMN     "agentAiProvider" TEXT,
ADD COLUMN     "agentDailyBrief" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "agentInferred" JSONB,
ADD COLUMN     "agentPlan" TEXT,
ADD COLUMN     "agentPlanAt" TIMESTAMP(3),
ADD COLUMN     "agentWeeklyReview" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "applicationProfile" JSONB,
ADD COLUMN     "autoApplyProgress" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoBackupDir" TEXT,
ADD COLUMN     "autoBackupEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoBackupIntervalHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "autoBackupKeep" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "autoBackupLastAt" TIMESTAMP(3),
ADD COLUMN     "autoBackupLastError" TEXT,
ADD COLUMN     "autofillMappings" JSONB,
ADD COLUMN     "birthDate" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "emailReminderClaimUntil" TIMESTAMP(3),
ADD COLUMN     "emailReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailReminderLastDay" TEXT,
ADD COLUMN     "emailReminderLastError" TEXT,
ADD COLUMN     "emailReminderLastSentAt" TIMESTAMP(3),
ADD COLUMN     "emailReminderTime" TEXT NOT NULL DEFAULT '09:00',
ADD COLUMN     "emailReminderTimeZone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
ADD COLUMN     "extensionPairedAt" TIMESTAMP(3),
ADD COLUMN     "extensionTokenHash" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "inboxScanError" TEXT,
ADD COLUMN     "inboxScanErrorAt" TIMESTAMP(3),
ADD COLUMN     "inboxScanFailStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "inboxScanOkAt" TIMESTAMP(3),
ADD COLUMN     "lastBackupAt" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "smtpFrom" TEXT,
ADD COLUMN     "smtpHost" TEXT,
ADD COLUMN     "smtpPasswordEncrypted" TEXT,
ADD COLUMN     "smtpPort" INTEGER,
ADD COLUMN     "smtpUser" TEXT,
ADD COLUMN     "webdavPasswordEncrypted" TEXT,
ADD COLUMN     "webdavUrl" TEXT,
ADD COLUMN     "webdavUser" TEXT;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "portalContentHash" TEXT,
ADD COLUMN     "portalLastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "portalLastError" TEXT,
ADD COLUMN     "portalUrl" TEXT,
ADD COLUMN     "radarContentHash" TEXT,
ADD COLUMN     "radarEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "radarLastChangedAt" TIMESTAMP(3),
ADD COLUMN     "radarLastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "radarLastError" TEXT,
ADD COLUMN     "radarLastWarning" TEXT,
ADD COLUMN     "structuredApiUrl" TEXT;

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "applicationRules" JSONB,
ADD COLUMN     "captureKey" TEXT,
ADD COLUMN     "recruitmentType" TEXT,
ADD COLUMN     "rulesRevision" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "applyUrl" TEXT,
ADD COLUMN     "autoUndoneStatus" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "cityLookupAt" TIMESTAMP(3),
ADD COLUMN     "citySource" TEXT,
ADD COLUMN     "currentStageLabel" TEXT,
ADD COLUMN     "jdSnapshot" TEXT,
ADD COLUMN     "jdSnapshotUrl" TEXT,
ADD COLUMN     "portalId" TEXT,
ADD COLUMN     "portalStatus" TEXT,
ADD COLUMN     "portalStatusAt" TIMESTAMP(3),
ADD COLUMN     "portalSuggestedAt" TIMESTAMP(3),
ADD COLUMN     "portalSuggestedStage" "ApplicationStage",
ADD COLUMN     "sortOrder" DOUBLE PRECISION,
ADD COLUMN     "submissionPackage" JSONB,
ADD COLUMN     "workflowChecklist" JSONB,
ADD COLUMN     "workflowRevision" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StageHistory" ADD COLUMN     "autoEvidence" TEXT,
ADD COLUMN     "autoSeenAt" TIMESTAMP(3),
ADD COLUMN     "autoSource" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "followedUpAt" TIMESTAMP(3),
ADD COLUMN     "meetingInfo" TEXT,
ADD COLUMN     "nextHasTime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "remindMinutes" INTEGER,
ADD COLUMN     "scheduleSource" TEXT,
ADD COLUMN     "stageLabel" TEXT,
ADD COLUMN     "terminatedAtStage" TEXT,
ADD COLUMN     "terminatedAtStageLabel" TEXT;

-- AlterTable
ALTER TABLE "ResumeVersion" ADD COLUMN     "extractedAt" TIMESTAMP(3),
ADD COLUMN     "extractedText" TEXT,
ADD COLUMN     "structured" JSONB,
ADD COLUMN     "structuredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PersonalTask" ADD COLUMN     "mailAppliedAt" TIMESTAMP(3),
ADD COLUMN     "mailAppliedSeenAt" TIMESTAMP(3),
ADD COLUMN     "mailEventDraft" JSONB,
ADD COLUMN     "mailEventId" TEXT,
ADD COLUMN     "mailUndo" JSONB,
ADD COLUMN     "mailUndoneAt" TIMESTAMP(3),
ADD COLUMN     "sourceMailKey" TEXT;

-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "focusMix" TEXT,
ADD COLUMN     "includeCoding" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ApplicationMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "alternatives" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingApplicationChange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "contextKey" TEXT,
    "resumeVersionId" TEXT,
    "variantId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingApplicationChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesktopNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "template" TEXT NOT NULL DEFAULT 'blank',
    "color" TEXT NOT NULL DEFAULT 'cream',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesktopNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "dateKey" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "noteId" TEXT,
    "stageHistoryId" TEXT,
    "meetingInfo" TEXT,
    "source" TEXT,
    "completedAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventReminder" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "offsetMinutes" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "claimUntil" TIMESTAMP(3),
    "claimToken" TEXT,

    CONSTRAINT "EventReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyDigest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyDigest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeComparisonSummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeComparisonSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewIntelligence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "imapHost" TEXT NOT NULL,
    "imapPort" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "passwordEncrypted" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" TIMESTAMP(3),
    "lastSeenUid" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationPortal" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "contentHash" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "lastSuccessfulAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationPortal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadarJobPosting" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "RadarJobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadarJobEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "RadarJobEventType" NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RadarJobEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyAlias" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostingSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "total" INTEGER NOT NULL DEFAULT 0,
    "rev" INTEGER,
    "lastCheckedAt" TIMESTAMP(3),
    "firstSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostingSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampusPosting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "roles" TEXT,
    "cohort" TEXT,
    "kind" TEXT,
    "cities" TEXT,
    "industry" TEXT,
    "degree" TEXT,
    "writtenTest" TEXT,
    "applyUrl" TEXT,
    "noticeUrl" TEXT,
    "startDate" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "deadlineText" TEXT,
    "note" TEXT,
    "salary" TEXT,
    "positionId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampusPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewNoteExtract" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stageHistoryId" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewNoteExtract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StagePostmortem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stageHistoryId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StagePostmortem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionMatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "resumeVersionId" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeTailoring" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "positionId" TEXT,
    "resumeVersionId" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "draft" JSONB,
    "savedVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeTailoring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeDrill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeVersionId" TEXT NOT NULL,
    "positionId" TEXT,
    "tree" JSONB NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeDrill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillGapAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeVersionId" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillGapAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutofillAnswer" (
    "contextDigest" TEXT,
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeVersionId" TEXT,
    "questionLabel" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'essay',
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "contextKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutofillAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupInterviewPrep" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupInterviewPrep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverLetter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewBrief" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contextKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentBrief" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "actions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "about" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationMemory_userId_enabled_idx" ON "ApplicationMemory"("userId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationMemory_userId_category_identity_key" ON "ApplicationMemory"("userId", "category", "identity");

-- CreateIndex
CREATE INDEX "PendingApplicationChange_userId_updatedAt_idx" ON "PendingApplicationChange"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PendingApplicationChange_userId_fingerprint_key" ON "PendingApplicationChange"("userId", "fingerprint");

-- CreateIndex
CREATE INDEX "DesktopNote_userId_idx" ON "DesktopNote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_stageHistoryId_key" ON "CalendarEvent"("stageHistoryId");

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_startsAt_idx" ON "CalendarEvent"("userId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventReminder_eventId_key" ON "EventReminder"("eventId");

-- CreateIndex
CREATE INDEX "EventReminder_deliveredAt_scheduledAt_idx" ON "EventReminder"("deliveredAt", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyDigest_userId_date_key" ON "DailyDigest"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReview_userId_weekStart_key" ON "WeeklyReview"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeComparisonSummary_userId_key" ON "ResumeComparisonSummary"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewIntelligence_userId_key" ON "InterviewIntelligence"("userId");

-- CreateIndex
CREATE INDEX "MailAccount_userId_idx" ON "MailAccount"("userId");

-- CreateIndex
CREATE INDEX "ApplicationPortal_companyId_idx" ON "ApplicationPortal"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationPortal_companyId_url_key" ON "ApplicationPortal"("companyId", "url");

-- CreateIndex
CREATE INDEX "RadarJobPosting_companyId_idx" ON "RadarJobPosting"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "RadarJobPosting_companyId_title_key" ON "RadarJobPosting"("companyId", "title");

-- CreateIndex
CREATE INDEX "RadarJobEvent_companyId_idx" ON "RadarJobEvent"("companyId");

-- CreateIndex
CREATE INDEX "RadarJobEvent_createdAt_idx" ON "RadarJobEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyAlias_alias_key" ON "CompanyAlias"("alias");

-- CreateIndex
CREATE INDEX "CompanyAlias_companyId_idx" ON "CompanyAlias"("companyId");

-- CreateIndex
CREATE INDEX "PostingSource_userId_idx" ON "PostingSource"("userId");

-- CreateIndex
CREATE INDEX "CampusPosting_userId_startDate_idx" ON "CampusPosting"("userId", "startDate");

-- CreateIndex
CREATE INDEX "CampusPosting_userId_deadline_idx" ON "CampusPosting"("userId", "deadline");

-- CreateIndex
CREATE UNIQUE INDEX "CampusPosting_sourceId_externalId_key" ON "CampusPosting"("sourceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewNoteExtract_stageHistoryId_key" ON "InterviewNoteExtract"("stageHistoryId");

-- CreateIndex
CREATE INDEX "InterviewNoteExtract_userId_idx" ON "InterviewNoteExtract"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StagePostmortem_stageHistoryId_key" ON "StagePostmortem"("stageHistoryId");

-- CreateIndex
CREATE INDEX "StagePostmortem_userId_idx" ON "StagePostmortem"("userId");

-- CreateIndex
CREATE INDEX "PositionMatch_userId_idx" ON "PositionMatch"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PositionMatch_positionId_resumeVersionId_key" ON "PositionMatch"("positionId", "resumeVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeTailoring_savedVersionId_key" ON "ResumeTailoring"("savedVersionId");

-- CreateIndex
CREATE INDEX "ResumeTailoring_userId_idx" ON "ResumeTailoring"("userId");

-- CreateIndex
CREATE INDEX "ResumeTailoring_positionId_resumeVersionId_idx" ON "ResumeTailoring"("positionId", "resumeVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeDrill_resumeVersionId_key" ON "ResumeDrill"("resumeVersionId");

-- CreateIndex
CREATE INDEX "ResumeDrill_userId_idx" ON "ResumeDrill"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillGapAnalysis_resumeVersionId_key" ON "SkillGapAnalysis"("resumeVersionId");

-- CreateIndex
CREATE INDEX "SkillGapAnalysis_userId_idx" ON "SkillGapAnalysis"("userId");

-- CreateIndex
CREATE INDEX "AutofillAnswer_userId_resumeVersionId_idx" ON "AutofillAnswer"("userId", "resumeVersionId");

-- CreateIndex
CREATE INDEX "AutofillAnswer_userId_resumeVersionId_contextKey_idx" ON "AutofillAnswer"("userId", "resumeVersionId", "contextKey");

-- CreateIndex
CREATE INDEX "AutofillAnswer_userId_confirmed_contextKey_idx" ON "AutofillAnswer"("userId", "confirmed", "contextKey");

-- CreateIndex
CREATE UNIQUE INDEX "GroupInterviewPrep_positionId_key" ON "GroupInterviewPrep"("positionId");

-- CreateIndex
CREATE INDEX "GroupInterviewPrep_userId_idx" ON "GroupInterviewPrep"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CoverLetter_positionId_key" ON "CoverLetter"("positionId");

-- CreateIndex
CREATE INDEX "CoverLetter_userId_idx" ON "CoverLetter"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewBrief_applicationId_key" ON "InterviewBrief"("applicationId");

-- CreateIndex
CREATE INDEX "InterviewBrief_userId_idx" ON "InterviewBrief"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationDraft_userId_contextKey_key" ON "ApplicationDraft"("userId", "contextKey");

-- CreateIndex
CREATE INDEX "AgentConversation_userId_updatedAt_idx" ON "AgentConversation"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "AgentMemory_userId_idx" ON "AgentMemory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentBrief_userId_kind_period_key" ON "AgentBrief"("userId", "kind", "period");

-- CreateIndex
CREATE INDEX "JourneyEntry_userId_createdAt_idx" ON "JourneyEntry"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Position_captureKey_key" ON "Position"("captureKey");

-- CreateIndex
CREATE INDEX "Application_portalId_idx" ON "Application"("portalId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalTask_sourceMailKey_key" ON "PersonalTask"("sourceMailKey");

-- AddForeignKey
ALTER TABLE "ApplicationMemory" ADD CONSTRAINT "ApplicationMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingApplicationChange" ADD CONSTRAINT "PendingApplicationChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesktopNote" ADD CONSTRAINT "DesktopNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "DesktopNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_stageHistoryId_fkey" FOREIGN KEY ("stageHistoryId") REFERENCES "StageHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReminder" ADD CONSTRAINT "EventReminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyDigest" ADD CONSTRAINT "DailyDigest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReview" ADD CONSTRAINT "WeeklyReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeComparisonSummary" ADD CONSTRAINT "ResumeComparisonSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewIntelligence" ADD CONSTRAINT "InterviewIntelligence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailAccount" ADD CONSTRAINT "MailAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationPortal" ADD CONSTRAINT "ApplicationPortal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadarJobPosting" ADD CONSTRAINT "RadarJobPosting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadarJobEvent" ADD CONSTRAINT "RadarJobEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAlias" ADD CONSTRAINT "CompanyAlias_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostingSource" ADD CONSTRAINT "PostingSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampusPosting" ADD CONSTRAINT "CampusPosting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampusPosting" ADD CONSTRAINT "CampusPosting_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "PostingSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "ApplicationPortal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewNoteExtract" ADD CONSTRAINT "InterviewNoteExtract_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewNoteExtract" ADD CONSTRAINT "InterviewNoteExtract_stageHistoryId_fkey" FOREIGN KEY ("stageHistoryId") REFERENCES "StageHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StagePostmortem" ADD CONSTRAINT "StagePostmortem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StagePostmortem" ADD CONSTRAINT "StagePostmortem_stageHistoryId_fkey" FOREIGN KEY ("stageHistoryId") REFERENCES "StageHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionMatch" ADD CONSTRAINT "PositionMatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionMatch" ADD CONSTRAINT "PositionMatch_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionMatch" ADD CONSTRAINT "PositionMatch_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "ResumeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeTailoring" ADD CONSTRAINT "ResumeTailoring_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeTailoring" ADD CONSTRAINT "ResumeTailoring_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeTailoring" ADD CONSTRAINT "ResumeTailoring_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "ResumeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeTailoring" ADD CONSTRAINT "ResumeTailoring_savedVersionId_fkey" FOREIGN KEY ("savedVersionId") REFERENCES "ResumeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeDrill" ADD CONSTRAINT "ResumeDrill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeDrill" ADD CONSTRAINT "ResumeDrill_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "ResumeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeDrill" ADD CONSTRAINT "ResumeDrill_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillGapAnalysis" ADD CONSTRAINT "SkillGapAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillGapAnalysis" ADD CONSTRAINT "SkillGapAnalysis_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "ResumeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutofillAnswer" ADD CONSTRAINT "AutofillAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutofillAnswer" ADD CONSTRAINT "AutofillAnswer_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "ResumeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupInterviewPrep" ADD CONSTRAINT "GroupInterviewPrep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupInterviewPrep" ADD CONSTRAINT "GroupInterviewPrep_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverLetter" ADD CONSTRAINT "CoverLetter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverLetter" ADD CONSTRAINT "CoverLetter_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewBrief" ADD CONSTRAINT "InterviewBrief_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewBrief" ADD CONSTRAINT "InterviewBrief_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDraft" ADD CONSTRAINT "ApplicationDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentConversation" ADD CONSTRAINT "AgentConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentBrief" ADD CONSTRAINT "AgentBrief_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyEntry" ADD CONSTRAINT "JourneyEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

