-- CreateTable
CREATE TABLE "QuestionBankEntry" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "subject" "Subject" NOT NULL,
    "chapter" TEXT,
    "concept" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "explanation" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionBankEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankOption" (
    "id" TEXT NOT NULL,
    "questionBankId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BankOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionBankEntry_subject_chapter_idx" ON "QuestionBankEntry"("subject", "chapter");

-- CreateIndex
CREATE INDEX "BankOption_questionBankId_idx" ON "BankOption"("questionBankId");

-- AddForeignKey
ALTER TABLE "BankOption" ADD CONSTRAINT "BankOption_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "QuestionBankEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
