import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'
import { ApiError } from '../utils/api-error'
import { buildItemCodeWhere } from '../utils/code-lookup'
import { generateBarcodeValue, generateQrValue } from '../utils/qr'
import { alertService } from './alert.service'
import { itemCatalogService } from './item-catalog.service'
import { activityService } from './activity.service'
import { auditService } from './audit.service'
import { domainEvents } from '../architecture/domain-events'

interface ItemVariantInput {
  name?: string
  sku: string
  size?: string
  color?: string
  model?: string
  quantity?: number
  reservedQty?: number
  price?: number
}

interface ItemInput {
  name: string
  sku: string
  categoryId: string
  locationId?: string
  categoryIds?: string[]
  tags?: string[]
  quantity: number
  reservedQty?: number
  expiryDate?: string
  weight?: string
  expiryMessage?: string
  price: number
  supplier: string
  location: string
  description?: string
  lowStockAt?: number
  batches?: Array<{
    batchNumber: string
    lotNumber?: string
    expiryDate?: string
    quantity: number
  }>
  variants?: ItemVariantInput[]
}

const itemInclude = {
  category: true,
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
  variants: true,
  batches: true,
} as const

const mapItemResponse = (
  item: Prisma.ItemGetPayload<{
    include: typeof itemInclude
  }>,
) => ({
  ...item,
  availableQty: Math.max(0, item.quantity - item.reservedQty),
  categories: item.categories.map((link) => link.category),
  tags: item.tags.map((link) => link.tag),
  variants: item.variants.map((variant) => ({
    ...variant,
    availableQty: Math.max(0, variant.quantity - variant.reservedQty),
  })),
})

