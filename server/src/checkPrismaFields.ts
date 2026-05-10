import { prisma } from './prisma/client.js'

async function check() {
  const dmmf = (prisma as any)._runtimeDataModel
  const model = dmmf.models.QuestionBankEntry
  console.log('QuestionBankEntry fields:', model.fields.map((f: any) => f.name))
  process.exit(0)
}

check()
