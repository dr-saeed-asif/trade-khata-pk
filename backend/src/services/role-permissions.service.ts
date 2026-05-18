import { randomUUID } from 'node:crypto'
import type { UserRole } from '@prisma/client'
import { prisma } from '../config/prisma'
import { rolePermissions, type AppRole } from '../config/permissions'

const roleLabels: Record<AppRole, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Operations Manager',
  USER: 'Standard User',
}

const coreRoles: AppRole[] = ['ADMIN', 'MANAGER', 'USER']

export const parsePermissions = (value: unknown) => {
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map((item) => String(item))
    } catch {
      return []
    }
  }
  return []
}

export const ensureRoleTables = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS admin_roles (
      id TEXT NOT NULL PRIMARY KEY,
      "roleKey" TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      permissions JSONB NOT NULL,
      "isSystem" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS admin_user_roles (
      "userId" TEXT NOT NULL PRIMARY KEY,
      "roleKey" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

/** Insert missing system roles only — never overwrite customized permissions. */
export const ensureSystemRoles = async () => {
  await ensureRoleTables()

  const existing = await prisma.$queryRaw<Array<{ roleKey: string }>>`
    SELECT "roleKey" FROM admin_roles WHERE "roleKey" IN ('ADMIN', 'MANAGER', 'USER')
  `
  const existingKeys = new Set(existing.map((row) => row.roleKey))

  for (const role of coreRoles) {
    if (existingKeys.has(role)) continue
    await prisma.$executeRaw`
      INSERT INTO admin_roles (id, "roleKey", name, permissions, "isSystem")
      VALUES (${randomUUID()}, ${role}, ${roleLabels[role]}, ${JSON.stringify(Array.from(rolePermissions[role]))}::jsonb, true)
    `
  }
}

export const getPermissionsForRoleKey = async (roleKey: string): Promise<string[]> => {
  await ensureSystemRoles()

  const fallback = coreRoles.includes(roleKey as AppRole)
    ? Array.from(rolePermissions[roleKey as AppRole])
    : []

  const rows = await prisma.$queryRaw<Array<{ permissions: unknown }>>`
    SELECT permissions FROM admin_roles WHERE "roleKey" = ${roleKey} LIMIT 1
  `

  const fromDb = parsePermissions(rows[0]?.permissions)
  return fromDb.length > 0 ? fromDb : fallback
}

export const resolveUserPermissions = async (userId: string, role: UserRole) => {
  await ensureRoleTables()

  const overrideRows = await prisma.$queryRaw<Array<{ roleKey: string }>>`
    SELECT "roleKey" FROM admin_user_roles WHERE "userId" = ${userId} LIMIT 1
  `

  const effectiveRoleKey = overrideRows[0]?.roleKey ?? role
  return getPermissionsForRoleKey(effectiveRoleKey)
}
