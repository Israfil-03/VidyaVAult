import {
  Board,
  Difficulty,
  QuestionSource,
  Subject,
  TestCategory,
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
  imageUrl: z.string().url().or(z.literal('')).nullable().optional(),
  options: z
    .array(
      z.object({
        text: z.string().min(1),
        imageUrl: z.string().url().or(z.literal('')).nullable().optional(),
        isCorrect: z.boolean(),
      }),
    )
    .min(2)
    .max(10),
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
  category: z.nativeEnum(TestCategory).default(TestCategory.WEEKLY_TEST),
  isDaily: z.boolean().default(false),
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
      category: z.nativeEnum(TestCategory).optional(),
      subject: z.nativeEnum(Subject).optional(),
      classLevel: z.string().optional(),
      teacherId: z.string().optional(),
    })
    .parse(req.query)

  const tests = await prisma.test.findMany({
    where: {
      status: query.status,
      category: query.category,
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
      category: payload.category,
      isDaily: payload.isDaily,
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
                imageUrl: question.imageUrl,
                options: {
                  create: question.options.map(opt => ({
                    text: opt.text,
                    isCorrect: opt.isCorrect,
                    imageUrl: opt.imageUrl
                  })),
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
        averageMarks: stat.attempts === 0 ? 0 : Number((stat.marksTotal / stat.attempts).toFixed(2)),
        correctCount: stat.correctCount,
        attempts: stat.attempts,
      })),
    },
  })
}

export const getDetailedSubmissions = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }

  const { testId } = z.object({ testId: z.string().min(1) }).parse(req.params)
  await ensureTeacherOwnsTest(prisma, req.user, testId)

  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      assignments: {
        include: {
          student: { include: { user: true } },
          batch: {
            include: {
              batchStudents: {
                include: {
                  student: { include: { user: true } },
                },
              },
            },
          },
        },
      },
      submissions: {
        include: {
          student: { include: { user: true } },
          answers: {
            include: {
              question: true,
              selectedOption: true,
            },
          },
        },
      },
    },
  })

  if (!test) {
    throw new ApiError('Test not found', 404)
  }

  // Flatten all assigned students
  const assignedStudentMap = new Map<string, { id: string; username: string; email: string | null }>()

  for (const assignment of test.assignments) {
    if (assignment.student) {
      assignedStudentMap.set(assignment.student.id, {
        id: assignment.student.id,
        username: assignment.student.user.username,
        email: assignment.student.user.email,
      })
    }
    if (assignment.batch) {
      for (const bs of assignment.batch.batchStudents) {
        assignedStudentMap.set(bs.student.id, {
          id: bs.student.id,
          username: bs.student.user.username,
          email: bs.student.user.email,
        })
      }
    }
  }

  const submissions = test.submissions.map((s) => ({
    studentId: s.studentId,
    username: s.student.user.username,
    status: s.submittedAt ? 'SUBMITTED' : 'IN_PROGRESS',
    submittedAt: s.submittedAt,
    score: s.scoreTotal,
    maxScore: s.maxScore,
    answers: s.answers.map((a) => ({
      questionText: a.question.text,
      selectedOption: a.selectedOption?.text,
      isCorrect: a.isCorrect,
      marks: a.marksObtained,
    })),
  }))

  const submissionMap = new Map(submissions.map((s) => [s.studentId, s]))

  const report = Array.from(assignedStudentMap.values()).map((student) => {
    const submission = submissionMap.get(student.id)
    return {
      studentId: student.id,
      username: student.username,
      email: student.email,
      status: submission ? submission.status : 'NOT_STARTED',
      submittedAt: submission?.submittedAt || null,
      score: submission?.score || 0,
      maxScore: submission?.maxScore || 0,
      answers: submission?.answers || [],
    }
  })

  res.json({
    success: true,
    data: report,
  })
}

export const deleteTest = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }

  const { testId } = z.object({ testId: z.string().min(1) }).parse(req.params)

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

  await prisma.test.delete({
    where: { id: testId },
  })

  res.json({
    success: true,
    data: { message: 'Test deleted successfully' },
  })
}
