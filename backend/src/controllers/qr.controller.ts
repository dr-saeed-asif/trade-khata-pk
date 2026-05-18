import type { NextFunction, Request, Response } from 'express'
import { itemService } from '../services/item.service'

export const qrController = {
  getItemByCode: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await itemService.getByCode(String(req.params.code))
      res.json(item)
    } catch (error) {
      next(error)
    }
  },
}
