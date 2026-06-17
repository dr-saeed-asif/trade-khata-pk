"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = void 0;
const zod_1 = require("zod");
const permissions_1 = require("../../config/permissions");
const env_1 = require("../../config/env");
const category_service_1 = require("../category.service");
const api_error_1 = require("../../utils/api-error");
const rag_1 = require("../rag");
const ai_observability_1 = require("../ai-observability");
const tools_1 = require("./tools");
const formatters_1 = require("./formatters");
const llm_1 = require("./llm");
const llm_service_1 = require("./llm/llm.service");
const intents_1 = require("./intents");
const memory_manager_1 = require("./memory/memory-manager");
const conversation_service_1 = require("./memory/conversation.service");
const trace_service_1 = require("./trace/trace.service");
const registry_1 = require("./tools/registry");
const executor_1 = require("./tools/executor");
const chatInputSchema = zod_1.z.object({
    message: zod_1.z.string().min(2).max(2000),
    conversationId: zod_1.z.string().uuid().optional(),
});
const hasRuntimePermission = (user, permission) => {
    const fromToken = user.permissions?.includes(permission) ?? false;
    return fromToken || (0, permissions_1.hasPermission)(user.role, permission);
};
const toToolResults = (records) => records.filter((r) => r.success).map((r) => ({ tool: r.toolName, data: r.output }));
const logTrace = async (input) => {
    await trace_service_1.aiTraceService.log(input);
    await ai_observability_1.aiObservabilityService.logChat({
        userId: input.userId,
        role: input.role,
        message: input.message,
        intent: input.intent ?? 'unknown',
        toolCalls: input.toolCalls ?? [],
        provider: input.provider,
        citationsCount: input.citationsCount ?? 0,
        latencyMs: input.totalLatencyMs,
        success: input.success,
        errorMessage: input.errorMessage,
    });
};
exports.aiService = {
    chat: async (input, user) => {
        if (!user)
            throw new api_error_1.ApiError(401, 'Unauthorized');
        const startedAt = Date.now();
        const parsed = chatInputSchema.safeParse(input);
        if (!parsed.success)
            throw new api_error_1.ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid request payload');
        const { message, conversationId: inputConversationId } = parsed.data;
        const conversation = await conversation_service_1.conversationService.getOrCreate(user.userId, inputConversationId);
        const conversationId = conversation.id;
        await memory_manager_1.memoryManager.saveUserMessage(conversationId, message);
        const memoryContext = await memory_manager_1.memoryManager.getContextForLlm(conversationId);
        const followUpHint = memory_manager_1.memoryManager.buildFollowUpContextHint(memoryContext);
        const intent = (0, intents_1.detectIntent)(message);
        let effectiveIntent = intent;
        const days = (0, intents_1.extractDays)(message);
        const results = [];
        let usedProvider = 'rule-based';
        let citations = [];
        const text = message.toLowerCase();
        let cachedCategories = null;
        let llmLatencyMs = 0;
        let tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
        let estimatedCostUsd = 0;
        let answer = '';
        const ensureCategories = async () => {
            if (!cachedCategories) {
                cachedCategories = (await category_service_1.categoryService.list({ limit: '500' })).data;
            }
            return cachedCategories ?? [];
        };
        const can = (permission) => hasRuntimePermission(user, permission);
        try {
            if ((0, intents_1.isGreetingMessage)(text)) {
                answer =
                    'Hi! I am your inventory copilot. Ask about low stock, expiring items, sales summaries, reorder suggestions, or follow up on previous results in this chat.';
                await memory_manager_1.memoryManager.saveAssistantMessage(conversationId, answer, { intent: 'greeting' });
                await memory_manager_1.memoryManager.touchConversation(conversationId, message);
                await logTrace({
                    conversationId,
                    userId: user.userId,
                    role: user.role,
                    message,
                    response: answer,
                    intent: 'greeting',
                    toolCalls: [],
                    shortTermMemory: { messageCount: memoryContext.recentMessages.length },
                    provider: 'rule-based',
                    totalLatencyMs: Date.now() - startedAt,
                    success: true,
                });
                return {
                    answer,
                    conversationId,
                    intent: 'greeting',
                    toolCalls: [],
                    citations: [],
                    resultBlocks: [],
                    usedProvider: 'rule-based',
                    suggestions: ['Show low stock items', 'What items are expiring soon?', 'Get inventory summary'],
                };
            }
            const smallTalkIntent = (0, intents_1.detectSmallTalkIntent)(text);
            if (smallTalkIntent) {
                const smallTalkAnswers = {
                    thanks: "You're welcome! Ask any inventory or stock query anytime.",
                    acknowledgement: 'Great. I am ready for your next inventory query.',
                    help: 'I can answer inventory questions using live data — stock levels, low stock, expiring items, sales/purchase summaries, and reorder suggestions. I remember context within this conversation.',
                };
                answer = smallTalkAnswers[smallTalkIntent] ?? 'I am here to help with your inventory queries.';
                await memory_manager_1.memoryManager.saveAssistantMessage(conversationId, answer, { intent: smallTalkIntent });
                await memory_manager_1.memoryManager.touchConversation(conversationId);
                await logTrace({
                    conversationId,
                    userId: user.userId,
                    role: user.role,
                    message,
                    response: answer,
                    intent: smallTalkIntent,
                    toolCalls: [],
                    provider: 'rule-based',
                    totalLatencyMs: Date.now() - startedAt,
                    success: true,
                });
                return {
                    answer,
                    conversationId,
                    intent: smallTalkIntent,
                    toolCalls: [],
                    citations: [],
                    resultBlocks: [],
                    usedProvider: 'rule-based',
                    suggestions: ['Show low stock items', 'Get inventory summary', 'Summarize these results'],
                };
            }
            if ((0, intents_1.shouldUseRag)(text))
                citations = await rag_1.ragService.retrieve(message, 3);
            const toolDefinitions = (0, registry_1.getLlmToolDefinitions)(can);
            const enrichedMessage = followUpHint ? `${message}\n\n[Context]\n${followUpHint}` : message;
            const toolExecutionRecords = [];
            if (llm_service_1.llmService.isEnabled() && toolDefinitions.length > 0) {
                const loopResult = await llm_service_1.llmService.runToolCallingLoop(enrichedMessage, memoryContext.recentMessages.slice(0, -1), toolDefinitions, async (toolName, args) => {
                    const record = await executor_1.toolExecutor.execute(toolName, args, {
                        userId: user.userId,
                        conversationId,
                        can,
                    });
                    toolExecutionRecords.push(record);
                    await trace_service_1.aiTraceService.logToolCall({
                        conversationId,
                        userId: user.userId,
                        toolName: record.toolName,
                        input: record.input,
                        output: record.output,
                        success: record.success,
                        errorMessage: record.errorMessage,
                        executionMs: record.executionMs,
                    });
                    return record.success ? record.output : { error: record.errorMessage };
                }, memoryContext.sessionSummary);
                if (loopResult) {
                    answer = loopResult.answer;
                    usedProvider = loopResult.provider;
                    llmLatencyMs = loopResult.llmLatencyMs;
                    tokenUsage = loopResult.usage;
                    estimatedCostUsd = loopResult.estimatedCostUsd;
                    results.push(...toToolResults(toolExecutionRecords));
                    effectiveIntent = toolExecutionRecords[0]?.toolName ?? intent;
                }
            }
            if (!answer) {
                results.push(...(await (0, tools_1.runAiTools)({
                    message,
                    text,
                    intent,
                    days,
                    can: (permission) => can(permission),
                    getCategories: ensureCategories,
                })));
                if (intent === 'help' && results.length > 0)
                    effectiveIntent = 'custom-query';
                const llmAnswer = (0, intents_1.shouldUseLlmForAnswer)(text, effectiveIntent, results)
                    ? await (0, llm_1.createLlmAnswer)(enrichedMessage, results, citations)
                    : null;
                answer = llmAnswer ?? (0, formatters_1.buildRuleBasedAnswer)(message, results, citations);
                usedProvider = llmAnswer ? env_1.env.llmProvider : 'rule-based';
            }
            const resultBlocks = (0, formatters_1.buildResultBlocks)(results);
            const toolCallNames = results.map((entry) => entry.tool);
            const lastSuccessfulTool = toolExecutionRecords.find((r) => r.success) ?? null;
            await memory_manager_1.memoryManager.saveAssistantMessage(conversationId, answer, {
                intent: effectiveIntent,
                toolCalls: toolCallNames,
                provider: usedProvider,
                resultBlocks,
                citations: citations.map((c) => ({ source: c.source, title: c.title, score: c.score })),
            });
            await memory_manager_1.memoryManager.updateSessionAfterTurn(conversationId, {
                toolName: lastSuccessfulTool?.toolName ?? toolCallNames[0],
                toolOutput: lastSuccessfulTool?.output ?? results[0]?.data,
                intent: effectiveIntent,
            });
            await memory_manager_1.memoryManager.touchConversation(conversationId, message);
            await logTrace({
                conversationId,
                userId: user.userId,
                role: user.role,
                message,
                response: answer,
                intent: effectiveIntent,
                toolCalls: toolCallNames,
                shortTermMemory: {
                    recentMessageCount: memoryContext.recentMessages.length,
                    hasSessionSummary: Boolean(memoryContext.sessionSummary),
                    contextState: memoryContext.contextState,
                },
                provider: usedProvider,
                model: llm_service_1.llmService.isEnabled() ? env_1.env.llmModel : undefined,
                promptTokens: tokenUsage.promptTokens || undefined,
                completionTokens: tokenUsage.completionTokens || undefined,
                totalTokens: tokenUsage.totalTokens || undefined,
                estimatedCostUsd: estimatedCostUsd || undefined,
                llmLatencyMs: llmLatencyMs || undefined,
                totalLatencyMs: Date.now() - startedAt,
                citationsCount: citations.length,
                success: true,
            });
            return {
                answer,
                conversationId,
                intent: effectiveIntent,
                toolCalls: toolCallNames,
                citations: citations.map((entry) => ({
                    source: entry.source,
                    title: entry.title,
                    score: entry.score,
                })),
                resultBlocks,
                usedProvider,
                suggestions: [
                    'Summarize these results',
                    'Show only critical ones',
                    'Create a reorder report from that',
                ],
            };
        }
        catch (error) {
            await logTrace({
                conversationId,
                userId: user.userId,
                role: user.role,
                message,
                intent: effectiveIntent,
                toolCalls: results.map((entry) => entry.tool),
                provider: usedProvider,
                totalLatencyMs: Date.now() - startedAt,
                citationsCount: citations.length,
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    },
    analytics: async (days) => trace_service_1.aiTraceService.getAnalytics(days),
    history: async (userId, limit = 20) => trace_service_1.aiTraceService.getUserHistory(userId, limit),
    listConversations: async (userId, limit = 20) => conversation_service_1.conversationService.listForUser(userId, limit),
    createConversation: async (userId) => conversation_service_1.conversationService.create(userId),
    getConversationMessages: async (userId, conversationId, limit = 50) => conversation_service_1.conversationService.getMessages(userId, conversationId, limit),
};
