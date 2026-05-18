"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationController = void 0;
const location_service_1 = require("../services/location.service");
exports.locationController = {
    list: async (req, res, next) => {
        try {
            res.json(await location_service_1.locationService.list(req.query.warehouseId ? String(req.query.warehouseId) : undefined));
        }
        catch (error) {
            next(error);
        }
    },
    create: async (req, res, next) => {
        try {
            res.status(201).json(await location_service_1.locationService.create(req.body));
        }
        catch (error) {
            next(error);
        }
    },
    scan: async (req, res, next) => {
        try {
            res.json(await location_service_1.locationService.scanByCode(String(req.params.code)));
        }
        catch (error) {
            next(error);
        }
    },
    items: async (req, res, next) => {
        try {
            res.json(await location_service_1.locationService.itemsAtLocation(String(req.params.id)));
        }
        catch (error) {
            next(error);
        }
    },
};
