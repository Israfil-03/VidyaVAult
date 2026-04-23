import {
  Board,
  Difficulty,
  QuestionSource,
  Subject,
  TestCreationMode,
  TestStatus,
} from '@prisma/client'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { prisma } from '../prisma/client.js'
import {
  ensureTeacherOwnsBatchIds,
  ensureTeacherOwnsStudentIds,
  ensureTeacherOwnsTest,
  requireTeacherId,
} from '../services/accessService.js'
import { ApiError } from '../utils/apiError.js'

const questionSchema = z.object({
  text: z.string().min(1),
  chapter: z.string().optional(),
  concept: z.string().optional(),
  difficulty: z.nativeEnum(Difficulty).default(Difficulty.MEDIUM),
  marks: z.number().int().positive().default(1),
  source: z.nativeEnum(QuestionSource).default(QuestionSource.MANUAL),
  explanation: z.string().optional(),
  options: z
    .array(
      z.object({
        text: z.string().min(1),
        isCorrect: z.boolean(),
      }),
    )
    .length(4),
})

const assignmentSchema = z
  .object({
    studentId: z.string().optional(),
    batchId: z.string().optional(),
  })
  .refine((entry) => Boolean(entry.studentId) !== Boolean(entry.batchId), {
    message: 'Provide either studentId or batchId',
  })

const createTestSchema = z.object({
  title: z.string().min(1),
  subject: z.nativeEnum(Subject),
  teacherId: z.string().optional(),
  boardTarget: z.nativeEnum(Board).optional(),
  classLevel: z.string().min(1),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  durationMinutes: z.number().int().positive(),
  status: z.nativeEnum(TestStatus).default(TestStatus.DRAFT),
  creationMode: z.nativeEnum(TestCreationMode).default(TestCreationMode.MANUAL),
  questions: z.array(questionSchema).optional(),
  assignments: z.array(assignmentSchema).optional(),
})

const updateTestSchema = createTestSchema
  .omit({
    questions: true,
    assignments: true,
    teacherId: true,
  })
  .partial()

const assignmentsBodySchema = z.object({
  assignments: z.array(assignmentSchema),
})

const resolveTeacherScope = (req: Request, bodyTeacherId?: string): string => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }

  if (req.user.role === 'teacher_admin') {
    return requireTeacherId(req.user)
  }

  if (req.user.role === 'superadmin') {
    if (!bodyTeacherId) {
      throw new ApiError('teacherId is required for superadmin actions', 400)
    }
    return bodyTeacherId
  }

  throw new ApiError('Forbidden', 403)
}

export const listTests = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }

  const query = z
    .object({
      status: z.nativeEnum(TestStatus).optional(),
      subject: z.nativeEnum(Subject).optional(),
      classLevel: z.string().optional(),
      teacherId: z.string().optional(),
    })
    .parse(req.query)

  const tests = await prisma.test.findMany({
    where: {
      status: query.status,
      subject: query.subject,
      classLevel: query.classLevel,
      teacherId:
        req.user.role === 'teacher_admin'
          ? req.user.teacherId
          : query.teacherId,
    },
    include: {
      teacher: {
        include: {
          user: {
            select: { username: true },
          },
        },
      },
      _count: {
        select: {
          questions: true,
          assignments: true,
          submissions: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    success: true,
    data: tests,
  })
}

export const getTestById = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }

  const { testId } = z.object({ testId: z.string().min(1) }).parse(req.params)

  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      questions: {
        include: {
          options: true,
        },
      },
      assignments: true,
    },
  })

  if (!test) {
    throw new ApiError('Test not found', 404)
  }

  if (req.user.role === 'teacher_admin' && req.user.teacherId !== test.teacherId) {
    throw new ApiError('Forbidden', 403)
  }

  res.json({
    success: true,
    data: test,
  })
}

export const createTest = async (req: Request, res: Response): Promise<void> => {
  const payload = createTestSchema.parse(req.body)
  const teacherId = resolveTeacherScope(req, payload.teacherId)

  if (payload.endTime <= payload.startTime) {
    throw new ApiError('endTime must be after startTime', 400)
  }

  if (payload.assignments && req.user?.role === 'teacher_admin') {
    const studentIds = payload.assignments
      .map((item) => item.studentId)
      .filter((value): value is string => Boolean(value))
    const batchIds = payload.assignments
      .map((item) => item.batchId)
      .filter((value): value is string => Boolean(value))

    await Promise.all([
      ensureTeacherOwnsStudentIds(prisma, teacherId, studentIds),
      ensureTeacherOwnsBatchIds(prisma, teacherId, batchIds),
    ])
  }

  const test = await prisma.test.create({
    data: {
      title: payload.title,
      subject: payload.subject,
      teacherId,
      boardTarget: payload.boardTarget,
      classLevel: payload.classLevel,
      startTime: payload.startTime,
      endTime: payload.endTime,
      durationMinutes: payload.durationMinutes,
      status: payload.status,
      creationMode: payload.creationMode,
      questions:
        payload.questions && payload.questions.length > 0
          ? {
              create: payload.questions.map((question) => ({
                text: question.text,
                chapter: question.chapter,
                concept: question.concept,
                difficulty: question.difficulty,
                marks: question.marks,
                source: question.source,
                explanation: question.explanation,
                options: {
                  create: question.options,
                },
              })),
            }
          : undefined,
      assignments:
        payload.assignments && payload.assignments.length > 0
          ? {
              create: payload.assignments,
            }
          : undefined,
    },
    include: {
      questions: { include: { options: true } },
      assignments: true,
    },
  })

  res.status(201).json({
    success: true,
    data: test,
  })
}

