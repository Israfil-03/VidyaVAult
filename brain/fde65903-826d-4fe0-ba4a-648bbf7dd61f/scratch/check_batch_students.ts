import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const batchStudents = await prisma.batchStudent.findMany({
    include: {
      batch: true,
      student: { include: { user: true } }
    }
  })
  
  const grouped: Record<string, string[]> = {}
  batchStudents.forEach(bs => {
    const batchName = bs.batch.name
    if (!grouped[batchName]) grouped[batchName] = []
    grouped[batchName].push(bs.student.user.username)
  })
  
  console.log('Batch Students:', grouped)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
