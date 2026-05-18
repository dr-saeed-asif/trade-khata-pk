"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
const api_error_1 = require("../utils/api-error");
const invoice_math_1 = require("../utils/invoice-math");
const invoice_tokens_1 = require("../utils/invoice-tokens");
const alert_service_1 = require("./alert.service");
const activity_service_1 = require("./activity.service");
const invoiceInclude = {
    customer: true,
    createdBy: { select: { id: true, name: true, email: true } },
    items: { include: { item: { include: { category: true } } } },
    payments: { orderBy: { createdAt: 'desc' } },
};
const mapInvoice = (invoice) => ({
    ...invoice,
    subtotal: Number(invoice.subtotal),
    discount: Number(invoice.discount),
    tax: Number(invoice.tax),
    grandTotal: Number(invoice.grandTotal),
    paidAmount: Number(invoice.paidAmount),
    balance: Number(invoice.balance),
    items: invoice.items.map((row) => ({
        ...row,
        unitPrice: Number(row.unitPrice),
        discount: Number(row.discount),
        lineTotal: Number(row.lineTotal),
    })),
    payments: invoice.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
});
const buildLinesFromPayload = async (items) => {
    if (!items.length)
        throw new api_error_1.ApiError(400, 'Invoice must have at least one item');
    const lines = [];
    for (const row of items) {
        if (row.quantity <= 0)
            throw new api_error_1.ApiError(400, 'Quantity must be greater than 0');
        const item = await prisma_1.prisma.item.findUnique({ where: { id: row.itemId } });
        if (!item)
            throw new api_error_1.ApiError(404, `Item not found: ${row.itemId}`);
        lines.push({ ...row, item });
    }
    return lines;
};
const assertStockForLines = (lines) => {
    for (const line of lines) {
        const available = line.item.quantity - line.item.reservedQty;
        if (line.quantity > available) {
            throw new api_error_1.ApiError(400, `Insufficient stock for "${line.item.name}". Available: ${available}`);
        }
    }
};
const applyStockOut = async (tx, invoiceId, lines, userId, type = 'SALE') => {
    for (const line of lines) {
        const item = await tx.item.findUnique({ where: { id: line.itemId } });
        if (!item)
            throw new api_error_1.ApiError(404, 'Item not found during stock update');
        const beforeQty = item.quantity;
        const afterQty = beforeQty - line.quantity;
        if (afterQty < item.reservedQty) {
            throw new api_error_1.ApiError(400, `Cannot sell ${line.quantity} of "${item.name}" — reserved stock conflict`);
        }
        await tx.item.update({ where: { id: line.itemId }, data: { quantity: afterQty } });
        await tx.stockMovement.create({
            data: {
                itemId: line.itemId,
                type,
                quantity: line.quantity,
                beforeQty,
                afterQty,
                reference: invoiceId,
                referenceType: client_1.StockReferenceType.INVOICE,
                referenceId: invoiceId,
                note: `Invoice ${type}`,
                userId,
            },
        });
    }
};
const restoreStock = async (tx, invoiceId, lines, userId, type = 'CANCEL_INVOICE') => {
    for (const line of lines) {
        const item = await tx.item.findUnique({ where: { id: line.itemId } });
        if (!item)
            continue;
        const beforeQty = item.quantity;
        const afterQty = beforeQty + line.quantity;
        await tx.item.update({ where: { id: line.itemId }, data: { quantity: afterQty } });
        await tx.stockMovement.create({
            data: {
                itemId: line.itemId,
                type,
                quantity: line.quantity,
                beforeQty,
                afterQty,
                reference: invoiceId,
                referenceType: client_1.StockReferenceType.INVOICE,
                referenceId: invoiceId,
                note: `Stock restored (${type})`,
                userId,
            },
        });
    }
};
exports.invoiceService = {
    list: async (query) => {
        const page = Math.max(1, Number(query.page ?? 1));
        const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
        const skip = (page - 1) * limit;
        const where = {};
        if (query.status)
            where.invoiceStatus = query.status;
        if (query.paymentStatus)
            where.paymentStatus = query.paymentStatus;
        if (query.search) {
            where.OR = [
                { invoiceNo: { contains: query.search } },
                { customer: { name: { contains: query.search } } },
                { customer: { phone: { contains: query.search } } },
            ];
        }
        const [data, total] = await Promise.all([
            prisma_1.prisma.invoice.findMany({
                where,
                include: invoiceInclude,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.invoice.count({ where }),
        ]);
        return { data: data.map(mapInvoice), total, page, limit };
    },
    getById: async (id) => {
        const invoice = await prisma_1.prisma.invoice.findUnique({ where: { id }, include: invoiceInclude });
        if (!invoice)
            throw new api_error_1.ApiError(404, 'Invoice not found');
        return mapInvoice(invoice);
    },
    getByPublicToken: async (publicToken) => {
        const invoice = await prisma_1.prisma.invoice.findUnique({
            where: { publicToken },
            include: invoiceInclude,
        });
        if (!invoice)
            throw new api_error_1.ApiError(404, 'Invoice not found');
        if (invoice.invoiceStatus === 'DRAFT')
            throw new api_error_1.ApiError(403, 'Invoice is not available publicly yet');
        return mapInvoice(invoice);
    },
    create: async (payload, userId) => {
        const customer = await prisma_1.prisma.customer.findUnique({ where: { id: payload.customerId } });
        if (!customer)
            throw new api_error_1.ApiError(404, 'Customer not found');
        const linesWithItems = await buildLinesFromPayload(payload.items);
        const totals = (0, invoice_math_1.calcInvoiceTotals)(linesWithItems.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount })), payload.discount, payload.tax);
        const paidAmount = Math.max(0, Number(payload.paidAmount ?? 0));
        if (paidAmount > totals.grandTotal) {
            throw new api_error_1.ApiError(400, 'Paid amount cannot exceed grand total');
        }
        if (payload.confirm)
            assertStockForLines(linesWithItems);
        const invoiceNo = await (0, invoice_tokens_1.generateInvoiceNo)();
        const publicToken = (0, invoice_tokens_1.generatePublicToken)();
        const paymentStatus = (0, invoice_math_1.derivePaymentStatus)(paidAmount, totals.grandTotal);
        const balance = (0, invoice_math_1.deriveBalance)(totals.grandTotal, paidAmount);
        const invoice = await prisma_1.prisma.$transaction(async (tx) => {
            const created = await tx.invoice.create({
                data: {
                    invoiceNo,
                    publicToken,
                    customerId: payload.customerId,
                    subtotal: new client_1.Prisma.Decimal(totals.subtotal),
                    discount: new client_1.Prisma.Decimal(totals.discount),
                    tax: new client_1.Prisma.Decimal(totals.tax),
                    grandTotal: new client_1.Prisma.Decimal(totals.grandTotal),
                    paidAmount: new client_1.Prisma.Decimal(paidAmount),
                    balance: new client_1.Prisma.Decimal(balance),
                    paymentStatus,
                    invoiceStatus: payload.confirm ? 'CONFIRMED' : 'DRAFT',
                    notes: payload.notes,
                    createdById: userId,
                    items: {
                        create: linesWithItems.map((line) => ({
                            itemId: line.itemId,
                            itemNameSnapshot: line.item.name,
                            itemCodeSnapshot: line.item.itemCode,
                            skuSnapshot: line.item.sku,
                            quantity: line.quantity,
                            unitPrice: new client_1.Prisma.Decimal(line.unitPrice),
                            discount: new client_1.Prisma.Decimal(line.discount ?? 0),
                            lineTotal: new client_1.Prisma.Decimal((0, invoice_math_1.calcLineTotal)({ quantity: line.quantity, unitPrice: line.unitPrice, discount: line.discount })),
                        })),
                    },
                },
                include: invoiceInclude,
            });
            if (payload.confirm) {
                await applyStockOut(tx, created.id, linesWithItems.map((l) => ({ itemId: l.itemId, quantity: l.quantity, item: l.item })), userId);
            }
            if (paidAmount > 0) {
                await tx.payment.create({
                    data: {
                        invoiceId: created.id,
                        customerId: payload.customerId,
                        amount: new client_1.Prisma.Decimal(paidAmount),
                        paymentMethod: 'CASH',
                        createdById: userId,
                    },
                });
            }
            return created;
        });
        for (const line of linesWithItems) {
            await alert_service_1.alertService.syncItemAlerts(line.itemId);
        }
        await activity_service_1.activityService.create({
            action: payload.confirm ? 'INVOICE_CONFIRMED' : 'INVOICE_CREATED',
            entityType: 'INVOICE',
            entityId: invoice.id,
            description: `Invoice ${invoice.invoiceNo} ${payload.confirm ? 'confirmed' : 'saved as draft'}`,
            userId,
        });
        return mapInvoice(invoice);
    },
    update: async (id, payload, userId) => {
        const existing = await prisma_1.prisma.invoice.findUnique({ where: { id }, include: { items: true } });
        if (!existing)
            throw new api_error_1.ApiError(404, 'Invoice not found');
        if (existing.invoiceStatus !== 'DRAFT') {
            throw new api_error_1.ApiError(400, 'Only draft invoices can be edited');
        }
        const customerId = payload.customerId ?? existing.customerId;
        const items = payload.items ?? existing.items.map((row) => ({
            itemId: row.itemId,
            quantity: row.quantity,
            unitPrice: Number(row.unitPrice),
            discount: Number(row.discount),
        }));
        const linesWithItems = await buildLinesFromPayload(items);
        const totals = (0, invoice_math_1.calcInvoiceTotals)(linesWithItems.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount })), payload.discount ?? Number(existing.discount), payload.tax ?? Number(existing.tax));
        const paidAmount = Math.max(0, Number(payload.paidAmount ?? Number(existing.paidAmount)));
        if (paidAmount > totals.grandTotal)
            throw new api_error_1.ApiError(400, 'Paid amount cannot exceed grand total');
        const invoice = await prisma_1.prisma.$transaction(async (tx) => {
            await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
            return tx.invoice.update({
                where: { id },
                data: {
                    customerId,
                    subtotal: new client_1.Prisma.Decimal(totals.subtotal),
                    discount: new client_1.Prisma.Decimal(totals.discount),
                    tax: new client_1.Prisma.Decimal(totals.tax),
                    grandTotal: new client_1.Prisma.Decimal(totals.grandTotal),
                    paidAmount: new client_1.Prisma.Decimal(paidAmount),
                    balance: new client_1.Prisma.Decimal((0, invoice_math_1.deriveBalance)(totals.grandTotal, paidAmount)),
                    paymentStatus: (0, invoice_math_1.derivePaymentStatus)(paidAmount, totals.grandTotal),
                    notes: payload.notes ?? existing.notes,
                    items: {
                        create: linesWithItems.map((line) => ({
                            itemId: line.itemId,
                            itemNameSnapshot: line.item.name,
                            itemCodeSnapshot: line.item.itemCode,
                            skuSnapshot: line.item.sku,
                            quantity: line.quantity,
                            unitPrice: new client_1.Prisma.Decimal(line.unitPrice),
                            discount: new client_1.Prisma.Decimal(line.discount ?? 0),
                            lineTotal: new client_1.Prisma.Decimal((0, invoice_math_1.calcLineTotal)({ quantity: line.quantity, unitPrice: line.unitPrice, discount: line.discount })),
                        })),
                    },
                },
                include: invoiceInclude,
            });
        });
        await activity_service_1.activityService.create({
            action: 'INVOICE_UPDATED',
            entityType: 'INVOICE',
            entityId: id,
            description: `Draft invoice ${invoice.invoiceNo} updated`,
            userId,
        });
        return mapInvoice(invoice);
    },
    confirm: async (id, userId) => {
        const existing = await prisma_1.prisma.invoice.findUnique({ where: { id }, include: { items: true } });
        if (!existing)
            throw new api_error_1.ApiError(404, 'Invoice not found');
        if (existing.invoiceStatus !== 'DRAFT')
            throw new api_error_1.ApiError(400, 'Only draft invoices can be confirmed');
        const lines = existing.items.map((row) => ({
            itemId: row.itemId,
            quantity: row.quantity,
        }));
        const items = await prisma_1.prisma.item.findMany({ where: { id: { in: lines.map((l) => l.itemId) } } });
        const linesWithStock = lines.map((line) => {
            const item = items.find((i) => i.id === line.itemId);
            if (!item)
                throw new api_error_1.ApiError(404, 'Item not found');
            return { ...line, item };
        });
        assertStockForLines(linesWithStock);
        const paidAmount = Number(existing.paidAmount);
        const grandTotal = Number(existing.grandTotal);
        const invoice = await prisma_1.prisma.$transaction(async (tx) => {
            await applyStockOut(tx, id, linesWithStock, userId);
            return tx.invoice.update({
                where: { id },
                data: {
                    invoiceStatus: 'CONFIRMED',
                    paymentStatus: (0, invoice_math_1.derivePaymentStatus)(paidAmount, grandTotal),
                    balance: new client_1.Prisma.Decimal((0, invoice_math_1.deriveBalance)(grandTotal, paidAmount)),
                },
                include: invoiceInclude,
            });
        });
        for (const line of lines)
            await alert_service_1.alertService.syncItemAlerts(line.itemId);
        await activity_service_1.activityService.create({
            action: 'INVOICE_CONFIRMED',
            entityType: 'INVOICE',
            entityId: id,
            description: `Invoice ${invoice.invoiceNo} confirmed`,
            userId,
        });
        return mapInvoice(invoice);
    },
    cancel: async (id, userId) => {
        const existing = await prisma_1.prisma.invoice.findUnique({ where: { id }, include: { items: true } });
        if (!existing)
            throw new api_error_1.ApiError(404, 'Invoice not found');
        if (existing.invoiceStatus !== 'CONFIRMED') {
            throw new api_error_1.ApiError(400, 'Only confirmed invoices can be cancelled');
        }
        const lines = existing.items.map((row) => ({
            itemId: row.itemId,
            quantity: row.quantity - row.returnedQty,
        }));
        const invoice = await prisma_1.prisma.$transaction(async (tx) => {
            await restoreStock(tx, id, lines.filter((l) => l.quantity > 0), userId, 'CANCEL_INVOICE');
            return tx.invoice.update({
                where: { id },
                data: { invoiceStatus: 'CANCELLED' },
                include: invoiceInclude,
            });
        });
        for (const line of lines)
            await alert_service_1.alertService.syncItemAlerts(line.itemId);
        await activity_service_1.activityService.create({
            action: 'INVOICE_CANCELLED',
            entityType: 'INVOICE',
            entityId: id,
            description: `Invoice ${invoice.invoiceNo} cancelled`,
            userId,
        });
        return mapInvoice(invoice);
    },
    refund: async (id, payload, userId) => {
        const existing = await prisma_1.prisma.invoice.findUnique({
            where: { id },
            include: { items: true },
        });
        if (!existing)
            throw new api_error_1.ApiError(404, 'Invoice not found');
        if (existing.invoiceStatus !== 'CONFIRMED' && existing.invoiceStatus !== 'REFUNDED') {
            throw new api_error_1.ApiError(400, 'Only confirmed invoices can be refunded');
        }
        const refundLines = payload.lines?.length ?
            payload.lines
            : existing.items.map((row) => ({
                invoiceItemId: row.id,
                quantity: row.quantity - row.returnedQty,
            }));
        const toRestore = [];
        for (const req of refundLines) {
            const row = existing.items.find((i) => i.id === req.invoiceItemId);
            if (!row)
                throw new api_error_1.ApiError(404, 'Invoice line not found');
            const remaining = row.quantity - row.returnedQty;
            if (req.quantity <= 0 || req.quantity > remaining) {
                throw new api_error_1.ApiError(400, `Invalid refund quantity for ${row.itemNameSnapshot}`);
            }
            toRestore.push({ itemId: row.itemId, quantity: req.quantity, invoiceItemId: row.id });
        }
        const invoice = await prisma_1.prisma.$transaction(async (tx) => {
            for (const line of toRestore) {
                await tx.invoiceItem.update({
                    where: { id: line.invoiceItemId },
                    data: { returnedQty: { increment: line.quantity } },
                });
            }
            await restoreStock(tx, id, toRestore.map((l) => ({ itemId: l.itemId, quantity: l.quantity })), userId, 'RETURN');
            const allReturned = await tx.invoiceItem.findMany({ where: { invoiceId: id } });
            const fullyRefunded = allReturned.every((row) => row.returnedQty >= row.quantity);
            return tx.invoice.update({
                where: { id },
                data: { invoiceStatus: fullyRefunded ? 'REFUNDED' : 'CONFIRMED' },
                include: invoiceInclude,
            });
        });
        for (const line of toRestore)
            await alert_service_1.alertService.syncItemAlerts(line.itemId);
        await activity_service_1.activityService.create({
            action: 'INVOICE_REFUNDED',
            entityType: 'INVOICE',
            entityId: id,
            description: `Refund processed for invoice ${invoice.invoiceNo}`,
            userId,
        });
        return mapInvoice(invoice);
    },
    recordPayment: async (invoiceId, payload, userId) => {
        const invoice = await prisma_1.prisma.invoice.findUnique({ where: { id: invoiceId } });
        if (!invoice)
            throw new api_error_1.ApiError(404, 'Invoice not found');
        if (invoice.invoiceStatus === 'DRAFT')
            throw new api_error_1.ApiError(400, 'Confirm invoice before recording payment');
        if (invoice.invoiceStatus === 'CANCELLED')
            throw new api_error_1.ApiError(400, 'Cannot pay cancelled invoice');
        const amount = Math.max(0, payload.amount);
        if (amount <= 0)
            throw new api_error_1.ApiError(400, 'Payment amount must be greater than 0');
        const newPaid = Number(invoice.paidAmount) + amount;
        const grandTotal = Number(invoice.grandTotal);
        if (newPaid > grandTotal)
            throw new api_error_1.ApiError(400, 'Payment exceeds invoice balance');
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            await tx.payment.create({
                data: {
                    invoiceId,
                    customerId: invoice.customerId,
                    amount: new client_1.Prisma.Decimal(amount),
                    paymentMethod: payload.paymentMethod ?? 'CASH',
                    referenceNo: payload.referenceNo,
                    notes: payload.notes,
                    createdById: userId,
                },
            });
            return tx.invoice.update({
                where: { id: invoiceId },
                data: {
                    paidAmount: new client_1.Prisma.Decimal(newPaid),
                    balance: new client_1.Prisma.Decimal((0, invoice_math_1.deriveBalance)(grandTotal, newPaid)),
                    paymentStatus: (0, invoice_math_1.derivePaymentStatus)(newPaid, grandTotal),
                },
                include: invoiceInclude,
            });
        });
        return mapInvoice(updated);
    },
};
