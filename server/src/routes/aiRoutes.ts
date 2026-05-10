import { Router } from 'express'

import {
  analysePerformanceHandler,
  generateQuestionsHandler,
} from '../controllers/aiController.js'
import { authMiddleware, requireInternalAiToken, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const aiRouter = Router()

aiRouter.post(
  '/generate-questions',
  authMiddleware,
  requireRole('teacher_admin', 'superadmin', 'institute_admin'),
  asyncHandler(generateQuestionsHandler),
)
aiRouter.post(
  '/analyse-performance',
  requireInternalAiToken,
  asyncHandler(analysePerformanceHandler),
)
