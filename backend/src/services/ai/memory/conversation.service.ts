import { prisma } from '../../../config/prisma'
import { ApiError } from '../../../utils/api-error'

export const conversationService = {
  getOrCreate: async (userId: string, conversationId?: string) => {
    if (conversationId) {
      const existing = await prisma.aiConversation.findFirst({
        where: { id: conversationId, userId, isActive: true },
      })
      if (!existing) throw new ApiError(404, 'Conversation not found')
      return existing
    }

    return prisma.aiConversation.create({
      data: {
        userId,
        title: 'New conversation',
      },
    })
  },

  create: async (userId: string) =>
    prisma.aiConversation.create({
      data: {
        userId,
        title: 'New conversation',
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    }),

  listForUser: async (userId: string, limit = 20) => {
    const conversations = await prisma.aiConversation.findMany({
      where: { userId, isActive: true },
      orderBy: { updatedAt: 'desc' },
      take: Math.max(1, Math.min(50, limit)),
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, role: true, createdAt: true },
        },
      },
    })

    return conversations.map(({ messages, ...conversation }) => ({
      ...conversation,
      lastMessage: messages[0]
        ? {
            content: messages[0].content.slice(0, 120),
            role: messages[0].role,
            createdAt: messages[0].createdAt,
          }
        : null,
    }))
  },

  getMessages: async (userId: string, conversationId: string, limit = 50) => {
    const conversation = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
    })
    if (!conversation) throw new ApiError(404, 'Conversation not found')

    const messages = await prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, Math.min(100, limit)),
    })

    return messages.reverse()
  },

  touch: async (conversationId: string, titleHint?: string) => {
    const data: { updatedAt: Date; title?: string } = { updatedAt: new Date() }
    if (titleHint) {
      const conversation = await prisma.aiConversation.findUnique({
        where: { id: conversationId },
        select: { title: true },
      })
      if (conversation?.title === 'New conversation' || !conversation?.title) {
        data.title = titleHint.slice(0, 80)
      }
    }
    await prisma.aiConversation.update({ where: { id: conversationId }, data })
  },
}
