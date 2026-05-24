import { Router } from 'express'

import {
  getBatchLeaderboard,
  getClassLeaderboard,
  getGamifiedLeaderboard,
} from '../controllers/leaderboardController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const leaderboardRouter = Router()

leaderboardRouter.use(authMiddleware, requireRole('teacher_admin', 'superadmin', 'student'))
leaderboardRouter.get('/class', asyncHandler(getClassLeaderboard))
leaderboardRouter.get('/batch', asyncHandler(getBatchLeaderboard))
leaderboardRouter.get('/gamified', asyncHandler(getGamifiedLeaderboard))

