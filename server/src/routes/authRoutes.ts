import { Router } from 'express'

import {
  changePassword,
  login,
  me,
  registerStudent,
  registerTeacher,
  resetPassword,
  setupStudentProfile,
  submitRegistration,
} from '../controllers/authController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const authRouter = Router()

authRouter.post('/login', asyncHandler(login))
authRouter.get('/me', authMiddleware, asyncHandler(me))
authRouter.post(
  '/register-teacher',
  authMiddleware,
  requireRole('superadmin'),
  asyncHandler(registerTeacher),
)
authRouter.post(
  '/register-student',
  authMiddleware,
  requireRole('superadmin'),
  asyncHandler(registerStudent),
)
authRouter.post(
  '/change-password',
  authMiddleware,
  requireRole('superadmin', 'teacher_admin', 'student'),
  asyncHandler(changePassword),
)
authRouter.post(
  '/reset-password',
  authMiddleware,
  requireRole('superadmin', 'institute_admin'),
  asyncHandler(resetPassword),
)

authRouter.post('/register', asyncHandler(submitRegistration))
authRouter.post('/setup-profile', asyncHandler(setupStudentProfile))
