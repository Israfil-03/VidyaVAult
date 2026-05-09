-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "batchNo" TEXT,
ADD COLUMN     "batchSerialNo" INTEGER,
ADD COLUMN     "isTestAccount" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "longId" TEXT,
ADD COLUMN     "overallSerial" INTEGER,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "shortId" TEXT,
ADD COLUMN     "subjects" "Subject"[],
ADD COLUMN     "year" INTEGER;

-- AlterTable
ALTER TABLE "Test" ALTER COLUMN "category" SET DEFAULT 'WEEKLY_TEST';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isTestAccount" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RegistrationRequest" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "subjects" "Subject"[],
    "classLevel" TEXT NOT NULL,
    "medium" "Medium" NOT NULL,
    "phone" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistrationRequest_phone_status_idx" ON "RegistrationRequest"("phone", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_overallSerial_key" ON "StudentProfile"("overallSerial");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_shortId_key" ON "StudentProfile"("shortId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_longId_key" ON "StudentProfile"("longId");
