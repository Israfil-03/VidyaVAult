import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import type { Difficulty } from '@prisma/client'

import { env } from '../config/env.js'

// Initialize Gemini API
const genAI = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null

// Schema definition for Question Generation
const questionSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    questions: {
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
    },
  },
  required: ['questions'],
}

const model = genAI?.getGenerativeModel({
  model: 'gemini-flash-latest',

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
    console.warn('Gemini API key is not configured. Falling back to dummy questions.')
    return getDummyQuestions(input, count)
  }

  const prompt = `
    You are an elite academic content creator and subject matter expert for the ${input.board} curriculum, specializing in Class ${input.classLevel}.
    Your goal is to generate ${count} high-quality, conceptually rigorous Multiple Choice Questions (MCQs) for the topic: "${input.topic}" in ${input.subject}.

    Operational Guidelines for Each Question:
    1. **Conceptual Depth**: Avoid simple recall. Focus on application of principles, critical thinking, and common misconceptions.
    2. **Distractor Quality**: Provide 4 plausible options. Distractors must be based on common student errors or logical fallacies in ${input.subject}.
    3. **Pedagogical Explanation**: Write a detailed, step-by-step explanation that explains *why* the correct answer is right and *why* specific distractors are common mistakes.
    4. **Curriculum Alignment**: Strictly adhere to the ${input.board} standards and the specified ${input.difficulty} difficulty level.
    5. **Clarity**: Use precise academic terminology appropriate for Class ${input.classLevel}.

    Structure the response as a JSON object with a single property 'questions' containing an array of these objects.
  `

  try {
    const result = await model.generateContent(prompt)
    const response = result.response
    let text = response.text()

    // Strip markdown code blocks if the model puts them
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\n/, '').replace(/\n```$/, '')
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\n/, '').replace(/\n```$/, '')
    }

    // In JSON mode, response.text() should already be valid JSON
    const parsed = JSON.parse(text) as { questions: GeneratedQuestion[] }
    const questions = parsed.questions || []

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
  const analysisModel = genAI?.getGenerativeModel({ model: 'gemini-flash-latest' })


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
    You are a highly experienced academic mentor and educational psychologist. Analyze this student's performance data in ${input.subject} for Class ${input.classLevel}.

    Metrics:
    - Overall Proficiency: ${percentage}%
    - Concept Accuracy: ${accuracy}%
    - Total Marks: ${total.obtained} out of ${total.max}

    Individual Attempt Context:
    ${performanceContext}

    Your Task:
    1. Identify the specific conceptual gaps based on the 'Incorrect' results.
    2. Provide a motivating, highly actionable 3-4 sentence analysis.
    3. Suggest one specific revision technique (e.g., Active Recall, Feynman Technique) tailored to their weak topics.
    4. Maintain a tone that is professional, empathetic, and academically rigorous.
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
