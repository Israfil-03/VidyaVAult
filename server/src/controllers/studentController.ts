import { TestCategory, TestStatus } from '@prisma/client'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { prisma } from '../prisma/client.js'
import { analysePerformance } from '../services/aiService.js'
import { ApiError } from '../utils/apiError.js'

const answerInputSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedOptionId: z.string().optional(),
    }),
  ),
})

const statusSchema = z.enum(['active', 'upcoming', 'completed']).optional()

const requireStudentId = (req: Request): string => {
  if (!req.user || req.user.role !== 'student' || !req.user.studentId) {
    throw new ApiError('Student authentication required', 403)
  }
  return req.user.studentId
}

const getAssignedTestIds = async (studentId: string): Promise<string[]> => {
  const batchLinks = await prisma.batchStudent.findMany({
    where: { studentId },
    select: { batchId: true },
  })
  const batchIds = batchLinks.map((link) => link.batchId)

  const assignments = await prisma.testAssignment.findMany({
    where: {
      OR: [{ studentId }, ...(batchIds.length > 0 ? [{ batchId: { in: batchIds } }] : [])],
    },
    select: { testId: true },
  })

  return [...new Set(assignments.map((assignment) => assignment.testId))]
}

export const getStudentOverview = async (req: Request, res: Response): Promise<void> => {
  const studentId = requireStudentId(req)
  const now = new Date()
  const assignedTestIds = await getAssignedTestIds(studentId)

  const [active, upcoming, completed, activeHomework, studentProfile] = await Promise.all([
    prisma.test.count({
      where: {
        id: { in: assignedTestIds },
        status: TestStatus.PUBLISHED,
        category: { in: [TestCategory.WEEKLY_TEST, TestCategory.MONTHLY_TEST] },
        startTime: { lte: now },
        endTime: { gte: now },
      },
    }),
    prisma.test.count({
      where: {
        id: { in: assignedTestIds },
        status: TestStatus.PUBLISHED,
        category: { in: [TestCategory.WEEKLY_TEST, TestCategory.MONTHLY_TEST] },
        startTime: { gt: now },
      },
    }),
    prisma.submission.count({
      where: {
        studentId,
        submittedAt: { not: null },
      },
    }),
    prisma.test.count({
      where: {
        id: { in: assignedTestIds },
        status: TestStatus.PUBLISHED,
        category: TestCategory.HOMEWORK,
        startTime: { lte: now },
        endTime: { gte: now },
      },
    }),
    prisma.studentProfile.findUnique({
      where: { id: studentId },
      select: { streakCount: true, lastHomeworkDate: true },
    }),
  ])

  res.json({
    success: true,
    data: {
      active,
      upcoming,
      completed,
      activeHomework,
      streakCount: studentProfile?.streakCount ?? 0,
    },
  })
}

export const listStudentTests = async (req: Request, res: Response): Promise<void> => {
  const studentId = requireStudentId(req)
  const status = statusSchema.parse(req.query.status)
  const now = new Date()
  const assignedTestIds = await getAssignedTestIds(studentId)

  const tests = await prisma.test.findMany({
    where: {
      id: { in: assignedTestIds },
      status: TestStatus.PUBLISHED,
      ...(status === 'active'
        ? { startTime: { lte: now }, endTime: { gte: now } }
        : status === 'upcoming'
          ? { startTime: { gt: now } }
          : {}),
    },
    include: {
      submissions: {
        where: { studentId },
        select: {
          id: true,
          submittedAt: true,
          scoreTotal: true,
          maxScore: true,
        },
      },
      _count: {
        select: { questions: true },
      },
    },
    orderBy: { startTime: 'asc' },
  })

  // Filter by category based on requested status/view if needed
  // For now, return all assigned tests but include category

  const filtered =
    status === 'completed'
      ? tests.filter((test) => test.submissions.some((submission) => Boolean(submission.submittedAt)))
      : tests

  res.json({
    success: true,
    data: filtered,
  })
}

export const getStudentTestDetail = async (req: Request, res: Response): Promise<void> => {
  const studentId = requireStudentId(req)
  const { testId } = z.object({ testId: z.string().min(1) }).parse(req.params)
  const assignedTestIds = await getAssignedTestIds(studentId)

  if (!assignedTestIds.includes(testId)) {
    throw new ApiError('This test is not assigned to you', 403)
  }

  const test = await prisma.test.findFirst({
    where: {
      id: testId,
      status: TestStatus.PUBLISHED,
    },
    include: {
      questions: {
        select: {
          id: true,
          text: true,
          explanation: true,
          options: {
            select: {
              id: true,
              text: true,
            },
          },
        },
      },
    },
  })

  if (!test) {
    throw new ApiError('Test not found', 404)
  }

  res.json({
    success: true,
    data: test,
  })
}

export const startSubmission = async (req: Request, res: Response): Promise<void> => {
  const studentId = requireStudentId(req)
  const { testId } = z.object({ testId: z.string().min(1) }).parse(req.params)
  const now = new Date()

  const assignedTestIds = await getAssignedTestIds(studentId)
  if (!assignedTestIds.includes(testId)) {
    throw new ApiError('This test is not assigned to you', 403)
  }

  const test = await prisma.test.findUnique({ where: { id: testId } })
  if (!test || test.status !== TestStatus.PUBLISHED) {
    throw new ApiError('Test not available', 404)
  }

  if (now < test.startTime || now > test.endTime) {
    throw new ApiError('Test is outside active time window', 400)
  }

  const submission = await prisma.submission.upsert({
    where: {
      testId_studentId: {
        testId,
        studentId,
      },
    },
    update: {},
    create: {
      testId,
      studentId,
      startedAt: now,
    },
  })

  res.json({
    success: true,
    data: submission,
  })
}

