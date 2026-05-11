import { Router } from 'express'

import {
  bulkUploadQuestions,
  createBankQuestion,
  deleteBankQuestion,
  getQuestionBank,
  getQuestionBankAdmin,
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
router.get('/admin/all', requireRole('superadmin', 'institute_admin'), asyncHandler(getQuestionBankAdmin))
router.post('/', bankManagers, asyncHandler(createBankQuestion))
router.put('/:id', bankManagers, asyncHandler(updateBankQuestion))
router.delete('/:id', bankManagers, asyncHandler(deleteBankQuestion))
router.post('/bulk', bankManagers, asyncHandler(bulkUploadQuestions))

export default router
