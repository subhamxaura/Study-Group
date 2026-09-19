-- CreateTable
CREATE TABLE "public"."NoteVersion" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "kind" "public"."NoteKind" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "editorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteVersion_noteId_version_idx" ON "public"."NoteVersion"("noteId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "NoteVersion_noteId_version_key" ON "public"."NoteVersion"("noteId", "version");

-- AddForeignKey
ALTER TABLE "public"."NoteVersion" ADD CONSTRAINT "NoteVersion_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "public"."Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NoteVersion" ADD CONSTRAINT "NoteVersion_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
