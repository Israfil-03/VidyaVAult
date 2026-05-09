import { Board, Medium, Subject, UserRole } from '@prisma/client'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { hashPassword } from '../auth/password.js'
import { prisma } from '../prisma/client.js'
import { userRoleToTokenRole } from '../types/auth.js'
import { ApiError } from '../utils/apiError.js'

const resetTeacherPasswordSchema = z.object({
  teacherId: z.string().min(1),
  newPassword: z.string().min(8),
})

const createAdminSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3),
  password: z.string().min(8),
})

const updateRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
  subject: z.nativeEnum(Subject).optional(),
  board: z.nativeEnum(Board).optional(),
  medium: z.nativeEnum(Medium).optional(),
  classLevel: z.string().optional(),
})

export const getGlobalStats = async (_req: Request, res: Response): Promise<void> => {
  const [teacherCount, studentCount, testCount, submissionCount, rewardCycleCount] = await Promise.all([
    prisma.user.count({ where: { role: UserRole.TEACHER_ADMIN } }),
    prisma.user.count({ where: { role: UserRole.STUDENT } }),
    prisma.test.count(),
    prisma.submission.count(),
    prisma.rewardCycle.count(),
  ])

  res.json({
    success: true,
    data: {
      teacherCount,
      studentCount,
      testCount,
      submissionCount,
      rewardCycleCount,
    },
  })
}

export const listTeachers = async (_req: Request, res: Response): Promise<void> => {
  const teachers = await prisma.teacherProfile.findMany({
    include: {
      user: true,
      _count: {
        select: {
          teacherStudents: true,
          tests: true,
          batches: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  res.json({
    success: true,
    data: teachers.map((teacher) => ({
      id: teacher.id,
      subject: teacher.subject,
      user: {
        id: teacher.user.id,
        email: teacher.user.email,
        username: teacher.user.username,
        role: userRoleToTokenRole(teacher.user.role),
      },
      counts: teacher._count,
    })),
  })
}

export const resetTeacherPassword = async (req: Request, res: Response): Promise<void> => {
  const { teacherId, newPassword } = resetTeacherPasswordSchema.parse(req.body)

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    include: { user: true },
  })

  if (!teacher) {
    throw new ApiError('Teacher not found', 404)
  }

  const passwordHash = await hashPassword(newPassword)

  await prisma.user.update({
    where: { id: teacher.userId },
    data: {
      passwordHash,
      forcePasswordChange: true,
    },
  })

  res.json({
    success: true,
    data: { message: 'Teacher password reset successfully' },
  })
}

export const createAdmin = async (req: Request, res: Response): Promise<void> => {
  const body = createAdminSchema.parse(req.body)

  const passwordHash = await hashPassword(body.password)

  const user = await prisma.user.create({
    data: {
      email: body.email,
      username: body.username,
      passwordHash,
      role: UserRole.INSTITUTE_ADMIN,
    },
  })

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: userRoleToTokenRole(user.role),
      },
    },
  })
}

export const listAdmins = async (_req: Request, res: Response): Promise<void> => {
  const admins = await prisma.user.findMany({
    where: { role: UserRole.INSTITUTE_ADMIN },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  res.json({
    success: true,
    data: admins.map((admin) => ({
      ...admin,
      role: userRoleToTokenRole(admin.role),
    })),
  })
}

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  const { userId } = z.object({ userId: z.string().min(1) }).parse(req.params)
  const body = updateRoleSchema.parse(req.body)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      teacherProfile: true,
      studentProfile: true,
    },
  })

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { role: body.role },
    })

    if (body.role === UserRole.TEACHER_ADMIN && !user.teacherProfile) {
      await tx.teacherProfile.create({
        data: {
          userId,
          subject: body.subject ?? Subject.CHEMISTRY,
        },
      })
    }

    if (body.role === UserRole.STUDENT && !user.studentProfile) {
      await tx.studentProfile.create({
        data: {
          userId,
          board: body.board ?? Board.WEST_BENGAL,
          medium: body.medium ?? Medium.ENGLISH,
          classLevel: body.classLevel ?? '10',
        },
      })
    }
  })

  res.json({
    success: true,
    data: { message: 'User role updated successfully' },
  })
}

export const listStudents = async (_req: Request, res: Response): Promise<void> => {
  const students = await prisma.studentProfile.findMany({
    include: {
      user: true,
      _count: {
        select: {
          submissions: true,
          batchLinks: true,
          teacherLinks: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  res.json({
    success: true,
    data: students.map((student) => ({
      id: student.id,
      board: student.board,
      medium: student.medium,
      classLevel: student.classLevel,
      rollNo: student.rollNo,
      user: {
        id: student.user.id,
        email: student.user.email,
        username: student.user.username,
        role: userRoleToTokenRole(student.user.role),
      },
      counts: student._count,
    })),
  })
}

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const { userId } = z.object({ userId: z.string().min(1) }).parse(req.params)

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  if (user.role === UserRole.SUPERADMIN) {
    throw new ApiError('Cannot delete a superadmin account', 403)
  }

  await prisma.user.delete({
    where: { id: userId },
  })

  res.json({
    success: true,
    data: { message: 'User account and associated data removed successfully' },
  })
}
