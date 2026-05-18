import 'dotenv/config'
import { PartyType } from '@prisma/client'
import { prisma } from '../config/prisma'
import { calcLineTotal, calcTotals } from '../utils/commerce'

const TARGET = 10

const partySeeds = [
  { name: 'Ali Traders', phone: '0300-1110001', type: PartyType.SUPPLIER },
  { name: 'Karachi Wholesale Mart', phone: '0300-1110002', type: PartyType.SUPPLIER },
  { name: 'Spice House Distributors', phone: '0300-1110003', type: PartyType.SUPPLIER },
  { name: 'Rice & Grain Suppliers', phone: '0300-1110004', type: PartyType.BOTH },
  { name: 'Walk-in Customer A', phone: '0300-2220001', type: PartyType.CUSTOMER },
  { name: 'Hassan General Store', phone: '0300-2220002', type: PartyType.CUSTOMER },
  { name: 'Fatima Retail', phone: '0300-2220003', type: PartyType.CUSTOMER },
  { name: 'Bano Adam Outlet', phone: '0300-2220004', type: PartyType.CUSTOMER },
  { name: 'City Mart', phone: '0300-2220005', type: PartyType.CUSTOMER },
  { name: 'Green Valley Shop', phone: '0300-2220006', type: PartyType.CUSTOMER },
  { name: 'Metro Cash & Carry', phone: '0300-3330001', type: PartyType.BOTH },
  { name: 'Daily Needs Corner', phone: '0300-3330002', type: PartyType.CUSTOMER },
]

const ensureParties = async () => {
  let count = await prisma.party.count()
  if (count >= TARGET) {
    console.log(`Parties: ${count} records (skipped seed)`)
    return prisma.party.findMany({ orderBy: { name: 'asc' } })
  }

  for (const seed of partySeeds) {
    if (count >= TARGET) break
    const exists = await prisma.party.findFirst({ where: { name: seed.name } })
    if (exists) continue
    await prisma.party.create({
      data: {
        name: seed.name,
        phone: seed.phone,
        email: null,
        address: 'Karachi, Pakistan',
        type: seed.type,
      },
    })
    count += 1
  }

  const total = await prisma.party.count()
  console.log(`Parties: ${total} records`)
  return prisma.party.findMany({ orderBy: { name: 'asc' } })
}

const ensureItems = async () => {
  const items = await prisma.item.findMany({
    take: 20,
    orderBy: { name: 'asc' },
    select: { id: true, name: true, quantity: true, price: true },
  })

  if (items.length < 3) {
    throw new Error('Need at least 3 inventory items. Import items or run npm run stock:seed first.')
  }

  for (const item of items) {
    if (item.quantity < 500) {
      await prisma.item.update({
        where: { id: item.id },
        data: { quantity: 500 },
      })
      item.quantity = 500
    }
  }

  return items.map((item) => ({
    ...item,
    price: Number(item.price),
  }))
}

/** Direct insert for demo history without double stock movement when purchases/sales already exist */
const seedPurchaseRecords = async (
  parties: Array<{ id: string; type: PartyType }>,
  items: Array<{ id: string; price: number }>,
  userId?: string,
) => {
  const existing = await prisma.purchase.count({
    where: { invoiceNo: { startsWith: 'SEED-PUR-' } },
  })
  if (existing >= TARGET) {
    console.log(`Purchases: ${await prisma.purchase.count()} records (${existing} seed, skipped)`)
    return
  }

  const suppliers = parties.filter((p) => p.type === PartyType.SUPPLIER || p.type === PartyType.BOTH)
  let created = 0

  for (let i = existing; i < TARGET; i += 1) {
    const invoiceNo = `SEED-PUR-${String(i + 1).padStart(3, '0')}`
    const dup = await prisma.purchase.findUnique({ where: { invoiceNo } })
    if (dup) continue

    const itemA = items[i % items.length]
    const itemB = items[(i + 1) % items.length]
    const lines = [
      { itemId: itemA.id, quantity: 10 + (i % 5), unitPrice: itemA.price * 0.85 },
      ...(i % 2 === 0
        ? [{ itemId: itemB.id, quantity: 5 + (i % 3), unitPrice: itemB.price * 0.8 }]
        : []),
    ]
    const { subtotal, discount, total } = calcTotals(lines, i % 3 === 0 ? 50 : 0)
    const purchaseDate = new Date()
    purchaseDate.setDate(purchaseDate.getDate() - (TARGET - i))

    await prisma.$transaction(async (tx) => {
      await tx.purchase.create({
        data: {
          invoiceNo,
          partyId: suppliers[i % suppliers.length]?.id ?? null,
          purchaseDate,
          subtotal,
          discount,
          total,
          notes: 'Seed purchase record',
          createdById: userId ?? null,
          lines: {
            create: lines.map((line) => ({
              itemId: line.itemId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: calcLineTotal(line.quantity, line.unitPrice),
            })),
          },
        },
      })

      for (const line of lines) {
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
            note: `Seed purchase ${invoiceNo}`,
            reference: invoiceNo,
            userId,
          },
        })
      }
    })
    created += 1
  }

  console.log(`Purchases: seeded ${created} (total ${await prisma.purchase.count()})`)
}

