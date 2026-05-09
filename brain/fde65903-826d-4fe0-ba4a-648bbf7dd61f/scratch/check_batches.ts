import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const batches = await prisma.batch.findMany({
    include: { teacher: { include: { user: true } } }
  })
  console.log('Batches:', batches.map(b => ({ name: b.name, teacher: b.teacher.user.username })))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
