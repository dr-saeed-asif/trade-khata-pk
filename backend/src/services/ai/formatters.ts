import type { RagCitation, ResultBlock, ToolResult } from './types'

export const compactResultsForLlm = (results: ToolResult[]) =>
  results.map((entry) => {
    if (Array.isArray(entry.data)) {
      return { tool: entry.tool, data: entry.data.slice(0, 8) }
    }

    if (typeof entry.data === 'object' && entry.data && 'data' in entry.data) {
      const row = entry.data as { data?: unknown[]; [key: string]: unknown }
      return {
        ...entry,
        data: {
          ...row,
          data: Array.isArray(row.data) ? row.data.slice(0, 8) : row.data,
        },
      }
    }

    return entry
  })

export const buildResultBlocks = (results: ToolResult[]) => {
  const blocks: ResultBlock[] = []
  for (const result of results) {
    if (result.tool === 'search-items') {
      const data = result.data as { total?: number; data?: Array<{ name?: string; sku?: string; quantity?: number; availableQty?: number; category?: string; location?: string }> }
      blocks.push({
        key: 'search-items',
        title: `Matching Items (${data.total ?? 0})`,
        rows: (data.data ?? []).slice(0, 8).map((row) => ({
          name: row.name ?? '-',
          sku: row.sku ?? '-',
          qty: row.quantity ?? 0,
          available: row.availableQty ?? 0,
          category: row.category ?? '-',
          location: row.location ?? '-',
        })),
      })
      continue
    }

    if (result.tool === 'inventory-details' && typeof result.data === 'object' && result.data) {
      const data = result.data as { total?: number; data?: Array<{ name?: string; sku?: string; quantity?: number; availableQty?: number; category?: string; supplier?: string; location?: string }> }
      blocks.push({
        key: 'inventory-details',
        title: `Inventory Details (${data.total ?? 0})`,
        rows: (data.data ?? []).slice(0, 20).map((row) => ({
          name: row.name ?? '-',
          sku: row.sku ?? '-',
          qty: row.quantity ?? 0,
          available: row.availableQty ?? 0,
          category: row.category ?? '-',
          supplier: row.supplier ?? '-',
          location: row.location ?? '-',
        })),
      })
      continue
    }

    if (result.tool === 'low-stock' && Array.isArray(result.data)) {
      const rows = (result.data as Array<{ name?: string; sku?: string; quantity?: number; lowStockAt?: number; categoryName?: string }>)
        .slice(0, 10)
        .map((row) => ({
          name: row.name ?? '-',
          sku: row.sku ?? '-',
          qty: row.quantity ?? 0,
          threshold: row.lowStockAt ?? 0,
          category: row.categoryName ?? '-',
        }))
      blocks.push({ key: 'low-stock', title: 'Low Stock Items', rows })
      continue
    }

    if (result.tool === 'recent' && Array.isArray(result.data)) {
      const rows = (result.data as Array<{ name?: string; sku?: string; quantity?: number; category?: { name?: string } }>)
        .slice(0, 8)
        .map((row) => ({
          name: row.name ?? '-',
          sku: row.sku ?? '-',
          qty: row.quantity ?? 0,
          category: row.category?.name ?? '-',
        }))
      blocks.push({ key: 'recent', title: 'Recent Items', rows })
      continue
    }

    if (result.tool === 'top-categories-by-items' && Array.isArray(result.data)) {
      blocks.push({
        key: 'top-categories-by-items',
        title: 'Top Categories',
        rows: (result.data as Array<{ name: string; itemsCount: number }>).map((row) => ({
          category: row.name,
          items: row.itemsCount,
        })),
      })
      continue
    }

    if (result.tool === 'users-list' && Array.isArray(result.data)) {
      const rows = (result.data as Array<{ name?: string; email?: string; role?: string }>)
        .slice(0, 30)
        .map((row) => ({ name: row.name ?? '-', email: row.email ?? '-', role: row.role ?? '-' }))
      blocks.push({ key: 'users-list', title: `Users (${result.data.length})`, rows })
      continue
    }

    if (result.tool === 'category-list' && Array.isArray(result.data)) {
      const rows = (result.data as Array<{ name?: string; itemsCount?: number }>)
        .slice(0, 30)
        .map((row) => ({ category: row.name ?? '-', items: row.itemsCount ?? 0 }))
      blocks.push({ key: 'category-list', title: `Categories (${result.data.length})`, rows })
      continue
    }

    if (result.tool === 'stock-total-quantity' && typeof result.data === 'object' && result.data) {
      const row = result.data as { totalStockQuantity?: number; totalReservedQuantity?: number; totalAvailableQuantity?: number }
      blocks.push({
        key: 'stock-total-quantity',
        title: 'Total Stock Quantity',
        metrics: {
          totalStockQuantity: row.totalStockQuantity ?? 0,
          totalReservedQuantity: row.totalReservedQuantity ?? 0,
          totalAvailableQuantity: row.totalAvailableQuantity ?? 0,
        },
      })
      continue
    }

    if (typeof result.data === 'object' && result.data) {
      blocks.push({
        key: result.tool,
        title: result.tool.replaceAll('-', ' '),
        metrics: result.data as Record<string, string | number>,
      })
    }
  }
  return blocks
}

