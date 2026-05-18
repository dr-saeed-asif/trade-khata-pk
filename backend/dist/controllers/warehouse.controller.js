"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warehouseController = void 0;
const warehouse_service_1 = require("../services/warehouse.service");
exports.warehouseController = {
    list: async (_req, res, next) => {
        try {
            res.json(await warehouse_service_1.warehouseService.list());
        }
        catch (error) {
            next(error);
        }
    },
    create: async (req, res, next) => {
        try {
            res.status(201).json(await warehouse_service_1.warehouseService.create(req.body));
        }
        catch (error) {
            next(error);
        }
    },
};
