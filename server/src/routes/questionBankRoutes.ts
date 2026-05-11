import { Router } from 'express'

import {
  bulkUploadQuestions,
  checkSimilarBankQuestions,
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

// Admins and Teachers can view, but only Teachers can manage (Create/Update/Delete)
const canView = requireRole('superadmin', 'institute_admin', 'teacher_admin')
const canManage = requireRole('teacher_admin')

router.get('/', canView, asyncHandler(getQuestionBank))
router.get('/admin/all', requireRole('superadmin', 'institute_admin'), asyncHandler(getQuestionBankAdmin))
router.get('/similar', canManage, asyncHandler(checkSimilarBankQuestions))
router.post('/', canManage, asyncHandler(createBankQuestion))
router.put('/:id', canManage, asyncHandler(updateBankQuestion))
router.delete('/:id', canManage, asyncHandler(deleteBankQuestion))
router.post('/bulk', canManage, asyncHandler(bulkUploadQuestions))

export default router
