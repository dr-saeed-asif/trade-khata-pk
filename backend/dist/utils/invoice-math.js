"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveBalance = exports.derivePaymentStatus = exports.calcInvoiceTotals = exports.calcLineTotal = void 0;
const calcLineTotal = (line) => {
    const qty = Math.max(0, Math.floor(line.quantity));
    const unit = Math.max(0, Number(line.unitPrice) || 0);
    const discount = Math.max(0, Number(line.discount ?? 0) || 0);
    return Math.max(0, qty * unit - discount);
};
exports.calcLineTotal = calcLineTotal;
const calcInvoiceTotals = (lines, invoiceDiscount = 0, tax = 0) => {
    const subtotal = lines.reduce((sum, line) => sum + (0, exports.calcLineTotal)(line), 0);
    const discount = Math.max(0, Number(invoiceDiscount) || 0);
    const taxAmount = Math.max(0, Number(tax) || 0);
    const grandTotal = Math.max(0, subtotal - discount + taxAmount);
    return { subtotal, discount, tax: taxAmount, grandTotal };
};
exports.calcInvoiceTotals = calcInvoiceTotals;
const derivePaymentStatus = (paidAmount, grandTotal) => {
    const paid = Math.max(0, paidAmount);
    const total = Math.max(0, grandTotal);
    if (paid <= 0)
        return 'UNPAID';
    if (paid >= total)
        return 'PAID';
    return 'PARTIAL';
};
exports.derivePaymentStatus = derivePaymentStatus;
const deriveBalance = (grandTotal, paidAmount) => Math.max(0, grandTotal - Math.max(0, paidAmount));
exports.deriveBalance = deriveBalance;
