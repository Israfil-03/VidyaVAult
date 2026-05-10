import { Difficulty, Subject } from '@prisma/client'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { prisma } from '../prisma/client.js'
import { ApiError } from '../utils/apiError.js'

const bankQuestionSchema = z.object({
  text: z.string().min(1),
  subject: z.nativeEnum(Subject),
  chapter: z.string().optional(),
  concept: z.string().optional(),
  difficulty: z.nativeEnum(Difficulty).default(Difficulty.MEDIUM),
  explanation: z.string().optional(),
  imageUrl: z.string().url().or(z.literal('')).optional(),
  options: z
    .array(
      z.object({
        text: z.string().min(1),
        imageUrl: z.string().url().or(z.literal('')).optional(),
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
  const payload = bankQuestionSchema.parse(req.body)

  const question = await prisma.questionBankEntry.create({
    data: {
      text: payload.text,
      subject: payload.subject,
      chapter: payload.chapter,
      concept: payload.concept,
      difficulty: payload.difficulty,
      explanation: payload.explanation,
      imageUrl: payload.imageUrl,
      options: {
        create: payload.options,
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
}

export const updateBankQuestion = async (req: Request, res: Response): Promise<void> => {
  const { id } = z.object({ id: z.string() }).parse(req.params)
  const payload = bankQuestionSchema.partial().parse(req.body)

  const existing = await prisma.questionBankEntry.findUnique({ where: { id } })
  if (!existing) {
    throw new ApiError('Question not found', 404)
  }

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
              create: payload.options,
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
          options: {
            create: q.options,
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
