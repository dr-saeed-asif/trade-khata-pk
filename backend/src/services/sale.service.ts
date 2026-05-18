import { Prisma, TransactionStatus } from '@prisma/client'
import { prisma } from '../config/prisma'
import { ApiError } from '../utils/api-error'
import { parsePagination } from '../utils/pagination'
import { calcLineTotal, calcTotals, nextInvoiceNo, type CommerceLineInput } from '../utils/commerce'
import { activityService } from './activity.service'
import { alertService } from './alert.service'

export interface SaleInput {
  partyId?: string
  saleDate?: string
  discount?: number
  notes?: string
  lines: CommerceLineInput[]
}

const saleInclude = {
  party: true,
  lines: { include: { item: { select: { id: true, name: true, sku: true } } } },
} as const

const mapSale = (sale: Prisma.SaleGetPayload<{ include: typeof saleInclude }>) => ({
  id: sale.id,
  invoiceNo: sale.invoiceNo,
  partyId: sale.partyId,
  party: sale.party
    ? { id: sale.party.id, name: sale.party.name, phone: sale.party.phone, type: sale.party.type }
    : null,
  status: sale.status,
  saleDate: sale.saleDate.toISOString(),
  subtotal: Number(sale.subtotal),
  discount: Number(sale.discount),
  total: Number(sale.total),
  notes: sale.notes,
  lines: sale.lines.map((line) => ({
    id: line.id,
    itemId: line.itemId,
    itemName: line.item.name,
    itemSku: line.item.sku,
    quantity: line.quantity,
    unitPrice: Number(line.unitPrice),
    lineTotal: Number(line.lineTotal),
  })),
  createdAt: sale.createdAt.toISOString(),
})

