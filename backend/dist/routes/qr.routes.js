"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const qr_controller_1 = require("../controllers/qr.controller");
const router = (0, express_1.Router)();
router.get('/:code', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizePermission)('qr.read'), qr_controller_1.qrController.getItemByCode);
exports.default = router;
