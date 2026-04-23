import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { apiRouter } from './routes/index.js'

export const app = express()

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)
app.use(helmet())
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.use('/api', apiRouter)

app.use(notFoundHandler)
app.use(errorHandler)
