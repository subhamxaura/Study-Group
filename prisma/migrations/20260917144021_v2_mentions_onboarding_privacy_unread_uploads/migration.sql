-- CreateEnum
CREATE TYPE "public"."ProfilePrivacy" AS ENUM ('PUBLIC', 'GROUPS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "public"."StorageKind" AS ENUM ('LOCAL', 'BLOB');

-- AlterTable
ALTER TABLE "public"."GroupMember" ADD COLUMN     "lastReadMessageAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Resource" ADD COLUMN     "isFile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "storageKey" TEXT,
ADD COLUMN     "storageKind" "public"."StorageKind";

-- AlterTable
ALTER TABLE "public"."SessionRSVP" ADD COLUMN     "attended" BOOLEAN;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "onboardedAt" TIMESTAMP(3),
ADD COLUMN     "profilePrivacy" "public"."ProfilePrivacy" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "public"."Mention" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaskComment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mention_userId_idx" ON "public"."Mention"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Mention_messageId_userId_key" ON "public"."Mention"("messageId", "userId");

-- CreateIndex
CREATE INDEX "TaskComment_taskId_createdAt_idx" ON "public"."TaskComment"("taskId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Mention" ADD CONSTRAINT "Mention_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mention" ADD CONSTRAINT "Mention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskComment" ADD CONSTRAINT "TaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
