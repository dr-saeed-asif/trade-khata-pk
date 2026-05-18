"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextInvoiceNo = exports.calcTotals = exports.calcLineTotal = void 0;
const client_1 = require("@prisma/client");
const calcLineTotal = (quantity, unitPrice) => new client_1.Prisma.Decimal(quantity).mul(unitPrice);
exports.calcLineTotal = calcLineTotal;
const calcTotals = (lines, discount = 0) => {
    const subtotal = lines.reduce((sum, line) => sum.add((0, exports.calcLineTotal)(line.quantity, line.unitPrice)), new client_1.Prisma.Decimal(0));
    const discountDec = new client_1.Prisma.Decimal(discount);
    const total = subtotal.sub(discountDec);
    return { subtotal, discount: discountDec, total };
};
exports.calcTotals = calcTotals;
const nextInvoiceNo = async (prefix, countFn) => {
    const count = await countFn();
    const seq = String(count + 1).padStart(5, '0');
    return `${prefix}-${seq}`;
};
exports.nextInvoiceNo = nextInvoiceNo;
