import type { NextFunction, Request, Response } from 'express'
import { warehouseService } from '../services/warehouse.service'

export const warehouseController = {
  list: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await warehouseService.list())
    } catch (error) {
      next(error)
    }
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await warehouseService.create(req.body))
    } catch (error) {
      next(error)
    }
  },
}
