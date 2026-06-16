"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryManager = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../../config/prisma");
const env_1 = require("../../../config/env");
const llm_service_1 = require("../llm/llm.service");
const conversation_service_1 = require("./conversation.service");
const mapRoleForLlm = (role) => {
    if (role === client_1.AiMessageRole.USER)
        return 'user';
    if (role === client_1.AiMessageRole.ASSISTANT)
        return 'assistant';
    return null;
};
const extractContextFromToolResult = (toolName, output) => {
    const state = {
        lastToolName: toolName,
        lastToolResult: output,
    };
    if (!output || typeof output !== 'object')
        return state;
    const data = output;
    const items = (data.items ?? data.suggestions);
    if (Array.isArray(items) && items.length) {
        state.activeItemIds = items.map((i) => String(i.id)).filter(Boolean).slice(0, 20);
        state.activeItemSkus = items.map((i) => String(i.sku)).filter(Boolean).slice(0, 20);
    }
    return state;
};
exports.memoryManager = {
    saveUserMessage: async (conversationId, content, metadata) => prisma_1.prisma.aiMessage.create({
        data: {
            conversationId,
            role: client_1.AiMessageRole.USER,
            content,
            metadata: (metadata ?? undefined),
        },
    }),
    saveAssistantMessage: async (conversationId, content, metadata) => prisma_1.prisma.aiMessage.create({
        data: {
            conversationId,
            role: client_1.AiMessageRole.ASSISTANT,
            content,
            metadata: (metadata ?? undefined),
        },
    }),
    getContextForLlm: async (conversationId) => {
        const [messages, sessionMemory] = await Promise.all([
            prisma_1.prisma.aiMessage.findMany({
                where: {
                    conversationId,
                    role: { in: [client_1.AiMessageRole.USER, client_1.AiMessageRole.ASSISTANT] },
                },
                orderBy: { createdAt: 'desc' },
                take: env_1.env.aiMaxContextMessages,
            }),
            prisma_1.prisma.aiSessionMemory.findUnique({ where: { conversationId } }),
        ]);
        const recentMessages = messages
            .reverse()
            .map((m) => {
            const role = mapRoleForLlm(m.role);
            if (!role)
                return null;
            return { role, content: m.content };
        })
            .filter((m) => m !== null);
        return {
            recentMessages,
            sessionSummary: sessionMemory?.summary ?? null,
            contextState: sessionMemory?.contextState ?? null,
        };
    },
    updateSessionAfterTurn: async (conversationId, updates) => {
        const existing = await prisma_1.prisma.aiSessionMemory.findUnique({ where: { conversationId } });
        const prevState = existing?.contextState ?? {};
        const toolContext = updates.toolName && updates.toolOutput
            ? extractContextFromToolResult(updates.toolName, updates.toolOutput)
            : {};
        const contextState = {
            ...prevState,
            ...toolContext,
            lastIntent: updates.intent ?? prevState.lastIntent,
            recentTopics: [
                updates.intent ?? updates.toolName ?? 'general',
                ...(prevState.recentTopics ?? []),
            ].slice(0, 5),
        };
        const messageCount = await prisma_1.prisma.aiMessage.count({ where: { conversationId } });
        await prisma_1.prisma.aiSessionMemory.upsert({
            where: { conversationId },
            create: {
                conversationId,
                contextState: contextState,
                messageCount,
            },
            update: {
                contextState: contextState,
                messageCount,
                updatedAt: new Date(),
            },
        });
        if (messageCount >= env_1.env.aiSummaryThreshold && llm_service_1.llmService.isEnabled()) {
            await exports.memoryManager.maybeSummarizeConversation(conversationId);
        }
    },
    maybeSummarizeConversation: async (conversationId) => {
        const sessionMemory = await prisma_1.prisma.aiSessionMemory.findUnique({ where: { conversationId } });
        if (sessionMemory?.summary && (sessionMemory.messageCount ?? 0) < env_1.env.aiSummaryThreshold * 2) {
            return;
        }
        const olderMessages = await prisma_1.prisma.aiMessage.findMany({
            where: {
                conversationId,
                role: { in: [client_1.AiMessageRole.USER, client_1.AiMessageRole.ASSISTANT] },
            },
            orderBy: { createdAt: 'asc' },
            take: env_1.env.aiSummaryThreshold,
        });
        if (olderMessages.length < env_1.env.aiSummaryThreshold)
            return;
        const transcript = olderMessages
            .map((m) => `${m.role}: ${m.content.slice(0, 300)}`)
            .join('\n');
        const result = await llm_service_1.llmService.complete([
            {
                role: 'system',
                content: 'Summarize this inventory assistant conversation in 3-5 bullet points. Focus on user goals, items discussed, and pending follow-ups.',
            },
            { role: 'user', content: transcript },
        ]);
        if (!result?.content)
            return;
        await prisma_1.prisma.aiSessionMemory.update({
            where: { conversationId },
            data: { summary: result.content, updatedAt: new Date() },
        });
    },
    buildFollowUpContextHint: (context) => {
        const parts = [];
        if (context.sessionSummary) {
            parts.push(`Session summary: ${context.sessionSummary}`);
        }
        if (context.contextState?.lastToolName) {
            parts.push(`Last tool used: ${context.contextState.lastToolName}`);
        }
        if (context.contextState?.activeItemSkus?.length) {
            parts.push(`Active items (SKUs): ${context.contextState.activeItemSkus.join(', ')}`);
        }
        if (context.contextState?.lastToolResult) {
            parts.push(`Last tool result snapshot: ${JSON.stringify(context.contextState.lastToolResult).slice(0, 1500)}`);
        }
        return parts.length ? parts.join('\n') : null;
    },
    touchConversation: conversation_service_1.conversationService.touch,
};
