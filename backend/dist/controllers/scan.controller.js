"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanController = void 0;
const scan_service_1 = require("../services/scan.service");
exports.scanController = {
    create: async (req, res, next) => {
        try {
            const scan = await scan_service_1.scanService.create(req.body.qrCode, req.body.note, req.user?.userId);
            res.status(201).json(scan);
        }
        catch (error) {
            next(error);
        }
    },
};
