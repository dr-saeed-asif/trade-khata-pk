import { randomUUID } from 'node:crypto'
import { prisma } from '../config/prisma'
import { groceryCatalog } from '../data/grocery-catalog'
import { generateBarcodeValue, generateQrValue } from '../utils/qr'

const CATALOG_SEED_SUPPLIER = 'Catalog Seed'

const seedSku = (name: string) => {
  const slug = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || 'ITEM'
  return `CAT-${randomUUID().slice(0, 8).toUpperCase()}-${slug}`
}

const isCatalogSeededItem = (supplier: string, description?: string | null) =>
  supplier === CATALOG_SEED_SUPPLIER || description === 'Seeded from grocery catalog'

export const itemCatalogService = {
  rememberDeletedCatalogItem: async (name: string) => {
    const normalized = name.trim()
    if (!normalized) return
    const isCatalogItem = groceryCatalog.some((category) =>
      category.items.some((itemName) => itemName.toLowerCase() === normalized.toLowerCase()),
    )
    if (!isCatalogItem) return

    try {
      await prisma.catalogSeedExclusion.upsert({
        where: { name: normalized },
        update: {},
        create: { name: normalized },
      })
    } catch {
      // Table may not exist until migration is applied.
    }
  },

  syncCatalogToDatabase: async () => {
    let created = 0
    let existing = 0
    let skipped = 0

    let excludedNames = new Set<string>()
    try {
      const excludedRows = await prisma.catalogSeedExclusion.findMany({ select: { name: true } })
      excludedNames = new Set(excludedRows.map((row) => row.name.toLowerCase()))
    } catch {
      // Table may not exist until migration is applied.
    }

    for (const category of groceryCatalog) {
      const categoryRow = await prisma.category.upsert({
        where: { name: category.name },
        update: {},
        create: { name: category.name },
      })

      for (const itemName of category.items) {
        if (excludedNames.has(itemName.toLowerCase())) {
          skipped += 1
          continue
        }

        const alreadyExists = await prisma.item.findFirst({
          where: { name: itemName },
          select: { id: true },
        })

        if (alreadyExists) {
          existing += 1
          continue
        }

        const sku = seedSku(itemName)
        await prisma.item.create({
          data: {
            name: itemName,
            sku,
            quantity: 0,
            reservedQty: 0,
            price: 0,
            supplier: CATALOG_SEED_SUPPLIER,
            location: 'General',
            description: 'Seeded from grocery catalog',
            categoryId: categoryRow.id,
            qrValue: generateQrValue(),
            barcodeValue: generateBarcodeValue(sku),
            categories: {
              create: [{ categoryId: categoryRow.id }],
            },
          },
        })
        created += 1
      }
    }

    return {
      created,
      existing,
      skipped,
      totalCatalogItems: groceryCatalog.reduce((acc, cat) => acc + cat.items.length, 0),
    }
  },

  listCatalogItemNames: async () => {
    const names = await prisma.item.findMany({
      select: { name: true },
      distinct: ['name'],
      orderBy: { name: 'asc' },
    })
    return names.map((row) => row.name)
  },

  isCatalogSeededItem,
}

