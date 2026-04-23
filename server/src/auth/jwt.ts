import jwt from 'jsonwebtoken'

import { env } from '../config/env.js'
import type { AuthTokenPayload } from '../types/auth.js'

export const signJwt = (payload: AuthTokenPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })

export const verifyJwt = (token: string): AuthTokenPayload =>
  jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload
