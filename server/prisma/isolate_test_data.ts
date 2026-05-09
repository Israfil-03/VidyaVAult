import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Flagging existing data as test accounts ---')

  // 1. Find the test teacher 'chem_teacher'
  const chemTeacher = await prisma.user.findFirst({
    where: { username: 'chem_teacher' }
  })

  if (chemTeacher) {
    console.log(`Found teacher ${chemTeacher.username}, flagging as test...`)
    await prisma.user.update({
      where: { id: chemTeacher.id },
      data: { isTestAccount: true }
    })
  }

  // 2. Flag all students who are currently in the system
  // Since all existing students are considered "test" students for this isolation,
  // we flag all existing STUDENT role users.
  const updateStudents = await prisma.user.updateMany({
    where: { role: 'STUDENT' },
    data: { isTestAccount: true }
  })
  console.log(`Flagged ${updateStudents.count} students as test accounts.`)

  // 3. Flag existing student profiles
  const updateProfiles = await prisma.studentProfile.updateMany({
    data: { isTestAccount: true }
  })
  console.log(`Flagged ${updateProfiles.count} student profiles as test accounts.`)

  console.log('--- Isolation complete ---')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
