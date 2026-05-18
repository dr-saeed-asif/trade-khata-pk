"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = void 0;
const prisma_1 = require("../config/prisma");
exports.auditService = {
    create: async (payload) => prisma_1.prisma.auditTrail.create({
        data: {
            entityType: payload.entityType,
            entityId: payload.entityId,
            oldData: payload.oldData,
            newData: payload.newData,
            userId: payload.userId,
            itemId: payload.itemId,
        },
    }),
};
