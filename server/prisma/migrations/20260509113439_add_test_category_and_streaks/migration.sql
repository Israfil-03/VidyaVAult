-- CreateEnum
CREATE TYPE "TestCategory" AS ENUM ('HOMEWORK', 'PRACTICE', 'TEST', 'UNIT_TEST');

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "lastHomeworkDate" TIMESTAMP(3),
ADD COLUMN     "streakCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "category" "TestCategory" NOT NULL DEFAULT 'TEST',
ADD COLUMN     "isDaily" BOOLEAN NOT NULL DEFAULT false;