const buildSaleListWhere = (query?: {
  search?: string
  partyId?: string
  from?: string
  to?: string
}): Prisma.SaleWhereInput => {
  const where: Prisma.SaleWhereInput = {}

  if (query?.partyId === 'walk-in') {
    where.partyId = null
  } else if (query?.partyId) {
    where.partyId = query.partyId
  }

  if (query?.from || query?.to) {
    where.saleDate = {}
    if (query.from) where.saleDate.gte = new Date(query.from)
    if (query.to) {
      const to = new Date(query.to)
      to.setHours(23, 59, 59, 999)
      where.saleDate.lte = to
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

export const saleService = {
  list: async (query?: {
    page?: string
    limit?: string
    search?: string
    partyId?: string
    from?: string
    to?: string
  }) => {
    const { page, limit, skip } = parsePagination(query)
    const where = buildSaleListWhere(query)

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: saleInclude,
        skip,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ])

    return { data: sales.map(mapSale), total, page, limit }
  },

  getById: async (id: string) => {
    const sale = await prisma.sale.findUnique({ where: { id }, include: saleInclude })
    if (!sale) throw new ApiError(404, 'Sale not found')
    return mapSale(sale)
  },

  create: async (input: SaleInput, userId?: string) => {
    if (!input.lines.length) throw new ApiError(400, 'At least one line item is required')

    if (input.partyId) {
      const party = await prisma.party.findUnique({ where: { id: input.partyId } })
      if (!party) throw new ApiError(400, 'Party not found')
    }

    const itemIds = [...new Set(input.lines.map((l) => l.itemId))]
    const items = await prisma.item.findMany({ where: { id: { in: itemIds } } })
    if (items.length !== itemIds.length) throw new ApiError(400, 'One or more items are invalid')

    const itemMap = new Map(items.map((i) => [i.id, i]))
    for (const line of input.lines) {
      const item = itemMap.get(line.itemId)!
      if (line.quantity > item.quantity) {
        throw new ApiError(400, `Insufficient stock for "${item.name}" (available: ${item.quantity})`)
      }
    }

    const { subtotal, discount, total } = calcTotals(input.lines, input.discount ?? 0)
    const invoiceNo = await nextInvoiceNo('SALE', () => prisma.sale.count())
    const saleDate = input.saleDate ? new Date(input.saleDate) : new Date()

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          invoiceNo,
          partyId: input.partyId || null,
          status: TransactionStatus.CONFIRMED,
          saleDate,
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
        include: saleInclude,
      })

      for (const line of input.lines) {
        const item = itemMap.get(line.itemId)!
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
            note: `Sale ${invoiceNo}`,
            reference: invoiceNo,
            userId,
          },
        })
        item.quantity = afterQty
      }

      return created
    })

    for (const line of input.lines) {
      await alertService.syncItemAlerts(line.itemId)
    }

    await activityService.create({
      action: 'CREATE',
      entityType: 'SALE',
      entityId: sale.id,
      description: `Sale ${invoiceNo} created (Rs ${Number(total)})`,
      userId,
    })

    return mapSale(sale)
  },

  update: async (id: string, input: SaleInput, userId?: string) => {
    if (!input.lines.length) throw new ApiError(400, 'At least one line item is required')

    const existing = await prisma.sale.findUnique({
      where: { id },
      include: { lines: true },
    })
    if (!existing) throw new ApiError(404, 'Sale not found')
    if (existing.status === TransactionStatus.CANCELLED) {
      throw new ApiError(400, 'Cannot edit a cancelled sale')
    }

    if (input.partyId) {
      const party = await prisma.party.findUnique({ where: { id: input.partyId } })
      if (!party) throw new ApiError(400, 'Party not found')
    }

    const itemIds = [...new Set(input.lines.map((l) => l.itemId))]
    const items = await prisma.item.findMany({ where: { id: { in: itemIds } } })
    if (items.length !== itemIds.length) throw new ApiError(400, 'One or more items are invalid')

    const availableQty = new Map(items.map((i) => [i.id, i.quantity]))
    for (const line of existing.lines) {
      availableQty.set(line.itemId, (availableQty.get(line.itemId) ?? 0) + line.quantity)
    }

    const itemMap = new Map(items.map((i) => [i.id, i]))
    for (const line of input.lines) {
      const available = availableQty.get(line.itemId) ?? 0
      if (line.quantity > available) {
        const item = itemMap.get(line.itemId)!
        throw new ApiError(400, `Insufficient stock for "${item.name}" (available: ${available})`)
      }
    }

    const { subtotal, discount, total } = calcTotals(input.lines, input.discount ?? 0)
    const saleDate = input.saleDate ? new Date(input.saleDate) : existing.saleDate

    const sale = await prisma.$transaction(async (tx) => {
      for (const line of existing.lines) {
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
            note: `Edit reversal: Sale ${existing.invoiceNo}`,
            reference: existing.invoiceNo,
            userId,
          },
        })
      }

      await tx.saleLine.deleteMany({ where: { saleId: id } })

      const updated = await tx.sale.update({
        where: { id },
        data: {
          partyId: input.partyId || null,
          saleDate,
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
        include: saleInclude,
      })

      for (const line of input.lines) {
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
            note: `Sale ${existing.invoiceNo} (updated)`,
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
      entityType: 'SALE',
      entityId: sale.id,
      description: `Sale ${existing.invoiceNo} updated (Rs ${Number(total)})`,
      userId,
    })

    return mapSale(sale)
  },

  delete: async (id: string, userId?: string) => {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { lines: true },
    })
    if (!sale) throw new ApiError(404, 'Sale not found')
    if (sale.status === TransactionStatus.CANCELLED) {
      throw new ApiError(400, 'Sale is already cancelled')
    }

    await prisma.$transaction(async (tx) => {
      for (const line of sale.lines) {
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
            note: `Reversal: Sale ${sale.invoiceNo} deleted`,
            reference: sale.invoiceNo,
            userId,
          },
        })
      }
      await tx.sale.delete({ where: { id } })
    })

    for (const line of sale.lines) {
      await alertService.syncItemAlerts(line.itemId)
    }

    await activityService.create({
      action: 'DELETE',
      entityType: 'SALE',
      entityId: id,
      description: `Sale ${sale.invoiceNo} deleted`,
      userId,
    })
  },
}
