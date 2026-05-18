import type { NextFunction, Request, Response } from 'express'
import { locationService } from '../services/location.service'

export const locationController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await locationService.list(req.query.warehouseId ? String(req.query.warehouseId) : undefined))
    } catch (error) {
      next(error)
    }
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await locationService.create(req.body))
    } catch (error) {
      next(error)
    }
  },
  scan: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await locationService.scanByCode(String(req.params.code)))
    } catch (error) {
      next(error)
    }
  },
  items: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await locationService.itemsAtLocation(String(req.params.id)))
    } catch (error) {
      next(error)
    }
  },
}
