export type UserRole = 'ADMIN' | 'MANAGER' | 'USER'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  permissions?: string[]
}

export interface Category {
  id: string
  name: string
  itemsCount: number
}

export interface ItemVariant {
  id?: string
  name?: string
  sku: string
  size?: string
  color?: string
  model?: string
  quantity: number
  reservedQty: number
  availableQty?: number
  price?: number
}

export interface ItemBatch {
  id?: string
  batchNumber: string
  lotNumber?: string
  expiryDate?: string
  quantity: number
}

export interface ItemTimelineEvent {
  id: string
  at: string
  type: string
  title: string
  description?: string | null
  actor?: { id: string; name: string; email: string } | null
  meta?: Record<string, unknown> | null
}

export type AlertType = 'LOW_STOCK' | 'EXPIRY' | 'OVERSTOCK'
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface Alert {
  id: string
  dedupeKey: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  itemId?: string | null
  payload?: Record<string, unknown> | null
  isRead: boolean
  readAt?: string | null
  resolvedAt?: string | null
  createdAt: string
}

export interface AlertSummary {
  total: number
  unread: number
  critical: number
  warning: number
  info: number
  lowStock: number
  expiry: number
  overstock: number
}

export interface InventoryItem {
  id: string
  name: string
  sku: string
  category: string
  categoryId?: string
  categories?: Category[]
  tags?: string[]
  quantity: number
  reservedQty: number
  availableQty: number
  expiryDate?: string
  weight?: string
  expiryMessage?: string
  price: number
  supplier: string
  location: string
  description?: string
  qrValue: string
  barcodeValue: string
  variants?: ItemVariant[]
  batches?: ItemBatch[]
  createdAt: string
  updatedAt: string
}

export interface InventoryFilters {
  search?: string
  category?: string
  location?: string
  lowStock?: boolean
  expired?: boolean
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH'

export interface Party {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  type: PartyType
  salesCount?: number
  purchasesCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface CommerceLine {
  id?: string
  itemId: string
  itemName?: string
  itemSku?: string
  quantity: number
  unitPrice: number
  lineTotal?: number
}

export interface SaleRecord {
  id: string
  invoiceNo: string
  partyId?: string | null
  party?: { id: string; name: string; phone?: string | null; type: PartyType } | null
  status: string
  saleDate: string
  subtotal: number
  discount: number
  total: number
  notes?: string | null
  lines: CommerceLine[]
  createdAt: string
}

export interface PurchaseRecord {
  id: string
  invoiceNo: string
  partyId?: string | null
  party?: { id: string; name: string; phone?: string | null; type: PartyType } | null
  status: string
  purchaseDate: string
  subtotal: number
  discount: number
  total: number
  notes?: string | null
  lines: CommerceLine[]
  createdAt: string
}
