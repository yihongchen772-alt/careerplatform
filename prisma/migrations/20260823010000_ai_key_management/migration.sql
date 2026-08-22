-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultAiProvider" TEXT;

-- CreateTable
CREATE TABLE "AiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT NOT NULL,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiKey_userId_provider_key" ON "AiKey"("userId", "provider");

-- AddForeignKey
ALTER TABLE "AiKey" ADD CONSTRAINT "AiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry forward each user's old single-slot key into the new per-provider
-- table so existing configuration isn't lost, then make it their default.
-- 'aikey_' || id is a stable, collision-free id here since this insert only
-- ever produces one row per user.
INSERT INTO "AiKey" ("id", "userId", "provider", "apiKeyEncrypted", "model", "createdAt", "updatedAt")
SELECT 'aikey_' || "id", "id", "aiProvider", "aiApiKeyEncrypted", "aiModel", "createdAt", "createdAt"
FROM "User"
WHERE "aiProvider" IS NOT NULL AND "aiApiKeyEncrypted" IS NOT NULL;

UPDATE "User" SET "defaultAiProvider" = "aiProvider" WHERE "aiProvider" IS NOT NULL;
