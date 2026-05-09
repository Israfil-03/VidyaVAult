import { Board, Medium, Subject, UserRole } from '@prisma/client'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { signJwt } from '../auth/jwt.js'
import { hashPassword, verifyPassword } from '../auth/password.js'
import { prisma } from '../prisma/client.js'
import { userRoleToTokenRole } from '../types/auth.js'
import { ApiError } from '../utils/apiError.js'

const loginSchema = z.object({
  identity: z.string().min(1),
  password: z.string().min(1),
})

const registerTeacherSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(8),
  subject: z.nativeEnum(Subject),
})

const registerStudentSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3),
  password: z.string().min(8),
  board: z.nativeEnum(Board),
  medium: z.nativeEnum(Medium),
  classLevel: z.string().min(1),
  rollNo: z.string().optional(),
  teacherIds: z.array(z.string().min(1)).optional(),
  batchIds: z.array(z.string().min(1)).optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

const resetPasswordSchema = z.object({
  studentId: z.string().min(1),
  newPassword: z.string().min(8),
})

const registrationRequestSchema = z.object({
  fullName: z.string().min(1),
  subjects: z.array(z.nativeEnum(Subject)).min(1),
  classLevel: z.string().min(1),
  medium: z.nativeEnum(Medium),
  phone: z.string().min(10),
})

const setupProfileSchema = z.object({
  shortId: z.string().min(1),
  password: z.string().min(8),
})

const serializeUser = (
  user: {
    id: string
    email: string | null
    username: string
    role: UserRole
    forcePasswordChange: boolean
    teacherProfile?: { id: string } | null
    studentProfile?: { 
      id: string
      shortId: string | null
      longId: string | null
      subjects: Subject[]
    } | null
  },
) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  role: userRoleToTokenRole(user.role),
  teacherId: user.teacherProfile?.id,
  studentId: user.studentProfile?.id,
  shortId: user.studentProfile?.shortId,
  longId: user.studentProfile?.longId,
  subjects: user.studentProfile?.subjects,
  forcePasswordChange: user.forcePasswordChange,
})

export const login = async (req: Request, res: Response): Promise<void> => {
  const { identity, password } = loginSchema.parse(req.body)

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: identity }, { email: identity }],
    },
    include: {
      teacherProfile: { select: { id: true } },
      studentProfile: { 
        select: { 
          id: true,
          shortId: true,
          longId: true,
          subjects: true
        } 
      },
    },
  })

  if (!user) {
    throw new ApiError('Invalid credentials', 401)
  }

  const validPassword = await verifyPassword(password, user.passwordHash)
  if (!validPassword) {
    throw new ApiError('Invalid credentials', 401)
  }

  const payload = {
    userId: user.id,
    role: userRoleToTokenRole(user.role),
    teacherId: user.teacherProfile?.id,
    studentId: user.studentProfile?.id,
    forcePasswordChange: user.forcePasswordChange,
  } as const

  const token = signJwt(payload)
  // TODO: Introduce refresh-token rotation for long-lived sessions in production.

  res.json({
    success: true,
    data: {
      token,
      user: serializeUser(user),
    },
  })
}

export const me = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: {
      teacherProfile: { select: { id: true } },
      studentProfile: { 
        select: { 
          id: true,
          shortId: true,
          longId: true,
          subjects: true
        } 
      },
    },
  })

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  res.json({
    success: true,
    data: {
      user: serializeUser(user),
    },
  })
}

export const registerTeacher = async (req: Request, res: Response): Promise<void> => {
  const body = registerTeacherSchema.parse(req.body)

  const passwordHash = await hashPassword(body.password)

  const user = await prisma.user.create({
    data: {
      email: body.email,
      username: body.username,
      passwordHash,
      role: UserRole.TEACHER_ADMIN,
      teacherProfile: {
        create: {
          subject: body.subject,
        },
      },
    },
    include: {
      teacherProfile: true,
      studentProfile: true,
    },
  })

  res.status(201).json({
    success: true,
    data: { user: serializeUser(user) },
  })
}

