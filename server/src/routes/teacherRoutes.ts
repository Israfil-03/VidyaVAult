import { Router } from 'express'

import {
  addStudentToBatch,
  createBatch,
  getTeacherOverview,
  getTeacherPracticeSubmissions,
  listTeacherBatches,
  listTeacherRewardCycles,
  listTeacherStudents,
  removeStudentFromBatch,
  updateBatch,
} from '../controllers/teacherController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const teacherRouter = Router()

teacherRouter.use(authMiddleware, requireRole('teacher_admin'))
teacherRouter.get('/overview', asyncHandler(getTeacherOverview))
teacherRouter.get('/students', asyncHandler(listTeacherStudents))
teacherRouter.get('/batches', asyncHandler(listTeacherBatches))
teacherRouter.get('/practice-attempts', asyncHandler(getTeacherPracticeSubmissions))
teacherRouter.post('/batches', asyncHandler(createBatch))
teacherRouter.patch('/batches/:batchId', asyncHandler(updateBatch))
teacherRouter.post('/batches/:batchId/students', asyncHandler(addStudentToBatch))
teacherRouter.delete('/batches/:batchId/students/:studentId', asyncHandler(removeStudentFromBatch))
teacherRouter.get('/rewards', asyncHandler(listTeacherRewardCycles))
