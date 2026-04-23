import type { NextFunction, Request, Response } from 'express'

import { verifyJwt } from '../auth/jwt.js'
import { env } from '../config/env.js'
import type { TokenRole } from '../types/auth.js'
import { ApiError } from '../utils/apiError.js'

export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    next(new ApiError('Authorization token is required', 401))
    return
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    next(new ApiError('Authorization token is required', 401))
    return
  }

  try {
    req.user = verifyJwt(token)
    next()
  } catch {
    next(new ApiError('Invalid or expired token', 401))
  }
}

export const requireRole =
  (...roles: TokenRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError('Unauthorized', 401))
      return
    }

    if (!roles.includes(req.user.role)) {
      next(new ApiError('Forbidden', 403))
      return
    }

    next()
  }

export const requireInternalAiToken = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const token = req.headers['x-internal-ai-token']
  if (token !== env.INTERNAL_AI_TOKEN) {
    next(new ApiError('Invalid internal AI token', 401))
    return
  }

  next()
}
