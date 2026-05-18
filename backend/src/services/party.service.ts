import { PartyType, Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'
import { ApiError } from '../utils/api-error'
import { parsePagination } from '../utils/pagination'
import { activityService } from './activity.service'

export interface PartyInput {
  name: string
  phone?: string
  email?: string
  address?: string
  type?: PartyType
}

const mapParty = (party: {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  type: PartyType
  createdAt: Date
  updatedAt: Date
  _count?: { sales: number; purchases: number }
}) => ({
  id: party.id,
  name: party.name,
  phone: party.phone,
  email: party.email,
  address: party.address,
  type: party.type,
  salesCount: party._count?.sales ?? 0,
  purchasesCount: party._count?.purchases ?? 0,
  createdAt: party.createdAt,
  updatedAt: party.updatedAt,
})

export const partyService = {
  create: async (input: PartyInput, userId?: string) => {
    const party = await prisma.party.create({
      data: {
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        type: input.type ?? PartyType.BOTH,
      },
    })
    await activityService.create({
      action: 'CREATE',
      entityType: 'PARTY',
      entityId: party.id,
      description: `Party "${party.name}" created`,
      userId,
    })
    return mapParty(party)
  },

  list: async (query?: { type?: PartyType; search?: string; page?: string; limit?: string }) => {
    const { page, limit, skip } = parsePagination(query)
    const and: Prisma.PartyWhereInput[] = []

    if (query?.type) {
      and.push({ type: { in: [query.type, PartyType.BOTH] } })
    }

    const search = query?.search?.trim()
    if (search) {
      and.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ],
      })
    }

    const where = and.length ? { AND: and } : undefined

    const [parties, total] = await Promise.all([
      prisma.party.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { sales: true, purchases: true } } },
        skip,
        take: limit,
      }),
      prisma.party.count({ where }),
    ])

    return { data: parties.map(mapParty), total, page, limit }
  },

  getById: async (id: string) => {
    const party = await prisma.party.findUnique({
      where: { id },
      include: { _count: { select: { sales: true, purchases: true } } },
    })
    if (!party) throw new ApiError(404, 'Party not found')
    return mapParty(party)
  },

  update: async (id: string, input: PartyInput, userId?: string) => {
    const existing = await prisma.party.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Party not found')

    const party = await prisma.party.update({
      where: { id },
      data: {
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        type: input.type ?? existing.type,
      },
      include: { _count: { select: { sales: true, purchases: true } } },
    })
    await activityService.create({
      action: 'UPDATE',
      entityType: 'PARTY',
      entityId: id,
      description: `Party "${party.name}" updated`,
      userId,
    })
    return mapParty(party)
  },

  delete: async (id: string, userId?: string) => {
    const party = await prisma.party.findUnique({
      where: { id },
      include: { _count: { select: { sales: true, purchases: true } } },
    })
    if (!party) throw new ApiError(404, 'Party not found')
    if (party._count.sales > 0 || party._count.purchases > 0) {
      throw new ApiError(409, 'Cannot delete party linked to sales or purchases')
    }

    await prisma.party.delete({ where: { id } })
    await activityService.create({
      action: 'DELETE',
      entityType: 'PARTY',
      entityId: id,
      description: `Party "${party.name}" deleted`,
      userId,
    })
  },
}
