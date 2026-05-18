import { reportService } from '../../report.service'
import type { AiToolContext, ToolResult } from './types'

export const runReportTools = async (ctx: AiToolContext): Promise<ToolResult[]> => {
  const results: ToolResult[] = []

  if (ctx.intent === 'low-stock' && ctx.can('reports.read')) {
    results.push({ tool: 'low-stock', data: await reportService.lowStock() })
  }
  if (ctx.intent === 'recent' && ctx.can('reports.read')) {
    results.push({ tool: 'recent', data: await reportService.recent() })
  }
  if (ctx.intent === 'movement-trend' && ctx.can('reports.read')) {
    results.push({ tool: 'movement-trend', data: await reportService.stockMovementTrend(String(ctx.days)) })
  }
  if (ctx.intent === 'movers' && ctx.can('reports.read')) {
    results.push({ tool: 'movers', data: await reportService.movers(String(ctx.days)) })
  }
  if (ctx.intent === 'profit-loss' && ctx.can('reports.read')) {
    results.push({ tool: 'profit-loss', data: await reportService.profitLoss(String(ctx.days)) })
  }

  return results
}
