import { prisma } from '../../../config/prisma'
import { itemService } from '../../item.service'
import type { AiToolContext, ToolResult } from './types'
import { extractSearchTerm, hasAnyWord, includesExpiredIntent, includesInventoryDetailsIntent, includesTotalStockQuantityIntent } from './utils'

export const runInventoryTools = async (ctx: AiToolContext, existingResults: ToolResult[]): Promise<ToolResult[]> => {
  const results: ToolResult[] = []

  if (ctx.intent === 'search-items' && ctx.can('items.read')) {
    const searchTerm = extractSearchTerm(ctx.message)
    results.push({
      tool: 'search-items',
      data: await itemService.list({ page: '1', limit: '10', search: searchTerm }),
    })
  }

  if (
    existingResults.length === 0 &&
    ctx.can('items.read') &&
    hasAnyWord(ctx.text, ['show', 'find', 'lookup', 'search'])
  ) {
    const searchTerm = extractSearchTerm(ctx.message)
    results.push({
      tool: 'search-items',
      data: await itemService.list({ page: '1', limit: '10', search: searchTerm }),
    })
  }

  if (includesExpiredIntent(ctx.text) && ctx.can('items.read')) {
    results.push({
      tool: 'expired-count',
      data: {
        totalExpiredItems: (await itemService.list({ page: '1', limit: '1', expired: 'true' })).total,
      },
    })
  }

  if (includesInventoryDetailsIntent(ctx.text) && ctx.can('items.read')) {
    results.push({
      tool: 'inventory-details',
      data: await itemService.list({ page: '1', limit: '100' }),
    })
  }

  if (includesTotalStockQuantityIntent(ctx.text) && ctx.can('stock.read')) {
    const aggregate = await prisma.item.aggregate({
      _sum: { quantity: true, reservedQty: true },
    })
    const totalStockQuantity = aggregate._sum.quantity ?? 0
    const totalReservedQuantity = aggregate._sum.reservedQty ?? 0
    results.push({
      tool: 'stock-total-quantity',
      data: {
        totalStockQuantity,
        totalReservedQuantity,
        totalAvailableQuantity: Math.max(0, totalStockQuantity - totalReservedQuantity),
      },
    })
  }

  return results
}