const seedSaleRecords = async (
  parties: Array<{ id: string; type: PartyType }>,
  items: Array<{ id: string; price: number }>,
  userId?: string,
) => {
  const existing = await prisma.sale.count({
    where: { invoiceNo: { startsWith: 'SEED-SALE-' } },
  })
  if (existing >= TARGET) {
    console.log(`Sales: ${await prisma.sale.count()} records (${existing} seed, skipped)`)
    return
  }

  const customers = parties.filter((p) => p.type === PartyType.CUSTOMER || p.type === PartyType.BOTH)
  let created = 0

  for (let i = existing; i < TARGET; i += 1) {
    const invoiceNo = `SEED-SALE-${String(i + 1).padStart(3, '0')}`
    const dup = await prisma.sale.findUnique({ where: { invoiceNo } })
    if (dup) continue

    const itemA = items[(i + 2) % items.length]
    const itemB = items[(i + 3) % items.length]
    const qtyA = 2 + (i % 4)
    const qtyB = 1 + (i % 2)
    const lines = [
      { itemId: itemA.id, quantity: qtyA, unitPrice: itemA.price },
      ...(i % 2 === 1
        ? [{ itemId: itemB.id, quantity: qtyB, unitPrice: itemB.price }]
        : []),
    ]
    const { subtotal, discount, total } = calcTotals(lines, i % 4 === 0 ? 25 : 0)
    const saleDate = new Date()
    saleDate.setDate(saleDate.getDate() - (TARGET - i))

    await prisma.$transaction(async (tx) => {
      await tx.sale.create({
        data: {
          invoiceNo,
          partyId: customers[i % customers.length]?.id ?? null,
          saleDate,
          subtotal,
          discount,
          total,
          notes: 'Seed sale record',
          createdById: userId ?? null,
          lines: {
            create: lines.map((line) => ({
              itemId: line.itemId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: calcLineTotal(line.quantity, line.unitPrice),
            })),
          },
        },
      })

      for (const line of lines) {
        const item = await tx.item.findUnique({ where: { id: line.itemId } })
        if (!item) continue
        const beforeQty = item.quantity
        const afterQty = Math.max(0, beforeQty - line.quantity)
        await tx.item.update({ where: { id: line.itemId }, data: { quantity: afterQty } })
        await tx.stockMovement.create({
          data: {
            itemId: line.itemId,
            type: 'OUT',
            quantity: line.quantity,
            beforeQty,
            afterQty,
            note: `Seed sale ${invoiceNo}`,
            reference: invoiceNo,
            userId,
          },
        })
      }
    })
    created += 1
  }

  console.log(`Sales: seeded ${created} (total ${await prisma.sale.count()})`)
}

const run = async () => {
  const user = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true },
  })

  const parties = await ensureParties()
  const items = await ensureItems()

  await seedPurchaseRecords(parties, items, user?.id)
  await seedSaleRecords(parties, items, user?.id)

  console.log('\nDone.')
  console.log(`  Parties:   ${await prisma.party.count()} (target ${TARGET}+)`)
  console.log(`  Purchases: ${await prisma.purchase.count()}`)
  console.log(`  Sales:     ${await prisma.sale.count()}`)
}

run()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
