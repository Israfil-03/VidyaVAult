export type Role = 'superadmin' | 'teacher_admin' | 'student'

export interface AuthUser {
  id: string
  email: string | null
  username: string
  role: Role
  teacherId?: string
  studentId?: string
  forcePasswordChange: boolean
}

export interface ApiEnvelope<T> {
  success: boolean
  data: T
  error?: {
    message: string
    details?: unknown
  }
}

export interface OptionInput {
  text: string
  isCorrect: boolean
}

export interface QuestionInput {
  id: string
  text: string
  chapter?: string
  concept?: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  marks: number
  source: 'MANUAL' | 'AI'
  explanation?: string
  options: OptionInput[]
}
