"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const node_crypto_1 = require("node:crypto");
const prisma_1 = require("../config/prisma");
const api_error_1 = require("../utils/api-error");
const activity_service_1 = require("./activity.service");
const role_permissions_service_1 = require("./role-permissions.service");
const formatDate = (value) => value?.toISOString() ?? new Date().toISOString();
const coreRoles = ['ADMIN', 'MANAGER', 'USER'];
const moduleLabelMap = {
    items: 'Inventory',
    categories: 'Category',
    qr: 'QR Code',
    reports: 'Report',
    scan: 'Scan',
    stock: 'Stock',
};
const toPermissionAction = (permission) => {
    const action = permission.split('.')[1] ?? permission;
    const normalized = action.toLowerCase();
    if (normalized === 'read')
        return 'View';
    if (normalized === 'create')
        return 'Create';
    if (normalized === 'update' || normalized === 'write')
        return 'Edit';
    if (normalized === 'delete')
        return 'Delete';
    if (normalized === 'manage')
        return 'Manage';
    if (normalized === 'import')
        return 'Import';
    if (normalized === 'export')
        return 'Export';
    return null;
};
const toPermissionModule = (permission) => {
    const moduleKey = permission.split('.')[0] ?? permission;
    return (moduleLabelMap[moduleKey] ??
        moduleKey
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase()));
};
const summarizePermissionDisplay = (permissions) => ({
    actions: Array.from(new Set(permissions
        .map((permission) => toPermissionAction(permission))
        .filter(Boolean))),
    modules: Array.from(new Set(permissions.map((permission) => toPermissionModule(permission)))),
});
const toRoleKey = (name) => name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
const isCoreRoleKey = (roleKey) => coreRoles.includes(roleKey);
const countUsersByRoleKey = async (roleKey) => {
    if (isCoreRoleKey(roleKey)) {
        return prisma_1.prisma.user.count({ where: { role: roleKey } });
    }
    const rows = await prisma_1.prisma.$queryRaw `
    SELECT COUNT(*)::int as count
    FROM admin_user_roles
    WHERE "roleKey" = ${roleKey}
  `;
    const rawCount = rows[0]?.count ?? 0;
    return Number(rawCount);
};
exports.adminService = {
    listUsers: async () => {
        await (0, role_permissions_service_1.ensureSystemRoles)();
        const users = await prisma_1.prisma.user.findMany({
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
        });
        const overrides = await prisma_1.prisma.$queryRaw `
      SELECT "userId", "roleKey" FROM admin_user_roles
    `;
        const overrideMap = new Map(overrides.map((row) => [row.userId, row.roleKey]));
        return users.map((user) => ({
            ...user,
            role: overrideMap.get(user.id) ?? user.role,
            createdAt: formatDate(user.createdAt),
            updatedAt: formatDate(user.updatedAt),
        }));
    },
    createUser: async (input, actorId) => {
        await (0, role_permissions_service_1.ensureSystemRoles)();
        const existing = await prisma_1.prisma.user.findUnique({ where: { email: input.email } });
        if (existing)
            throw new api_error_1.ApiError(409, 'Email already in use');
        const username = input.username?.trim() || null;
        if (username) {
            const usernameTaken = await prisma_1.prisma.user.findUnique({ where: { username } });
            if (usernameTaken)
                throw new api_error_1.ApiError(409, 'Username already in use');
        }
        const passwordHash = await bcrypt_1.default.hash(input.password, 10);
        const selectedRole = input.role.trim().toUpperCase();
        const isCoreRole = coreRoles.includes(selectedRole);
        const savedRole = isCoreRole ? selectedRole : 'USER';
        const user = await prisma_1.prisma.user.create({
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
        });
        if (!isCoreRole) {
            await prisma_1.prisma.$executeRaw `
        INSERT INTO admin_user_roles ("userId", "roleKey")
        VALUES (${user.id}, ${selectedRole})
        ON CONFLICT ("userId") DO UPDATE SET "roleKey" = EXCLUDED."roleKey", "updatedAt" = CURRENT_TIMESTAMP
      `;
        }
        await activity_service_1.activityService.create({
            action: 'CREATE',
            entityType: 'ADMIN_USER',
            entityId: user.id,
            description: `Admin created user ${user.email}`,
            userId: actorId,
        });
        return {
            ...user,
            role: selectedRole,
        };
    },
    updateUser: async (userId, input, actorId) => {
        await (0, role_permissions_service_1.ensureSystemRoles)();
        const existing = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!existing)
            throw new api_error_1.ApiError(404, 'User not found');
        if (input.email && input.email !== existing.email) {
            const emailTaken = await prisma_1.prisma.user.findUnique({ where: { email: input.email } });
            if (emailTaken)
                throw new api_error_1.ApiError(409, 'Email already in use');
        }
        const username = input.username === undefined ? undefined : input.username.trim() || null;
        if (username && username !== existing.username) {
            const usernameTaken = await prisma_1.prisma.user.findUnique({ where: { username } });
            if (usernameTaken)
                throw new api_error_1.ApiError(409, 'Username already in use');
        }
        const passwordHash = input.password ? await bcrypt_1.default.hash(input.password, 10) : undefined;
        const selectedRole = input.role?.trim().toUpperCase();
        const isCoreRole = selectedRole ? coreRoles.includes(selectedRole) : undefined;
        const user = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                name: input.name,
                ...(username !== undefined ? { username } : {}),
                email: input.email,
                role: selectedRole ? (isCoreRole ? selectedRole : 'USER') : undefined,
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
        });
        if (selectedRole) {
            if (isCoreRole) {
                await prisma_1.prisma.$executeRaw `DELETE FROM admin_user_roles WHERE "userId" = ${userId}`;
            }
            else {
                await prisma_1.prisma.$executeRaw `
          INSERT INTO admin_user_roles ("userId", "roleKey")
          VALUES (${userId}, ${selectedRole})
          ON CONFLICT ("userId") DO UPDATE SET "roleKey" = EXCLUDED."roleKey", "updatedAt" = CURRENT_TIMESTAMP
        `;
            }
        }
        await activity_service_1.activityService.create({
            action: 'UPDATE',
            entityType: 'ADMIN_USER',
            entityId: user.id,
            description: `Admin updated user ${user.email}`,
            userId: actorId,
        });
        return {
            ...user,
            role: selectedRole ?? user.role,
        };
    },
    deleteUser: async (userId, actorId) => {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new api_error_1.ApiError(404, 'User not found');
        if (actorId && actorId === userId)
            throw new api_error_1.ApiError(400, 'You cannot delete your own account');
        await (0, role_permissions_service_1.ensureSystemRoles)();
        await prisma_1.prisma.$executeRaw `DELETE FROM admin_user_roles WHERE "userId" = ${userId}`;
        await prisma_1.prisma.user.delete({ where: { id: userId } });
        await activity_service_1.activityService.create({
            action: 'DELETE',
            entityType: 'ADMIN_USER',
            entityId: userId,
            description: `Admin deleted user ${user.email}`,
            userId: actorId,
        });
    },
    listRoles: async () => {
        await (0, role_permissions_service_1.ensureSystemRoles)();
        const rows = await prisma_1.prisma.$queryRaw `
      SELECT id, "roleKey", name, permissions, "isSystem", "createdAt", "updatedAt"
      FROM admin_roles
      ORDER BY "createdAt" DESC
    `;
        const roleStats = await prisma_1.prisma.user.groupBy({ by: ['role'], _count: { _all: true } });
        const customRoleStats = await prisma_1.prisma.$queryRaw `
      SELECT "roleKey", COUNT(*)::int as count
      FROM admin_user_roles
      GROUP BY "roleKey"
    `;
        const userCountByRole = new Map(roleStats.map((entry) => [entry.role, entry._count._all]));
        for (const row of customRoleStats) {
            userCountByRole.set(row.roleKey, Number(row.count));
        }
        return rows.map((row) => ({
            ...summarizePermissionDisplay((0, role_permissions_service_1.parsePermissions)(row.permissions)),
            id: row.id,
            roleKey: row.roleKey,
            name: row.name,
            role: row.roleKey,
            permissions: (0, role_permissions_service_1.parsePermissions)(row.permissions),
            userCount: userCountByRole.get(row.roleKey) ?? 0,
            isSystem: Boolean(row.isSystem),
            createdAt: formatDate(row.createdAt),
            updatedAt: formatDate(row.updatedAt),
        }));
    },
    createRole: async (input, actorId) => {
        await (0, role_permissions_service_1.ensureSystemRoles)();
        const roleKey = toRoleKey(input.name);
        if (!roleKey)
            throw new api_error_1.ApiError(400, 'Role name is invalid');
        const existing = await prisma_1.prisma.$queryRaw `
      SELECT id, "roleKey", name, permissions, "isSystem", "createdAt", "updatedAt"
      FROM admin_roles
      WHERE "roleKey" = ${roleKey}
      LIMIT 1
    `;
        if (existing.length > 0)
            throw new api_error_1.ApiError(409, 'Role already exists');
        const id = (0, node_crypto_1.randomUUID)();
        await prisma_1.prisma.$executeRaw `
      INSERT INTO admin_roles (id, "roleKey", name, permissions, "isSystem")
      VALUES (${id}, ${roleKey}, ${input.name.trim()}, ${JSON.stringify(input.permissions)}::jsonb, false)
    `;
        await activity_service_1.activityService.create({
            action: 'CREATE',
            entityType: 'ADMIN_ROLE',
            entityId: id,
            description: `Admin created role ${input.name}`,
            userId: actorId,
        });
        const created = await prisma_1.prisma.$queryRaw `
      SELECT id, "roleKey", name, permissions, "isSystem", "createdAt", "updatedAt"
      FROM admin_roles
      WHERE id = ${id}
      LIMIT 1
    `;
        const row = created[0];
        return {
            ...summarizePermissionDisplay((0, role_permissions_service_1.parsePermissions)(row.permissions)),
            id: row.id,
            roleKey: row.roleKey,
            name: row.name,
            role: row.roleKey,
            permissions: (0, role_permissions_service_1.parsePermissions)(row.permissions),
            userCount: 0,
            isSystem: Boolean(row.isSystem),
            createdAt: formatDate(row.createdAt),
            updatedAt: formatDate(row.updatedAt),
        };
    },
    updateRole: async (id, input, actorId) => {
        await (0, role_permissions_service_1.ensureSystemRoles)();
        const existingRows = await prisma_1.prisma.$queryRaw `
      SELECT id, "roleKey", name, permissions, "isSystem", "createdAt", "updatedAt"
      FROM admin_roles
      WHERE id = ${id}
      LIMIT 1
    `;
        const existing = existingRows[0];
        if (!existing)
            throw new api_error_1.ApiError(404, 'Role not found');
        const nextName = input.name?.trim() || existing.name;
        const nextPermissions = input.permissions ?? (0, role_permissions_service_1.parsePermissions)(existing.permissions);
        await prisma_1.prisma.$executeRaw `
      UPDATE admin_roles
      SET name = ${nextName}, permissions = ${JSON.stringify(nextPermissions)}::jsonb, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;
        await activity_service_1.activityService.create({
            action: 'UPDATE',
            entityType: 'ADMIN_ROLE',
            entityId: id,
            description: `Admin updated role ${nextName}`,
            userId: actorId,
        });
        const updatedRows = await prisma_1.prisma.$queryRaw `
      SELECT id, "roleKey", name, permissions, "isSystem", "createdAt", "updatedAt"
      FROM admin_roles
      WHERE id = ${id}
      LIMIT 1
    `;
        const updated = updatedRows[0];
        const assignedUsers = await countUsersByRoleKey(updated.roleKey);
        return {
            ...summarizePermissionDisplay((0, role_permissions_service_1.parsePermissions)(updated.permissions)),
            id: updated.id,
            roleKey: updated.roleKey,
            name: updated.name,
            role: updated.roleKey,
            permissions: (0, role_permissions_service_1.parsePermissions)(updated.permissions),
            userCount: assignedUsers,
            isSystem: Boolean(updated.isSystem),
            createdAt: formatDate(updated.createdAt),
            updatedAt: formatDate(updated.updatedAt),
        };
    },
    deleteRole: async (id, actorId) => {
        await (0, role_permissions_service_1.ensureSystemRoles)();
        const rows = await prisma_1.prisma.$queryRaw `
      SELECT id, "roleKey", name, permissions, "isSystem", "createdAt", "updatedAt"
      FROM admin_roles
      WHERE id = ${id}
      LIMIT 1
    `;
        const role = rows[0];
        if (!role)
            throw new api_error_1.ApiError(404, 'Role not found');
        if (role.isSystem)
            throw new api_error_1.ApiError(400, 'System roles cannot be deleted');
        const assignedUsers = await countUsersByRoleKey(role.roleKey);
        if (assignedUsers > 0) {
            throw new api_error_1.ApiError(400, 'This role cannot be deleted because it is assigned to users');
        }
        await prisma_1.prisma.$executeRaw `DELETE FROM admin_roles WHERE id = ${id}`;
        await activity_service_1.activityService.create({
            action: 'DELETE',
            entityType: 'ADMIN_ROLE',
            entityId: id,
            description: `Admin deleted role ${role.name}`,
            userId: actorId,
        });
    },
};
