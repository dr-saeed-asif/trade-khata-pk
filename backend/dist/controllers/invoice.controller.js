"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceController = void 0;
const invoice_service_1 = require("../services/invoice.service");
exports.invoiceController = {
    list: async (req, res, next) => {
        try {
            res.json(await invoice_service_1.invoiceService.list(req.query));
        }
        catch (error) {
            next(error);
        }
    },
    getById: async (req, res, next) => {
        try {
            res.json(await invoice_service_1.invoiceService.getById(String(req.params.id)));
        }
        catch (error) {
            next(error);
        }
    },
    getPublic: async (req, res, next) => {
        try {
            res.json(await invoice_service_1.invoiceService.getByPublicToken(String(req.params.publicToken)));
        }
        catch (error) {
            next(error);
        }
    },
    create: async (req, res, next) => {
        try {
            res.status(201).json(await invoice_service_1.invoiceService.create(req.body, req.user?.userId));
        }
        catch (error) {
            next(error);
        }
    },
    update: async (req, res, next) => {
        try {
            res.json(await invoice_service_1.invoiceService.update(String(req.params.id), req.body, req.user?.userId));
        }
        catch (error) {
            next(error);
        }
    },
    confirm: async (req, res, next) => {
        try {
            res.json(await invoice_service_1.invoiceService.confirm(String(req.params.id), req.user?.userId));
        }
        catch (error) {
            next(error);
        }
    },
    cancel: async (req, res, next) => {
        try {
            res.json(await invoice_service_1.invoiceService.cancel(String(req.params.id), req.user?.userId));
        }
        catch (error) {
            next(error);
        }
    },
    refund: async (req, res, next) => {
        try {
            res.json(await invoice_service_1.invoiceService.refund(String(req.params.id), req.body, req.user?.userId));
        }
        catch (error) {
            next(error);
        }
    },
    recordPayment: async (req, res, next) => {
        try {
            res.json(await invoice_service_1.invoiceService.recordPayment(String(req.params.id), req.body, req.user?.userId));
        }
        catch (error) {
            next(error);
        }
    },
};