export const saveAnswers = async (req: Request, res: Response): Promise<void> => {
  const studentId = requireStudentId(req)
  const { submissionId } = z.object({ submissionId: z.string().min(1) }).parse(req.params)
  const { answers } = answerInputSchema.parse(req.body)

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      test: {
        include: {
          questions: {
            include: { options: true },
          },
        },
      },
    },
  })

  if (!submission || submission.studentId !== studentId) {
    throw new ApiError('Submission not found', 404)
  }

  if (submission.submittedAt) {
    throw new ApiError('Submission is already finalized', 400)
  }

  const questionById = new Map(submission.test.questions.map((question) => [question.id, question]))
  const answersToUpsert = answers.map((answer) => {
    const question = questionById.get(answer.questionId)
    if (!question) {
      throw new ApiError(`Question ${answer.questionId} does not belong to this test`, 400)
    }

    const selectedOption = answer.selectedOptionId
      ? question.options.find((option) => option.id === answer.selectedOptionId)
      : undefined

    const isCorrect = selectedOption?.isCorrect ?? false
    const marksObtained = isCorrect ? question.marks : 0

    return {
      submissionId,
      questionId: question.id,
      selectedOptionId: selectedOption?.id,
      isCorrect,
      marksObtained,
    }
  })

  await prisma.$transaction(
    answersToUpsert.map((entry) =>
      prisma.answer.upsert({
        where: {
          submissionId_questionId: {
            submissionId: entry.submissionId,
            questionId: entry.questionId,
          },
        },
        update: {
          selectedOptionId: entry.selectedOptionId,
          isCorrect: entry.isCorrect,
          marksObtained: entry.marksObtained,
        },
        create: entry,
      }),
    ),
  )

  res.json({
    success: true,
    data: { message: 'Answers saved successfully' },
  })
}

export const submitSubmission = async (req: Request, res: Response): Promise<void> => {
  const studentId = requireStudentId(req)
  const { submissionId } = z.object({ submissionId: z.string().min(1) }).parse(req.params)
  const now = new Date()

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      test: {
        include: {
          questions: true,
        },
      },
      answers: true,
      student: true,
    },
  })

  if (!submission || submission.studentId !== studentId) {
    throw new ApiError('Submission not found', 404)
  }

  if (submission.submittedAt) {
    throw new ApiError('Submission is already finalized', 400)
  }

  if (now > submission.test.endTime) {
    throw new ApiError('Test submission window has ended', 400)
  }

  const maxScore = submission.test.questions.reduce((sum, question) => sum + question.marks, 0)
  const scoreTotal = submission.answers.reduce((sum, answer) => sum + answer.marksObtained, 0)

  const answerByQuestion = new Map(submission.answers.map((answer) => [answer.questionId, answer]))
  const aiPayloadEntries = submission.test.questions.map((question) => {
    const answer = answerByQuestion.get(question.id)
    return {
      chapter: question.chapter,
      concept: question.concept,
      isCorrect: answer?.isCorrect ?? false,
      marksObtained: answer?.marksObtained ?? 0,
      maxMarks: question.marks,
    }
  })

  let aiSummary: string | null = null
  try {
    aiSummary = await analysePerformance({
      subject: submission.test.subject,
      classLevel: submission.student.classLevel,
      board: submission.student.board,
      entries: aiPayloadEntries,
    })
  } catch (error) {
    console.warn('AI performance analysis failed:', error)
  }

  const finalized = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      submittedAt: now,
      scoreTotal,
      maxScore,
      aiAnalysisSummary: aiSummary,
    },
    include: {
      test: true,
      answers: {
        include: {
          question: true,
          selectedOption: true,
        },
      },
    },
  })

  // Handle Streaks for Homework
  if (finalized.test.category === TestCategory.HOMEWORK) {
    const student = submission.student
    const lastDate = student.lastHomeworkDate
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let newStreak = student.streakCount

    if (!lastDate) {
      newStreak = 1
    } else {
      const last = new Date(lastDate)
      last.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        newStreak += 1
      } else if (diffDays > 1) {
        newStreak = 1
      }
      // if diffDays === 0, streak stays the same
    }

    await prisma.studentProfile.update({
      where: { id: studentId },
      data: {
        streakCount: newStreak,
        lastHomeworkDate: now,
      },
    })
  }

  res.json({
    success: true,
    data: finalized,
  })
}

export const listResults = async (req: Request, res: Response): Promise<void> => {
  const studentId = requireStudentId(req)

  const results = await prisma.submission.findMany({
    where: {
      studentId,
      submittedAt: { not: null },
    },
    include: {
      test: true,
    },
    orderBy: { submittedAt: 'desc' },
  })

  res.json({
    success: true,
    data: results,
  })
}

export const getResultById = async (req: Request, res: Response): Promise<void> => {
  const studentId = requireStudentId(req)
  const { submissionId } = z.object({ submissionId: z.string().min(1) }).parse(req.params)

  const result = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      studentId,
    },
    include: {
      test: {
        include: {
          assignments: true,
        },
      },
      answers: {
        include: {
          question: {
            include: {
              options: true,
            },
          },
          selectedOption: true,
        },
      },
    },
  })

  if (!result) {
    throw new ApiError('Result not found', 404)
  }

  res.json({
    success: true,
    data: result,
  })
}
