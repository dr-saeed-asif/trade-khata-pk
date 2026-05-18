import type { NextFunction, Request, Response } from 'express'
import { PartyType } from '@prisma/client'
import { partyService } from '../services/party.service'

export const partyController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await partyService.create(req.body, req.user?.userId))
    } catch (error) {
      next(error)
    }
  },
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = req.query.type as PartyType | undefined
      res.json(
        await partyService.list({
          type,
          search: req.query.search as string | undefined,
          page: req.query.page as string | undefined,
          limit: req.query.limit as string | undefined,
        }),
      )
    } catch (error) {
      next(error)
    }
  },
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await partyService.getById(String(req.params.id)))
    } catch (error) {
      next(error)
    }
  },
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await partyService.update(String(req.params.id), req.body, req.user?.userId))
    } catch (error) {
      next(error)
    }
  },
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await partyService.delete(String(req.params.id), req.user?.userId)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  },
}
