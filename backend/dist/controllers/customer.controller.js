"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerController = void 0;
const customer_service_1 = require("../services/customer.service");
exports.customerController = {
    list: async (req, res, next) => {
        try {
            res.json(await customer_service_1.customerService.list(req.query));
        }
        catch (error) {
            next(error);
        }
    },
    getById: async (req, res, next) => {
        try {
            res.json(await customer_service_1.customerService.getById(String(req.params.id)));
        }
        catch (error) {
            next(error);
        }
    },
    create: async (req, res, next) => {
        try {
            res.status(201).json(await customer_service_1.customerService.create(req.body));
        }
        catch (error) {
            next(error);
        }
    },
    update: async (req, res, next) => {
        try {
            res.json(await customer_service_1.customerService.update(String(req.params.id), req.body));
        }
        catch (error) {
            next(error);
        }
    },
    delete: async (req, res, next) => {
        try {
            await customer_service_1.customerService.delete(String(req.params.id));
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    },
};
