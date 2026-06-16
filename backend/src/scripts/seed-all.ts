import 'dotenv/config'
import { prisma } from '../config/prisma'
import { seedAdmin } from './seed-admin'
import { seedStock } from './seed-stock'
import { seedCommerce } from './seed-commerce'
import { seedInventoryDemo, seedManagerUser } from './seed-inventory-demo'
import { seedAiDemo } from './seed-ai'

const run = async () => {
  console.log('=== Database seed started ===\n')

  console.log('1/6 Admin user')
  await seedAdmin()

  console.log('\n2/6 Grocery catalog + inventory demo data')
  await seedInventoryDemo()

  console.log('\n3/6 Manager user')
  await seedManagerUser()

  console.log('\n4/6 Stock movements demo')
  await seedStock()

  console.log('\n5/6 Commerce (parties, purchases, sales)')
  await seedCommerce()

  console.log('\n6/6 AI copilot demo conversation')
  await seedAiDemo()

  const [users, items, parties, purchases, sales, conversations] = await Promise.all([
    prisma.user.count(),
    prisma.item.count(),
    prisma.party.count(),
    prisma.purchase.count(),
    prisma.sale.count(),
    prisma.aiConversation.count(),
  ])

  console.log('\n=== Seed complete ===')
  console.log(`  Users:         ${users}`)
  console.log(`  Items:         ${items}`)
  console.log(`  Parties:       ${parties}`)
  console.log(`  Purchases:     ${purchases}`)
  console.log(`  Sales:         ${sales}`)
  console.log(`  Conversations: ${conversations}`)
  console.log('\nLogin credentials (from .env):')
  console.log(`  Admin:   ${process.env.ADMIN_EMAIL ?? 'admin@inventory.local'}`)
  console.log(`  Manager: ${process.env.MANAGER_EMAIL ?? 'manager@inventory.local'}`)
}

run()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('P1000') || message.includes('Authentication failed')) {
      console.error('\nPostgreSQL login failed. Check DATABASE_URL in backend/.env\n')
    }
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
