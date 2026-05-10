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

// Admin and Institute Admin can manage the bank
const adminOnly = requireRole('superadmin', 'institute_admin')

router.get('/', asyncHandler(getQuestionBank))
router.post('/', adminOnly, asyncHandler(createBankQuestion))
router.put('/:id', adminOnly, asyncHandler(updateBankQuestion))
router.delete('/:id', adminOnly, asyncHandler(deleteBankQuestion))
router.post('/bulk', adminOnly, asyncHandler(bulkUploadQuestions))

export default router
