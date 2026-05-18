"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qrController = void 0;
const item_service_1 = require("../services/item.service");
exports.qrController = {
    getItemByCode: async (req, res, next) => {
        try {
            const item = await item_service_1.itemService.getByCode(String(req.params.code));
            res.json(item);
        }
        catch (error) {
            next(error);
        }
    },
};
