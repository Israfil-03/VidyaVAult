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

  const questions = await prisma.questionBankEntry.findMany({
    where: {
      subject: query.subject,
      chapter: query.chapter,
      difficulty: query.difficulty,
      text: query.search ? { contains: query.search, mode: 'insensitive' } : undefined,
      OR: [
        { isPublic: true },
        req.user?.teacherId ? { teacherId: req.user.teacherId } : {},
      ],
    },
    include: {
      options: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    success: true,
    data: questions,
  })
}

export const createBankQuestion = async (req: Request, res: Response): Promise<void> => {
  console.log('[CreateBankQuestion] Body:', JSON.stringify(req.body, null, 2))
  const payload = bankQuestionSchema.parse(req.body)
  console.log('[CreateBankQuestion] Payload:', JSON.stringify(payload, null, 2))

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(prisma as any).questionBankEntry) {
      throw new Error("Prisma model 'questionBankEntry' is not defined. Please run 'npx prisma generate'.")
    }

    const question = await prisma.questionBankEntry.create({
      data: {
        text: payload.text,
        subject: payload.subject,
        chapter: payload.chapter,
        concept: payload.concept,
        difficulty: payload.difficulty,
        explanation: payload.explanation,
        imageUrl: payload.imageUrl,
        teacherId: req.user?.teacherId,
        options: {
          create: payload.options.map(opt => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
            imageUrl: opt.imageUrl
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

  const existing = await prisma.questionBankEntry.findUnique({ where: { id } })
  if (!existing) {
    throw new ApiError('Question not found', 404)
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
          imageUrl: payload.imageUrl,
          options: payload.options
            ? {
                create: payload.options.map(opt => ({
                  text: opt.text,
                  isCorrect: opt.isCorrect,
                  imageUrl: opt.imageUrl
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
          imageUrl: q.imageUrl,
          teacherId: req.user?.teacherId,
          options: {
            create: q.options.map(opt => ({
              text: opt.text,
              isCorrect: opt.isCorrect,
              imageUrl: opt.imageUrl
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
