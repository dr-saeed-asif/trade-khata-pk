import { stringify } from 'csv-stringify/sync'
import XLSX from 'xlsx'
import { prisma } from '../config/prisma'

const dayMs = 24 * 60 * 60 * 1000

const parseDays = (value?: string) => {
  const parsed = Number(value ?? 30)
  if (!Number.isFinite(parsed)) return 30
  return Math.max(1, Math.min(365, Math.floor(parsed)))
}

export const reportService = {
  exportCsv: async () => {
    const items = await prisma.item.findMany({
      include: {
        category: true,
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    })
    return stringify(
      items.map((item) => ({
        name: item.name,
        sku: item.sku,
        category: item.category.name,
        categories: item.categories.map((link) => link.category.name).join('|'),
        tags: item.tags.map((link) => link.tag.name).join('|'),
        quantity: item.quantity,
        reservedQty: item.reservedQty,
        availableQty: Math.max(0, item.quantity - item.reservedQty),
        location: item.location,
        supplier: item.supplier,
        price: Number(item.price),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      { header: true },
    )
  },
  exportExcel: async () => {
    const items = await prisma.item.findMany({
      include: {
        category: true,
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    })
    const rows = items.map((item) => ({
      Name: item.name,
      SKU: item.sku,
      PrimaryCategory: item.category.name,
      Categories: item.categories.map((link) => link.category.name).join(', '),
      Tags: item.tags.map((link) => link.tag.name).join(', '),
      Quantity: item.quantity,
      ReservedQty: item.reservedQty,
      AvailableQty: Math.max(0, item.quantity - item.reservedQty),
      Location: item.location,
      Supplier: item.supplier,
      Price: Number(item.price),
      CreatedAt: item.createdAt.toISOString(),
      UpdatedAt: item.updatedAt.toISOString(),
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory')
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
  },

  lowStock: async () =>
    prisma.$queryRaw`
      SELECT i.*, c.name as "categoryName"
      FROM "Item" i
      JOIN "Category" c ON i."categoryId" = c.id
      WHERE i.quantity <= i."lowStockAt"
      ORDER BY i.quantity ASC
    `,

  recent: async () =>
    prisma.item.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),

  stockMovementTrend: async (daysQuery?: string) => {
    const days = parseDays(daysQuery)
    const from = new Date(Date.now() - days * dayMs)

    const movements = await prisma.stockMovement.findMany({
      where: { createdAt: { gte: from } },
      select: {
        type: true,
        quantity: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    const byDay = new Map<
      string,
      { date: string; in: number; out: number; transfer: number; adjustment: number; total: number }
    >()

    for (const movement of movements) {
      const date = movement.createdAt.toISOString().slice(0, 10)
      const row = byDay.get(date) ?? {
        date,
        in: 0,
        out: 0,
        transfer: 0,
        adjustment: 0,
        total: 0,
      }

      if (movement.type === 'IN') row.in += movement.quantity
      if (movement.type === 'OUT') row.out += movement.quantity
      if (movement.type === 'TRANSFER') row.transfer += movement.quantity
      if (movement.type === 'ADJUSTMENT') row.adjustment += movement.quantity
      row.total += movement.quantity

      byDay.set(date, row)
    }

    return {
      days,
      from: from.toISOString(),
      to: new Date().toISOString(),
      series: Array.from(byDay.values()),
      totals: {
        in: movements.filter((row) => row.type === 'IN').reduce((sum, row) => sum + row.quantity, 0),
        out: movements.filter((row) => row.type === 'OUT').reduce((sum, row) => sum + row.quantity, 0),
        transfer: movements
          .filter((row) => row.type === 'TRANSFER')
          .reduce((sum, row) => sum + row.quantity, 0),
        adjustment: movements
          .filter((row) => row.type === 'ADJUSTMENT')
          .reduce((sum, row) => sum + row.quantity, 0),
      },
    }
  },

  movers: async (daysQuery?: string) => {
    const days = parseDays(daysQuery)
    const from = new Date(Date.now() - days * dayMs)

    const [items, outMovements] = await Promise.all([
      prisma.item.findMany({
        select: { id: true, name: true, sku: true, quantity: true, price: true },
      }),
      prisma.stockMovement.findMany({
        where: {
          type: 'OUT',
          createdAt: { gte: from },
        },
        select: { itemId: true, quantity: true },
      }),
    ])

    const soldByItem = new Map<string, number>()
    for (const row of outMovements) {
      soldByItem.set(row.itemId, (soldByItem.get(row.itemId) ?? 0) + row.quantity)
    }

    const ranked = items
      .map((item) => {
        const soldQty = soldByItem.get(item.id) ?? 0
        const turnoverRatio = item.quantity > 0 ? Number((soldQty / item.quantity).toFixed(2)) : soldQty > 0 ? soldQty : 0
        return {
          itemId: item.id,
          name: item.name,
          sku: item.sku,
          soldQty,
          onHandQty: item.quantity,
          turnoverRatio,
          estimatedRevenue: Number(item.price) * soldQty,
        }
      })

    const fastMoving = [...ranked].sort((a, b) => b.soldQty - a.soldQty).slice(0, 10)
    const slowMoving = [...ranked].sort((a, b) => a.soldQty - b.soldQty).slice(0, 10)

    return {
      days,
      from: from.toISOString(),
      to: new Date().toISOString(),
      fastMoving,
      slowMoving,
    }
  },

  profitLoss: async (daysQuery?: string) => {
    const days = parseDays(daysQuery)
    const from = new Date(Date.now() - days * dayMs)

    const movements = await prisma.stockMovement.findMany({
      where: { createdAt: { gte: from } },
      select: {
        type: true,
        quantity: true,
        item: { select: { price: true } },
      },
    })

    let revenue = 0
    let expense = 0
    for (const movement of movements) {
      const price = Number(movement.item.price)
      const amount = movement.quantity * price
      if (movement.type === 'OUT') revenue += amount
      if (movement.type === 'IN') expense += amount
    }

    const grossProfit = revenue - expense
    const marginPct = revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(2)) : 0

    return {
      days,
      from: from.toISOString(),
      to: new Date().toISOString(),
      revenue: Number(revenue.toFixed(2)),
      expense: Number(expense.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      marginPct,
      note: 'Calculated from stock OUT (revenue proxy) and stock IN (cost proxy) using current item price.',
    }
  },
}
