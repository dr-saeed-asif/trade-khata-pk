"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const invoice_controller_1 = require("../controllers/invoice.controller");
const print_settings_controller_1 = require("../controllers/print-settings.controller");
const router = (0, express_1.Router)();
router.get('/invoices/:publicToken', invoice_controller_1.invoiceController.getPublic);
router.get('/print-settings', print_settings_controller_1.printSettingsController.get);
exports.default = router;
