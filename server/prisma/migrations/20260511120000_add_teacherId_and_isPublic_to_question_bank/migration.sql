-- AlterTable - Add missing columns to QuestionBankEntry
ALTER TABLE "QuestionBankEntry" ADD COLUMN "teacherId" TEXT,
ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex - Add index for teacherId queries
CREATE INDEX "QuestionBankEntry_teacherId_idx" ON "QuestionBankEntry"("teacherId");

-- AddForeignKey - Add relationship to TeacherProfile
ALTER TABLE "QuestionBankEntry" ADD CONSTRAINT "QuestionBankEntry_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
