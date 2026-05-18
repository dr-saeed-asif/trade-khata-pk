import type { NextFunction, Request, Response } from 'express'
import { aiService } from '../services/ai'
import { ragService } from '../services/rag'

export const aiController = {
  chat: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await aiService.chat(req.body, req.user)
      res.json(data)
    } catch (error) {
      next(error)
    }
  },
  ingestRagDocument: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await ragService.ingestDocument(req.body)
      if (!data.success) {
        res.status(400).json({ message: data.message })
        return
      }
      res.status(201).json(data)
    } catch (error) {
      next(error)
    }
  },
  listRagSources: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await ragService.listSources()
      res.json(data)
    } catch (error) {
      next(error)
    }
  },
  analytics: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedDays = Number(req.query.days ?? 7)
      const days = Number.isFinite(parsedDays) ? Math.max(1, Math.min(90, Math.floor(parsedDays))) : 7
      const data = await aiService.analytics(days)
      res.json(data)
    } catch (error) {
      next(error)
    }
  },
  history: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' })
        return
      }
      const parsedLimit = Number(req.query.limit ?? 20)
      const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(100, Math.floor(parsedLimit))) : 20
      const data = await aiService.history(req.user.userId, limit)
      res.json(data)
    } catch (error) {
      next(error)
    }
  },
}
