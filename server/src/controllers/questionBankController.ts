import { Difficulty, Subject } from '@prisma/client'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { prisma } from '../prisma/client.js'
import { ApiError } from '../utils/apiError.js'

const bankQuestionSchema = z.object({
  text: z.string().min(1),
  subject: z.nativeEnum(Subject),
  chapter: z.string().nullable().optional(),
  concept: z.string().nullable().optional(),
  difficulty: z.nativeEnum(Difficulty).default(Difficulty.MEDIUM),
  explanation: z.string().nullable().optional(),
  imageUrl: z.string().url().or(z.literal('')).nullable().optional(),
  isPublic: z.boolean().default(false),
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

const bulkUploadSchema = z.object({
  questions: z.array(bankQuestionSchema),
})

export const getQuestionBank = async (req: Request, res: Response): Promise<void> => {
  const query = z
    .object({
      subject: z.nativeEnum(Subject).optional(),
      chapter: z.string().optional(),
      difficulty: z.nativeEnum(Difficulty).optional(),
      search: z.string().optional(),
    })
    .parse(req.query)

  const user = req.user
  if (!user) {
    throw new ApiError('Authentication required', 401)
  }

  // Base filter conditions
  const baseWhere = {
    subject: query.subject,
    chapter: query.chapter,
    difficulty: query.difficulty,
    text: query.search ? { contains: query.search, mode: 'insensitive' as const } : undefined,
  }

  let questions

  // Admins can see all questions from all subjects and teachers
  if (['superadmin', 'institute_admin'].includes(user.role)) {
    questions = await prisma.questionBankEntry.findMany({
      where: baseWhere,
      include: {
        options: true,
        teacher: {
          select: {
            id: true,
            subject: true,
            user: { select: { username: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }
  // Teachers can see questions from their subject: public questions + their own questions
  else if (user.role === 'teacher_admin' && user.teacherId) {
    // Fetch teacher's subject
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: user.teacherId },
      select: { subject: true },
    })

    if (!teacher) {
      throw new ApiError('Teacher profile not found', 404)
    }

    // Build where clause: strictly same subject AND (public OR owned by this teacher)
    // Removed { teacherId: null } as admins no longer add questions
    questions = await prisma.questionBankEntry.findMany({
      where: {
        ...baseWhere,
        subject: teacher.subject,
        OR: [
          { isPublic: true },
          { teacherId: user.teacherId },
        ],
      },
      include: {
        options: true,
        teacher: {
          select: {
            user: { select: { username: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }
  // Students and other roles do not have access to question bank
  else {
    throw new ApiError('You do not have permission to access the question bank', 403)
  }

  res.json({
    success: true,
    data: questions,
  })
}

export const createBankQuestion = async (req: Request, res: Response): Promise<void> => {
  console.log('[CreateBankQuestion] Body:', JSON.stringify(req.body, null, 2))
  const payload = bankQuestionSchema.parse(req.body)
  console.log('[CreateBankQuestion] Payload:', JSON.stringify(payload, null, 2))

  const user = req.user
  if (!user) {
    throw new ApiError('Authentication required', 401)
  }

  // ONLY Teachers can create questions for their own subject
  if (user.role === 'teacher_admin' && user.teacherId) {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: user.teacherId },
      select: { subject: true },
    })

    if (!teacher) {
      throw new ApiError('Teacher profile not found', 404)
    }

    if (payload.subject !== teacher.subject) {
      throw new ApiError(
        `You can only create questions for your subject (${teacher.subject}). Received: ${payload.subject}`,
        400
      )
    }
  } else {
    // Admins are restricted to "View Only" as per new architecture
    throw new ApiError('Only teachers can create questions in the question bank', 403)
  }

  // Exact Match Blocking
  const existingExactMatch = await prisma.questionBankEntry.findFirst({
    where: {
      teacherId: user.teacherId,
      text: { equals: payload.text, mode: 'insensitive' }
    }
  })

  if (existingExactMatch) {
    throw new ApiError('A question with this exact text already exists in your Question Bank.', 409)
  }

  try {
    const question = await prisma.questionBankEntry.create({
      data: {
        text: payload.text,
        subject: payload.subject,
        chapter: payload.chapter,
        concept: payload.concept,
        difficulty: payload.difficulty,
        explanation: payload.explanation,
        imageUrl: payload.imageUrl || null,
        isPublic: payload.isPublic,
        teacherId: user.teacherId || null,
        options: {
          create: payload.options.map(opt => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
            imageUrl: opt.imageUrl || null
          })),
        },
      },
      include: {
        options: true,
      },
    })

    res.status(201).json({
      success: true,
      data: question,
    })
  } catch (error) {
    console.error('[CreateBankQuestion Error]:', error)
    if (error instanceof Error) {
      throw new ApiError(`Failed to create bank question: ${error.message}`, 500)
    }
    throw error
  }
}

export const updateBankQuestion = async (req: Request, res: Response): Promise<void> => {
  const { id } = z.object({ id: z.string() }).parse(req.params)
  const payload = bankQuestionSchema.partial().parse(req.body)

  const user = req.user
  if (!user) {
    throw new ApiError('Authentication required', 401)
  }

  const existing = await prisma.questionBankEntry.findUnique({ where: { id } })
  if (!existing) {
    throw new ApiError('Question not found', 404)
  }

  // Check access control: only allow if user is the owner (Teacher)
  // Admins are "View Only" as per new architecture
  const isOwner = user.teacherId && existing.teacherId === user.teacherId

  if (!isOwner) {
    throw new ApiError('You do not have permission to edit this question. Only the creator can modify it.', 403)
  }

  // If teacher is updating, validate subject doesn't change or matches their subject
  if (user.role === 'teacher_admin' && user.teacherId && payload.subject) {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: user.teacherId },
      select: { subject: true },
    })

    if (teacher && payload.subject !== teacher.subject) {
      throw new ApiError(
        `You can only manage questions for your subject (${teacher.subject}). Cannot change to: ${payload.subject}`,
        400
      )
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (payload.options) {
        await tx.bankOption.deleteMany({ where: { questionBankId: id } })
      }

      return tx.questionBankEntry.update({
        where: { id },
        data: {
          text: payload.text,
          subject: payload.subject,
          chapter: payload.chapter,
          concept: payload.concept,
          difficulty: payload.difficulty,
          explanation: payload.explanation,
          imageUrl: payload.imageUrl || null,
          isPublic: payload.isPublic,
          options: payload.options
            ? {
                create: payload.options.map(opt => ({
                  text: opt.text,
                  isCorrect: opt.isCorrect,
                  imageUrl: opt.imageUrl || null
                })),
              }
            : undefined,
        },
        include: {
          options: true,
        },
      })
    })

    res.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('[UpdateBankQuestion Error]:', error)
    if (error instanceof Error) {
      throw new ApiError(`Failed to update bank question: ${error.message}`, 500)
    }
    throw error
  }
}

export const deleteBankQuestion = async (req: Request, res: Response): Promise<void> => {
  const { id } = z.object({ id: z.string() }).parse(req.params)

  const user = req.user
  if (!user) {
    throw new ApiError('Authentication required', 401)
  }

  const existing = await prisma.questionBankEntry.findUnique({ where: { id } })
  if (!existing) {
    throw new ApiError('Question not found', 404)
  }

  // Check access control: only allow if user is the owner (Teacher)
  // Admins are "View Only" as per new architecture
  const isOwner = user.teacherId && existing.teacherId === user.teacherId

  if (!isOwner) {
    throw new ApiError('You do not have permission to delete this question. Only the creator can remove it.', 403)
  }

  await prisma.questionBankEntry.delete({
    where: { id },
  })

  res.json({
    success: true,
    message: 'Question deleted from bank',
  })
}

export const bulkUploadQuestions = async (req: Request, res: Response): Promise<void> => {
  const { questions } = bulkUploadSchema.parse(req.body)

  const user = req.user
  if (!user) {
    throw new ApiError('Authentication required', 401)
  }

  // ONLY Teachers can bulk upload questions for their own subject
  if (user.role === 'teacher_admin' && user.teacherId) {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: user.teacherId },
      select: { subject: true },
    })

    if (!teacher) {
      throw new ApiError('Teacher profile not found', 404)
    }

    // Check if any question is for a different subject
    const mismatchedQuestions = questions.filter(q => q.subject !== teacher.subject)
    if (mismatchedQuestions.length > 0) {
      throw new ApiError(
        `You can only upload questions for your subject (${teacher.subject}). Found ${mismatchedQuestions.length} questions with different subjects.`,
        400
      )
    }
  } else {
    // Admins are restricted to "View Only" as per new architecture
    throw new ApiError('Only teachers can bulk upload questions to the bank', 403)
  }

  // Deduplicate against existing questions for this teacher
  const existingQuestions = await prisma.questionBankEntry.findMany({
    where: { teacherId: user.teacherId },
    select: { text: true }
  })
  const existingTextSet = new Set(existingQuestions.map(q => q.text.toLowerCase().trim()))

  const uniqueQuestions = questions.filter(q => !existingTextSet.has(q.text.toLowerCase().trim()))

  if (uniqueQuestions.length === 0) {
    res.status(200).json({
      success: true,
      count: 0,
      message: 'All questions already exist in your Question Bank.'
    })
    return
  }

  const created = await prisma.$transaction(
    uniqueQuestions.map((q) =>
      prisma.questionBankEntry.create({
        data: {
          text: q.text,
          subject: q.subject,
          chapter: q.chapter,
          concept: q.concept,
          difficulty: q.difficulty,
          explanation: q.explanation,
          imageUrl: q.imageUrl || null,
          isPublic: q.isPublic ?? false, // Default to private
          teacherId: user.teacherId!, // Guaranteed to be present due to check above
          options: {
            create: q.options.map(opt => ({
              text: opt.text,
              isCorrect: opt.isCorrect,
              imageUrl: opt.imageUrl || null
            })),
          },
        },
      }),
    ),
  )

  res.status(201).json({
    success: true,
    count: created.length,
  })
}

export const getQuestionBankAdmin = async (req: Request, res: Response): Promise<void> => {
  const query = z
    .object({
      subject: z.nativeEnum(Subject).optional(),
      teacherId: z.string().optional(),
      difficulty: z.nativeEnum(Difficulty).optional(),
      search: z.string().optional(),
    })
    .parse(req.query)

  const user = req.user
  if (!user) {
    throw new ApiError('Authentication required', 401)
  }

  // Admin only
  if (!['superadmin', 'institute_admin'].includes(user.role)) {
    throw new ApiError('You do not have permission to access this resource', 403)
  }

  const questions = await prisma.questionBankEntry.findMany({
    where: {
      subject: query.subject,
      teacherId: query.teacherId,
      difficulty: query.difficulty,
      text: query.search ? { contains: query.search, mode: 'insensitive' } : undefined,
    },
    include: {
      options: true,
      teacher: {
        select: {
          id: true,
          subject: true,
          user: { select: { id: true, username: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    success: true,
    data: questions,
  })
}

export const checkSimilarBankQuestions = async (req: Request, res: Response): Promise<void> => {
  const query = z.object({
    text: z.string().min(3),
    subject: z.nativeEnum(Subject).optional()
  }).parse(req.query)

  const user = req.user
  if (!user || !user.teacherId) {
    throw new ApiError('Authentication required', 401)
  }

  // A basic similarity check: check if any question contains the first 30 chars
  const searchSubstring = query.text.trim().substring(0, 30)

  const questions = await prisma.questionBankEntry.findMany({
    where: {
      teacherId: user.teacherId,
      subject: query.subject,
      text: { contains: searchSubstring, mode: 'insensitive' }
    },
    take: 5,
    include: { options: true }
  })

  res.json({
    success: true,
    data: questions
  })
}
