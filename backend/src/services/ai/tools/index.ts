import type { AiToolContext, ToolResult } from './types'
import { runReportTools } from './report-tools'
import { runInventoryTools } from './inventory-tools'
import { runCategoryTools } from './category-tools'
import { runUserTools } from './user-tools'
import { runFallbackSnapshotTool } from './fallback-tool'

export const runAiTools = async (ctx: AiToolContext): Promise<ToolResult[]> => {
  const results: ToolResult[] = []

  results.push(...(await runReportTools(ctx)))
  results.push(...(await runInventoryTools(ctx, results)))
  results.push(...(await runCategoryTools(ctx)))
  results.push(...(await runUserTools(ctx)))
  results.push(...(await runFallbackSnapshotTool(ctx, results)))

  return results
}

export type { ToolResult, CategoryRecord } from './types'
