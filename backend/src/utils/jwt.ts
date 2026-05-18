import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import type { UserRole } from '@prisma/client'
import { env } from '../config/env'

export interface JwtPayload {
  userId: string
  role: UserRole
  permissions?: string[]
}

export const signToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as SignOptions)

export const verifyToken = (token: string) => jwt.verify(token, env.jwtSecret) as JwtPayload
