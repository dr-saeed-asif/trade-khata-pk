import type { NextFunction, Request, Response } from 'express'
import { alertService } from '../services/alert.service'

export const alertController = {
  list: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await alertService.list())
    } catch (error) {
      next(error)
    }
  },
  summary: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await alertService.summary())
    } catch (error) {
      next(error)
    }
  },
  refresh: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await alertService.refreshAll())
    } catch (error) {
      next(error)
    }
  },
  markRead: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await alertService.markRead(String(req.params.id)))
    } catch (error) {
      next(error)
    }
  },
  markAllRead: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await alertService.markAllRead())
    } catch (error) {
      next(error)
    }
  },
}
