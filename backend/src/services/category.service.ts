import { prisma } from '../config/prisma'
import { ApiError } from '../utils/api-error'
import { parsePagination } from '../utils/pagination'
import { activityService } from './activity.service'
import { auditService } from './audit.service'

export const categoryService = {
  create: async (name: string, userId?: string) => {
    const category = await prisma.category.create({ data: { name } })
    await activityService.create({
      action: 'CREATE',
      entityType: 'CATEGORY',
      entityId: category.id,
      description: `Category "${name}" created`,
      userId,
    })
    return category
  },

  getById: async (id: string) => {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    })
    if (!category) throw new ApiError(404, 'Category not found')
    return {
      id: category.id,
      name: category.name,
      itemsCount: category._count.items,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }
  },

  list: async (query?: { page?: string; limit?: string }) => {
    const { page, limit, skip } = parsePagination(query)

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { items: true } } },
        skip,
        take: limit,
      }),
      prisma.category.count(),
    ])

    return {
      data: categories.map((category) => ({
        id: category.id,
        name: category.name,
        itemsCount: category._count.items,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      })),
      total,
      page,
      limit,
    }
  },

  update: async (id: string, name: string, userId?: string) => {
    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Category not found')

    const category = await prisma.category.update({ where: { id }, data: { name } })
    await auditService.create({
      entityType: 'CATEGORY',
      entityId: id,
      oldData: existing,
      newData: category,
      userId,
    })
    return category
  },

  delete: async (id: string, userId?: string) => {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { items: true, itemLinks: true } } },
    })
    if (!category) throw new ApiError(404, 'Category not found')

    if (category._count.items > 0 || category._count.itemLinks > 0) {
      throw new ApiError(409, 'Cannot delete category with linked inventory items')
    }

    await prisma.category.delete({ where: { id } })
    await activityService.create({
      action: 'DELETE',
      entityType: 'CATEGORY',
      entityId: id,
      description: `Category "${category.name}" deleted`,
      userId,
    })
  },
}
