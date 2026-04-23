import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

import { ApiError } from '../utils/apiError.js'

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new ApiError('Route not found', 404))
}

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  void next
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: error.flatten(),
      },
    })
    return
  }

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        details: error.details,
      },
    })
    return
  }

  console.error(error)
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
    },
  })
}
