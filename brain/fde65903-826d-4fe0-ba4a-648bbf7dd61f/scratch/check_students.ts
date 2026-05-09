import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const count = await prisma.studentProfile.count()
  console.log('Student count:', count)
  
  const students = await prisma.studentProfile.findMany({
    include: { user: true }
  })
  
  students.forEach(s => {
    console.log(`Student: ${s.user.username}, ID: ${s.id}`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