export const toolSummary = (toolName: string, data: unknown) => {
  if (toolName === 'profit-loss' && typeof data === 'object' && data) {
    const row = data as { grossProfit?: number; revenue?: number; expense?: number; marginPct?: number; days?: number }
    return `Profit/Loss (${row.days ?? 30} days): revenue ${row.revenue ?? 0}, expense ${row.expense ?? 0}, gross profit ${row.grossProfit ?? 0}, margin ${row.marginPct ?? 0}%.`
  }
  if (toolName === 'movement-trend' && typeof data === 'object' && data) {
    const row = data as { days?: number; totals?: { in?: number; out?: number; transfer?: number; adjustment?: number } }
    return `Movement trend (${row.days ?? 30} days): IN ${row.totals?.in ?? 0}, OUT ${row.totals?.out ?? 0}, TRANSFER ${row.totals?.transfer ?? 0}, ADJUSTMENT ${row.totals?.adjustment ?? 0}.`
  }
  if (toolName === 'movers' && typeof data === 'object' && data) {
    const row = data as { fastMoving?: Array<{ name: string; soldQty: number }>; slowMoving?: Array<{ name: string; soldQty: number }>; days?: number }
    const fast = row.fastMoving?.slice(0, 3).map((x) => `${x.name} (${x.soldQty})`).join(', ') ?? 'None'
    const slow = row.slowMoving?.slice(0, 3).map((x) => `${x.name} (${x.soldQty})`).join(', ') ?? 'None'
    return `Top movers (${row.days ?? 30} days). Fast: ${fast}. Slow: ${slow}.`
  }
  if (toolName === 'low-stock' && Array.isArray(data)) return `Low stock items found: ${data.length}.`
  if (toolName === 'recent' && Array.isArray(data)) return `Recent items count: ${data.length}.`
  if (toolName === 'search-items' && typeof data === 'object' && data) {
    return `Matching items found: ${(data as { total?: number }).total ?? 0}.`
  }
  if (toolName === 'category-count' && typeof data === 'object' && data) {
    const row = data as { totalCategories?: number; sample?: string[] }
    return `Total categories: ${row.totalCategories ?? 0}.${row.sample?.length ? ` Sample: ${row.sample.join(', ')}.` : ''}`
  }
  if (toolName === 'item-count' && typeof data === 'object' && data) return `Total items: ${(data as { totalItems?: number }).totalItems ?? 0}.`
  if (toolName === 'top-categories-by-items' && Array.isArray(data)) {
    const sample = data
      .slice(0, 5)
      .map((row) => `${(row as { name?: string }).name ?? 'Unknown'} (${(row as { itemsCount?: number }).itemsCount ?? 0})`)
      .join(', ')
    return sample ? `Top categories by items: ${sample}.` : 'No category ranking data available.'
  }
  if (toolName === 'category-item-count' && typeof data === 'object' && data) {
    const row = data as { category?: string; totalItems?: number }
    return `Items in category "${row.category ?? 'unknown'}": ${row.totalItems ?? 0}.`
  }
  if (toolName === 'category-low-stock-count' && typeof data === 'object' && data) {
    const row = data as { category?: string; lowStockItems?: number }
    return `Low stock items in category "${row.category ?? 'unknown'}": ${row.lowStockItems ?? 0}.`
  }
  if (toolName === 'expired-count' && typeof data === 'object' && data) {
    return `Expired items found: ${(data as { totalExpiredItems?: number }).totalExpiredItems ?? 0}.`
  }
  if (toolName === 'system-snapshot' && typeof data === 'object' && data) {
    const row = data as { totalItems?: number; totalCategories?: number; lowStockItems?: number; recentItems?: number }
    return `Snapshot -> items: ${row.totalItems ?? 0}, categories: ${row.totalCategories ?? 0}, low stock: ${row.lowStockItems ?? 0}, recent: ${row.recentItems ?? 0}.`
  }
  if (toolName === 'users-list' && Array.isArray(data)) {
    const names = (data as Array<{ name?: string }>).map((row) => row.name).filter(Boolean)
    const preview = names.slice(0, 8).join(', ')
    return `Total users: ${names.length}. ${preview ? `Names: ${preview}${names.length > 8 ? ' ...' : ''}.` : ''}`
  }
  if (toolName === 'inventory-details' && typeof data === 'object' && data) {
    const row = data as { total?: number; data?: Array<{ name?: string }> }
    const preview = (row.data ?? []).slice(0, 5).map((item) => item.name ?? 'Unknown').join(', ')
    return `Total inventory items: ${row.total ?? 0}.${preview ? ` Sample: ${preview}.` : ''}`
  }
  if (toolName === 'category-list' && Array.isArray(data)) {
    const names = (data as Array<{ name?: string }>).map((row) => row.name).filter(Boolean)
    const preview = names.slice(0, 10).join(', ')
    return `Total categories: ${names.length}.${preview ? ` Names: ${preview}${names.length > 10 ? ' ...' : ''}.` : ''}`
  }
  if (toolName === 'stock-total-quantity' && typeof data === 'object' && data) {
    const row = data as { totalStockQuantity?: number; totalReservedQuantity?: number; totalAvailableQuantity?: number }
    return `Total stock quantity: ${row.totalStockQuantity ?? 0}, reserved: ${row.totalReservedQuantity ?? 0}, available: ${row.totalAvailableQuantity ?? 0}.`
  }
  return 'Data retrieved from inventory system.'
}

export const buildRuleBasedAnswer = (message: string, results: ToolResult[], citations: RagCitation[]) => {
  if (!results.length) {
    const guidance = [
      'I can help with inventory analytics.',
      'Try queries like:',
      '- Show low stock items',
      '- Profit loss for last 30 days',
      '- Top fast and slow movers',
      '- Search item by SKU',
    ]
    if (citations.length) guidance.push('', 'I also found related documentation context in the knowledge base.')
    return guidance.join('\n')
  }

  const sections = results.map((entry) => `- ${toolSummary(entry.tool, entry.data)}`)
  const answer = [`Question: ${message}`, '', 'Insights:', ...sections]
  if (citations.length) answer.push('', 'Documentation context was also used for this answer.')
  return answer.join('\n')
}
