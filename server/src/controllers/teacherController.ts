import { Board, Medium, TestStatus } from '@prisma/client'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { prisma } from '../prisma/client.js'
import { requireTeacherId } from '../services/accessService.js'
import { ApiError } from '../utils/apiError.js'

const createBatchSchema = z.object({
  name: z.string().min(1),
  medium: z.nativeEnum(Medium),
  classLevel: z.string().min(1),
  boardTarget: z.nativeEnum(Board).optional(),
})

const updateBatchSchema = createBatchSchema.partial()

const batchStudentSchema = z.object({
  studentId: z.string().min(1),
})

export const getTeacherOverview = async (req: Request, res: Response): Promise<void> => {
  const teacherId = requireTeacherId(req.user)
  const now = new Date()

  const [studentCount, upcomingTests, activeTests, recentSubmissions] = await Promise.all([
    prisma.teacherStudent.count({ where: { teacherId } }),
    prisma.test.count({
      where: {
        teacherId,
        status: TestStatus.PUBLISHED,
        startTime: { gt: now },
      },
    }),
    prisma.test.count({
      where: {
        teacherId,
        status: TestStatus.PUBLISHED,
        startTime: { lte: now },
        endTime: { gte: now },
      },
    }),
    prisma.submission.count({
      where: {
        test: { teacherId },
        submittedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  res.json({
    success: true,
    data: {
      studentCount,
      upcomingTests,
      activeTests,
      recentSubmissions,
    },
  })
}

export const listTeacherStudents = async (req: Request, res: Response): Promise<void> => {
  const teacherId = requireTeacherId(req.user)

  const links = await prisma.teacherStudent.findMany({
    where: { teacherId },
    include: {
      student: {
        include: {
          user: true,
          batchLinks: {
            include: {
              batch: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  res.json({
    success: true,
    data: links.map((link) => ({
      id: link.student.id,
      username: link.student.user.username,
      email: link.student.user.email,
      board: link.student.board,
      medium: link.student.medium,
      classLevel: link.student.classLevel,
      rollNo: link.student.rollNo,
      batchIds: link.student.batchLinks.map((item) => item.batchId),
    })),
  })
}

export const listTeacherBatches = async (req: Request, res: Response): Promise<void> => {
  const teacherId = requireTeacherId(req.user)

  const batches = await prisma.batch.findMany({
    where: { teacherId },
    include: {
      _count: {
        select: { batchStudents: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  res.json({
    success: true,
    data: batches,
  })
}

export const createBatch = async (req: Request, res: Response): Promise<void> => {
  const teacherId = requireTeacherId(req.user)
  const payload = createBatchSchema.parse(req.body)

  const batch = await prisma.batch.create({
    data: {
      ...payload,
      teacherId,
    },
  })

  res.status(201).json({
    success: true,
    data: batch,
  })
}

export const updateBatch = async (req: Request, res: Response): Promise<void> => {
  const teacherId = requireTeacherId(req.user)
  const { batchId } = z.object({ batchId: z.string().min(1) }).parse(req.params)
  const payload = updateBatchSchema.parse(req.body)

  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      teacherId,
    },
  })

  if (!batch) {
    throw new ApiError('Batch not found', 404)
  }

  const updated = await prisma.batch.update({
    where: { id: batchId },
    data: payload,
  })

  res.json({
    success: true,
    data: updated,
  })
}

export const addStudentToBatch = async (req: Request, res: Response): Promise<void> => {
  const teacherId = requireTeacherId(req.user)
  const { batchId } = z.object({ batchId: z.string().min(1) }).parse(req.params)
  const { studentId } = batchStudentSchema.parse(req.body)

  const [batch, teacherStudent] = await Promise.all([
    prisma.batch.findFirst({
      where: { id: batchId, teacherId },
      select: { id: true },
    }),
    prisma.teacherStudent.findFirst({
      where: { teacherId, studentId },
      select: { id: true },
    }),
  ])

  if (!batch) {
    throw new ApiError('Batch not found in your scope', 404)
  }

  if (!teacherStudent) {
    throw new ApiError('Student does not belong to your scope', 403)
  }

  await prisma.batchStudent.upsert({
    where: {
      batchId_studentId: {
        batchId,
        studentId,
      },
    },
    update: {},
    create: {
      batchId,
      studentId,
    },
  })

  res.json({
    success: true,
    data: { message: 'Student assigned to batch successfully' },
  })
}

export const removeStudentFromBatch = async (req: Request, res: Response): Promise<void> => {
  const teacherId = requireTeacherId(req.user)
  const { batchId, studentId } = z
    .object({
      batchId: z.string().min(1),
      studentId: z.string().min(1),
    })
    .parse(req.params)

  const batch = await prisma.batch.findFirst({
    where: { id: batchId, teacherId },
    select: { id: true },
  })

  if (!batch) {
    throw new ApiError('Batch not found in your scope', 404)
  }

  await prisma.batchStudent.deleteMany({
    where: {
      batchId,
      studentId,
    },
  })

  res.json({
    success: true,
    data: { message: 'Student removed from batch successfully' },
  })
}

export const listTeacherRewardCycles = async (req: Request, res: Response): Promise<void> => {
  const teacherId = requireTeacherId(req.user)

  const cycles = await prisma.rewardCycle.findMany({
    where: { teacherId },
    include: {
      results: {
        include: {
          batch: true,
        },
      },
    },
    orderBy: { periodStart: 'desc' },
  })

  res.json({
    success: true,
    data: cycles,
  })
}
