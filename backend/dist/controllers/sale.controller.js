"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saleController = void 0;
const sale_service_1 = require("../services/sale.service");
exports.saleController = {
    list: async (req, res, next) => {
        try {
            res.json(await sale_service_1.saleService.list({
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
            res.json(await sale_service_1.saleService.getById(String(req.params.id)));
        }
        catch (error) {
            next(error);
        }
    },
    create: async (req, res, next) => {
        try {
            res.status(201).json(await sale_service_1.saleService.create(req.body, req.user?.userId));
        }
        catch (error) {
            next(error);
        }
    },
    update: async (req, res, next) => {
        try {
            res.json(await sale_service_1.saleService.update(String(req.params.id), req.body, req.user?.userId));
        }
        catch (error) {
            next(error);
        }
    },
    delete: async (req, res, next) => {
        try {
            await sale_service_1.saleService.delete(String(req.params.id), req.user?.userId);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    },
};
