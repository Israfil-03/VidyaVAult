import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import type { Difficulty } from '@prisma/client'

import { env } from '../config/env.js'

// Initialize Gemini API
const genAI = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null

// Schema definition for Question Generation
const questionSchema: Schema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      question: { type: SchemaType.STRING },
      options: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
      },
      correctIndex: { type: SchemaType.NUMBER },
      explanation: { type: SchemaType.STRING },
      chapter: { type: SchemaType.STRING },
      concept: { type: SchemaType.STRING },
    },
    required: ['question', 'options', 'correctIndex', 'explanation', 'chapter', 'concept'],
  },
}

const model = genAI?.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: questionSchema,
  },
})

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

/**
 * Generates academic questions using Gemini AI.
 * Uses JSON mode for perfectly structured and valid JSON output.
 */
export const generateQuestions = async (
  input: GenerateQuestionInput,
): Promise<GeneratedQuestion[]> => {
  const count = Math.min(Math.max(input.numQuestions, 1), 50)

  if (!model) {
    console.warn('Gemini API key not configured, falling back to dummy questions.')
    return getDummyQuestions(input, count)
  }

  const prompt = `
    You are an expert academic content creator for the ${input.board} board.
    Generate ${count} multiple-choice questions (MCQs) for:
    - Subject: ${input.subject}
    - Class Level: ${input.classLevel}
    - Topic: ${input.topic}
    - Difficulty: ${input.difficulty}

    Each question must be challenging and accurate. Ensure all options are plausible but only one is correct.
  `

  try {
    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // In JSON mode, response.text() should already be valid JSON
    const questions = JSON.parse(text) as GeneratedQuestion[]

    return questions.map((q) => ({
      ...q,
      chapter: q.chapter || input.topic,
      concept: q.concept || `${input.topic} core concept`,
    }))
  } catch (error) {
    console.error('Gemini question generation failed:', error)
    return getDummyQuestions(input, count)
  }
}

/**
 * Analyzes student performance and provides personalized AI feedback.
 */
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

  // For analysis, we use the standard model (not JSON mode)
  const analysisModel = genAI?.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

  if (!analysisModel) {
    return `Great effort! You scored ${percentage}% with ${accuracy}% accuracy in ${input.subject}. Keep revising chapter basics daily.`
  }

  const performanceContext = input.entries
    .map(
      (e) =>
        `- Topic: ${e.chapter || 'General'}, Concept: ${e.concept || 'General'}, Result: ${e.isCorrect ? 'Correct' : 'Incorrect'}`,
    )
    .join('\n')

  const prompt = `
    You are a supportive academic mentor. Analyze the following student performance in ${input.subject} (Class ${input.classLevel}):
    
    Overall Score: ${percentage}% (${total.obtained}/${total.max})
    Accuracy: ${accuracy}%
    
    Detailed Breakdown:
    ${performanceContext}
    
    Provide a personalized, encouraging, and actionable study plan in 3-4 sentences. 
    Focus on the concepts they missed and suggest how to improve.
    Keep the tone professional yet motivating.
  `

  try {
    const result = await analysisModel.generateContent(prompt)
    return result.response.text()
  } catch (error) {
    console.error('Gemini performance analysis failed:', error)
    return `You scored ${percentage}% with ${accuracy}% accuracy. Continue practicing your weak areas in ${input.subject} to improve further.`
  }
}

/**
 * Fallback helper for when AI is unavailable.
 */
function getDummyQuestions(input: GenerateQuestionInput, count: number): GeneratedQuestion[] {
  return Array.from({ length: count }).map((_, index) => ({
    question: `${input.subject} (${input.board} class ${input.classLevel}) - ${input.topic} practice question ${index + 1}?`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctIndex: index % 4,
    explanation: `Focus on ${input.topic} fundamentals. Difficulty: ${input.difficulty}.`,
    chapter: input.topic,
    concept: `${input.topic} core concept ${index + 1}`,
  }))
}
