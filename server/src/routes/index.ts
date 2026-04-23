import { Router } from 'express'

import { adminRouter } from './adminRoutes.js'
import { aiRouter } from './aiRoutes.js'
import { authRouter } from './authRoutes.js'
import { leaderboardRouter } from './leaderboardRoutes.js'
import { rewardRouter } from './rewardRoutes.js'
import { studentRouter } from './studentRoutes.js'
import { teacherRouter } from './teacherRoutes.js'
import { testRouter } from './testRoutes.js'

export const apiRouter = Router()

apiRouter.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: { status: 'ok' },
  })
})

apiRouter.use('/auth', authRouter)
apiRouter.use('/admin', adminRouter)
apiRouter.use('/teacher', teacherRouter)
apiRouter.use('/tests', testRouter)
apiRouter.use('/student', studentRouter)
apiRouter.use('/rewards', rewardRouter)
apiRouter.use('/leaderboards', leaderboardRouter)
apiRouter.use('/ai', aiRouter)
