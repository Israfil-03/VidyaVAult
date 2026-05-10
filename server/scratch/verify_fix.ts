import { prisma } from '../src/prisma/client.js'

async function verify() {
  console.log('--- Verifying Database Schema ---')
  try {
    // Check if table exists by counting entries
    const count = await (prisma as any).questionBankEntry.count()
    console.log(`✅ Table 'QuestionBankEntry' exists. Current count: ${count}`)
    
    const optionCount = await (prisma as any).bankOption.count()
    console.log(`✅ Table 'BankOption' exists. Current count: ${optionCount}`)

    console.log('\n--- Verifying Enums ---')
    const subjects = await prisma.$queryRaw`SELECT enum_range(NULL::"Subject")`
    console.log('Subject values:', subjects)

    console.log('\n--- Verification Success ---')
  } catch (err) {
    console.error('\n❌ Verification Failed!')
    console.error('Error:', err instanceof Error ? err.message : err)
    console.log('\nPossible causes:')
    console.log('1. Database migrations not applied. Run: npx prisma migrate deploy')
    console.log('2. Prisma client not generated. Run: npx prisma generate')
  } finally {
    await prisma.$disconnect()
  }
}

verify()
