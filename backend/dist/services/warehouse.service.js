"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warehouseService = void 0;
const prisma_1 = require("../config/prisma");
const api_error_1 = require("../utils/api-error");
const normalizeCode = (value) => value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
exports.warehouseService = {
    list: async () => prisma_1.prisma.warehouse.findMany({
        include: { _count: { select: { locations: true } } },
        orderBy: { createdAt: 'desc' },
    }),
    create: async (input) => {
        const code = normalizeCode(input.code);
        if (!code) {
            throw new api_error_1.ApiError(400, 'Warehouse code is required');
        }
        const existing = await prisma_1.prisma.warehouse.findUnique({ where: { code } });
        if (existing) {
            throw new api_error_1.ApiError(409, 'Warehouse code already exists');
        }
        return prisma_1.prisma.warehouse.create({
            data: {
                name: input.name.trim(),
                code,
                address: input.address?.trim() || undefined,
            },
        });
    },
};
