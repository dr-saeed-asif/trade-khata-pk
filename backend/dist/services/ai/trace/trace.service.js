"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiTraceService = void 0;
const prisma_1 = require("../../../config/prisma");
const average = (values) => {
    if (!values.length)
        return 0;
    return Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2));
};
exports.aiTraceService = {
    log: async (input) => prisma_1.prisma.aiTrace.create({
        data: {
            conversationId: input.conversationId,
            userId: input.userId,
            role: input.role,
            message: input.message,
            response: input.response,
            intent: input.intent,
            toolCalls: input.toolCalls ?? [],
            shortTermMemory: (input.shortTermMemory ?? undefined),
            provider: input.provider,
            model: input.model,
            promptTokens: input.promptTokens,
            completionTokens: input.completionTokens,
            totalTokens: input.totalTokens,
            estimatedCostUsd: input.estimatedCostUsd,
            llmLatencyMs: input.llmLatencyMs,
            totalLatencyMs: input.totalLatencyMs,
            citationsCount: input.citationsCount ?? 0,
            success: input.success,
            errorMessage: input.errorMessage,
        },
    }),
    logToolCall: async (input) => prisma_1.prisma.aiToolCall.create({
        data: {
            conversationId: input.conversationId,
            userId: input.userId,
            toolName: input.toolName,
            input: input.input,
            output: input.output,
            success: input.success,
            errorMessage: input.errorMessage,
            executionMs: input.executionMs,
        },
    }),
    getUserHistory: async (userId, limit = 20) => prisma_1.prisma.aiTrace.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: Math.max(1, Math.min(100, limit)),
        select: {
            id: true,
            conversationId: true,
            message: true,
            response: true,
            intent: true,
            toolCalls: true,
            provider: true,
            totalLatencyMs: true,
            success: true,
            errorMessage: true,
            createdAt: true,
        },
    }),
    getAnalytics: async (days = 7) => {
        const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const traces = await prisma_1.prisma.aiTrace.findMany({
            where: { createdAt: { gte: from } },
        });
        const successCount = traces.filter((t) => t.success).length;
        const providerUsage = traces.reduce((acc, row) => {
            acc[row.provider] = (acc[row.provider] ?? 0) + 1;
            return acc;
        }, {});
        const intentUsage = traces.reduce((acc, row) => {
            const key = row.intent ?? 'unknown';
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
        }, {});
        const toolCalls = traces.flatMap((t) => (Array.isArray(t.toolCalls) ? t.toolCalls : []));
        return {
            days,
            totalRequests: traces.length,
            successCount,
            failureCount: traces.length - successCount,
            avgLatencyMs: average(traces.map((t) => t.totalLatencyMs)),
            avgLlmLatencyMs: average(traces.filter((t) => t.llmLatencyMs).map((t) => t.llmLatencyMs ?? 0)),
            avgToolsPerRequest: average(traces.map((t) => (Array.isArray(t.toolCalls) ? t.toolCalls.length : 0))),
            avgCitationsPerRequest: average(traces.map((t) => t.citationsCount)),
            totalTokens: traces.reduce((sum, t) => sum + (t.totalTokens ?? 0), 0),
            estimatedTotalCostUsd: Number(traces.reduce((sum, t) => sum + (t.estimatedCostUsd ?? 0), 0).toFixed(4)),
            providerUsage,
            intentUsage,
            topTools: toolCalls.reduce((acc, name) => {
                acc[name] = (acc[name] ?? 0) + 1;
                return acc;
            }, {}),
            generatedAt: new Date().toISOString(),
        };
    },
};
