export type ToolResult = {
  tool: string
  data: unknown
}

export type CategoryRecord = {
  id: string
  name: string
  itemsCount: number
}

export type AiToolContext = {
  message: string
  text: string
  intent: string
  days: number
  can: (permission: string) => boolean
  getCategories: () => Promise<CategoryRecord[]>
}
