import { prisma } from '../config/prisma'
import { ApiError } from '../utils/api-error'

const normalizeCode = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const warehouseService = {
  list: async () =>
    prisma.warehouse.findMany({
      include: { _count: { select: { locations: true } } },
      orderBy: { createdAt: 'desc' },
    }),

  create: async (input: { name: string; code: string; address?: string }) => {
    const code = normalizeCode(input.code)
    if (!code) {
      throw new ApiError(400, 'Warehouse code is required')
    }

    const existing = await prisma.warehouse.findUnique({ where: { code } })
    if (existing) {
      throw new ApiError(409, 'Warehouse code already exists')
    }

    return prisma.warehouse.create({
      data: {
        name: input.name.trim(),
        code,
        address: input.address?.trim() || undefined,
      },
    })
  },
}
