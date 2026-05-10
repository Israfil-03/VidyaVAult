import { PrismaClient, Subject, Difficulty } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Testing question creation...')
    const question = await prisma.questionBankEntry.create({
      data: {
        text: 'Test Question',
        subject: Subject.PHYSICS,
        difficulty: Difficulty.MEDIUM,
        options: {
          create: [
            { text: 'Option 1', isCorrect: true },
            { text: 'Option 2', isCorrect: false },
          ],
        },
      },
      include: {
        options: true,
      },
    })
    console.log('Successfully created question:', question)

    console.log('Testing question update...')
    const updated = await prisma.$transaction(async (tx) => {
      await tx.bankOption.deleteMany({ where: { questionBankId: question.id } })
      return tx.questionBankEntry.update({
        where: { id: question.id },
        data: {
          text: 'Updated Question',
          options: {
            create: [
              { text: 'Updated Option 1', isCorrect: false },
              { text: 'Updated Option 2', isCorrect: true },
            ],
          },
        },
        include: {
          options: true,
        },
      })
    })
    console.log('Successfully updated question:', updated)

    // Cleanup
    await prisma.questionBankEntry.delete({ where: { id: question.id } })
    console.log('Successfully deleted test question.')

  } catch (error) {
    console.error('Error occurred:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
