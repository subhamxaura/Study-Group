-- CreateTable
CREATE TABLE "public"."FocusRoom" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "groupId" TEXT,
    "subject" TEXT NOT NULL,
    "goal" TEXT,
    "durationMin" INTEGER NOT NULL,
    "taskId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'LIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "pausedAtMs" INTEGER,
    "pausedTotalMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FocusRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FocusRoomParticipant" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "presence" TEXT NOT NULL DEFAULT 'FOCUSING',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FocusRoomParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuizAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "totalQuestions" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "answersJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FocusRoom_status_endsAt_idx" ON "public"."FocusRoom"("status", "endsAt");

-- CreateIndex
CREATE INDEX "FocusRoom_groupId_status_idx" ON "public"."FocusRoom"("groupId", "status");

-- CreateIndex
CREATE INDEX "FocusRoomParticipant_userId_lastSeenAt_idx" ON "public"."FocusRoomParticipant"("userId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "FocusRoomParticipant_roomId_userId_key" ON "public"."FocusRoomParticipant"("roomId", "userId");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_createdAt_idx" ON "public"."QuizAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_subject_idx" ON "public"."QuizAttempt"("userId", "subject");

-- AddForeignKey
ALTER TABLE "public"."FocusRoom" ADD CONSTRAINT "FocusRoom_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FocusRoom" ADD CONSTRAINT "FocusRoom_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FocusRoomParticipant" ADD CONSTRAINT "FocusRoomParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."FocusRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FocusRoomParticipant" ADD CONSTRAINT "FocusRoomParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
