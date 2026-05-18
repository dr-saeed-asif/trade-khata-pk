import { prisma } from '../config/prisma'
import { ApiError } from '../utils/api-error'
import { alertService } from './alert.service'
import { activityService } from './activity.service'
import { auditService } from './audit.service'
import { domainEvents } from '../architecture/domain-events'

interface BasePayload {
  itemId: string
  quantity: number
  note?: string
  reference?: string
}

export const stockService = {
  stockIn: async (
    payload: BasePayload & { destinationWarehouse?: string },
    userId?: string,
  ) => {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({ where: { id: payload.itemId } })
      if (!item) throw new ApiError(404, 'Item not found')

      const beforeQty = item.quantity
      const afterQty = beforeQty + payload.quantity
      const updated = await tx.item.update({
        where: { id: payload.itemId },
        data: { quantity: afterQty },
      })

      const movement = await tx.stockMovement.create({
        data: {
          itemId: payload.itemId,
          type: 'IN',
          quantity: payload.quantity,
          beforeQty,
          afterQty,
          note: payload.note,
          reference: payload.reference,
          destinationWarehouse: payload.destinationWarehouse,
          userId,
        },
      })

      return { updated, movement, beforeQty }
    })

    await activityService.create({
      action: 'STOCK_IN',
      entityType: 'ITEM',
      entityId: payload.itemId,
      description: `Stock IN ${payload.quantity}`,
      userId,
      itemId: payload.itemId,
    })
    await auditService.create({
      entityType: 'ITEM',
      entityId: payload.itemId,
      oldData: { quantity: result.beforeQty },
      newData: { quantity: result.updated.quantity },
      userId,
      itemId: payload.itemId,
    })
    await alertService.syncItemAlerts(payload.itemId)
    domainEvents.publish({
      type: 'inventory.stock.mutated',
      payload: { itemId: payload.itemId, movement: 'IN', quantity: payload.quantity },
    })
    return result
  },

  stockOut: async (payload: BasePayload & { sourceWarehouse?: string }, userId?: string) => {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({ where: { id: payload.itemId } })
      if (!item) throw new ApiError(404, 'Item not found')
      if (payload.quantity > item.quantity) throw new ApiError(400, 'Insufficient stock quantity')

      const beforeQty = item.quantity
      const afterQty = beforeQty - payload.quantity
      if (afterQty < item.reservedQty) {
        throw new ApiError(400, 'Cannot reduce stock below reserved quantity')
      }

      const updated = await tx.item.update({
        where: { id: payload.itemId },
        data: { quantity: afterQty },
      })

      const movement = await tx.stockMovement.create({
        data: {
          itemId: payload.itemId,
          type: 'OUT',
          quantity: payload.quantity,
          beforeQty,
          afterQty,
          note: payload.note,
          reference: payload.reference,
          sourceWarehouse: payload.sourceWarehouse,
          userId,
        },
      })

      return { updated, movement, beforeQty }
    })

    await activityService.create({
      action: 'STOCK_OUT',
      entityType: 'ITEM',
      entityId: payload.itemId,
      description: `Stock OUT ${payload.quantity}`,
      userId,
      itemId: payload.itemId,
    })
    await auditService.create({
      entityType: 'ITEM',
      entityId: payload.itemId,
      oldData: { quantity: result.beforeQty },
      newData: { quantity: result.updated.quantity },
      userId,
      itemId: payload.itemId,
    })
    await alertService.syncItemAlerts(payload.itemId)
    domainEvents.publish({
      type: 'inventory.stock.mutated',
      payload: { itemId: payload.itemId, movement: 'OUT', quantity: payload.quantity },
    })
    return result
  },

  transfer: async (
    payload: BasePayload & {
      sourceWarehouse: string
      destinationWarehouse: string
    },
    userId?: string,
  ) => {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({ where: { id: payload.itemId } })
      if (!item) throw new ApiError(404, 'Item not found')
      if (payload.quantity > item.quantity) throw new ApiError(400, 'Insufficient stock quantity')

      const beforeQty = item.quantity
      const afterQty = beforeQty
      const movement = await tx.stockMovement.create({
        data: {
          itemId: payload.itemId,
          type: 'TRANSFER',
          quantity: payload.quantity,
          beforeQty,
          afterQty,
          note: payload.note,
          reference: payload.reference,
          sourceWarehouse: payload.sourceWarehouse,
          destinationWarehouse: payload.destinationWarehouse,
          userId,
        },
      })
      return { item, movement }
    })

    await activityService.create({
      action: 'STOCK_TRANSFER',
      entityType: 'ITEM',
      entityId: payload.itemId,
      description: `Transferred ${payload.quantity} from ${payload.sourceWarehouse} to ${payload.destinationWarehouse}`,
      userId,
      itemId: payload.itemId,
    })
    await alertService.syncItemAlerts(payload.itemId)
    domainEvents.publish({
      type: 'inventory.stock.mutated',
      payload: { itemId: payload.itemId, movement: 'TRANSFER', quantity: payload.quantity },
    })
    return result
  },

  adjust: async (
    payload: BasePayload & { reason: 'DAMAGE' | 'LOSS' | 'RECOUNT' | 'MANUAL' },
    userId?: string,
  ) => {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({ where: { id: payload.itemId } })
      if (!item) throw new ApiError(404, 'Item not found')

      const beforeQty = item.quantity
      const afterQty = payload.quantity
      if (afterQty < item.reservedQty) {
        throw new ApiError(400, 'Adjusted quantity cannot be below reserved quantity')
      }

      const updated = await tx.item.update({
        where: { id: payload.itemId },
        data: { quantity: afterQty },
      })

      const movement = await tx.stockMovement.create({
        data: {
          itemId: payload.itemId,
          type: 'ADJUSTMENT',
          quantity: Math.abs(afterQty - beforeQty),
          beforeQty,
          afterQty,
          adjustmentReason: payload.reason,
          note: payload.note,
          reference: payload.reference,
          userId,
        },
      })
      return { updated, movement, beforeQty }
    })

    await activityService.create({
      action: 'STOCK_ADJUSTMENT',
      entityType: 'ITEM',
      entityId: payload.itemId,
      description: `Adjusted stock to ${payload.quantity} (${payload.reason})`,
      userId,
      itemId: payload.itemId,
    })
    await auditService.create({
      entityType: 'ITEM',
      entityId: payload.itemId,
      oldData: { quantity: result.beforeQty },
      newData: { quantity: result.updated.quantity, reason: payload.reason },
      userId,
      itemId: payload.itemId,
    })
    await alertService.syncItemAlerts(payload.itemId)
    domainEvents.publish({
      type: 'inventory.stock.mutated',
      payload: { itemId: payload.itemId, movement: 'ADJUSTMENT', quantity: payload.quantity, reason: payload.reason },
    })
    return result
  },

  history: async (filters?: { itemId?: string; type?: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT' }) => {
    const where: { itemId?: string; type?: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT' } = {}
    if (filters?.itemId) where.itemId = filters.itemId
    if (filters?.type) where.type = filters.type
    return prisma.stockMovement.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        item: { select: { id: true, name: true, sku: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  },
}
