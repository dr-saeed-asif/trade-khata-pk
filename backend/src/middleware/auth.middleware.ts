import type { Request, Response, NextFunction } from 'express'
import type { UserRole } from '@prisma/client'
import { ApiError } from '../utils/api-error'
import { verifyToken } from '../utils/jwt'
import { hasPermission, type Permission } from '../config/permissions'

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const authorization = req.headers.authorization
  if (!authorization?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authorization token is required'))
  }
  const token = authorization.replace('Bearer ', '')
  try {
    req.user = verifyToken(token)
    next()
  } catch {
    next(new ApiError(401, 'Invalid or expired token'))
  }
}

export const authorize =
  (roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions'))
    }
    next()
  }

export const authorizePermission =
  (permission: Permission) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(403, 'Insufficient permissions'))
    }

    const userPermissions = req.user.permissions
    if (Array.isArray(userPermissions) && userPermissions.length > 0) {
      if (!userPermissions.includes(permission)) {
        return next(new ApiError(403, 'Insufficient permissions'))
      }
      return next()
    }

    if (!hasPermission(req.user.role, permission)) {
      return next(new ApiError(403, 'Insufficient permissions'))
    }
    next()
  }
