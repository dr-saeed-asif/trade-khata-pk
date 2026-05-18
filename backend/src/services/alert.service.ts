import { AlertSeverity, AlertType, Prisma } from '@prisma/client'
import nodemailer from 'nodemailer'
import { prisma } from '../config/prisma'
import { env } from '../config/env'

type AlertItem = {
  id: string
  name: string
  sku: string
  quantity: number
  lowStockAt: number
  expiryDate: Date | null
  category: { name: string } | null
  batches: Array<{
    id: string
    batchNumber: string
    quantity: number
    expiryDate: Date | null
  }>
}

type AlertSignal = {
  dedupeKey: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  itemId: string
  payload: Prisma.InputJsonValue
}

const emailTransport = env.smtpHost
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: env.smtpUser
        ? {
            user: env.smtpUser,
            pass: env.smtpPassword ?? '',
          }
        : undefined,
    })
  : null

const dayMs = 24 * 60 * 60 * 1000

const formatDate = (date: Date) => date.toISOString().slice(0, 10)

const daysUntil = (date: Date) => Math.ceil((date.getTime() - Date.now()) / dayMs)

const overstockThreshold = (lowStockAt: number) => Math.max(lowStockAt * env.alertOverstockMultiplier, lowStockAt + 1)

const buildItemSignals = (item: AlertItem): AlertSignal[] => {
  const signals: AlertSignal[] = []
  const categoryName = item.category?.name ? ` in ${item.category.name}` : ''
  const expiryWindow = env.alertExpiryWindowDays

  if (item.quantity <= item.lowStockAt) {
    signals.push({
      dedupeKey: `LOW_STOCK:${item.id}:${item.quantity}:${item.lowStockAt}`,
      type: AlertType.LOW_STOCK,
      severity: item.quantity === 0 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
      title: `${item.name} is low on stock`,
      message: `${item.sku}${categoryName} has ${item.quantity} units left. Threshold is ${item.lowStockAt}.`,
      itemId: item.id,
      payload: {
        sku: item.sku,
        quantity: item.quantity,
        lowStockAt: item.lowStockAt,
      },
    })
  }

  const itemExpiry = item.expiryDate
  const itemExpiryDays = itemExpiry ? daysUntil(itemExpiry) : null
  if (itemExpiry && itemExpiryDays !== null && itemExpiryDays <= expiryWindow) {
    signals.push({
      dedupeKey: `EXPIRY:ITEM:${item.id}:${formatDate(itemExpiry)}`,
      type: AlertType.EXPIRY,
      severity: itemExpiryDays <= 0 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
      title: `${item.name} expires soon`,
      message:
        itemExpiryDays <= 0
          ? `${item.sku}${categoryName} has expired.`
          : `${item.sku}${categoryName} expires in ${itemExpiryDays} day${itemExpiryDays === 1 ? '' : 's'}.`,
      itemId: item.id,
      payload: {
        sku: item.sku,
        expiryDate: itemExpiry.toISOString(),
        daysUntilExpiry: itemExpiryDays,
      },
    })
  }

  for (const batch of item.batches) {
    if (!batch.expiryDate || batch.quantity <= 0) continue
    const batchDays = daysUntil(batch.expiryDate)
    if (batchDays > expiryWindow) continue

    signals.push({
      dedupeKey: `EXPIRY:BATCH:${item.id}:${batch.id}:${formatDate(batch.expiryDate)}`,
      type: AlertType.EXPIRY,
      severity: batchDays <= 0 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
      title: `${item.name} batch ${batch.batchNumber} expires soon`,
      message:
        batchDays <= 0
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
    })
  }

  const threshold = overstockThreshold(item.lowStockAt)
  if (item.quantity >= threshold) {
    signals.push({
      dedupeKey: `OVERSTOCK:${item.id}:${item.quantity}:${threshold}`,
      type: AlertType.OVERSTOCK,
      severity: AlertSeverity.INFO,
      title: `${item.name} is overstocked`,
      message: `${item.sku}${categoryName} has ${item.quantity} units. Overstock threshold is ${threshold}.`,
      itemId: item.id,
      payload: {
        sku: item.sku,
        quantity: item.quantity,
        threshold,
      },
    })
  }

  return signals
}

