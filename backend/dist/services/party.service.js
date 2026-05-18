"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partyService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
const api_error_1 = require("../utils/api-error");
const pagination_1 = require("../utils/pagination");
const activity_service_1 = require("./activity.service");
const mapParty = (party) => ({
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
});
exports.partyService = {
    create: async (input, userId) => {
        const party = await prisma_1.prisma.party.create({
            data: {
                name: input.name.trim(),
                phone: input.phone?.trim() || null,
                email: input.email?.trim() || null,
                address: input.address?.trim() || null,
                type: input.type ?? client_1.PartyType.BOTH,
            },
        });
        await activity_service_1.activityService.create({
            action: 'CREATE',
            entityType: 'PARTY',
            entityId: party.id,
            description: `Party "${party.name}" created`,
            userId,
        });
        return mapParty(party);
    },
    list: async (query) => {
        const { page, limit, skip } = (0, pagination_1.parsePagination)(query);
        const and = [];
        if (query?.type) {
            and.push({ type: { in: [query.type, client_1.PartyType.BOTH] } });
        }
        const search = query?.search?.trim();
        if (search) {
            and.push({
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { address: { contains: search, mode: 'insensitive' } },
                ],
            });
        }
        const where = and.length ? { AND: and } : undefined;
        const [parties, total] = await Promise.all([
            prisma_1.prisma.party.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: { _count: { select: { sales: true, purchases: true } } },
                skip,
                take: limit,
            }),
            prisma_1.prisma.party.count({ where }),
        ]);
        return { data: parties.map(mapParty), total, page, limit };
    },
    getById: async (id) => {
        const party = await prisma_1.prisma.party.findUnique({
            where: { id },
            include: { _count: { select: { sales: true, purchases: true } } },
        });
        if (!party)
            throw new api_error_1.ApiError(404, 'Party not found');
        return mapParty(party);
    },
    update: async (id, input, userId) => {
        const existing = await prisma_1.prisma.party.findUnique({ where: { id } });
        if (!existing)
            throw new api_error_1.ApiError(404, 'Party not found');
        const party = await prisma_1.prisma.party.update({
            where: { id },
            data: {
                name: input.name.trim(),
                phone: input.phone?.trim() || null,
                email: input.email?.trim() || null,
                address: input.address?.trim() || null,
                type: input.type ?? existing.type,
            },
            include: { _count: { select: { sales: true, purchases: true } } },
        });
        await activity_service_1.activityService.create({
            action: 'UPDATE',
            entityType: 'PARTY',
            entityId: id,
            description: `Party "${party.name}" updated`,
            userId,
        });
        return mapParty(party);
    },
    delete: async (id, userId) => {
        const party = await prisma_1.prisma.party.findUnique({
            where: { id },
            include: { _count: { select: { sales: true, purchases: true } } },
        });
        if (!party)
            throw new api_error_1.ApiError(404, 'Party not found');
        if (party._count.sales > 0 || party._count.purchases > 0) {
            throw new api_error_1.ApiError(409, 'Cannot delete party linked to sales or purchases');
        }
        await prisma_1.prisma.party.delete({ where: { id } });
        await activity_service_1.activityService.create({
            action: 'DELETE',
            entityType: 'PARTY',
            entityId: id,
            description: `Party "${party.name}" deleted`,
            userId,
        });
    },
};
