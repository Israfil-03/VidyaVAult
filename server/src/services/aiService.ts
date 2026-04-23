import type { Difficulty } from '@prisma/client'

export interface GenerateQuestionInput {
  subject: string
  board: string
  classLevel: string
  topic: string
  difficulty: Difficulty
  numQuestions: number
}

export interface GeneratedQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  chapter: string
  concept: string
}

export interface AnalysePerformanceInput {
  subject: string
  board?: string
  classLevel: string
  entries: Array<{
    chapter?: string | null
    concept?: string | null
    isCorrect: boolean
    marksObtained: number
    maxMarks: number
  }>
}

export const generateQuestions = async (
  input: GenerateQuestionInput,
): Promise<GeneratedQuestion[]> => {
  const count = Math.min(Math.max(input.numQuestions, 1), 50)

  // TODO: Replace with Gemini API integration and robust schema-level JSON validation.
  return Array.from({ length: count }).map((_, index) => ({
    question: `${input.subject} (${input.board} class ${input.classLevel}) - ${input.topic} practice question ${index + 1}?`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctIndex: index % 4,
    explanation: `Focus on ${input.topic} fundamentals. Difficulty: ${input.difficulty}.`,
    chapter: input.topic,
    concept: `${input.topic} core concept ${index + 1}`,
  }))
}

export const analysePerformance = async (
  input: AnalysePerformanceInput,
): Promise<string | null> => {
  if (input.entries.length === 0) {
    return null
  }

  const total = input.entries.reduce(
    (acc, entry) => {
      acc.obtained += entry.marksObtained
      acc.max += entry.maxMarks
      acc.correct += entry.isCorrect ? 1 : 0
      return acc
    },
    { obtained: 0, max: 0, correct: 0 },
  )

  const percentage = total.max === 0 ? 0 : Math.round((total.obtained / total.max) * 100)
  const accuracy = Math.round((total.correct / input.entries.length) * 100)

  // TODO: Replace with Gemini call with retry/backoff and queue-based fallback for production.
  return `Great effort! You scored ${percentage}% with ${accuracy}% accuracy in ${input.subject}. Keep revising chapter basics daily, then solve timed mixed questions. Review mistakes one by one and write short correction notes. With steady practice and confidence, your next test performance can improve strongly.`
}
