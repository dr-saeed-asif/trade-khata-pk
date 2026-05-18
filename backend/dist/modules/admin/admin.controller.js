"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminController = void 0;
const admin_service_1 = require("./admin.service");
exports.adminController = {
    users: async (_req, res, next) => {
        try {
            res.json(await admin_service_1.adminService.listUsers());
        }
        catch (error) {
            next(error);
        }
    },
    createUser: async (req, res, next) => {
        try {
            const user = await admin_service_1.adminService.createUser(req.body, req.user?.userId);
            res.status(201).json(user);
        }
        catch (error) {
            next(error);
        }
    },
    updateUser: async (req, res, next) => {
        try {
            const user = await admin_service_1.adminService.updateUser(String(req.params.id), req.body, req.user?.userId);
            res.json(user);
        }
        catch (error) {
            next(error);
        }
    },
    deleteUser: async (req, res, next) => {
        try {
            await admin_service_1.adminService.deleteUser(String(req.params.id), req.user?.userId);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    },
    roles: async (_req, res, next) => {
        try {
            res.json(await admin_service_1.adminService.listRoles());
        }
        catch (error) {
            next(error);
        }
    },
    createRole: async (req, res, next) => {
        try {
            const role = await admin_service_1.adminService.createRole(req.body, req.user?.userId);
            res.status(201).json(role);
        }
        catch (error) {
            next(error);
        }
    },
    updateRole: async (req, res, next) => {
        try {
            const role = await admin_service_1.adminService.updateRole(String(req.params.id), req.body, req.user?.userId);
            res.json(role);
        }
        catch (error) {
            next(error);
        }
    },
    deleteRole: async (req, res, next) => {
        try {
            await admin_service_1.adminService.deleteRole(String(req.params.id), req.user?.userId);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    },
};
