"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printSettingsController = void 0;
const print_settings_service_1 = require("../services/print-settings.service");
exports.printSettingsController = {
    get: async (_req, res, next) => {
        try {
            res.json(await print_settings_service_1.printSettingsService.get());
        }
        catch (error) {
            next(error);
        }
    },
    update: async (req, res, next) => {
        try {
            res.json(await print_settings_service_1.printSettingsService.update(req.body));
        }
        catch (error) {
            next(error);
        }
    },
};
