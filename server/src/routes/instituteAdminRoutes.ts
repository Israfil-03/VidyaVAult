import { Router } from 'express'

import {
  approveRequest,
  declineRequest,
  getPendingRequests,
} from '../controllers/instituteAdminController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const instituteAdminRouter = Router()

instituteAdminRouter.use(authMiddleware, requireRole('institute_admin'))

instituteAdminRouter.get('/requests', asyncHandler(getPendingRequests))
instituteAdminRouter.post('/requests/:requestId/approve', asyncHandler(approveRequest))
instituteAdminRouter.post('/requests/:requestId/decline', asyncHandler(declineRequest))
