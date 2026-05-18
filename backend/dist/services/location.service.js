"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationService = void 0;
const prisma_1 = require("../config/prisma");
const api_error_1 = require("../utils/api-error");
const domain_events_1 = require("../architecture/domain-events");
const normalizeSegment = (value) => value.trim().toUpperCase().replace(/\s+/g, '-');
const createLocationCodes = (warehouseCode, shelf, rack, bin) => {
    const signature = `${normalizeSegment(warehouseCode)}-${normalizeSegment(shelf)}-${normalizeSegment(rack)}-${normalizeSegment(bin)}`;
    return {
        barcodeValue: `LOC-${signature}`,
        qrValue: `LOC:${signature}`,
    };
};
exports.locationService = {
    list: async (warehouseId) => prisma_1.prisma.storageLocation.findMany({
        where: warehouseId ? { warehouseId } : undefined,
        include: {
            warehouse: true,
            _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
    }),
    create: async (input) => {
        const warehouse = await prisma_1.prisma.warehouse.findUnique({ where: { id: input.warehouseId } });
        if (!warehouse) {
            throw new api_error_1.ApiError(404, 'Warehouse not found');
        }
        const shelf = normalizeSegment(input.shelf);
        const rack = normalizeSegment(input.rack);
        const bin = normalizeSegment(input.bin);
        const { barcodeValue, qrValue } = createLocationCodes(warehouse.code, shelf, rack, bin);
        const duplicate = await prisma_1.prisma.storageLocation.findFirst({
            where: {
                warehouseId: input.warehouseId,
                shelf,
                rack,
                bin,
            },
        });
        if (duplicate) {
            throw new api_error_1.ApiError(409, 'Location already exists in this warehouse');
        }
        return prisma_1.prisma.storageLocation.create({
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
            domain_events_1.domainEvents.publish({
                type: 'inventory.location.created',
                payload: { locationId: location.id, warehouseId: location.warehouseId, qrValue: location.qrValue },
            });
            return location;
        });
    },
    scanByCode: async (code) => {
        const trimmed = code.trim();
        const location = await prisma_1.prisma.storageLocation.findFirst({
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
        });
        if (!location) {
            throw new api_error_1.ApiError(404, 'Location not found for provided code');
        }
        return location;
    },
    itemsAtLocation: async (locationId) => {
        const location = await prisma_1.prisma.storageLocation.findUnique({
            where: { id: locationId },
            include: {
                warehouse: true,
                items: {
                    include: { category: true },
                    orderBy: { name: 'asc' },
                },
            },
        });
        if (!location) {
            throw new api_error_1.ApiError(404, 'Location not found');
        }
        return location;
    },
};
