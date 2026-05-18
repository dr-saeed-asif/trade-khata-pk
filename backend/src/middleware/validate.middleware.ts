import type { Request, Response, NextFunction } from 'express'
import type { ZodType } from 'zod'

export const validate =
  <T>(schema: ZodType<T>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return next({
        statusCode: 400,
        message: parsed.error.issues.map((issue) => issue.message).join(', '),
      })
    }
    req.body = parsed.data
    next()
  }
