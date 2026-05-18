import type { NextFunction, Request, Response } from 'express'
import { adminService } from '../services/admin.service'

export const adminController = {
  users: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await adminService.listUsers())
    } catch (error) {
      next(error)
    }
  },

  createUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await adminService.createUser(req.body, req.user?.userId)
      res.status(201).json(user)
    } catch (error) {
      next(error)
    }
  },

  updateUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await adminService.updateUser(String(req.params.id), req.body, req.user?.userId)
      res.json(user)
    } catch (error) {
      next(error)
    }
  },

  deleteUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await adminService.deleteUser(String(req.params.id), req.user?.userId)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  },

  roles: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await adminService.listRoles())
    } catch (error) {
      next(error)
    }
  },

  createRole: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = await adminService.createRole(req.body, req.user?.userId)
      res.status(201).json(role)
    } catch (error) {
      next(error)
    }
  },

  updateRole: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = await adminService.updateRole(String(req.params.id), req.body, req.user?.userId)
      res.json(role)
    } catch (error) {
      next(error)
    }
  },

  deleteRole: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await adminService.deleteRole(String(req.params.id), req.user?.userId)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  },
}