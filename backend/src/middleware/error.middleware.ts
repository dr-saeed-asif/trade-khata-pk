import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../utils/api-error'

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction) => {
  next(new ApiError(404, 'Route not found'))
}

export const errorHandler = (
  err: Error | ApiError | { statusCode?: number; message?: string },
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const statusCode =
    err instanceof ApiError
      ? err.statusCode
      : typeof err === 'object' && err !== null && 'statusCode' in err
        ? ((err as { statusCode?: number }).statusCode ?? 500)
        : 500
  const message = err.message ?? 'Internal server error'
  res.status(statusCode).json({ message })
}
