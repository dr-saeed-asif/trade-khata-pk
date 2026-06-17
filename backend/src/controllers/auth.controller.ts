import type { Request, Response, NextFunction } from 'express'
import { authService } from '../services/auth.service'

export const authController = {
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(req.body)
      res.status(201).json(result)
    } catch (error) {
      next(error)
    }
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  forgotPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.forgotPassword(req.body)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  refresh: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Unauthorized' })
        return
      }
      const result = await authService.refreshSession(req.user.userId)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  profile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Unauthorized' })
        return
      }
      const result = await authService.getProfile(req.user.userId)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  updateProfile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Unauthorized' })
        return
      }
      const result = await authService.updateProfile(req.user.userId, req.body)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  changePassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Unauthorized' })
        return
      }
      const result = await authService.changePassword(req.user.userId, req.body)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  deleteAccount: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Unauthorized' })
        return
      }
      const result = await authService.deleteAccount(req.user.userId, req.body)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },
}
