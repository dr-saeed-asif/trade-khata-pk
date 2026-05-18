"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportController = void 0;
const report_service_1 = require("../services/report.service");
exports.reportController = {
    exportCsv: async (_req, res, next) => {
        try {
            const csv = await report_service_1.reportService.exportCsv();
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="inventory-report.csv"');
            res.send(csv);
        }
        catch (error) {
            next(error);
        }
    },
    exportExcel: async (_req, res, next) => {
        try {
            const workbook = await report_service_1.reportService.exportExcel();
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="inventory-report.xlsx"');
            res.send(workbook);
        }
        catch (error) {
            next(error);
        }
    },
    lowStock: async (_req, res, next) => {
        try {
            res.json(await report_service_1.reportService.lowStock());
        }
        catch (error) {
            next(error);
        }
    },
    recent: async (_req, res, next) => {
        try {
            res.json(await report_service_1.reportService.recent());
        }
        catch (error) {
            next(error);
        }
    },
    movementTrend: async (req, res, next) => {
        try {
            res.json(await report_service_1.reportService.stockMovementTrend(String(req.query.days ?? '30')));
        }
        catch (error) {
            next(error);
        }
    },
    movers: async (req, res, next) => {
        try {
            res.json(await report_service_1.reportService.movers(String(req.query.days ?? '30')));
        }
        catch (error) {
            next(error);
        }
    },
    profitLoss: async (req, res, next) => {
        try {
            res.json(await report_service_1.reportService.profitLoss(String(req.query.days ?? '30')));
        }
        catch (error) {
            next(error);
        }
    },
};
