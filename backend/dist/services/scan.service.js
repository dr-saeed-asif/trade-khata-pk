"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanService = void 0;
const prisma_1 = require("../config/prisma");
const api_error_1 = require("../utils/api-error");
const activity_service_1 = require("./activity.service");
exports.scanService = {
    create: async (qrCode, note, userId) => {
        const item = await prisma_1.prisma.item.findFirst({
            where: {
                OR: [{ qrValue: qrCode }, { barcodeValue: qrCode }],
            },
        });
        if (!item)
            throw new api_error_1.ApiError(404, 'Item not found for provided code');
        const scan = await prisma_1.prisma.scanHistory.create({
            data: {
                qrCode,
                note,
                itemId: item.id,
                userId,
            },
        });
        await activity_service_1.activityService.create({
            action: 'SCAN',
            entityType: 'ITEM',
            entityId: item.id,
            description: 'Code scan logged',
            userId,
            itemId: item.id,
        });
        return scan;
    },
};
