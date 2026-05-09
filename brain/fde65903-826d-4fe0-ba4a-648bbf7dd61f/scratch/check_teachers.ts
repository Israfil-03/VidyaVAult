import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const teachers = await prisma.teacherProfile.findMany({
    include: { user: true }
  })
  console.log('Teachers:', teachers.map(t => ({ username: t.user.username, id: t.id, subject: t.subject })))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
