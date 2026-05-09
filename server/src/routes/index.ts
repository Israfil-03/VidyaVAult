import { Router } from 'express'

import { adminRouter } from './adminRoutes.js'
import { aiRouter } from './aiRoutes.js'
import { authRouter } from './authRoutes.js'
import { prisma } from '../prisma/client.js'
import { instituteAdminRouter } from './instituteAdminRoutes.js'
import { leaderboardRouter } from './leaderboardRoutes.js'
import { rewardRouter } from './rewardRoutes.js'
import { studentRouter } from './studentRoutes.js'
import { teacherRouter } from './teacherRoutes.js'
import { testRouter } from './testRoutes.js'

export const apiRouter = Router()

apiRouter.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({
      success: true,
      data: { status: 'ok', database: 'connected' },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      data: { status: 'error', database: 'disconnected' },
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

apiRouter.use('/auth', authRouter)
apiRouter.use('/admin', adminRouter)
apiRouter.use('/teacher', teacherRouter)
apiRouter.use('/tests', testRouter)
apiRouter.use('/student', studentRouter)
apiRouter.use('/rewards', rewardRouter)
apiRouter.use('/leaderboards', leaderboardRouter)
apiRouter.use('/institute-admin', instituteAdminRouter)
apiRouter.use('/ai', aiRouter)
