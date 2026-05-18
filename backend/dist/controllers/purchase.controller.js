"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseController = void 0;
const purchase_service_1 = require("../services/purchase.service");
exports.purchaseController = {
    list: async (req, res, next) => {
        try {
            res.json(await purchase_service_1.purchaseService.list({
                page: req.query.page,
                limit: req.query.limit,
                search: req.query.search,
                partyId: req.query.partyId,
                from: req.query.from,
                to: req.query.to,
            }));
        }
        catch (error) {
            next(error);
        }
    },
    getById: async (req, res, next) => {
        try {
            res.json(await purchase_service_1.purchaseService.getById(String(req.params.id)));
        }
        catch (error) {
            next(error);
        }
    },
    create: async (req, res, next) => {
        try {
            res.status(201).json(await purchase_service_1.purchaseService.create(req.body, req.user?.userId));
        }
        catch (error) {
            next(error);
        }
    },
    update: async (req, res, next) => {
        try {
            res.json(await purchase_service_1.purchaseService.update(String(req.params.id), req.body, req.user?.userId));
        }
        catch (error) {
            next(error);
        }
    },
    delete: async (req, res, next) => {
        try {
            await purchase_service_1.purchaseService.delete(String(req.params.id), req.user?.userId);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    },
};
