import 'dotenv/config'

import { Board, Medium, PrismaClient, Subject, UserRole } from '@prisma/client'
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

  let teacherProfileId: string

  if (!existingTeacher) {
    const teacherHash = await bcrypt.hash('Teacher@123', 12)
    const teacherUser = await prisma.user.create({
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
      include: { teacherProfile: true },
    })
    teacherProfileId = teacherUser.teacherProfile!.id
  } else {
    teacherProfileId = existingTeacher.teacherProfile!.id
  }

  // Ensure 2 Batches for chem_teacher
  let batch1 = await prisma.batch.findFirst({
    where: { name: 'Organic Chemistry Alpha', teacherId: teacherProfileId },
  })
  if (!batch1) {
    batch1 = await prisma.batch.create({
      data: {
        name: 'Organic Chemistry Alpha',
        medium: Medium.ENGLISH,
        classLevel: '12',
        boardTarget: Board.CBSE,
        teacherId: teacherProfileId,
      },
    })
  }

  let batch2 = await prisma.batch.findFirst({
    where: { name: 'Inorganic Chemistry Beta', teacherId: teacherProfileId },
  })
  if (!batch2) {
    batch2 = await prisma.batch.create({
      data: {
        name: 'Inorganic Chemistry Beta',
        medium: Medium.ENGLISH,
        classLevel: '12',
        boardTarget: Board.ICSE,
        teacherId: teacherProfileId,
      },
    })
  }

  // Create 6 Students if they don't exist
  const studentPasswordHash = await bcrypt.hash('Student@123', 12)

  for (let i = 1; i <= 6; i++) {
    const batch = i <= 3 ? batch1 : batch2
    const username = `student_chem_${i}`

    const existingStudent = await prisma.user.findUnique({
      where: { username },
    })

    if (!existingStudent) {
      const studentUser = await prisma.user.create({
        data: {
          email: `student${i}.chem@vidyavault.local`,
          username,
          passwordHash: studentPasswordHash,
          role: UserRole.STUDENT,
          forcePasswordChange: true,
          studentProfile: {
            create: {
              board: batch.boardTarget ?? Board.WEST_BENGAL,
              medium: batch.medium,
              classLevel: batch.classLevel,
              rollNo: `C-2024-${100 + i}`,
              teacherLinks: {
                create: { teacherId: teacherProfileId },
              },
              batchLinks: {
                create: { batchId: batch.id },
              },
            },
          },
        },
      })
      console.log(`Created student: ${studentUser.username} in batch: ${batch.name}`)
    }
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
