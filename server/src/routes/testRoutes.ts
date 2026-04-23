import { Router } from 'express'

import {
  createTest,
  getTestAnalytics,
  getTestById,
  listTests,
  replaceAssignments,
  updateTest,
} from '../controllers/testController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const testRouter = Router()

testRouter.use(authMiddleware, requireRole('teacher_admin', 'superadmin'))
testRouter.get('/', asyncHandler(listTests))
testRouter.post('/', asyncHandler(createTest))
testRouter.get('/:testId', asyncHandler(getTestById))
testRouter.patch('/:testId', asyncHandler(updateTest))
testRouter.post('/:testId/assignments', asyncHandler(replaceAssignments))
testRouter.get('/:testId/analytics', asyncHandler(getTestAnalytics))
