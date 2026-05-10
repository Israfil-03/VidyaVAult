import { prisma } from './prisma/client.js'

async function check() {
  console.log('Prisma keys:', Object.keys(prisma))
  console.log('QuestionBankEntry:', (prisma as any).questionBankEntry)
  process.exit(0)
}

check()
