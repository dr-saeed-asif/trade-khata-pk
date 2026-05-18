import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { generateBarcodeValue, generateQrValue } from '../utils/qr'

const prisma = new PrismaClient()

const run = async () => {
  const user = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true },
  })

  const category =
    (await prisma.category.findFirst({ where: { name: 'Dry Food' } })) ??
    (await prisma.category.create({ data: { name: 'Dry Food' } }))

  const itemSeeds = [
    {
      name: 'Daal Chana',
      sku: 'DAAL-CHANA-001',
      quantity: 200,
      reservedQty: 20,
      price: 2.5,
      supplier: 'Local Supplier',
      location: 'Main Rack A1',
      lowStockAt: 30,
    },
    {
      name: 'Basmati Rice',
      sku: 'RICE-BASMATI-001',
      quantity: 150,
      reservedQty: 15,
      price: 4.25,
      supplier: 'Rice Wholesale',
      location: 'Main Rack B2',
      lowStockAt: 25,
    },
  ]

  for (const seed of itemSeeds) {
    const existing = await prisma.item.findUnique({
      where: { sku: seed.sku },
      select: { id: true },
    })

    if (!existing) {
      await prisma.item.create({
        data: {
          ...seed,
          categoryId: category.id,
          qrValue: generateQrValue(),
          barcodeValue: generateBarcodeValue(seed.sku),
          categories: {
            create: [{ categoryId: category.id }],
          },
        },
      })
    }
  }

  const items = await prisma.item.findMany({
    where: {
      sku: { in: itemSeeds.map((seed) => seed.sku) },
    },
    select: { id: true, sku: true, quantity: true },
  })

  const bySku = new Map(items.map((item) => [item.sku, item]))
  const chana = bySku.get('DAAL-CHANA-001')
  const rice = bySku.get('RICE-BASMATI-001')
  if (!chana || !rice) throw new Error('Seed items missing')

  const references = ['DEMO-IN-001', 'DEMO-OUT-001', 'DEMO-TR-001', 'DEMO-ADJ-001']
  await prisma.stockMovement.deleteMany({
    where: {
      reference: { in: references },
    },
  })

  const chanaAfterIn = chana.quantity + 40
  await prisma.item.update({
    where: { id: chana.id },
    data: { quantity: chanaAfterIn },
  })
  await prisma.stockMovement.create({
    data: {
      itemId: chana.id,
      type: 'IN',
      quantity: 40,
      beforeQty: chana.quantity,
      afterQty: chanaAfterIn,
      destinationWarehouse: 'Main Warehouse',
      note: 'Purchase receive',
      reference: 'DEMO-IN-001',
      userId: user?.id,
    },
  })

  const riceAfterOut = Math.max(rice.quantity - 20, 0)
  await prisma.item.update({
    where: { id: rice.id },
    data: { quantity: riceAfterOut },
  })
  await prisma.stockMovement.create({
    data: {
      itemId: rice.id,
      type: 'OUT',
      quantity: 20,
      beforeQty: rice.quantity,
      afterQty: riceAfterOut,
      sourceWarehouse: 'Main Warehouse',
      note: 'Dispatch to branch',
      reference: 'DEMO-OUT-001',
      userId: user?.id,
    },
  })

  await prisma.stockMovement.create({
    data: {
      itemId: chana.id,
      type: 'TRANSFER',
      quantity: 15,
      beforeQty: chanaAfterIn,
      afterQty: chanaAfterIn,
      sourceWarehouse: 'Main Warehouse',
      destinationWarehouse: 'Secondary Warehouse',
      note: 'Inter-warehouse transfer',
      reference: 'DEMO-TR-001',
      userId: user?.id,
    },
  })

  const chanaAfterAdjustment = chanaAfterIn - 5
  await prisma.item.update({
    where: { id: chana.id },
    data: { quantity: chanaAfterAdjustment },
  })
  await prisma.stockMovement.create({
    data: {
      itemId: chana.id,
      type: 'ADJUSTMENT',
      quantity: 5,
      beforeQty: chanaAfterIn,
      afterQty: chanaAfterAdjustment,
      adjustmentReason: 'DAMAGE',
      note: 'Damaged bags in recount',
      reference: 'DEMO-ADJ-001',
      userId: user?.id,
    },
  })

  const count = await prisma.stockMovement.count({
    where: { reference: { in: references } },
  })
  console.log(`Stock demo data ready. Inserted movements: ${count}`)
}

run()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
