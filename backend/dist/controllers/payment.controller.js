"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentController = void 0;
const invoice_service_1 = require("../services/invoice.service");
const payment_service_1 = require("../services/payment.service");
exports.paymentController = {
    list: async (req, res, next) => {
        try {
            res.json(await payment_service_1.paymentService.list(req.query));
        }
        catch (error) {
            next(error);
        }
    },
    listByInvoice: async (req, res, next) => {
        try {
            res.json(await payment_service_1.paymentService.listByInvoice(String(req.params.invoiceId)));
        }
        catch (error) {
            next(error);
        }
    },
    create: async (req, res, next) => {
        try {
            const { invoiceId, amount, paymentMethod, referenceNo, notes } = req.body;
            res.status(201).json(await invoice_service_1.invoiceService.recordPayment(invoiceId, { amount, paymentMethod, referenceNo, notes }, req.user?.userId));
        }
        catch (error) {
            next(error);
        }
    },
};
