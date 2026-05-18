import { prisma } from '../config/prisma'

interface ActivityPayload {
  action: string
  entityType: string
  entityId: string
  description?: string
  userId?: string
  itemId?: string
}

export const activityService = {
  create: async (payload: ActivityPayload) =>
    prisma.activityLog.create({
      data: payload,
    }),
}
