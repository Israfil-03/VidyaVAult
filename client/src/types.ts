export type Role = 'superadmin' | 'institute_admin' | 'teacher_admin' | 'student'

export interface AuthUser {
  id: string
  email: string | null
  username: string
  role: Role
  teacherId?: string
  studentId?: string
  shortId?: string | null
  longId?: string | null
  subjects?: string[]
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
  imageUrl?: string
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
  imageUrl?: string
  options: OptionInput[]
}

export interface BankOption {
  id: string
  text: string
  imageUrl?: string
  isCorrect: boolean
}

export interface QuestionBankEntry {
  id: string
  text: string
  imageUrl?: string
  subject: string
  chapter?: string
  concept?: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  explanation?: string
  options: BankOption[]
  teacherId?: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
}
