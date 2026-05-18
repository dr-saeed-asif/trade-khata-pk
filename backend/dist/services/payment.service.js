"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = void 0;
const prisma_1 = require("../config/prisma");
const api_error_1 = require("../utils/api-error");
exports.paymentService = {
    list: async (query) => {
        const where = query.invoiceId ? { invoiceId: query.invoiceId } : {};
        const payments = await prisma_1.prisma.payment.findMany({
            where,
            include: {
                invoice: { select: { invoiceNo: true, grandTotal: true } },
                customer: { select: { name: true, phone: true } },
                createdBy: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        return payments.map((p) => ({ ...p, amount: Number(p.amount) }));
    },
    listByInvoice: async (invoiceId) => {
        const invoice = await prisma_1.prisma.invoice.findUnique({ where: { id: invoiceId } });
        if (!invoice)
            throw new api_error_1.ApiError(404, 'Invoice not found');
        const payments = await prisma_1.prisma.payment.findMany({
            where: { invoiceId },
            orderBy: { createdAt: 'desc' },
        });
        return payments.map((p) => ({ ...p, amount: Number(p.amount) }));
    },
};
