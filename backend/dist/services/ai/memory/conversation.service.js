"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationService = void 0;
const prisma_1 = require("../../../config/prisma");
const api_error_1 = require("../../../utils/api-error");
exports.conversationService = {
    getOrCreate: async (userId, conversationId) => {
        if (conversationId) {
            const existing = await prisma_1.prisma.aiConversation.findFirst({
                where: { id: conversationId, userId, isActive: true },
            });
            if (!existing)
                throw new api_error_1.ApiError(404, 'Conversation not found');
            return existing;
        }
        return prisma_1.prisma.aiConversation.create({
            data: {
                userId,
                title: 'New conversation',
            },
        });
    },
    create: async (userId) => prisma_1.prisma.aiConversation.create({
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
    listForUser: async (userId, limit = 20) => {
        const conversations = await prisma_1.prisma.aiConversation.findMany({
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
        });
        return conversations.map(({ messages, ...conversation }) => ({
            ...conversation,
            lastMessage: messages[0]
                ? {
                    content: messages[0].content.slice(0, 120),
                    role: messages[0].role,
                    createdAt: messages[0].createdAt,
                }
                : null,
        }));
    },
    getMessages: async (userId, conversationId, limit = 50) => {
        const conversation = await prisma_1.prisma.aiConversation.findFirst({
            where: { id: conversationId, userId },
        });
        if (!conversation)
            throw new api_error_1.ApiError(404, 'Conversation not found');
        const messages = await prisma_1.prisma.aiMessage.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            take: Math.max(1, Math.min(100, limit)),
        });
        return messages.reverse();
    },
    touch: async (conversationId, titleHint) => {
        const data = { updatedAt: new Date() };
        if (titleHint) {
            const conversation = await prisma_1.prisma.aiConversation.findUnique({
                where: { id: conversationId },
                select: { title: true },
            });
            if (conversation?.title === 'New conversation' || !conversation?.title) {
                data.title = titleHint.slice(0, 80);
            }
        }
        await prisma_1.prisma.aiConversation.update({ where: { id: conversationId }, data });
    },
};
