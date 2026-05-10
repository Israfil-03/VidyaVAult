import { prisma } from './prisma/client.js'
import { Subject, Difficulty } from '@prisma/client'

async function check() {
  try {
    const q = await prisma.questionBankEntry.create({
      data: {
        text: 'Test Question',
        subject: Subject.PHYSICS,
        difficulty: Difficulty.MEDIUM,
        options: {
          create: [
            { text: 'Opt 1', isCorrect: true },
            { text: 'Opt 2', isCorrect: false }
          ]
        }
      }
    })
    console.log('Created:', q.id)
    await prisma.questionBankEntry.delete({ where: { id: q.id } })
    console.log('Deleted successfully')
  } catch (err) {
    console.error('Error during create test:', err)
  }
  process.exit(0)
}

check()
