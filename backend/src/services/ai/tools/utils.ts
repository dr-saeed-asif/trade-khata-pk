import type { CategoryRecord } from './types'

export const hasAnyWord = (text: string, words: string[]) => words.some((word) => text.includes(word))

export const asksForCount = (text: string) =>
  hasAnyWord(text, ['count', 'total', 'kitna', 'kitni', 'number of', 'how many'])

export const asksForTop = (text: string) => hasAnyWord(text, ['top', 'highest', 'most', 'max'])

export const includesLowStockIntent = (text: string) =>
  hasAnyWord(text, ['low stock', 'low-stock', 'reorder', 'restock', 'out of stock', 'stock kam'])

export const includesExpiredIntent = (text: string) =>
  hasAnyWord(text, ['expired', 'expiry', 'expire', 'near expiry', 'expiring'])

export const includesUsersIntent = (text: string) =>
  hasAnyWord(text, ['user', 'users', 'team members', 'staff', 'employee', 'employees'])

export const includesNamesIntent = (text: string) =>
  hasAnyWord(text, ['name', 'names', 'list', 'all', 'get'])

export const includesInventoryDetailsIntent = (text: string) =>
  hasAnyWord(text, ['inventory details', 'all inventory', 'full inventory', 'get all inventory', 'all items details'])

export const includesCategoryNamesIntent = (text: string) =>
  hasAnyWord(text, ['category names', 'categories names', 'list categories', 'all categories', 'category list']) ||
  (hasAnyWord(text, ['category', 'categories']) && hasAnyWord(text, ['name', 'names', 'list']))

export const includesTotalStockQuantityIntent = (text: string) => {
  const normalized = text.toLowerCase()
  if (!hasAnyWord(normalized, ['stock'])) return false
  if (!hasAnyWord(normalized, ['total', 'sum'])) return false
  return /stock.*(qty|quantity)|(?:qty|quantity).*(stock)|sum\s+of\s+stock/i.test(normalized)
}

const searchNoiseWords = new Set([
  'show', 'find', 'lookup', 'search', 'items', 'item', 'inventory', 'products', 'product', 'for', 'in', 'the',
  'with', 'about', 'please', 'mujhe', 'mujhy', 'mjy', 'data', 'details', 'total', 'count', 'how', 'many',
  'kya', 'kitna', 'kitni',
])

export const extractSearchTerm = (message: string) => {
  const words = message
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !searchNoiseWords.has(word))
  if (!words.length) return message
  return words.slice(0, 6).join(' ')
}

export const extractCategoryNameFromQuery = (text: string) => {
  const normalized = text.toLowerCase()
  const patterns = [
    /category\s+([a-z0-9\-\s]+)/i,
    /categories\s+([a-z0-9\-\s]+)/i,
    /in\s+([a-z0-9\-\s]+)\s+category/i,
  ]
  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    const value = match?.[1]?.trim()
    if (value && value.length > 1) {
      return value.replace(/\s+/g, ' ')
    }
  }
  return null
}

export const matchCategoryFromQuery = (query: string, categories: CategoryRecord[]) => {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return null
  const exact = categories.find((row) => row.name.toLowerCase() === normalized)
  if (exact) return exact
  const partial = categories.find(
    (row) => normalized.includes(row.name.toLowerCase()) || row.name.toLowerCase().includes(normalized),
  )
  return partial ?? null
}
