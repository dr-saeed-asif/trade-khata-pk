import type { Prisma } from '@prisma/client'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const normalizeScannedCode = (code: string) => code.trim()

export const buildItemCodeWhere = (code: string): Prisma.ItemWhereInput => {
  const normalized = normalizeScannedCode(code)
  if (!normalized) return { id: '__invalid__' }

  if (UUID_PATTERN.test(normalized)) {
    return { qrValue: normalized }
  }

  const upper = normalized.toUpperCase()
  return {
    OR: [
      { qrValue: normalized },
      { barcodeValue: normalized },
      { barcodeValue: upper },
      { sku: { equals: normalized, mode: 'insensitive' } },
    ],
  }
}

export const buildLocationCodeWhere = (code: string): Prisma.StorageLocationWhereInput => {
  const normalized = normalizeScannedCode(code)
  if (!normalized) return { id: '__invalid__' }

  if (UUID_PATTERN.test(normalized)) {
    return { qrValue: normalized }
  }

  const upper = normalized.toUpperCase()
  return {
    OR: [
      { qrValue: normalized },
      { barcodeValue: normalized },
      { barcodeValue: upper },
    ],
  }
}
