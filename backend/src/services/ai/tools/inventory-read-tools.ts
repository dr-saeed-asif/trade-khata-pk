import { prisma } from '../../../config/prisma'
import { env } from '../../../config/env'
import { itemService } from '../../item.service'
import { reportService } from '../../report.service'

const dayMs = 24 * 60 * 60 * 1000

const parseDays = (value?: unknown) => {
  const parsed = Number(value ?? 30)
  if (!Number.isFinite(parsed)) return 30
  return Math.max(1, Math.min(365, Math.floor(parsed)))
}

const parseLimit = (value?: unknown, fallback = 10) => {
  const parsed = Number(value ?? fallback)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.min(50, Math.floor(parsed)))
}

export const inventoryReadTools = {
  getInventorySummary: async () => {
    const [itemCount, categoryCount, aggregate, lowStockCount] = await Promise.all([
      prisma.item.count(),
      prisma.category.count(),
      prisma.item.aggregate({ _sum: { quantity: true, reservedQty: true } }),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint as count FROM "Item" WHERE quantity <= "lowStockAt"
      `,
    ])
    const totalStock = aggregate._sum.quantity ?? 0
    const totalReserved = aggregate._sum.reservedQty ?? 0
    return {
      totalItems: itemCount,
      totalCategories: categoryCount,
      totalStockQuantity: totalStock,
      totalReservedQuantity: totalReserved,
      totalAvailableQuantity: Math.max(0, totalStock - totalReserved),
      lowStockItemCount: Number(lowStockCount[0]?.count ?? 0),
    }
  },

  getLowStockItems: async (args?: { limit?: number }) => {
    const items = await reportService.lowStock()
    const limit = parseLimit(args?.limit, 20)
    const list = Array.isArray(items) ? items.slice(0, limit) : []
    return {
      count: Array.isArray(items) ? items.length : 0,
      items: list.map((item: Record<string, unknown>) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        lowStockAt: item.lowStockAt,
        categoryName: item.categoryName,
        supplier: item.supplier,
        location: item.location,
      })),
    }
  },

  getExpiringItems: async (args?: { days?: number; limit?: number }) => {
    const days = parseDays(args?.days ?? env.alertExpiryWindowDays)
    const limit = parseLimit(args?.limit, 20)
    const until = new Date(Date.now() + days * dayMs)
    const items = await prisma.item.findMany({
      where: {
        expiryDate: { lte: until, not: null },
        quantity: { gt: 0 },
      },
      include: { category: true },
      orderBy: { expiryDate: 'asc' },
      take: limit,
    })
    return {
      windowDays: days,
      count: items.length,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        expiryDate: item.expiryDate?.toISOString() ?? null,
        category: item.category.name,
        supplier: item.supplier,
      })),
    }
  },

  searchItemBySkuOrName: async (args: { query: string; limit?: number }) => {
    const limit = parseLimit(args.limit, 10)
    const result = await itemService.list({ page: '1', limit: String(limit), search: args.query })
    return {
      query: args.query,
      total: result.total,
      items: result.data.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        reservedQty: item.reservedQty,
        availableQty: Math.max(0, item.quantity - item.reservedQty),
        category: item.category?.name,
        supplier: item.supplier,
        location: item.location,
      })),
    }
  },

  getItemDetails: async (args: { itemId?: string; sku?: string }) => {
    if (args.itemId) {
      const item = await itemService.getById(args.itemId)
      return item
    }
    if (args.sku) {
      const found = await prisma.item.findUnique({
        where: { sku: args.sku },
        include: { category: true },
      })
      if (!found) return { error: 'Item not found' }
      return found
    }
    return { error: 'itemId or sku is required' }
  },

  getStockMovementHistory: async (args?: { itemId?: string; days?: number; limit?: number }) => {
    const days = parseDays(args?.days)
    const limit = parseLimit(args?.limit, 20)
    const from = new Date(Date.now() - days * dayMs)
    const movements = await prisma.stockMovement.findMany({
      where: {
        createdAt: { gte: from },
        ...(args?.itemId ? { itemId: args.itemId } : {}),
      },
      include: {
        item: { select: { name: true, sku: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return {
      days,
      count: movements.length,
      movements: movements.map((m) => ({
        id: m.id,
        itemName: m.item.name,
        sku: m.item.sku,
        type: m.type,
        quantity: m.quantity,
        beforeQty: m.beforeQty,
        afterQty: m.afterQty,
        note: m.note,
        createdAt: m.createdAt.toISOString(),
        userName: m.user?.name ?? null,
      })),
    }
  },

  getFastMovingItems: async (args?: { days?: number; limit?: number }) => {
    const days = parseDays(args?.days)
    const limit = parseLimit(args?.limit, 10)
    const movers = await reportService.movers(String(days))
    return {
      days,
      items: movers.fastMoving.slice(0, limit),
    }
  },

  getSlowMovingItems: async (args?: { days?: number; limit?: number }) => {
    const days = parseDays(args?.days)
    const limit = parseLimit(args?.limit, 10)
    const movers = await reportService.movers(String(days))
    return {
      days,
      items: movers.slowMoving.slice(0, limit),
    }
  },

  getReorderSuggestions: async (args?: { limit?: number }) => {
    const limit = parseLimit(args?.limit, 20)
    const items = await reportService.lowStock()
    const list = Array.isArray(items) ? items.slice(0, limit) : []
    return {
      count: list.length,
      suggestions: list.map((item: Record<string, unknown>) => {
        const quantity = Number(item.quantity ?? 0)
        const lowStockAt = Number(item.lowStockAt ?? 5)
        const suggestedReorderQty = Math.max(lowStockAt * 2 - quantity, lowStockAt)
        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          currentQuantity: quantity,
          lowStockAt,
          suggestedReorderQty,
          supplier: item.supplier,
          priority: quantity <= 0 ? 'critical' : quantity <= Math.floor(lowStockAt / 2) ? 'high' : 'medium',
        }
      }),
    }
  },

  getSalesSummary: async (args?: { days?: number }) => {
    const days = parseDays(args?.days)
    const from = new Date(Date.now() - days * dayMs)
    const [count, aggregate] = await Promise.all([
      prisma.sale.count({ where: { saleDate: { gte: from }, status: 'CONFIRMED' } }),
      prisma.sale.aggregate({
        where: { saleDate: { gte: from }, status: 'CONFIRMED' },
        _sum: { total: true, subtotal: true, discount: true },
      }),
    ])
    return {
      days,
      from: from.toISOString(),
      saleCount: count,
      subtotal: Number(aggregate._sum.subtotal ?? 0),
      discount: Number(aggregate._sum.discount ?? 0),
      totalRevenue: Number(aggregate._sum.total ?? 0),
    }
  },

  getPurchaseSummary: async (args?: { days?: number }) => {
    const days = parseDays(args?.days)
    const from = new Date(Date.now() - days * dayMs)
    const [count, aggregate] = await Promise.all([
      prisma.purchase.count({ where: { purchaseDate: { gte: from }, status: 'CONFIRMED' } }),
      prisma.purchase.aggregate({
        where: { purchaseDate: { gte: from }, status: 'CONFIRMED' },
        _sum: { total: true, subtotal: true, discount: true },
      }),
    ])
    return {
      days,
      from: from.toISOString(),
      purchaseCount: count,
      subtotal: Number(aggregate._sum.subtotal ?? 0),
      discount: Number(aggregate._sum.discount ?? 0),
      totalSpend: Number(aggregate._sum.total ?? 0),
    }
  },
}

export type InventoryReadToolName = keyof typeof inventoryReadTools
