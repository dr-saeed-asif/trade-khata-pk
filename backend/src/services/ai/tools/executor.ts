import type { Permission } from '../../../config/permissions'
import { inventoryReadTools } from './inventory-read-tools'
import { getToolByName } from './registry'

export type ToolExecutionContext = {
  userId: string
  conversationId?: string
  can: (permission: Permission) => boolean
}

export type ToolExecutionRecord = {
  toolName: string
  input: Record<string, unknown>
  output: unknown
  success: boolean
  errorMessage?: string
  executionMs: number
}

const hasToolPermission = (permissions: Permission | Permission[], can: (p: Permission) => boolean) => {
  const list = Array.isArray(permissions) ? permissions : [permissions]
  return list.every((p) => can(p))
}

export const toolExecutor = {
  execute: async (
    toolName: string,
    input: Record<string, unknown>,
    ctx: ToolExecutionContext,
  ): Promise<ToolExecutionRecord> => {
    const startedAt = Date.now()
    const registered = getToolByName(toolName)

    if (!registered) {
      return {
        toolName,
        input,
        output: null,
        success: false,
        errorMessage: `Unknown tool: ${toolName}`,
        executionMs: Date.now() - startedAt,
      }
    }

    if (!hasToolPermission(registered.permissions, ctx.can)) {
      return {
        toolName,
        input,
        output: null,
        success: false,
        errorMessage: 'Permission denied for this tool',
        executionMs: Date.now() - startedAt,
      }
    }

    const handler = inventoryReadTools[registered.name]
    if (!handler) {
      return {
        toolName,
        input,
        output: null,
        success: false,
        errorMessage: `Tool handler not implemented: ${toolName}`,
        executionMs: Date.now() - startedAt,
      }
    }

    try {
      const output = await handler(input as never)
      return {
        toolName,
        input,
        output,
        success: true,
        executionMs: Date.now() - startedAt,
      }
    } catch (error) {
      return {
        toolName,
        input,
        output: null,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Tool execution failed',
        executionMs: Date.now() - startedAt,
      }
    }
  },
}
