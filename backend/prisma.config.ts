import { config } from 'dotenv'
import { resolve } from 'node:path'
import { defineConfig } from 'prisma/config'

// Always load backend/.env (Prisma CLI may run with a different cwd)
config({ path: resolve(__dirname, '.env') })

// Prisma generate does not connect to the DB; a placeholder is enough for CI/Vercel builds.
const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://build:build@localhost:5432/build?schema=public'

if (
  process.env.DATABASE_URL?.includes('YOUR_PASSWORD')
) {
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
