import { Router } from 'express'

import {
  bulkUploadQuestions,
  createBankQuestion,
  deleteBankQuestion,
  getQuestionBank,
  updateBankQuestion,
} from '../controllers/questionBankController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// Admin and Institute Admin can manage the bank
const adminOnly = requireRole('superadmin', 'institute_admin')

router.get('/', getQuestionBank)
router.post('/', adminOnly, createBankQuestion)
router.put('/:id', adminOnly, updateBankQuestion)
router.delete('/:id', adminOnly, deleteBankQuestion)
router.post('/bulk', adminOnly, bulkUploadQuestions)

export default router
