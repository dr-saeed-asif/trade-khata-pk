import { config } from 'dotenv'
import { resolve } from 'node:path'
import { defineConfig } from 'prisma/config'

// Always load backend/.env (Prisma CLI may run with a different cwd)
config({ path: resolve(__dirname, '.env') })

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing. Set it in backend/.env')
}

if (databaseUrl.includes('YOUR_PASSWORD')) {
  throw new Error(
    'DATABASE_URL still contains YOUR_PASSWORD. Edit backend/.env and set your real PostgreSQL password.',
  )
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
})
