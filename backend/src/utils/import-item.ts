import { createHash } from 'node:crypto'

export const defaultImportCategory = 'Spices and Dry Fruits'
export const defaultImportSupplier = 'Banu Adam Spices and Dry Fruits'
export const defaultImportLocation = 'General'

export const skuFromImport = (name: string, itemCode?: string) => {
  const code = itemCode?.trim()
  if (code) return code.slice(0, 64)
  const hash = createHash('sha256').update(name.trim()).digest('hex').slice(0, 12).toUpperCase()
  return `ITM-${hash}`
}

const pick = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return ''
}

const pickNumber = (record: Record<string, unknown>, keys: string[]) => {
  const raw = pick(record, keys)
  if (!raw) return 0
  const parsed = Number(raw.replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export type ImportItemRow = {
  name: string
  sku: string
  category: string
  quantity: number
  reservedQty: number
  price: number
  supplier: string
  location: string
  description?: string
  expiryDate?: string
  batchNumber?: string
  lotNumber?: string
}

export const mapImportRecord = (record: Record<string, unknown>): ImportItemRow => {
  const name = pick(record, ['Item Name', 'item name', 'name', 'Name'])
  const itemCode = pick(record, ['Item Code', 'item code', 'itemCode', 'ItemCode', 'code', 'Code', 'SKU', 'sku'])
  const salePrice = pickNumber(record, ['Sale Price', 'sale price', 'salePrice', 'price', 'Price'])
  const purchasePrice = pickNumber(record, ['Purchase Price', 'purchase price', 'purchasePrice'])
  const onlineStorePrice = pickNumber(record, ['Online Store Price', 'online store price', 'onlineStorePrice'])
  const discountType = pick(record, ['Discount Type', 'discount type', 'discountType'])
  const saleDiscount = pickNumber(record, ['Sale Discount', 'sale discount', 'saleDiscount'])
  const quantity = pickNumber(record, ['quantity', 'Quantity', 'qty', 'Qty', 'On Hand', 'on hand'])

  const descriptionParts: string[] = []
  if (purchasePrice > 0) descriptionParts.push(`Purchase: Rs ${purchasePrice}`)
  if (onlineStorePrice > 0 && onlineStorePrice !== salePrice) {
    descriptionParts.push(`Online: Rs ${onlineStorePrice}`)
  }
  if (saleDiscount > 0) {
    descriptionParts.push(`Discount: ${saleDiscount}${discountType.includes('%') ? '%' : ''}`)
  }

  return {
    name,
    sku: skuFromImport(name, itemCode),
    category: pick(record, ['category', 'Category']) || defaultImportCategory,
    quantity,
    reservedQty: pickNumber(record, ['reservedQty', 'ReservedQty', 'Reserved', 'reserved']),
    price: salePrice,
    supplier: pick(record, ['supplier', 'Supplier']) || defaultImportSupplier,
    location: pick(record, ['location', 'Location']) || defaultImportLocation,
    description: pick(record, ['description', 'Description']) || descriptionParts.join(' · ') || undefined,
    expiryDate: pick(record, ['expiryDate', 'ExpiryDate', 'Expiry', 'expiry']) || undefined,
    batchNumber: pick(record, ['batchNumber', 'BatchNumber']) || undefined,
    lotNumber: pick(record, ['lotNumber', 'LotNumber']) || undefined,
  }
}
