import { Router } from 'express'

import {
  closeAndCalculateRewardCycle,
  createRewardCycle,
  listRewardCycles,
} from '../controllers/rewardController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const rewardRouter = Router()

rewardRouter.use(authMiddleware, requireRole('teacher_admin', 'superadmin'))
rewardRouter.get('/cycles', asyncHandler(listRewardCycles))
rewardRouter.post('/cycles', asyncHandler(createRewardCycle))
rewardRouter.post('/cycles/:rewardCycleId/close', asyncHandler(closeAndCalculateRewardCycle))
