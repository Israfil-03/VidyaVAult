import { Router } from 'express'

import {
  approveRequest,
  declineRequest,
  getApprovalOptions,
  getPendingRequests,
  listInstituteTeachers,
  previewRequestApproval,
} from '../controllers/instituteAdminController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const instituteAdminRouter = Router()

instituteAdminRouter.use(authMiddleware, requireRole('institute_admin'))

instituteAdminRouter.get('/requests', asyncHandler(getPendingRequests))
instituteAdminRouter.get('/teachers', asyncHandler(listInstituteTeachers))
instituteAdminRouter.get('/requests/:requestId/approval-options', asyncHandler(getApprovalOptions))
instituteAdminRouter.post('/requests/:requestId/approval-preview', asyncHandler(previewRequestApproval))
instituteAdminRouter.post('/requests/:requestId/approve', asyncHandler(approveRequest))
instituteAdminRouter.post('/requests/:requestId/decline', asyncHandler(declineRequest))
