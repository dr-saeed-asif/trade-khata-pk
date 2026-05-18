"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertService = void 0;
const client_1 = require("@prisma/client");
const nodemailer_1 = __importDefault(require("nodemailer"));
const prisma_1 = require("../config/prisma");
const env_1 = require("../config/env");
const emailTransport = env_1.env.smtpHost
    ? nodemailer_1.default.createTransport({
        host: env_1.env.smtpHost,
        port: env_1.env.smtpPort,
        secure: env_1.env.smtpSecure,
        auth: env_1.env.smtpUser
            ? {
                user: env_1.env.smtpUser,
                pass: env_1.env.smtpPassword ?? '',
            }
            : undefined,
    })
    : null;
const dayMs = 24 * 60 * 60 * 1000;
const formatDate = (date) => date.toISOString().slice(0, 10);
const daysUntil = (date) => Math.ceil((date.getTime() - Date.now()) / dayMs);
const overstockThreshold = (lowStockAt) => Math.max(lowStockAt * env_1.env.alertOverstockMultiplier, lowStockAt + 1);
const buildItemSignals = (item) => {
    const signals = [];
    const categoryName = item.category?.name ? ` in ${item.category.name}` : '';
    const expiryWindow = env_1.env.alertExpiryWindowDays;
    if (item.quantity <= item.lowStockAt) {
        signals.push({
            dedupeKey: `LOW_STOCK:${item.id}:${item.quantity}:${item.lowStockAt}`,
            type: client_1.AlertType.LOW_STOCK,
            severity: item.quantity === 0 ? client_1.AlertSeverity.CRITICAL : client_1.AlertSeverity.WARNING,
            title: `${item.name} is low on stock`,
            message: `${item.sku}${categoryName} has ${item.quantity} units left. Threshold is ${item.lowStockAt}.`,
            itemId: item.id,
            payload: {
                sku: item.sku,
                quantity: item.quantity,
                lowStockAt: item.lowStockAt,
            },
        });
    }
    const itemExpiry = item.expiryDate;
    const itemExpiryDays = itemExpiry ? daysUntil(itemExpiry) : null;
    if (itemExpiry && itemExpiryDays !== null && itemExpiryDays <= expiryWindow) {
        signals.push({
            dedupeKey: `EXPIRY:ITEM:${item.id}:${formatDate(itemExpiry)}`,
            type: client_1.AlertType.EXPIRY,
            severity: itemExpiryDays <= 0 ? client_1.AlertSeverity.CRITICAL : client_1.AlertSeverity.WARNING,
            title: `${item.name} expires soon`,
            message: itemExpiryDays <= 0
                ? `${item.sku}${categoryName} has expired.`
                : `${item.sku}${categoryName} expires in ${itemExpiryDays} day${itemExpiryDays === 1 ? '' : 's'}.`,
            itemId: item.id,
            payload: {
                sku: item.sku,
                expiryDate: itemExpiry.toISOString(),
                daysUntilExpiry: itemExpiryDays,
            },
        });
    }
    for (const batch of item.batches) {
        if (!batch.expiryDate || batch.quantity <= 0)
            continue;
        const batchDays = daysUntil(batch.expiryDate);
        if (batchDays > expiryWindow)
            continue;
        signals.push({
            dedupeKey: `EXPIRY:BATCH:${item.id}:${batch.id}:${formatDate(batch.expiryDate)}`,
            type: client_1.AlertType.EXPIRY,
            severity: batchDays <= 0 ? client_1.AlertSeverity.CRITICAL : client_1.AlertSeverity.WARNING,
            title: `${item.name} batch ${batch.batchNumber} expires soon`,
            message: batchDays <= 0
                ? `Batch ${batch.batchNumber} for ${item.sku}${categoryName} has expired.`
                : `Batch ${batch.batchNumber} for ${item.sku}${categoryName} expires in ${batchDays} day${batchDays === 1 ? '' : 's'}.`,
            itemId: item.id,
            payload: {
                sku: item.sku,
                batchId: batch.id,
                batchNumber: batch.batchNumber,
                expiryDate: batch.expiryDate.toISOString(),
                daysUntilExpiry: batchDays,
            },
        });
    }
    const threshold = overstockThreshold(item.lowStockAt);
    if (item.quantity >= threshold) {
        signals.push({
            dedupeKey: `OVERSTOCK:${item.id}:${item.quantity}:${threshold}`,
            type: client_1.AlertType.OVERSTOCK,
            severity: client_1.AlertSeverity.INFO,
            title: `${item.name} is overstocked`,
            message: `${item.sku}${categoryName} has ${item.quantity} units. Overstock threshold is ${threshold}.`,
            itemId: item.id,
            payload: {
                sku: item.sku,
                quantity: item.quantity,
                threshold,
            },
        });
    }
    return signals;
};
const getAlertRecipients = async () => {
    const configuredRecipients = env_1.env.alertEmailTo
        ?.split(',')
        .map((recipient) => recipient.trim())
        .filter(Boolean);
    if (configuredRecipients?.length) {
        return configuredRecipients;
    }
    const admins = await prisma_1.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true },
    });
    return admins.map((admin) => admin.email);
};
const sendEmailAlerts = async (signals) => {
    if (!emailTransport || signals.length === 0)
        return;
    const recipients = await getAlertRecipients();
    if (recipients.length === 0)
        return;
    const from = env_1.env.alertEmailFrom ?? env_1.env.smtpUser ?? 'alerts@inventory.local';
    await Promise.all(signals.map(async (signal) => {
        await emailTransport.sendMail({
            from,
            to: recipients.join(','),
            subject: `[Inventory Alert] ${signal.title}`,
            text: `${signal.title}\n\n${signal.message}\n\nType: ${signal.type}\nSeverity: ${signal.severity}`,
        });
    }));
};
const syncItemAlerts = async (itemId) => {
    const item = await prisma_1.prisma.item.findUnique({
        where: { id: itemId },
        include: { category: true, batches: true },
    });
    if (!item) {
        return { created: 0, resolved: 0, refreshed: 0 };
    }
    const signals = buildItemSignals(item);
    const currentKeys = new Set(signals.map((signal) => signal.dedupeKey));
    const existingAlerts = await prisma_1.prisma.alert.findMany({ where: { itemId, resolvedAt: null } });
    let created = 0;
    let resolved = 0;
    const emailSignals = [];
    await prisma_1.prisma.$transaction(async (tx) => {
        for (const signal of signals) {
            const existing = await tx.alert.findUnique({ where: { dedupeKey: signal.dedupeKey } });
            const shouldSendEmail = !existing || Boolean(existing.resolvedAt);
            await tx.alert.upsert({
                where: { dedupeKey: signal.dedupeKey },
                create: {
                    dedupeKey: signal.dedupeKey,
                    type: signal.type,
                    severity: signal.severity,
                    title: signal.title,
                    message: signal.message,
                    itemId: signal.itemId,
                    payload: signal.payload,
                    isRead: false,
                    inAppSentAt: new Date(),
                },
                update: {
                    type: signal.type,
                    severity: signal.severity,
                    title: signal.title,
                    message: signal.message,
                    itemId: signal.itemId,
                    payload: signal.payload,
                    resolvedAt: null,
                    isRead: existing?.resolvedAt ? false : existing?.isRead ?? false,
                    readAt: existing?.resolvedAt ? null : existing?.readAt ?? null,
                    inAppSentAt: existing?.inAppSentAt ?? new Date(),
                },
            });
            if (!existing)
                created += 1;
            if (shouldSendEmail) {
                emailSignals.push(signal);
            }
        }
        for (const alert of existingAlerts) {
            if (!currentKeys.has(alert.dedupeKey)) {
                await tx.alert.update({
                    where: { id: alert.id },
                    data: { resolvedAt: new Date() },
                });
                resolved += 1;
            }
        }
    });
    await sendEmailAlerts(emailSignals);
    if (emailSignals.length > 0) {
        const emailSentAt = new Date();
        await prisma_1.prisma.alert.updateMany({
            where: { dedupeKey: { in: emailSignals.map((signal) => signal.dedupeKey) } },
            data: { emailSentAt },
        });
    }
    return { created, resolved, refreshed: signals.length };
};
exports.alertService = {
    syncItemAlerts,
    refreshAll: async () => {
        const items = await prisma_1.prisma.item.findMany({
            include: { category: true, batches: true },
        });
        let created = 0;
        let resolved = 0;
        for (const item of items) {
            const result = await syncItemAlerts(item.id);
            created += result.created;
            resolved += result.resolved;
        }
        return { created, resolved, items: items.length };
    },
    list: async () => prisma_1.prisma.alert.findMany({
        where: { resolvedAt: null },
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
    }),
    summary: async () => {
        const alerts = await prisma_1.prisma.alert.findMany({ where: { resolvedAt: null } });
        return {
            total: alerts.length,
            unread: alerts.filter((alert) => !alert.isRead).length,
            critical: alerts.filter((alert) => alert.severity === client_1.AlertSeverity.CRITICAL).length,
            warning: alerts.filter((alert) => alert.severity === client_1.AlertSeverity.WARNING).length,
            info: alerts.filter((alert) => alert.severity === client_1.AlertSeverity.INFO).length,
            lowStock: alerts.filter((alert) => alert.type === client_1.AlertType.LOW_STOCK).length,
            expiry: alerts.filter((alert) => alert.type === client_1.AlertType.EXPIRY).length,
            overstock: alerts.filter((alert) => alert.type === client_1.AlertType.OVERSTOCK).length,
        };
    },
    markRead: async (id) => prisma_1.prisma.alert.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
    }),
    markAllRead: async () => prisma_1.prisma.alert.updateMany({
        where: { resolvedAt: null, isRead: false },
        data: { isRead: true, readAt: new Date() },
    }),
    resolveItemAlerts: async (itemId) => {
        await prisma_1.prisma.alert.updateMany({
            where: { itemId, resolvedAt: null },
            data: { resolvedAt: new Date() },
        });
    },
};
