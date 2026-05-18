import 'dotenv/config'
import bcrypt from 'bcrypt'
import { prisma } from '../config/prisma'

const run = async () => {
  const adminName = process.env.ADMIN_NAME ?? 'System Admin'
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required in .env')
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      role: 'ADMIN',
      passwordHash,
    },
    create: {
      name: adminName,
      email: adminEmail,
      role: 'ADMIN',
      passwordHash,
    },
  })

  console.log(`Admin ready: ${admin.email} (role: ${admin.role})`)
}

run()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('P1000') || message.includes('Authentication failed')) {
      console.error('\nPostgreSQL login failed.')
      console.error('Update DATABASE_URL in backend/.env with your real username and password.')
      console.error('Example: postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/qr_inventory?schema=public')
      console.error('If the password has special characters (@, #, etc.), URL-encode them (e.g. @ → %40).\n')
    }
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
