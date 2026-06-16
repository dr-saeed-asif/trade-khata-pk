import 'dotenv/config'
import bcrypt from 'bcrypt'
import { prisma } from '../config/prisma'
import { itemCatalogService } from '../services/item-catalog.service'

const dayMs = 24 * 60 * 60 * 1000

/** Assign realistic quantities, prices, and demo scenarios (low stock, expiry) to catalog items. */
export const seedInventoryDemo = async () => {
  const catalogResult = await itemCatalogService.syncCatalogToDatabase()
  console.log(
    `Catalog sync: created ${catalogResult.created}, existing ${catalogResult.existing}, skipped ${catalogResult.skipped}`,
  )

  const items = await prisma.item.findMany({
    where: { supplier: 'Catalog Seed' },
    orderBy: { name: 'asc' },
    take: 40,
  })

  if (!items.length) {
    console.log('Inventory demo: no catalog items to update')
    return { updated: 0, lowStock: 0, expiring: 0 }
  }

  let updated = 0
  let lowStock = 0
  let expiring = 0

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]
    const basePrice = 50 + (i % 20) * 25
    let quantity = 20 + (i % 15) * 10
    let lowStockAt = 15
    let expiryDate: Date | null = null

    // Every 4th item: low stock scenario
    if (i % 4 === 0) {
      quantity = 3 + (i % 5)
      lowStockAt = 20
      lowStock += 1
    }

    // Every 5th item: expiring soon
    if (i % 5 === 0) {
      expiryDate = new Date(Date.now() + (3 + (i % 10)) * dayMs)
      expiring += 1
    }

    await prisma.item.update({
      where: { id: item.id },
      data: {
        quantity,
        reservedQty: i % 3 === 0 ? Math.min(5, quantity) : 0,
        price: basePrice,
        lowStockAt,
        expiryDate,
        location: `Rack ${String.fromCharCode(65 + (i % 6))}${(i % 9) + 1}`,
        supplier: i % 2 === 0 ? 'Karachi Wholesale Mart' : 'Ali Traders',
      },
    })
    updated += 1
  }

  console.log(`Inventory demo: updated ${updated} items (${lowStock} low-stock, ${expiring} expiring soon)`)
  return { updated, lowStock, expiring }
}

/** Optional manager user for testing role-based AI access. */
export const seedManagerUser = async () => {
  const email = process.env.MANAGER_EMAIL ?? 'manager@inventory.local'
  const password = process.env.MANAGER_PASSWORD ?? 'ChangeMe123!'
  const name = process.env.MANAGER_NAME ?? 'Store Manager'

  const passwordHash = await bcrypt.hash(password, 10)
  const manager = await prisma.user.upsert({
    where: { email },
    update: { name, role: 'MANAGER', passwordHash },
    create: { name, email, username: 'manager', role: 'MANAGER', passwordHash },
  })

  console.log(`Manager ready: ${manager.email} (role: ${manager.role})`)
  return manager
}

const run = async () => {
  await seedInventoryDemo()
  await seedManagerUser()
}

if (require.main === module) {
  run()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