const getAlertRecipients = async () => {
  const configuredRecipients = env.alertEmailTo
    ?.split(',')
    .map((recipient) => recipient.trim())
    .filter(Boolean)

  if (configuredRecipients?.length) {
    return configuredRecipients
  }

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { email: true },
  })

  return admins.map((admin) => admin.email)
}

const sendEmailAlerts = async (signals: AlertSignal[]) => {
  if (!emailTransport || signals.length === 0) return

  const recipients = await getAlertRecipients()
  if (recipients.length === 0) return

  const from = env.alertEmailFrom ?? env.smtpUser ?? 'alerts@inventory.local'
  await Promise.all(
    signals.map(async (signal) => {
      await emailTransport.sendMail({
        from,
        to: recipients.join(','),
        subject: `[Inventory Alert] ${signal.title}`,
        text: `${signal.title}\n\n${signal.message}\n\nType: ${signal.type}\nSeverity: ${signal.severity}`,
      })
    }),
  )
}

const syncItemAlerts = async (itemId: string) => {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { category: true, batches: true },
  })

  if (!item) {
    return { created: 0, resolved: 0, refreshed: 0 }
  }

  const signals = buildItemSignals(item)
  const currentKeys = new Set(signals.map((signal) => signal.dedupeKey))
  const existingAlerts = await prisma.alert.findMany({ where: { itemId, resolvedAt: null } })

  let created = 0
  let resolved = 0
  const emailSignals: AlertSignal[] = []

  await prisma.$transaction(async (tx) => {
    for (const signal of signals) {
      const existing = await tx.alert.findUnique({ where: { dedupeKey: signal.dedupeKey } })
      const shouldSendEmail = !existing || Boolean(existing.resolvedAt)
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
      })
      if (!existing) created += 1
      if (shouldSendEmail) {
        emailSignals.push(signal)
      }
    }

    for (const alert of existingAlerts) {
      if (!currentKeys.has(alert.dedupeKey)) {
        await tx.alert.update({
          where: { id: alert.id },
          data: { resolvedAt: new Date() },
        })
        resolved += 1
      }
    }
  })

  await sendEmailAlerts(emailSignals)
  if (emailSignals.length > 0) {
    const emailSentAt = new Date()
    await prisma.alert.updateMany({
      where: { dedupeKey: { in: emailSignals.map((signal) => signal.dedupeKey) } },
      data: { emailSentAt },
    })
  }

  return { created, resolved, refreshed: signals.length }
}

export const alertService = {
  syncItemAlerts,

  refreshAll: async () => {
    const items = await prisma.item.findMany({
      include: { category: true, batches: true },
    })

    let created = 0
    let resolved = 0
    for (const item of items as AlertItem[]) {
      const result = await syncItemAlerts(item.id)
      created += result.created
      resolved += result.resolved
    }

    return { created, resolved, items: items.length }
  },

  list: async () =>
    prisma.alert.findMany({
      where: { resolvedAt: null },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
    }),

  summary: async () => {
    const alerts = await prisma.alert.findMany({ where: { resolvedAt: null } })
    return {
      total: alerts.length,
      unread: alerts.filter((alert) => !alert.isRead).length,
      critical: alerts.filter((alert) => alert.severity === AlertSeverity.CRITICAL).length,
      warning: alerts.filter((alert) => alert.severity === AlertSeverity.WARNING).length,
      info: alerts.filter((alert) => alert.severity === AlertSeverity.INFO).length,
      lowStock: alerts.filter((alert) => alert.type === AlertType.LOW_STOCK).length,
      expiry: alerts.filter((alert) => alert.type === AlertType.EXPIRY).length,
      overstock: alerts.filter((alert) => alert.type === AlertType.OVERSTOCK).length,
    }
  },

  markRead: async (id: string) =>
    prisma.alert.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    }),

  markAllRead: async () =>
    prisma.alert.updateMany({
      where: { resolvedAt: null, isRead: false },
      data: { isRead: true, readAt: new Date() },
    }),

  resolveItemAlerts: async (itemId: string) => {
    await prisma.alert.updateMany({
      where: { itemId, resolvedAt: null },
      data: { resolvedAt: new Date() },
    })
  },
}
