"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runReportTools = void 0;
const report_service_1 = require("../../report.service");
const runReportTools = async (ctx) => {
    const results = [];
    if (ctx.intent === 'low-stock' && ctx.can('reports.read')) {
        results.push({ tool: 'low-stock', data: await report_service_1.reportService.lowStock() });
    }
    if (ctx.intent === 'recent' && ctx.can('reports.read')) {
        results.push({ tool: 'recent', data: await report_service_1.reportService.recent() });
    }
    if (ctx.intent === 'movement-trend' && ctx.can('reports.read')) {
        results.push({ tool: 'movement-trend', data: await report_service_1.reportService.stockMovementTrend(String(ctx.days)) });
    }
    if (ctx.intent === 'movers' && ctx.can('reports.read')) {
        results.push({ tool: 'movers', data: await report_service_1.reportService.movers(String(ctx.days)) });
    }
    if (ctx.intent === 'profit-loss' && ctx.can('reports.read')) {
        results.push({ tool: 'profit-loss', data: await report_service_1.reportService.profitLoss(String(ctx.days)) });
    }
    return results;
};
exports.runReportTools = runReportTools;
