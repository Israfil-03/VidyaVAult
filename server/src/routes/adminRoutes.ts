import { Router } from 'express'

import {
  getGlobalStats,
  listTeachers,
  resetTeacherPassword,
  updateUserRole,
} from '../controllers/adminController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const adminRouter = Router()

adminRouter.use(authMiddleware, requireRole('superadmin'))
adminRouter.get('/stats', asyncHandler(getGlobalStats))
adminRouter.get('/teachers', asyncHandler(listTeachers))
adminRouter.post('/reset-teacher-password', asyncHandler(resetTeacherPassword))
adminRouter.patch('/users/:userId/role', asyncHandler(updateUserRole))
