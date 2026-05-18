"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_1 = require("../services/auth.service");
exports.authController = {
    register: async (req, res, next) => {
        try {
            const result = await auth_service_1.authService.register(req.body);
            res.status(201).json(result);
        }
        catch (error) {
            next(error);
        }
    },
    login: async (req, res, next) => {
        try {
            const result = await auth_service_1.authService.login(req.body);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    },
    forgotPassword: async (req, res, next) => {
        try {
            const result = await auth_service_1.authService.forgotPassword(req.body);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    },
    refresh: async (req, res, next) => {
        try {
            if (!req.user?.userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const result = await auth_service_1.authService.refreshSession(req.user.userId);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    },
};
