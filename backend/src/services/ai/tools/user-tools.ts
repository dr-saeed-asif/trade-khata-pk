import { adminService } from '../../admin.service'
import type { AiToolContext, ToolResult } from './types'
import { includesNamesIntent, includesUsersIntent } from './utils'

export const runUserTools = async (ctx: AiToolContext): Promise<ToolResult[]> => {
  if (!(includesUsersIntent(ctx.text) && includesNamesIntent(ctx.text) && ctx.can('users.read'))) {
    return []
  }

  const users = await adminService.listUsers()
  return [
    {
      tool: 'users-list',
      data: users.map((row) => ({
        name: row.name,
        email: row.email,
        role: row.role,
      })),
    },
  ]
}
