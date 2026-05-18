import type { NextFunction, Request, Response } from 'express'
import { stockService } from '../services/stock.service'

export const stockController = {
  stockIn: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await stockService.stockIn(req.body, req.user?.userId)
      res.status(201).json(data)
    } catch (error) {
      next(error)
    }
  },
  stockOut: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await stockService.stockOut(req.body, req.user?.userId)
      res.status(201).json(data)
    } catch (error) {
      next(error)
    }
  },
  transfer: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await stockService.transfer(req.body, req.user?.userId)
      res.status(201).json(data)
    } catch (error) {
      next(error)
    }
  },
  adjust: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await stockService.adjust(req.body, req.user?.userId)
      res.status(201).json(data)
    } catch (error) {
      next(error)
    }
  },
  history: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const itemId = typeof req.query.itemId === 'string' ? req.query.itemId : undefined
      const typeParam = typeof req.query.type === 'string' ? req.query.type : undefined
      const type =
        typeParam === 'IN' || typeParam === 'OUT' || typeParam === 'TRANSFER' || typeParam === 'ADJUSTMENT'
          ? typeParam
          : undefined
      const data = await stockService.history({ itemId, type })
      res.json(data)
    } catch (error) {
      next(error)
    }
  },
}
