import type { NextFunction, Request, Response } from 'express'
import { scanService } from '../services/scan.service'

export const scanController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scan = await scanService.create(req.body.qrCode, req.body.note, req.user?.userId)
      res.status(201).json(scan)
    } catch (error) {
      next(error)
    }
  },
}
