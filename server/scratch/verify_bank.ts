import { prisma } from '../src/prisma/client.js'

async function verify() {
  console.log('--- Question Bank Verification ---')
  
  try {
    // 1. Check if model exists in client
    if (!prisma.questionBankEntry) {
      console.error('FAILED: prisma.questionBankEntry is still undefined. Run "npx prisma generate"!')
      return
    }
    console.log('SUCCESS: prisma.questionBankEntry is defined.')

    // 2. Try to fetch
    const count = await prisma.questionBankEntry.count()
    console.log(`Current Bank Size: ${count}`)

    // 3. Verify Fields
    const sample = await prisma.questionBankEntry.findFirst({
      include: { options: true }
    })
    
    if (sample) {
      console.log('Sample Question found:')
      console.log(`- Text: ${sample.text}`)
      console.log(`- Subject: ${sample.subject}`)
      console.log(`- isPublic: ${sample.isPublic}`)
      console.log(`- teacherId: ${sample.teacherId ?? 'None'}`)
      console.log(`- Options Count: ${sample.options.length}`)
    } else {
      console.log('No questions in bank yet. Try adding one from the UI!')
    }

  } catch (error) {
    console.error('ERROR during verification:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verify()