export const updateTest = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }

  const { testId } = z.object({ testId: z.string().min(1) }).parse(req.params)
  const payload = updateTestSchema.parse(req.body)

  await ensureTeacherOwnsTest(prisma, req.user, testId)

  const updated = await prisma.test.update({
    where: { id: testId },
    data: payload,
  })

  res.json({
    success: true,
    data: updated,
  })
}

export const replaceAssignments = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }

  const { testId } = z.object({ testId: z.string().min(1) }).parse(req.params)
  const { assignments } = assignmentsBodySchema.parse(req.body)

  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { id: true, teacherId: true },
  })

  if (!test) {
    throw new ApiError('Test not found', 404)
  }

  if (req.user.role === 'teacher_admin' && req.user.teacherId !== test.teacherId) {
    throw new ApiError('Forbidden', 403)
  }

  if (req.user.role === 'teacher_admin') {
    const teacherId = requireTeacherId(req.user)
    const studentIds = assignments
      .map((item) => item.studentId)
      .filter((value): value is string => Boolean(value))
    const batchIds = assignments
      .map((item) => item.batchId)
      .filter((value): value is string => Boolean(value))

    await Promise.all([
      ensureTeacherOwnsStudentIds(prisma, teacherId, studentIds),
      ensureTeacherOwnsBatchIds(prisma, teacherId, batchIds),
    ])
  }

  await prisma.$transaction(async (tx) => {
    await tx.testAssignment.deleteMany({ where: { testId } })
    if (assignments.length > 0) {
      await tx.testAssignment.createMany({
        data: assignments.map((assignment) => ({
          testId,
          studentId: assignment.studentId,
          batchId: assignment.batchId,
        })),
      })
    }
  })

  res.json({
    success: true,
    data: { message: 'Assignments updated successfully' },
  })
}

export const getTestAnalytics = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }

  const { testId } = z.object({ testId: z.string().min(1) }).parse(req.params)
  await ensureTeacherOwnsTest(prisma, req.user, testId)

  const [submissions, answers] = await Promise.all([
    prisma.submission.findMany({
      where: { testId, submittedAt: { not: null } },
      include: {
        student: {
          include: { user: true },
        },
      },
      orderBy: { scoreTotal: 'desc' },
    }),
    prisma.answer.findMany({
      where: {
        submission: { testId },
      },
      select: {
        questionId: true,
        isCorrect: true,
        marksObtained: true,
      },
    }),
  ])

  const total = submissions.length
  const averageScore =
    total === 0
      ? 0
      : submissions.reduce((sum, submission) => sum + (submission.scoreTotal ?? 0), 0) / total

  const questionAggregation = new Map<string, { marksTotal: number; correctCount: number; attempts: number }>()
  for (const answer of answers) {
    const current = questionAggregation.get(answer.questionId) ?? {
      marksTotal: 0,
      correctCount: 0,
      attempts: 0,
    }
    current.marksTotal += answer.marksObtained
    current.correctCount += answer.isCorrect ? 1 : 0
    current.attempts += 1
    questionAggregation.set(answer.questionId, current)
  }

  res.json({
    success: true,
    data: {
      totalSubmissions: total,
      averageScore: Number(averageScore.toFixed(2)),
      topPerformers: submissions.slice(0, 5).map((submission) => ({
        studentId: submission.studentId,
        username: submission.student.user.username,
        scoreTotal: submission.scoreTotal,
        maxScore: submission.maxScore,
      })),
      bottomPerformers: [...submissions]
        .reverse()
        .slice(0, 5)
        .map((submission) => ({
          studentId: submission.studentId,
          username: submission.student.user.username,
          scoreTotal: submission.scoreTotal,
          maxScore: submission.maxScore,
        })),
      questionWise: [...questionAggregation.entries()].map(([questionId, stat]) => ({
        questionId,
        averageMarks: Number((stat.marksTotal / stat.attempts).toFixed(2)),
        correctCount: stat.correctCount,
        attempts: stat.attempts,
      })),
    },
  })
}
