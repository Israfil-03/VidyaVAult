import 'dotenv/config'

import { PrismaClient, Subject, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SUPERADMIN_EMAIL ?? 'israfilhoque523@gmail.com'
  const password = process.env.SUPERADMIN_PASSWORD ?? 'Israfil@860974'
  const username = process.env.SUPERADMIN_USERNAME ?? 'superadmin'

  const passwordHash = await bcrypt.hash(password, 12)

  const superadmin = await prisma.user.upsert({
    where: { username },
    create: {
      email,
      username,
      passwordHash,
      role: UserRole.SUPERADMIN,
    },
    update: {
      email,
      passwordHash,
      role: UserRole.SUPERADMIN,
    },
  })

  const existingTeacher = await prisma.user.findFirst({
    where: { username: 'chem_teacher' },
    include: { teacherProfile: true },
  })

  if (!existingTeacher) {
    const teacherHash = await bcrypt.hash('Teacher@123', 12)
    await prisma.user.create({
      data: {
        email: 'chemistry.teacher@vidyavault.local',
        username: 'chem_teacher',
        passwordHash: teacherHash,
        role: UserRole.TEACHER_ADMIN,
        teacherProfile: {
          create: {
            subject: Subject.CHEMISTRY,
          },
        },
      },
    })
  }

  console.log(`Seed completed. Superadmin username: ${superadmin.username}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
