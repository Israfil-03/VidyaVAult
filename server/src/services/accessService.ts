import type { PrismaClient } from '@prisma/client'

import type { AuthTokenPayload } from '../types/auth.js'
import { ApiError } from '../utils/apiError.js'

export const canAccessTeacherResource = (
  actor: Pick<AuthTokenPayload, 'role' | 'teacherId'>,
  resourceTeacherId: string,
): boolean => {
  if (actor.role === 'superadmin') {
    return true
  }

  return actor.role === 'teacher_admin' && actor.teacherId === resourceTeacherId
}

export const requireTeacherId = (user?: AuthTokenPayload): string => {
  if (!user || user.role !== 'teacher_admin' || !user.teacherId) {
    throw new ApiError('Teacher scope is required', 403)
  }
  return user.teacherId
}

export const ensureTeacherOwnsStudentIds = async (
  prisma: PrismaClient,
  teacherId: string,
  studentIds: string[],
): Promise<void> => {
  if (studentIds.length === 0) {
    return
  }

  const links = await prisma.teacherStudent.findMany({
    where: { teacherId, studentId: { in: studentIds } },
    select: { studentId: true },
  })

  if (links.length !== new Set(studentIds).size) {
    throw new ApiError('One or more students are outside your ownership scope', 403)
  }
}

export const ensureTeacherOwnsBatchIds = async (
  prisma: PrismaClient,
  teacherId: string,
  batchIds: string[],
): Promise<void> => {
  if (batchIds.length === 0) {
    return
  }

  const batches = await prisma.batch.findMany({
    where: { id: { in: batchIds }, teacherId },
    select: { id: true },
  })

  if (batches.length !== new Set(batchIds).size) {
    throw new ApiError('One or more batches are outside your ownership scope', 403)
  }
}

export const ensureTeacherOwnsTest = async (
  prisma: PrismaClient,
  actor: AuthTokenPayload,
  testId: string,
): Promise<void> => {
  if (actor.role === 'superadmin') {
    return
  }

  const teacherId = requireTeacherId(actor)
  const test = await prisma.test.findFirst({
    where: {
      id: testId,
      teacherId,
    },
    select: { id: true },
  })

  if (!test) {
    throw new ApiError('Test not found in your ownership scope', 404)
  }
}
