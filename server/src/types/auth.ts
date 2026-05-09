import type { UserRole } from '@prisma/client'

export type TokenRole = 'superadmin' | 'institute_admin' | 'teacher_admin' | 'student'

export interface AuthTokenPayload {
  userId: string
  role: TokenRole
  teacherId?: string
  studentId?: string
  forcePasswordChange: boolean
  iat?: number
  exp?: number
}

export const userRoleToTokenRole = (role: UserRole): TokenRole => {
  if (role === 'SUPERADMIN') {
    return 'superadmin'
  }

  if (role === 'INSTITUTE_ADMIN') {
    return 'institute_admin'
  }

  if (role === 'TEACHER_ADMIN') {
    return 'teacher_admin'
  }

  return 'student'
}
