import { Router } from 'express'

import {
  getStudentTestDetail,
  getResultById,
  getStudentOverview,
  listResults,
  listStudentTests,
  saveAnswers,
  startSubmission,
  submitSubmission,
} from '../controllers/studentController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const studentRouter = Router()

studentRouter.use(authMiddleware, requireRole('student'))
studentRouter.get('/overview', asyncHandler(getStudentOverview))
studentRouter.get('/tests', asyncHandler(listStudentTests))
studentRouter.get('/tests/:testId/detail', asyncHandler(getStudentTestDetail))
studentRouter.post('/tests/:testId/start', asyncHandler(startSubmission))
studentRouter.post('/submissions/:submissionId/answers', asyncHandler(saveAnswers))
studentRouter.post('/submissions/:submissionId/submit', asyncHandler(submitSubmission))
studentRouter.get('/results', asyncHandler(listResults))
studentRouter.get('/results/:submissionId', asyncHandler(getResultById))
