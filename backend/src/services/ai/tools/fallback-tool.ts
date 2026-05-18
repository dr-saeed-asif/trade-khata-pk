import { itemService } from '../../item.service'
import { reportService } from '../../report.service'
import type { AiToolContext, ToolResult } from './types'

export const runFallbackSnapshotTool = async (ctx: AiToolContext, existingResults: ToolResult[]): Promise<ToolResult[]> => {
  if (existingResults.length > 0) return []
  if (!(ctx.can('items.read') && ctx.can('categories.read') && ctx.can('reports.read'))) return []

  const [items, categories, lowStock, recent] = await Promise.all([
    itemService.list({ page: '1', limit: '1' }),
    ctx.getCategories(),
    reportService.lowStock(),
    reportService.recent(),
  ])

  return [
    {
      tool: 'system-snapshot',
      data: {
        totalItems: items.total,
        totalCategories: categories.length,
        lowStockItems: Array.isArray(lowStock) ? lowStock.length : 0,
        recentItems: recent.length,
      },
    },
  ]
}
