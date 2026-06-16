import 'dotenv/config'
import { AiMessageRole } from '@prisma/client'
import { prisma } from '../config/prisma'

/** Demo AI conversation for testing short-term memory and follow-ups. */
export const seedAiDemo = async () => {
  const user = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'MANAGER'] } },
    orderBy: { createdAt: 'asc' },
  })

  if (!user) {
    console.log('AI demo: skipped (no admin/manager user found)')
    return null
  }

  const existing = await prisma.aiConversation.findFirst({
    where: { userId: user.id, title: 'Demo: Low stock review' },
  })
  if (existing) {
    console.log(`AI demo: conversation already exists (${existing.id})`)
    return existing
  }

  const lowStockItems = await prisma.$queryRaw<Array<{ id: string; name: string; sku: string; quantity: number }>>`
    SELECT id, name, sku, quantity FROM "Item"
    WHERE quantity <= "lowStockAt"
    ORDER BY quantity ASC
    LIMIT 5
  `

  const itemSummary =
    lowStockItems.length > 0
      ? lowStockItems.map((i) => `${i.name} (${i.sku}): qty ${i.quantity}`).join(', ')
      : 'Daal Chana, Basmati Rice'

  const conversation = await prisma.aiConversation.create({
    data: {
      userId: user.id,
      title: 'Demo: Low stock review',
      messages: {
        create: [
          {
            role: AiMessageRole.USER,
            content: 'Show me low-stock items',
          },
          {
            role: AiMessageRole.ASSISTANT,
            content: `Here are the current low-stock items: ${itemSummary}. Several items are below their reorder threshold and may need attention.`,
            metadata: { intent: 'getLowStockItems', provider: 'seed' },
          },
          {
            role: AiMessageRole.USER,
            content: 'Which ones are most critical?',
          },
          {
            role: AiMessageRole.ASSISTANT,
            content:
              'The most critical items are those with quantity at or near zero. I recommend prioritizing reorder for items with the lowest available quantity first.',
            metadata: { intent: 'follow-up', provider: 'seed' },
          },
        ],
      },
      sessionMemory: {
        create: {
          summary: 'User reviewed low-stock items and asked about critical reorder priorities.',
          messageCount: 4,
          contextState: {
            lastToolName: 'getLowStockItems',
            lastIntent: 'getLowStockItems',
            activeItemSkus: lowStockItems.map((i) => i.sku),
            activeItemIds: lowStockItems.map((i) => i.id),
            recentTopics: ['getLowStockItems', 'follow-up'],
          },
        },
      },
    },
  })

  console.log(`AI demo: created conversation ${conversation.id}`)
  return conversation
}

const run = async () => {
  await seedAiDemo()
}

if (require.main === module) {
  run()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
