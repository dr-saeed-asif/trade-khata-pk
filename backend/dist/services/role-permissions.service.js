"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveUserPermissions = exports.getPermissionsForRoleKey = exports.ensureSystemRoles = exports.ensureRoleTables = exports.parsePermissions = void 0;
const node_crypto_1 = require("node:crypto");
const prisma_1 = require("../config/prisma");
const permissions_1 = require("../config/permissions");
const roleLabels = {
    ADMIN: 'Administrator',
    MANAGER: 'Operations Manager',
    USER: 'Standard User',
};
const coreRoles = ['ADMIN', 'MANAGER', 'USER'];
const parsePermissions = (value) => {
    if (Array.isArray(value))
        return value.map((item) => String(item));
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed))
                return parsed.map((item) => String(item));
        }
        catch {
            return [];
        }
    }
    return [];
};
exports.parsePermissions = parsePermissions;
const ensureRoleTables = async () => {
    await prisma_1.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS admin_roles (
      id TEXT NOT NULL PRIMARY KEY,
      "roleKey" TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      permissions JSONB NOT NULL,
      "isSystem" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
    await prisma_1.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS admin_user_roles (
      "userId" TEXT NOT NULL PRIMARY KEY,
      "roleKey" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
};
exports.ensureRoleTables = ensureRoleTables;
/** Insert missing system roles only — never overwrite customized permissions. */
const ensureSystemRoles = async () => {
    await (0, exports.ensureRoleTables)();
    const existing = await prisma_1.prisma.$queryRaw `
    SELECT "roleKey" FROM admin_roles WHERE "roleKey" IN ('ADMIN', 'MANAGER', 'USER')
  `;
    const existingKeys = new Set(existing.map((row) => row.roleKey));
    for (const role of coreRoles) {
        if (existingKeys.has(role))
            continue;
        await prisma_1.prisma.$executeRaw `
      INSERT INTO admin_roles (id, "roleKey", name, permissions, "isSystem")
      VALUES (${(0, node_crypto_1.randomUUID)()}, ${role}, ${roleLabels[role]}, ${JSON.stringify(Array.from(permissions_1.rolePermissions[role]))}::jsonb, true)
    `;
    }
};
exports.ensureSystemRoles = ensureSystemRoles;
const getPermissionsForRoleKey = async (roleKey) => {
    await (0, exports.ensureSystemRoles)();
    const fallback = coreRoles.includes(roleKey)
        ? Array.from(permissions_1.rolePermissions[roleKey])
        : [];
    const rows = await prisma_1.prisma.$queryRaw `
    SELECT permissions FROM admin_roles WHERE "roleKey" = ${roleKey} LIMIT 1
  `;
    const fromDb = (0, exports.parsePermissions)(rows[0]?.permissions);
    return fromDb.length > 0 ? fromDb : fallback;
};
exports.getPermissionsForRoleKey = getPermissionsForRoleKey;
const resolveUserPermissions = async (userId, role) => {
    await (0, exports.ensureRoleTables)();
    const overrideRows = await prisma_1.prisma.$queryRaw `
    SELECT "roleKey" FROM admin_user_roles WHERE "userId" = ${userId} LIMIT 1
  `;
    const effectiveRoleKey = overrideRows[0]?.roleKey ?? role;
    return (0, exports.getPermissionsForRoleKey)(effectiveRoleKey);
};
exports.resolveUserPermissions = resolveUserPermissions;
