import { Router } from 'express'

import {
  bulkUploadQuestions,
  createBankQuestion,
  deleteBankQuestion,
  getQuestionBank,
  updateBankQuestion,
} from '../controllers/questionBankController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// Admin, Institute Admin and Teachers can manage the bank
const bankManagers = requireRole('superadmin', 'institute_admin', 'teacher_admin')

router.get('/', asyncHandler(getQuestionBank))
router.post('/', bankManagers, asyncHandler(createBankQuestion))
router.put('/:id', bankManagers, asyncHandler(updateBankQuestion))
router.delete('/:id', bankManagers, asyncHandler(deleteBankQuestion))
router.post('/bulk', bankManagers, asyncHandler(bulkUploadQuestions))

export default router