export const itemService = {
  create: async (input: ItemInput, userId?: string) => {
    const categoryIds = Array.from(new Set([input.categoryId, ...(input.categoryIds ?? [])]))
    const categories = await prisma.category.findMany({ where: { id: { in: categoryIds } } })
    const category = categories.find((row) => row.id === input.categoryId)
    if (!category) throw new ApiError(404, 'Category not found')
    if (categories.length !== categoryIds.length) {
      throw new ApiError(400, 'One or more categories are invalid')
    }

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.item.create({
        data: {
          name: input.name,
          sku: input.sku,
          quantity: input.quantity,
          reservedQty: input.reservedQty ?? 0,
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
          weight: input.weight?.trim() || null,
          expiryMessage: input.expiryMessage?.trim() || null,
          price: new Prisma.Decimal(input.price),
          supplier: input.supplier,
          location: input.location,
          locationId: input.locationId,
          description: input.description,
          lowStockAt: input.lowStockAt,
          categoryId: input.categoryId,
          qrValue: generateQrValue(),
          barcodeValue: generateBarcodeValue(input.sku),
          categories: {
            create: categoryIds.map((categoryId) => ({ categoryId })),
          },
          tags: input.tags?.length
            ? {
                create: input.tags.map((tagName) => ({
                  tag: {
                    connectOrCreate: {
                      where: { name: tagName.trim().toLowerCase() },
                      create: { name: tagName.trim().toLowerCase() },
                    },
                  },
                })),
              }
            : undefined,
          variants: input.variants?.length
            ? {
                create: input.variants.map((variant) => ({
                  name: variant.name,
                  sku: variant.sku,
                  size: variant.size,
                  color: variant.color,
                  model: variant.model,
                  quantity: variant.quantity ?? 0,
                  reservedQty: variant.reservedQty ?? 0,
                  price:
                    typeof variant.price === 'number' ? new Prisma.Decimal(variant.price) : undefined,
                })),
              }
            : undefined,
          batches: input.batches?.length
            ? {
                create: input.batches.map((batch) => ({
                  batchNumber: batch.batchNumber,
                  lotNumber: batch.lotNumber,
                  expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : undefined,
                  quantity: batch.quantity,
                })),
              }
            : undefined,
        },
        include: itemInclude,
      })

      return created
    })

    await activityService.create({
      action: 'CREATE',
      entityType: 'ITEM',
      entityId: item.id,
      description: `Item "${item.name}" created`,
      userId,
      itemId: item.id,
    })
    await alertService.syncItemAlerts(item.id)
    domainEvents.publish({
      type: 'inventory.item.created',
      payload: { itemId: item.id, sku: item.sku },
    })
    return mapItemResponse(item)
  },

  createManyFromImport: async (
    rows: Array<
      Pick<ItemInput, 'name' | 'sku' | 'quantity' | 'price' | 'supplier' | 'location'> & {
        category: string
        description?: string
        reservedQty?: number
        expiryDate?: string
        batchNumber?: string
        lotNumber?: string
      }
    >,
    userId?: string,
  ) => {
    let created = 0
    let updated = 0

    for (const row of rows) {
      const categoryName = row.category.trim()
      const category = await prisma.category.upsert({
        where: { name: categoryName },
        update: {},
        create: { name: categoryName },
      })

      const existing = await prisma.item.findUnique({ where: { sku: row.sku } })
      if (existing) {
        const updatedItem = await prisma.item.update({
          where: { sku: row.sku },
          data: {
            name: row.name,
            quantity: row.quantity,
            reservedQty: row.reservedQty ?? existing.reservedQty,
            expiryDate: row.expiryDate ? new Date(row.expiryDate) : existing.expiryDate,
            price: new Prisma.Decimal(row.price),
            supplier: row.supplier,
            location: row.location,
            description: row.description,
            categoryId: category.id,
          },
        })
        await alertService.syncItemAlerts(updatedItem.id)
        updated += 1
      } else {
        const createdItem = await prisma.item.create({
          data: {
            name: row.name,
            sku: row.sku,
            quantity: row.quantity,
            reservedQty: row.reservedQty ?? 0,
            expiryDate: row.expiryDate ? new Date(row.expiryDate) : undefined,
            price: new Prisma.Decimal(row.price),
            supplier: row.supplier,
            location: row.location,
            description: row.description,
            categoryId: category.id,
            qrValue: generateQrValue(),
            barcodeValue: generateBarcodeValue(row.sku),
            categories: {
              create: [{ categoryId: category.id }],
            },
            batches: row.batchNumber
              ? {
                  create: [
                    {
                      batchNumber: row.batchNumber,
                      lotNumber: row.lotNumber,
                      expiryDate: row.expiryDate ? new Date(row.expiryDate) : undefined,
                      quantity: row.quantity,
                    },
                  ],
                }
              : undefined,
          },
        })
        await alertService.syncItemAlerts(createdItem.id)
        created += 1
      }
    }

    await activityService.create({
      action: 'IMPORT',
      entityType: 'ITEM',
      entityId: 'bulk',
      description: `Imported items: created ${created}, updated ${updated}`,
      userId,
    })

    return { created, updated, total: rows.length }
  },

  list: async (query: Record<string, string | undefined>) => {
    const page = Number(query.page ?? '1')
    const limit = Number(query.limit ?? '10')
    const skip = (page - 1) * limit

    const expiredOnly = query.expired === 'true'
    const lowStockOnly = query.lowStock === 'true'
    const now = new Date()

    const lowStockIds = lowStockOnly
      ? (
          await prisma.$queryRaw<Array<{ id: string }>>(
            Prisma.sql`SELECT id FROM "Item" WHERE quantity <= "lowStockAt"`,
          )
        ).map((row) => row.id)
      : undefined

    const rawCategory = (query.categoryId || query.category || '').trim()
    const categoryLooksLikeUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawCategory)

    const where: Prisma.ItemWhereInput = {
      name: query.search ? { contains: query.search } : undefined,
      categoryId: rawCategory && categoryLooksLikeUuid ? rawCategory : undefined,
      category: rawCategory && !categoryLooksLikeUuid ? { name: { contains: rawCategory } } : undefined,
      location: query.location ? { contains: query.location } : undefined,
      OR: expiredOnly
        ? [
            { expiryDate: { lt: now } },
            {
              batches: {
                some: {
                  expiryDate: { lt: now },
                  quantity: { gt: 0 },
                },
              },
            },
          ]
        : undefined,
      id: lowStockOnly ? { in: lowStockIds } : undefined,
      tags: query.tag
        ? {
            some: {
              tag: {
                name: query.tag.trim().toLowerCase(),
              },
            },
          }
        : undefined,
    }

    const [data, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: itemInclude,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.item.count({ where }),
    ])

    return { data: data.map(mapItemResponse), total, page, limit }
  },

  getById: async (id: string) => {
    const item = await prisma.item.findUnique({ where: { id }, include: itemInclude })
    if (!item) throw new ApiError(404, 'Item not found')
    return mapItemResponse(item)
  },

  timeline: async (id: string) => {
    const item = await prisma.item.findUnique({
      where: { id },
      select: { id: true, name: true, sku: true, createdAt: true },
    })
    if (!item) throw new ApiError(404, 'Item not found')

    const [activities, audits, movements, scans] = await Promise.all([
      prisma.activityLog.findMany({
        where: { itemId: id },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditTrail.findMany({
        where: { itemId: id },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stockMovement.findMany({
        where: { itemId: id },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.scanHistory.findMany({
        where: { itemId: id },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const timeline = [
      {
        id: `item-created-${item.id}`,
        at: item.createdAt,
        type: 'ITEM_CREATED',
        title: 'Item created',
        description: `${item.name} (${item.sku}) was created`,
        actor: null,
        meta: null,
      },
      ...activities.map((row) => ({
        id: `activity-${row.id}`,
        at: row.createdAt,
        type: row.action,
        title: `Activity: ${row.action.replaceAll('_', ' ')}`,
        description: row.description ?? null,
        actor: row.user ?? null,
        meta: {
          entityType: row.entityType,
          entityId: row.entityId,
        },
      })),
      ...audits.map((row) => ({
        id: `audit-${row.id}`,
        at: row.createdAt,
        type: 'CHANGE_AUDIT',
        title: 'Field changes recorded',
        description: `Changes were captured for ${row.entityType}`,
        actor: row.user ?? null,
        meta: {
          oldData: row.oldData,
          newData: row.newData,
        },
      })),
      ...movements.map((row) => ({
        id: `movement-${row.id}`,
        at: row.createdAt,
        type: `STOCK_${row.type}`,
        title: `Stock ${row.type.toLowerCase()}`,
        description: `Qty ${row.quantity} (before ${row.beforeQty}, after ${row.afterQty})`,
        actor: row.user ?? null,
        meta: {
          reason: row.adjustmentReason,
          note: row.note,
          reference: row.reference,
          sourceWarehouse: row.sourceWarehouse,
          destinationWarehouse: row.destinationWarehouse,
        },
      })),
      ...scans.map((row) => ({
        id: `scan-${row.id}`,
        at: row.createdAt,
        type: 'SCAN',
        title: 'Item scanned',
        description: row.note ?? `Code ${row.qrCode} scanned`,
        actor: row.user ?? null,
        meta: {
          qrCode: row.qrCode,
        },
      })),
    ]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .map((entry) => ({ ...entry, at: entry.at.toISOString() }))

    return {
      item,
      timeline,
    }
  },

  getByCode: async (code: string) => {
    const item = await prisma.item.findFirst({
      where: buildItemCodeWhere(code),
      include: itemInclude,
    })
    if (!item) throw new ApiError(404, 'Item not found for provided code')
    return mapItemResponse(item)
  },

  update: async (id: string, input: Partial<ItemInput>, userId?: string) => {
    const existing = await prisma.item.findUnique({ where: { id }, include: itemInclude })
    if (!existing) throw new ApiError(404, 'Item not found')

    const categoryIds = input.categoryIds
      ? Array.from(new Set([...(input.categoryId ? [input.categoryId] : []), ...input.categoryIds]))
      : input.categoryId
        ? [input.categoryId]
        : undefined
    if (categoryIds?.length) {
      const categories = await prisma.category.findMany({ where: { id: { in: categoryIds } } })
      if (categories.length !== categoryIds.length) {
        throw new ApiError(400, 'One or more categories are invalid')
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (categoryIds) {
        await tx.itemCategory.deleteMany({ where: { itemId: id } })
      }
      if (input.tags) {
        await tx.itemTag.deleteMany({ where: { itemId: id } })
      }
      if (input.variants) {
        await tx.itemVariant.deleteMany({ where: { itemId: id } })
      }
      if (input.batches) {
        await tx.itemBatch.deleteMany({ where: { itemId: id } })
      }

      const row = await tx.item.update({
        where: { id },
        data: {
          name: input.name,
          sku: input.sku,
          ...(input.sku !== undefined ? { barcodeValue: generateBarcodeValue(input.sku) } : {}),
          categoryId: input.categoryId,
          quantity: input.quantity,
          reservedQty: input.reservedQty,
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
          weight: input.weight !== undefined ? input.weight?.trim() || null : undefined,
          expiryMessage:
            input.expiryMessage !== undefined ? input.expiryMessage?.trim() || null : undefined,
          price: typeof input.price === 'number' ? new Prisma.Decimal(input.price) : undefined,
          supplier: input.supplier,
          location: input.location,
          locationId: input.locationId,
          description: input.description,
          lowStockAt: input.lowStockAt,
          categories: categoryIds
            ? {
                create: categoryIds.map((categoryId) => ({
                  categoryId,
                })),
              }
            : undefined,
          tags: input.tags
            ? {
                create: input.tags.map((tagName) => ({
                  tag: {
                    connectOrCreate: {
                      where: { name: tagName.trim().toLowerCase() },
                      create: { name: tagName.trim().toLowerCase() },
                    },
                  },
                })),
              }
            : undefined,
          variants: input.variants
            ? {
                create: input.variants.map((variant) => ({
                  name: variant.name,
                  sku: variant.sku,
                  size: variant.size,
                  color: variant.color,
                  model: variant.model,
                  quantity: variant.quantity ?? 0,
                  reservedQty: variant.reservedQty ?? 0,
                  price:
                    typeof variant.price === 'number' ? new Prisma.Decimal(variant.price) : undefined,
                })),
              }
            : undefined,
          batches: input.batches
            ? {
                create: input.batches.map((batch) => ({
                  batchNumber: batch.batchNumber,
                  lotNumber: batch.lotNumber,
                  expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : undefined,
                  quantity: batch.quantity,
                })),
              }
            : undefined,
        },
        include: itemInclude,
      })
      return row
    })

    await auditService.create({
      entityType: 'ITEM',
      entityId: id,
      oldData: existing,
      newData: updated,
      userId,
      itemId: id,
    })
    await alertService.syncItemAlerts(id)
    domainEvents.publish({
      type: 'inventory.item.updated',
      payload: { itemId: id, sku: updated.sku },
    })
    return mapItemResponse(updated)
  },

  delete: async (id: string, userId?: string) => {
    const existing = await prisma.item.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Item not found')

    await prisma.$transaction(async (tx) => {
      await tx.saleLine.deleteMany({ where: { itemId: id } })
      await tx.purchaseLine.deleteMany({ where: { itemId: id } })
      await tx.stockMovement.deleteMany({ where: { itemId: id } })
      await tx.scanHistory.deleteMany({ where: { itemId: id } })
      await tx.activityLog.updateMany({ where: { itemId: id }, data: { itemId: null } })
      await tx.auditTrail.updateMany({ where: { itemId: id }, data: { itemId: null } })
      await tx.alert.deleteMany({ where: { itemId: id } })
      await tx.item.delete({ where: { id } })
    })

    await itemCatalogService.rememberDeletedCatalogItem(existing.name)

    await activityService.create({
      action: 'DELETE',
      entityType: 'ITEM',
      entityId: id,
      description: `Item "${existing.name}" deleted`,
      userId,
    })
  },
}
