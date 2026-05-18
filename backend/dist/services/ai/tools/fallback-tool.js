"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFallbackSnapshotTool = void 0;
const item_service_1 = require("../../item.service");
const report_service_1 = require("../../report.service");
const runFallbackSnapshotTool = async (ctx, existingResults) => {
    if (existingResults.length > 0)
        return [];
    if (!(ctx.can('items.read') && ctx.can('categories.read') && ctx.can('reports.read')))
        return [];
    const [items, categories, lowStock, recent] = await Promise.all([
        item_service_1.itemService.list({ page: '1', limit: '1' }),
        ctx.getCategories(),
        report_service_1.reportService.lowStock(),
        report_service_1.reportService.recent(),
    ]);
    return [
        {
            tool: 'system-snapshot',
            data: {
                totalItems: items.total,
                totalCategories: categories.length,
                lowStockItems: Array.isArray(lowStock) ? lowStock.length : 0,
                recentItems: recent.length,
            },
        },
    ];
};
exports.runFallbackSnapshotTool = runFallbackSnapshotTool;