export const registerStudent = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }

  const body = registerStudentSchema.parse(req.body)

  const scopedTeacherIds =
    req.user.role === 'teacher_admin'
      ? [req.user.teacherId]
      : body.teacherIds && body.teacherIds.length > 0
        ? body.teacherIds
        : []

  const teacherIds = scopedTeacherIds.filter((value): value is string => Boolean(value))

  if (teacherIds.length === 0) {
    throw new ApiError('At least one teacher must be linked to this student', 400)
  }

  const missingTeachers = await prisma.teacherProfile.findMany({
    where: { id: { in: teacherIds } },
    select: { id: true },
  })

  if (missingTeachers.length !== new Set(teacherIds).size) {
    throw new ApiError('One or more teachers are invalid', 400)
  }

  const passwordHash = await hashPassword(body.password)

  const user = await prisma.user.create({
    data: {
      email: body.email,
      username: body.username,
      passwordHash,
      role: UserRole.STUDENT,
      forcePasswordChange: true,
      studentProfile: {
        create: {
          board: body.board,
          medium: body.medium,
          classLevel: body.classLevel,
          rollNo: body.rollNo,
          teacherLinks: {
            createMany: {
              data: teacherIds.map((teacherId) => ({ teacherId })),
              skipDuplicates: true,
            },
          },
        },
      },
    },
    include: {
      teacherProfile: true,
      studentProfile: true,
    },
  })

  if (body.batchIds && body.batchIds.length > 0 && user.studentProfile) {
    await prisma.batchStudent.createMany({
      data: body.batchIds.map((batchId) => ({
        batchId,
        studentId: user.studentProfile!.id,
      })),
      skipDuplicates: true,
    })
  }

  res.status(201).json({
    success: true,
    data: { user: serializeUser(user) },
  })
}

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }

  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body)

  const user = await prisma.user.findUnique({ where: { id: req.user.userId } })

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  const validPassword = await verifyPassword(currentPassword, user.passwordHash)
  if (!validPassword) {
    throw new ApiError('Current password is incorrect', 400)
  }

  const passwordHash = await hashPassword(newPassword)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      forcePasswordChange: false,
    },
  })

  res.json({
    success: true,
    data: { message: 'Password changed successfully' },
  })
}

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { studentId, newPassword } = resetPasswordSchema.parse(req.body)

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      user: true,
      teacherLinks: true,
    },
  })

  if (!student) {
    throw new ApiError('Student not found', 404)
  }

  if (req.user?.role === 'teacher_admin') {
    const ownsStudent = student.teacherLinks.some((link) => link.teacherId === req.user!.teacherId)
    if (!ownsStudent) {
      throw new ApiError('You cannot reset password for this student', 403)
    }
  }

  const passwordHash = await hashPassword(newPassword)

  await prisma.user.update({
    where: { id: student.userId },
    data: {
      passwordHash,
      forcePasswordChange: true,
    },
  })

  res.json({
    success: true,
    data: { message: 'Student password reset successfully' },
  })
}

export const submitRegistration = async (req: Request, res: Response): Promise<void> => {
  const body = registrationRequestSchema.parse(req.body)

  // Check if a pending or approved request exists for this phone
  const existingRequest = await prisma.registrationRequest.findFirst({
    where: {
      phone: body.phone,
      status: { in: ['PENDING', 'APPROVED'] },
    },
  })

  if (existingRequest) {
    throw new ApiError('A registration request for this phone number already exists.', 400)
  }

  const request = await prisma.registrationRequest.create({
    data: {
      fullName: body.fullName,
      subjects: body.subjects,
      classLevel: body.classLevel,
      medium: body.medium,
      phone: body.phone,
      year: new Date().getFullYear(),
      status: 'PENDING',
    },
  })

  res.status(201).json({
    success: true,
    data: request,
  })
}

export const setupStudentProfile = async (req: Request, res: Response): Promise<void> => {
  const { shortId, password } = setupProfileSchema.parse(req.body)

  const user = await prisma.user.findFirst({
    where: {
      username: shortId,
      passwordHash: 'PENDING_SETUP',
      role: UserRole.STUDENT,
    },
  })

  if (!user) {
    throw new ApiError('Invalid ID or profile already set up.', 400)
  }

  const passwordHash = await hashPassword(password)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      forcePasswordChange: false,
    },
  })

  res.json({
    success: true,
    data: { message: 'Profile created successfully! You can now log in.' },
  })
}
