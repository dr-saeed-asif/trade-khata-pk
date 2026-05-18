import bcrypt from 'bcrypt'
import { randomUUID } from 'node:crypto'
import type { UserRole } from '@prisma/client'
import { prisma } from '../config/prisma'
import { ApiError } from '../utils/api-error'
import { activityService } from './activity.service'
import { ensureSystemRoles, parsePermissions } from './role-permissions.service'

type DbAdminRole = {
  id: string
  roleKey: string
  name: string
  permissions: unknown
  isSystem: number
  createdAt: Date
  updatedAt: Date
}

type DbAdminUserRole = {
  userId: string
  roleKey: string
}

const formatDate = (value?: Date | null) => value?.toISOString() ?? new Date().toISOString()
const coreRoles: UserRole[] = ['ADMIN', 'MANAGER', 'USER']

const moduleLabelMap: Record<string, string> = {
  items: 'Inventory',
  categories: 'Category',
  qr: 'QR Code',
  reports: 'Report',
  scan: 'Scan',
  stock: 'Stock',
}

const toPermissionAction = (permission: string) => {
  const action = permission.split('.')[1] ?? permission
  const normalized = action.toLowerCase()
  if (normalized === 'read') return 'View'
  if (normalized === 'create') return 'Create'
  if (normalized === 'update' || normalized === 'write') return 'Edit'
  if (normalized === 'delete') return 'Delete'
  if (normalized === 'manage') return 'Manage'
  if (normalized === 'import') return 'Import'
  if (normalized === 'export') return 'Export'
  return null
}

const toPermissionModule = (permission: string) => {
  const moduleKey = permission.split('.')[0] ?? permission
  return (
    moduleLabelMap[moduleKey] ??
    moduleKey
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  )
}

const summarizePermissionDisplay = (permissions: string[]) => ({
  actions: Array.from(
    new Set(
      permissions
        .map((permission) => toPermissionAction(permission))
        .filter(Boolean),
    ),
  ) as string[],
  modules: Array.from(new Set(permissions.map((permission) => toPermissionModule(permission)))),
})

const toRoleKey = (name: string) =>
  name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const isCoreRoleKey = (roleKey: string): roleKey is UserRole => coreRoles.includes(roleKey as UserRole)

