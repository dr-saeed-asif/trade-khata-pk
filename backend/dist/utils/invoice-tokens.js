"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoiceNo = exports.generatePublicToken = void 0;
const node_crypto_1 = require("node:crypto");
const prisma_1 = require("../config/prisma");
const generatePublicToken = () => (0, node_crypto_1.randomBytes)(24).toString('hex');
exports.generatePublicToken = generatePublicToken;
const generateInvoiceNo = async () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const prefix = `INV-${y}${m}${d}-`;
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    const count = await prisma_1.prisma.invoice.count({
        where: { createdAt: { gte: start, lt: end } },
    });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
};
exports.generateInvoiceNo = generateInvoiceNo;
