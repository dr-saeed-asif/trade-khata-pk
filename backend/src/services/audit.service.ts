import { prisma } from '../config/prisma'

interface AuditPayload {
  entityType: string
  entityId: string
  oldData?: unknown
  newData?: unknown
  userId?: string
  itemId?: string
}

export const auditService = {
  create: async (payload: AuditPayload) =>
    prisma.auditTrail.create({
      data: {
        entityType: payload.entityType,
        entityId: payload.entityId,
        oldData: payload.oldData as object | undefined,
        newData: payload.newData as object | undefined,
        userId: payload.userId,
        itemId: payload.itemId,
      },
    }),
}