const countUsersByRoleKey = async (roleKey: string) => {
  if (isCoreRoleKey(roleKey)) {
    return prisma.user.count({ where: { role: roleKey } })
  }

  const rows = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
    SELECT COUNT(*)::int as count
    FROM admin_user_roles
    WHERE "roleKey" = ${roleKey}
  `
  const rawCount = rows[0]?.count ?? 0
  return Number(rawCount)
}

export const adminService = {
  listUsers: async () => {
    await ensureSystemRoles()

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    const overrides = await prisma.$queryRaw<DbAdminUserRole[]>`
      SELECT "userId", "roleKey" FROM admin_user_roles
    `
    const overrideMap = new Map(overrides.map((row) => [row.userId, row.roleKey]))
    return users.map((user) => ({
      ...user,
      role: overrideMap.get(user.id) ?? user.role,
      createdAt: formatDate(user.createdAt),
      updatedAt: formatDate(user.updatedAt),
    }))
  },

  createUser: async (
    input: { name: string; username?: string; email: string; password: string; role: string },
    actorId?: string,
  ) => {
    await ensureSystemRoles()

    const existing = await prisma.user.findUnique({ where: { email: input.email } })
    if (existing) throw new ApiError(409, 'Email already in use')

    const username = input.username?.trim() || null
    if (username) {
      const usernameTaken = await prisma.user.findUnique({ where: { username } })
      if (usernameTaken) throw new ApiError(409, 'Username already in use')
    }

    const passwordHash = await bcrypt.hash(input.password, 10)
    const selectedRole = input.role.trim().toUpperCase()
    const isCoreRole = coreRoles.includes(selectedRole as UserRole)
    const savedRole: UserRole = isCoreRole ? (selectedRole as UserRole) : 'USER'

    const user = await prisma.user.create({
      data: {
        name: input.name,
        username,
        email: input.email,
        passwordHash,
        role: savedRole,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!isCoreRole) {
      await prisma.$executeRaw`
        INSERT INTO admin_user_roles ("userId", "roleKey")
        VALUES (${user.id}, ${selectedRole})
        ON CONFLICT ("userId") DO UPDATE SET "roleKey" = EXCLUDED."roleKey", "updatedAt" = CURRENT_TIMESTAMP
      `
    }

    await activityService.create({
      action: 'CREATE',
      entityType: 'ADMIN_USER',
      entityId: user.id,
      description: `Admin created user ${user.email}`,
      userId: actorId,
    })

    return {
      ...user,
      role: selectedRole,
    }
  },

  updateUser: async (
    userId: string,
    input: { name?: string; username?: string; email?: string; password?: string; role?: string },
    actorId?: string,
  ) => {
    await ensureSystemRoles()

    const existing = await prisma.user.findUnique({ where: { id: userId } })
    if (!existing) throw new ApiError(404, 'User not found')

    if (input.email && input.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: input.email } })
      if (emailTaken) throw new ApiError(409, 'Email already in use')
    }

    const username = input.username === undefined ? undefined : input.username.trim() || null
    if (username && username !== existing.username) {
      const usernameTaken = await prisma.user.findUnique({ where: { username } })
      if (usernameTaken) throw new ApiError(409, 'Username already in use')
    }

    const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : undefined
    const selectedRole = input.role?.trim().toUpperCase()
    const isCoreRole = selectedRole ? coreRoles.includes(selectedRole as UserRole) : undefined

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        ...(username !== undefined ? { username } : {}),
        email: input.email,
        role: selectedRole ? (isCoreRole ? (selectedRole as UserRole) : 'USER') : undefined,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (selectedRole) {
      if (isCoreRole) {
        await prisma.$executeRaw`DELETE FROM admin_user_roles WHERE "userId" = ${userId}`
      } else {
        await prisma.$executeRaw`
          INSERT INTO admin_user_roles ("userId", "roleKey")
          VALUES (${userId}, ${selectedRole})
          ON CONFLICT ("userId") DO UPDATE SET "roleKey" = EXCLUDED."roleKey", "updatedAt" = CURRENT_TIMESTAMP
        `
      }
    }

    await activityService.create({
      action: 'UPDATE',
      entityType: 'ADMIN_USER',
      entityId: user.id,
      description: `Admin updated user ${user.email}`,
      userId: actorId,
    })

    return {
      ...user,
      role: selectedRole ?? user.role,
    }
  },

  deleteUser: async (userId: string, actorId?: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new ApiError(404, 'User not found')

    if (actorId && actorId === userId) throw new ApiError(400, 'You cannot delete your own account')

    await ensureSystemRoles()
    await prisma.$executeRaw`DELETE FROM admin_user_roles WHERE "userId" = ${userId}`
    await prisma.user.delete({ where: { id: userId } })

    await activityService.create({
      action: 'DELETE',
      entityType: 'ADMIN_USER',
      entityId: userId,
      description: `Admin deleted user ${user.email}`,
      userId: actorId,
    })
  },

  listRoles: async () => {
    await ensureSystemRoles()

    const rows = await prisma.$queryRaw<DbAdminRole[]>`
      SELECT id, "roleKey", name, permissions, "isSystem", "createdAt", "updatedAt"
      FROM admin_roles
      ORDER BY "createdAt" DESC
    `

    const roleStats = await prisma.user.groupBy({ by: ['role'], _count: { _all: true } })
    const customRoleStats = await prisma.$queryRaw<Array<{ roleKey: string; count: bigint | number }>>`
      SELECT "roleKey", COUNT(*)::int as count
      FROM admin_user_roles
      GROUP BY "roleKey"
    `
    const userCountByRole = new Map<string, number>(roleStats.map((entry) => [entry.role, entry._count._all]))
    for (const row of customRoleStats) {
      userCountByRole.set(row.roleKey, Number(row.count))
    }

    return rows.map((row) => ({
      ...summarizePermissionDisplay(parsePermissions(row.permissions)),
      id: row.id,
      roleKey: row.roleKey,
      name: row.name,
      role: row.roleKey,
      permissions: parsePermissions(row.permissions),
      userCount: userCountByRole.get(row.roleKey) ?? 0,
      isSystem: Boolean(row.isSystem),
      createdAt: formatDate(row.createdAt),
      updatedAt: formatDate(row.updatedAt),
    }))
  },

  createRole: async (input: { name: string; permissions: string[] }, actorId?: string) => {
    await ensureSystemRoles()

    const roleKey = toRoleKey(input.name)
    if (!roleKey) throw new ApiError(400, 'Role name is invalid')

    const existing = await prisma.$queryRaw<DbAdminRole[]>`
      SELECT id, "roleKey", name, permissions, "isSystem", "createdAt", "updatedAt"
      FROM admin_roles
      WHERE "roleKey" = ${roleKey}
      LIMIT 1
    `

    if (existing.length > 0) throw new ApiError(409, 'Role already exists')

    const id = randomUUID()

    await prisma.$executeRaw`
      INSERT INTO admin_roles (id, "roleKey", name, permissions, "isSystem")
      VALUES (${id}, ${roleKey}, ${input.name.trim()}, ${JSON.stringify(input.permissions)}::jsonb, false)
    `

    await activityService.create({
      action: 'CREATE',
      entityType: 'ADMIN_ROLE',
      entityId: id,
      description: `Admin created role ${input.name}`,
      userId: actorId,
    })

    const created = await prisma.$queryRaw<DbAdminRole[]>`
      SELECT id, "roleKey", name, permissions, "isSystem", "createdAt", "updatedAt"
      FROM admin_roles
      WHERE id = ${id}
      LIMIT 1
    `

    const row = created[0]

    return {
      ...summarizePermissionDisplay(parsePermissions(row.permissions)),
      id: row.id,
      roleKey: row.roleKey,
      name: row.name,
      role: row.roleKey,
      permissions: parsePermissions(row.permissions),
      userCount: 0,
      isSystem: Boolean(row.isSystem),
      createdAt: formatDate(row.createdAt),
      updatedAt: formatDate(row.updatedAt),
    }
  },

  updateRole: async (
    id: string,
    input: { name?: string; permissions?: string[] },
    actorId?: string,
  ) => {
    await ensureSystemRoles()

    const existingRows = await prisma.$queryRaw<DbAdminRole[]>`
      SELECT id, "roleKey", name, permissions, "isSystem", "createdAt", "updatedAt"
      FROM admin_roles
      WHERE id = ${id}
      LIMIT 1
    `

    const existing = existingRows[0]
    if (!existing) throw new ApiError(404, 'Role not found')

    const nextName = input.name?.trim() || existing.name
    const nextPermissions = input.permissions ?? parsePermissions(existing.permissions)

    await prisma.$executeRaw`
      UPDATE admin_roles
      SET name = ${nextName}, permissions = ${JSON.stringify(nextPermissions)}::jsonb, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `

    await activityService.create({
      action: 'UPDATE',
      entityType: 'ADMIN_ROLE',
      entityId: id,
      description: `Admin updated role ${nextName}`,
      userId: actorId,
    })

    const updatedRows = await prisma.$queryRaw<DbAdminRole[]>`
      SELECT id, "roleKey", name, permissions, "isSystem", "createdAt", "updatedAt"
      FROM admin_roles
      WHERE id = ${id}
      LIMIT 1
    `

    const updated = updatedRows[0]
    const assignedUsers = await countUsersByRoleKey(updated.roleKey)

    return {
      ...summarizePermissionDisplay(parsePermissions(updated.permissions)),
      id: updated.id,
      roleKey: updated.roleKey,
      name: updated.name,
      role: updated.roleKey,
      permissions: parsePermissions(updated.permissions),
      userCount: assignedUsers,
      isSystem: Boolean(updated.isSystem),
      createdAt: formatDate(updated.createdAt),
      updatedAt: formatDate(updated.updatedAt),
    }
  },

  deleteRole: async (id: string, actorId?: string) => {
    await ensureSystemRoles()

    const rows = await prisma.$queryRaw<DbAdminRole[]>`
      SELECT id, "roleKey", name, permissions, "isSystem", "createdAt", "updatedAt"
      FROM admin_roles
      WHERE id = ${id}
      LIMIT 1
    `

    const role = rows[0]
    if (!role) throw new ApiError(404, 'Role not found')
    if (role.isSystem) throw new ApiError(400, 'System roles cannot be deleted')

    const assignedUsers = await countUsersByRoleKey(role.roleKey)
    if (assignedUsers > 0) {
      throw new ApiError(400, 'This role cannot be deleted because it is assigned to users')
    }

    await prisma.$executeRaw`DELETE FROM admin_roles WHERE id = ${id}`

    await activityService.create({
      action: 'DELETE',
      entityType: 'ADMIN_ROLE',
      entityId: id,
      description: `Admin deleted role ${role.name}`,
      userId: actorId,
    })
  },
}
