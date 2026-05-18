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

/** Text shown on barcode/QR labels under the product name. */
export const formatItemExpiryLabel = (info: Pick<ItemLabelInfo, 'expiryMessage' | 'expiryDate'>) => {
  const parts: string[] = []
  if (info.expiryMessage?.trim()) parts.push(info.expiryMessage.trim())
  if (info.expiryDate) parts.push(`Exp: ${formatExpiryDate(info.expiryDate)}`)
  return parts.join(' · ') || undefined
}
