import { prisma } from '../src/config/prisma'

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "weight" TEXT;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "expiryMessage" TEXT;
  `)
  console.log('Item.weight and Item.expiryMessage columns are ready')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
