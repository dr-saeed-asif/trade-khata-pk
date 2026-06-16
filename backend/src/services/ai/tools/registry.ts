import type { Permission } from '../../../config/permissions'
import type { LlmToolDefinition } from '../llm/types'
import type { InventoryReadToolName } from './inventory-read-tools'

export type AiToolPermission = Permission | Permission[]

export type RegisteredAiTool = {
  name: InventoryReadToolName
  description: string
  permissions: AiToolPermission
  parameters: Record<string, unknown>
  readOnly: boolean
}

const tool = (
  name: InventoryReadToolName,
  description: string,
  permissions: AiToolPermission,
  properties: Record<string, unknown>,
  required: string[] = [],
): RegisteredAiTool => ({
  name,
  description,
  permissions,
  readOnly: true,
  parameters: {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  },
})

export const AI_TOOL_REGISTRY: RegisteredAiTool[] = [
  tool('getInventorySummary', 'Get overall inventory summary including total items, stock quantities, and low-stock count.', 'items.read', {}),
  tool('getLowStockItems', 'List items at or below their low-stock threshold.', 'reports.read', {
    limit: { type: 'number', description: 'Maximum items to return (default 20)' },
  }),
  tool('getExpiringItems', 'List items expiring within a given number of days.', 'items.read', {
    days: { type: 'number', description: 'Expiry window in days (default 30)' },
    limit: { type: 'number', description: 'Maximum items to return (default 20)' },
  }),
  tool('searchItemBySkuOrName', 'Search inventory items by SKU or name.', 'items.read', {
    query: { type: 'string', description: 'SKU or item name search term' },
    limit: { type: 'number', description: 'Maximum items to return (default 10)' },
  }, ['query']),
  tool('getItemDetails', 'Get full details for a specific item by ID or SKU.', 'items.read', {
    itemId: { type: 'string', description: 'Item UUID' },
    sku: { type: 'string', description: 'Item SKU' },
  }),
  tool('getStockMovementHistory', 'Get recent stock movement history, optionally filtered by item.', 'stock.read', {
    itemId: { type: 'string', description: 'Optional item UUID filter' },
    days: { type: 'number', description: 'Lookback window in days (default 30)' },
    limit: { type: 'number', description: 'Maximum movements to return (default 20)' },
  }),
  tool('getFastMovingItems', 'Get fast-moving items based on outbound stock movement.', 'reports.read', {
    days: { type: 'number', description: 'Analysis window in days (default 30)' },
    limit: { type: 'number', description: 'Maximum items to return (default 10)' },
  }),
  tool('getSlowMovingItems', 'Get slow-moving items based on outbound stock movement.', 'reports.read', {
    days: { type: 'number', description: 'Analysis window in days (default 30)' },
    limit: { type: 'number', description: 'Maximum items to return (default 10)' },
  }),
  tool('getReorderSuggestions', 'Suggest items that need reordering based on low stock levels.', 'reports.read', {
    limit: { type: 'number', description: 'Maximum suggestions to return (default 20)' },
  }),
  tool('getSalesSummary', 'Get sales summary for a given period.', 'sales.read', {
    days: { type: 'number', description: 'Lookback window in days (default 30)' },
  }),
  tool('getPurchaseSummary', 'Get purchase summary for a given period.', 'purchases.read', {
    days: { type: 'number', description: 'Lookback window in days (default 30)' },
  }),
]

export const getLlmToolDefinitions = (can: (permission: Permission) => boolean): LlmToolDefinition[] =>
  AI_TOOL_REGISTRY.filter((entry) => {
    const perms = Array.isArray(entry.permissions) ? entry.permissions : [entry.permissions]
    return perms.every((p) => can(p))
  }).map((entry) => ({
    type: 'function',
    function: {
      name: entry.name,
      description: entry.description,
      parameters: entry.parameters,
    },
  }))

export const getToolByName = (name: string) => AI_TOOL_REGISTRY.find((t) => t.name === name)
