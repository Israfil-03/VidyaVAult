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

  if (!req.user) {
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
  if (['superadmin', 'institute_admin'].includes(req.user.role)) {
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
  else if (req.user.role === 'teacher_admin' && req.user.teacherId) {
    // Fetch teacher's subject
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: req.user.teacherId },
      select: { subject: true },
    })

    if (!teacher) {
      throw new ApiError('Teacher profile not found', 404)
    }

    // Build where clause: same subject AND (public OR owned by this teacher OR created by admin)
    questions = await prisma.questionBankEntry.findMany({
      where: {
        ...baseWhere,
        subject: teacher.subject,
        OR: [
          { isPublic: true },
          { teacherId: req.user.teacherId },
          { teacherId: null }, // Include questions created by admins
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

  if (!req.user) {
    throw new ApiError('Authentication required', 401)
  }

  // Teachers can only create questions for their own subject
  if (req.user.role === 'teacher_admin' && req.user.teacherId) {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: req.user.teacherId },
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
  }
  // Admins and others can create for any subject
  else if (!['superadmin', 'institute_admin'].includes(req.user.role)) {
    throw new ApiError('You do not have permission to create questions', 403)
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
        teacherId: req.user.teacherId || null,
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

  if (!req.user) {
    throw new ApiError('Authentication required', 401)
  }

  const existing = await prisma.questionBankEntry.findUnique({ where: { id } })
  if (!existing) {
    throw new ApiError('Question not found', 404)
  }

  // Check access control: only allow if user is admin or owner
  const isAdmin = ['superadmin', 'institute_admin'].includes(req.user.role)
  const isOwner = existing.teacherId === req.user.teacherId

  if (!isAdmin && !isOwner) {
    throw new ApiError('You do not have permission to edit this question', 403)
  }

  // If teacher is updating, validate subject doesn't change or matches their subject
  if (req.user.role === 'teacher_admin' && req.user.teacherId && payload.subject) {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: req.user.teacherId },
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

  if (!req.user) {
    throw new ApiError('Authentication required', 401)
  }

  const existing = await prisma.questionBankEntry.findUnique({ where: { id } })
  if (!existing) {
    throw new ApiError('Question not found', 404)
  }

  // Check access control: only allow if user is admin or owner
  const isAdmin = ['superadmin', 'institute_admin'].includes(req.user.role)
  const isOwner = existing.teacherId === req.user.teacherId

  if (!isAdmin && !isOwner) {
    throw new ApiError('You do not have permission to delete this question', 403)
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

  if (!req.user) {
    throw new ApiError('Authentication required', 401)
  }

  // Teachers can only bulk upload questions for their own subject
  if (req.user.role === 'teacher_admin' && req.user.teacherId) {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: req.user.teacherId },
      select: { subject: true },
    })

    if (!teacher) {
      throw new ApiError('Teacher profile not found', 404)
    }

    // Check if any question is for a different subject
    const mismatchedQuestions = questions.filter(q => q.subject !== teacher.subject)
    if (mismatchedQuestions.length > 0) {
      throw new ApiError(
        `You can only upload questions for your subject (${teacher.subject}). Found ${mismatchedQuestions.length} questions with different subjects: ${
          [...new Set(mismatchedQuestions.map(q => q.subject))].join(', ')
        }`,
        400
      )
    }
  }
  // Admins and others must have permission
  else if (!['superadmin', 'institute_admin'].includes(req.user.role)) {
    throw new ApiError('You do not have permission to bulk upload questions', 403)
  }

  const created = await prisma.$transaction(
    questions.map((q) =>
      prisma.questionBankEntry.create({
        data: {
          text: q.text,
          subject: q.subject,
          chapter: q.chapter,
          concept: q.concept,
          difficulty: q.difficulty,
          explanation: q.explanation,
          imageUrl: q.imageUrl || null,
          isPublic: q.isPublic ?? (req.user?.role !== 'teacher_admin'), // Default to public if uploaded by admin
          teacherId: req.user?.teacherId || null,
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

  if (!req.user) {
    throw new ApiError('Authentication required', 401)
  }

  // Admin only
  if (!['superadmin', 'institute_admin'].includes(req.user.role)) {
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
