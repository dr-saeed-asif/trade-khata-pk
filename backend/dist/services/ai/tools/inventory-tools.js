"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInventoryTools = void 0;
const prisma_1 = require("../../../config/prisma");
const item_service_1 = require("../../item.service");
const utils_1 = require("./utils");
const runInventoryTools = async (ctx, existingResults) => {
    const results = [];
    if (ctx.intent === 'search-items' && ctx.can('items.read')) {
        const searchTerm = (0, utils_1.extractSearchTerm)(ctx.message);
        results.push({
            tool: 'search-items',
            data: await item_service_1.itemService.list({ page: '1', limit: '10', search: searchTerm }),
        });
    }
    if (existingResults.length === 0 &&
        ctx.can('items.read') &&
        (0, utils_1.hasAnyWord)(ctx.text, ['show', 'find', 'lookup', 'search'])) {
        const searchTerm = (0, utils_1.extractSearchTerm)(ctx.message);
        results.push({
            tool: 'search-items',
            data: await item_service_1.itemService.list({ page: '1', limit: '10', search: searchTerm }),
        });
    }
    if ((0, utils_1.includesExpiredIntent)(ctx.text) && ctx.can('items.read')) {
        results.push({
            tool: 'expired-count',
            data: {
                totalExpiredItems: (await item_service_1.itemService.list({ page: '1', limit: '1', expired: 'true' })).total,
            },
        });
    }
    if ((0, utils_1.includesInventoryDetailsIntent)(ctx.text) && ctx.can('items.read')) {
        results.push({
            tool: 'inventory-details',
            data: await item_service_1.itemService.list({ page: '1', limit: '100' }),
        });
    }
    if ((0, utils_1.includesTotalStockQuantityIntent)(ctx.text) && ctx.can('stock.read')) {
        const aggregate = await prisma_1.prisma.item.aggregate({
            _sum: { quantity: true, reservedQty: true },
        });
        const totalStockQuantity = aggregate._sum.quantity ?? 0;
        const totalReservedQuantity = aggregate._sum.reservedQty ?? 0;
        results.push({
            tool: 'stock-total-quantity',
            data: {
                totalStockQuantity,
                totalReservedQuantity,
                totalAvailableQuantity: Math.max(0, totalStockQuantity - totalReservedQuantity),
            },
        });
    }
    return results;
};
exports.runInventoryTools = runInventoryTools;
