import type { InventoryItem } from '@/types'

export interface ItemLabelInfo {
  name: string
  weight?: string
  expiryMessage?: string
  expiryDate?: string
  price?: number
}

export const inventoryItemToLabel = (item: InventoryItem): ItemLabelInfo => ({
  name: item.name,
  weight: item.weight,
  expiryMessage: item.expiryMessage,
  expiryDate: item.expiryDate,
  price: item.price,
})

const formatExpiryDate = (value: string) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}-${month}-${year}`
}

/** Product title on sticker e.g. "Almond (500gm)". */
export const formatItemLabelTitle = (info: Pick<ItemLabelInfo, 'name' | 'weight'>) => {
  const name = info.name.trim()
  const weight = info.weight?.trim()
  if (!name) return '—'
  if (!weight) return name
  return `${name} (${weight})`
}

const toSingleLine = (value: string) => value.replace(/\s+/g, ' ').trim()

/** Text shown on barcode/QR labels beside the code (always one line). */
export const formatItemExpiryLabel = (info: Pick<ItemLabelInfo, 'expiryMessage' | 'expiryDate'>) => {
  const parts: string[] = []
  if (info.expiryMessage?.trim()) parts.push(toSingleLine(info.expiryMessage))
  if (info.expiryDate) parts.push(`Exp: ${formatExpiryDate(info.expiryDate)}`)
  const line = parts.join(' · ')
  return line || undefined
}
