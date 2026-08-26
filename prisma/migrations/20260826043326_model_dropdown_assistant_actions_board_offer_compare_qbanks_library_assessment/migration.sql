-- AlterEnum
ALTER TYPE "ApplicationStage" ADD VALUE 'ASSESSMENT';

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "commuteMinutes" INTEGER,
ADD COLUMN     "growthNote" TEXT,
ADD COLUMN     "offerAnnualTotal" INTEGER,
ADD COLUMN     "overtimeNote" TEXT;

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "category" TEXT;

-- AlterTable
ALTER TABLE "InterviewMessage" ADD COLUMN     "deliveryNote" TEXT;

-- CreateTable
CREATE TABLE "QuestionBank" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionBank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionBank_userId_idx" ON "QuestionBank"("userId");

-- AddForeignKey
ALTER TABLE "QuestionBank" ADD CONSTRAINT "QuestionBank_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
