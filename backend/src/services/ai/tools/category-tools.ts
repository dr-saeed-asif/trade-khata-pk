import { categoryService } from '../../category.service'
import { itemService } from '../../item.service'
import type { AiToolContext, ToolResult } from './types'
import {
  asksForCount,
  asksForTop,
  extractCategoryNameFromQuery,
  hasAnyWord,
  includesCategoryNamesIntent,
  includesLowStockIntent,
  matchCategoryFromQuery,
} from './utils'

export const runCategoryTools = async (ctx: AiToolContext): Promise<ToolResult[]> => {
  const results: ToolResult[] = []

  if (asksForCount(ctx.text) && hasAnyWord(ctx.text, ['category', 'categories']) && ctx.can('categories.read')) {
    const categories = (await categoryService.list({ limit: '500' })).data
    results.push({
      tool: 'category-count',
      data: {
        totalCategories: categories.length,
        sample: categories.slice(0, 5).map((row) => row.name),
      },
    })
  }

  if (asksForCount(ctx.text) && hasAnyWord(ctx.text, ['item', 'items', 'inventory', 'products']) && ctx.can('items.read')) {
    results.push({
      tool: 'item-count',
      data: { totalItems: (await itemService.list({ page: '1', limit: '1' })).total },
    })
  }

  if (asksForTop(ctx.text) && hasAnyWord(ctx.text, ['category', 'categories']) && ctx.can('categories.read')) {
    const categories = await ctx.getCategories()
    results.push({
      tool: 'top-categories-by-items',
      data: [...categories].sort((a, b) => b.itemsCount - a.itemsCount).slice(0, 5),
    })
  }

  const requestedCategory = extractCategoryNameFromQuery(ctx.text)
  if (requestedCategory && ctx.can('categories.read') && ctx.can('items.read')) {
    const categories = await ctx.getCategories()
    const matched = matchCategoryFromQuery(requestedCategory, categories)
    if (matched) {
      results.push({
        tool: 'category-item-count',
        data: {
          category: matched.name,
          totalItems: (await itemService.list({ page: '1', limit: '1', categoryId: matched.id })).total,
        },
      })

      if (includesLowStockIntent(ctx.text)) {
        results.push({
          tool: 'category-low-stock-count',
          data: {
            category: matched.name,
            lowStockItems: (
              await itemService.list({ page: '1', limit: '100', categoryId: matched.id, lowStock: 'true' })
            ).total,
          },
        })
      }
    }
  }

  if (includesCategoryNamesIntent(ctx.text) && ctx.can('categories.read')) {
    const categories = await ctx.getCategories()
    results.push({
      tool: 'category-list',
      data: categories.map((row) => ({ name: row.name, itemsCount: row.itemsCount })),
    })
  }

  return results
}
