"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertController = void 0;
const alert_service_1 = require("../services/alert.service");
exports.alertController = {
    list: async (_req, res, next) => {
        try {
            res.json(await alert_service_1.alertService.list());
        }
        catch (error) {
            next(error);
        }
    },
    summary: async (_req, res, next) => {
        try {
            res.json(await alert_service_1.alertService.summary());
        }
        catch (error) {
            next(error);
        }
    },
    refresh: async (_req, res, next) => {
        try {
            res.json(await alert_service_1.alertService.refreshAll());
        }
        catch (error) {
            next(error);
        }
    },
    markRead: async (req, res, next) => {
        try {
            res.json(await alert_service_1.alertService.markRead(String(req.params.id)));
        }
        catch (error) {
            next(error);
        }
    },
    markAllRead: async (_req, res, next) => {
        try {
            res.json(await alert_service_1.alertService.markAllRead());
        }
        catch (error) {
            next(error);
        }
    },
};
