import { prisma } from '../config/prisma'
import { ApiError } from '../utils/api-error'
import { domainEvents } from '../architecture/domain-events'

const normalizeSegment = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '-')

const createLocationCodes = (warehouseCode: string, shelf: string, rack: string, bin: string) => {
  const signature = `${normalizeSegment(warehouseCode)}-${normalizeSegment(shelf)}-${normalizeSegment(rack)}-${normalizeSegment(bin)}`
  return {
    barcodeValue: `LOC-${signature}`,
    qrValue: `LOC:${signature}`,
  }
}

export const locationService = {
  list: async (warehouseId?: string) =>
    prisma.storageLocation.findMany({
      where: warehouseId ? { warehouseId } : undefined,
      include: {
        warehouse: true,
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),

  create: async (input: {
    warehouseId: string
    name?: string
    shelf: string
    rack: string
    bin: string
  }) => {
    const warehouse = await prisma.warehouse.findUnique({ where: { id: input.warehouseId } })
    if (!warehouse) {
      throw new ApiError(404, 'Warehouse not found')
    }

    const shelf = normalizeSegment(input.shelf)
    const rack = normalizeSegment(input.rack)
    const bin = normalizeSegment(input.bin)
    const { barcodeValue, qrValue } = createLocationCodes(warehouse.code, shelf, rack, bin)

    const duplicate = await prisma.storageLocation.findFirst({
      where: {
        warehouseId: input.warehouseId,
        shelf,
        rack,
        bin,
      },
    })
    if (duplicate) {
      throw new ApiError(409, 'Location already exists in this warehouse')
    }

    return prisma.storageLocation.create({
      data: {
        warehouseId: input.warehouseId,
        name: input.name?.trim() || `${warehouse.code} ${shelf}/${rack}/${bin}`,
        shelf,
        rack,
        bin,
        qrValue,
        barcodeValue,
      },
      include: {
        warehouse: true,
      },
    }).then((location) => {
      domainEvents.publish({
        type: 'inventory.location.created',
        payload: { locationId: location.id, warehouseId: location.warehouseId, qrValue: location.qrValue },
      })
      return location
    })
  },

  scanByCode: async (code: string) => {
    const trimmed = code.trim()
    const location = await prisma.storageLocation.findFirst({
      where: {
        OR: [{ qrValue: trimmed }, { barcodeValue: trimmed }],
      },
      include: {
        warehouse: true,
        items: {
          include: { category: true },
          orderBy: { name: 'asc' },
        },
      },
    })

    if (!location) {
      throw new ApiError(404, 'Location not found for provided code')
    }

    return location
  },

  itemsAtLocation: async (locationId: string) => {
    const location = await prisma.storageLocation.findUnique({
      where: { id: locationId },
      include: {
        warehouse: true,
        items: {
          include: { category: true },
          orderBy: { name: 'asc' },
        },
      },
    })

    if (!location) {
      throw new ApiError(404, 'Location not found')
    }

    return location
  },
}
