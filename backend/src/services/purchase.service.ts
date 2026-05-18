import { Prisma, TransactionStatus } from '@prisma/client'
import { prisma } from '../config/prisma'
import { ApiError } from '../utils/api-error'
import { parsePagination } from '../utils/pagination'
import { calcLineTotal, calcTotals, nextInvoiceNo, type CommerceLineInput } from '../utils/commerce'
import { activityService } from './activity.service'
import { alertService } from './alert.service'

export interface PurchaseInput {
  partyId?: string
  purchaseDate?: string
  discount?: number
  notes?: string
  lines: CommerceLineInput[]
}

const purchaseInclude = {
  party: true,
  lines: { include: { item: { select: { id: true, name: true, sku: true } } } },
} as const

const mapPurchase = (purchase: Prisma.PurchaseGetPayload<{ include: typeof purchaseInclude }>) => ({
  id: purchase.id,
  invoiceNo: purchase.invoiceNo,
  partyId: purchase.partyId,
  party: purchase.party
    ? { id: purchase.party.id, name: purchase.party.name, phone: purchase.party.phone, type: purchase.party.type }
    : null,
  status: purchase.status,
  purchaseDate: purchase.purchaseDate.toISOString(),
  subtotal: Number(purchase.subtotal),
  discount: Number(purchase.discount),
  total: Number(purchase.total),
  notes: purchase.notes,
  lines: purchase.lines.map((line) => ({
    id: line.id,
    itemId: line.itemId,
    itemName: line.item.name,
    itemSku: line.item.sku,
    quantity: line.quantity,
    unitPrice: Number(line.unitPrice),
    lineTotal: Number(line.lineTotal),
  })),
  createdAt: purchase.createdAt.toISOString(),
})

