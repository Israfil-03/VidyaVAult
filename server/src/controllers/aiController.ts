import { Difficulty } from '@prisma/client'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { analysePerformance, generateQuestions } from '../services/aiService.js'

const generateQuestionsSchema = z.object({
  subject: z.string().min(1),
  board: z.string().min(1),
  classLevel: z.string().min(1),
  topic: z.string().min(1),
  difficulty: z.nativeEnum(Difficulty),
  numQuestions: z.number().int().positive().max(50),
})

const analyseSchema = z.object({
  subject: z.string().min(1),
  board: z.string().optional(),
  classLevel: z.string().min(1),
  entries: z.array(
    z.object({
      chapter: z.string().optional(),
      concept: z.string().optional(),
      isCorrect: z.boolean(),
      marksObtained: z.number(),
      maxMarks: z.number().positive(),
    }),
  ),
})

export const generateQuestionsHandler = async (req: Request, res: Response): Promise<void> => {
  const payload = generateQuestionsSchema.parse(req.body)
  const questions = await generateQuestions(payload)

  res.json({
    success: true,
    data: questions,
  })
}

export const analysePerformanceHandler = async (req: Request, res: Response): Promise<void> => {
  const payload = analyseSchema.parse(req.body)
  const summary = await analysePerformance(payload)

  res.json({
    success: true,
    data: { summary },
  })
}