const buildPurchaseListWhere = (query?: {
  search?: string
  partyId?: string
  from?: string
  to?: string
}): Prisma.PurchaseWhereInput => {
  const where: Prisma.PurchaseWhereInput = {}

  if (query?.partyId === 'walk-in') {
    where.partyId = null
  } else if (query?.partyId) {
    where.partyId = query.partyId
  }

  if (query?.from || query?.to) {
    where.purchaseDate = {}
    if (query.from) where.purchaseDate.gte = new Date(query.from)
    if (query.to) {
      const to = new Date(query.to)
      to.setHours(23, 59, 59, 999)
      where.purchaseDate.lte = to
    }
  }

  const search = query?.search?.trim()
  if (search) {
    where.OR = [
      { invoiceNo: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { party: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }

  return where
}

export const purchaseService = {
  list: async (query?: {
    page?: string
    limit?: string
    search?: string
    partyId?: string
    from?: string
    to?: string
  }) => {
    const { page, limit, skip } = parsePagination(query)
    const where = buildPurchaseListWhere(query)

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: purchaseInclude,
        skip,
        take: limit,
      }),
      prisma.purchase.count({ where }),
    ])

    return { data: purchases.map(mapPurchase), total, page, limit }
  },

  getById: async (id: string) => {
    const purchase = await prisma.purchase.findUnique({ where: { id }, include: purchaseInclude })
    if (!purchase) throw new ApiError(404, 'Purchase not found')
    return mapPurchase(purchase)
  },

  create: async (input: PurchaseInput, userId?: string) => {
    if (!input.lines.length) throw new ApiError(400, 'At least one line item is required')

    if (input.partyId) {
      const party = await prisma.party.findUnique({ where: { id: input.partyId } })
      if (!party) throw new ApiError(400, 'Party not found')
    }

    const itemIds = [...new Set(input.lines.map((l) => l.itemId))]
    const items = await prisma.item.findMany({ where: { id: { in: itemIds } } })
    if (items.length !== itemIds.length) throw new ApiError(400, 'One or more items are invalid')

    const { subtotal, discount, total } = calcTotals(input.lines, input.discount ?? 0)
    const invoiceNo = await nextInvoiceNo('PUR', () => prisma.purchase.count())
    const purchaseDate = input.purchaseDate ? new Date(input.purchaseDate) : new Date()

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          invoiceNo,
          partyId: input.partyId || null,
          status: TransactionStatus.CONFIRMED,
          purchaseDate,
          subtotal,
          discount,
          total,
          notes: input.notes?.trim() || null,
          createdById: userId || null,
          lines: {
            create: input.lines.map((line) => ({
              itemId: line.itemId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: calcLineTotal(line.quantity, line.unitPrice),
            })),
          },
        },
        include: purchaseInclude,
      })

      for (const line of input.lines) {
        const item = await tx.item.findUnique({ where: { id: line.itemId } })
        if (!item) continue
        const beforeQty = item.quantity
        const afterQty = beforeQty + line.quantity
        await tx.item.update({ where: { id: line.itemId }, data: { quantity: afterQty } })
        await tx.stockMovement.create({
          data: {
            itemId: line.itemId,
            type: 'IN',
            quantity: line.quantity,
            beforeQty,
            afterQty,
            note: `Purchase ${invoiceNo}`,
            reference: invoiceNo,
            userId,
          },
        })
      }

      return created
    })

    for (const line of input.lines) {
      await alertService.syncItemAlerts(line.itemId)
    }

    await activityService.create({
      action: 'CREATE',
      entityType: 'PURCHASE',
      entityId: purchase.id,
      description: `Purchase ${invoiceNo} created (Rs ${Number(total)})`,
      userId,
    })

    return mapPurchase(purchase)
  },

  update: async (id: string, input: PurchaseInput, userId?: string) => {
    if (!input.lines.length) throw new ApiError(400, 'At least one line item is required')

    const existing = await prisma.purchase.findUnique({
      where: { id },
      include: { lines: true },
    })
    if (!existing) throw new ApiError(404, 'Purchase not found')
    if (existing.status === TransactionStatus.CANCELLED) {
      throw new ApiError(400, 'Cannot edit a cancelled purchase')
    }

    if (input.partyId) {
      const party = await prisma.party.findUnique({ where: { id: input.partyId } })
      if (!party) throw new ApiError(400, 'Party not found')
    }

    const itemIds = [...new Set(input.lines.map((l) => l.itemId))]
    const items = await prisma.item.findMany({ where: { id: { in: itemIds } } })
    if (items.length !== itemIds.length) throw new ApiError(400, 'One or more items are invalid')

    for (const line of existing.lines) {
      const item = await prisma.item.findUnique({ where: { id: line.itemId } })
      if (!item) continue
      if (line.quantity > item.quantity) {
        throw new ApiError(
          400,
          `Cannot update purchase: insufficient stock to reverse "${item.name}" (available: ${item.quantity})`,
        )
      }
    }

    const { subtotal, discount, total } = calcTotals(input.lines, input.discount ?? 0)
    const purchaseDate = input.purchaseDate ? new Date(input.purchaseDate) : existing.purchaseDate

    const purchase = await prisma.$transaction(async (tx) => {
      for (const line of existing.lines) {
        const item = await tx.item.findUnique({ where: { id: line.itemId } })
        if (!item) continue
        const beforeQty = item.quantity
        const afterQty = beforeQty - line.quantity
        await tx.item.update({ where: { id: line.itemId }, data: { quantity: afterQty } })
        await tx.stockMovement.create({
          data: {
            itemId: line.itemId,
            type: 'OUT',
            quantity: line.quantity,
            beforeQty,
            afterQty,
            note: `Edit reversal: Purchase ${existing.invoiceNo}`,
            reference: existing.invoiceNo,
            userId,
          },
        })
      }

      await tx.purchaseLine.deleteMany({ where: { purchaseId: id } })

      const updated = await tx.purchase.update({
        where: { id },
        data: {
          partyId: input.partyId || null,
          purchaseDate,
          subtotal,
          discount,
          total,
          notes: input.notes?.trim() || null,
          lines: {
            create: input.lines.map((line) => ({
              itemId: line.itemId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: calcLineTotal(line.quantity, line.unitPrice),
            })),
          },
        },
        include: purchaseInclude,
      })

      for (const line of input.lines) {
        const item = await tx.item.findUnique({ where: { id: line.itemId } })
        if (!item) continue
        const beforeQty = item.quantity
        const afterQty = beforeQty + line.quantity
        await tx.item.update({ where: { id: line.itemId }, data: { quantity: afterQty } })
        await tx.stockMovement.create({
          data: {
            itemId: line.itemId,
            type: 'IN',
            quantity: line.quantity,
            beforeQty,
            afterQty,
            note: `Purchase ${existing.invoiceNo} (updated)`,
            reference: existing.invoiceNo,
            userId,
          },
        })
      }

      return updated
    })

    for (const line of [...existing.lines, ...input.lines]) {
      await alertService.syncItemAlerts(line.itemId)
    }

    await activityService.create({
      action: 'UPDATE',
      entityType: 'PURCHASE',
      entityId: purchase.id,
      description: `Purchase ${existing.invoiceNo} updated (Rs ${Number(total)})`,
      userId,
    })

    return mapPurchase(purchase)
  },

  delete: async (id: string, userId?: string) => {
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: { lines: true },
    })
    if (!purchase) throw new ApiError(404, 'Purchase not found')

    await prisma.$transaction(async (tx) => {
      for (const line of purchase.lines) {
        const item = await tx.item.findUnique({ where: { id: line.itemId } })
        if (!item) continue
        if (line.quantity > item.quantity) {
          throw new ApiError(
            400,
            `Cannot delete purchase: insufficient stock to reverse "${item.name}"`,
          )
        }
        const beforeQty = item.quantity
        const afterQty = beforeQty - line.quantity
        await tx.item.update({ where: { id: line.itemId }, data: { quantity: afterQty } })
        await tx.stockMovement.create({
          data: {
            itemId: line.itemId,
            type: 'OUT',
            quantity: line.quantity,
            beforeQty,
            afterQty,
            note: `Reversal: Purchase ${purchase.invoiceNo} deleted`,
            reference: purchase.invoiceNo,
            userId,
          },
        })
      }
      await tx.purchase.delete({ where: { id } })
    })

    for (const line of purchase.lines) {
      await alertService.syncItemAlerts(line.itemId)
    }

    await activityService.create({
      action: 'DELETE',
      entityType: 'PURCHASE',
      entityId: id,
      description: `Purchase ${purchase.invoiceNo} deleted`,
      userId,
    })
  },
}
