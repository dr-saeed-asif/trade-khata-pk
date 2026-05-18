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
const intents_1 = require("./intents");
const chatInputSchema = zod_1.z.object({
    message: zod_1.z.string().min(2).max(2000),
});
const hasRuntimePermission = (user, permission) => {
    const fromToken = user.permissions?.includes(permission) ?? false;
    return fromToken || (0, permissions_1.hasPermission)(user.role, permission);
};
exports.aiService = {
    chat: async (input, user) => {
        if (!user)
            throw new api_error_1.ApiError(401, 'Unauthorized');
        const startedAt = Date.now();
        const parsed = chatInputSchema.safeParse(input);
        if (!parsed.success)
            throw new api_error_1.ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid request payload');
        const { message } = parsed.data;
        const intent = (0, intents_1.detectIntent)(message);
        let effectiveIntent = intent;
        const days = (0, intents_1.extractDays)(message);
        const results = [];
        let usedProvider = 'rule-based';
        let citations = [];
        const text = message.toLowerCase();
        let cachedCategories = null;
        const ensureCategories = async () => {
            if (!cachedCategories) {
                cachedCategories = (await category_service_1.categoryService.list({ limit: '500' })).data;
            }
            return cachedCategories;
        };
        try {
            if ((0, intents_1.isGreetingMessage)(text)) {
                const answer = 'Hi! I can help with inventory insights. Ask me things like total stock quantity, category names, low stock items, users list, or inventory details.';
                await ai_observability_1.aiObservabilityService.logChat({
                    userId: user.userId,
                    role: user.role,
                    message,
                    intent: 'greeting',
                    toolCalls: [],
                    provider: 'rule-based',
                    citationsCount: 0,
                    latencyMs: Date.now() - startedAt,
                    success: true,
                });
                return {
                    answer,
                    intent: 'greeting',
                    toolCalls: [],
                    citations: [],
                    resultBlocks: [],
                    usedProvider: 'rule-based',
                    suggestions: [
                        'Get total stock quantity',
                        'Show low stock items',
                        'List category names',
                    ],
                };
            }
            const smallTalkIntent = (0, intents_1.detectSmallTalkIntent)(text);
            if (smallTalkIntent) {
                const smallTalkAnswers = {
                    thanks: "You're welcome! Ask any inventory or stock query anytime.",
                    acknowledgement: 'Great. I am ready for your next inventory query.',
                    help: 'I can answer inventory questions using your project data, like stock totals, low stock items, category names, user list, and report insights.',
                };
                const answer = smallTalkAnswers[smallTalkIntent] ?? 'I am here to help with your inventory queries.';
                await ai_observability_1.aiObservabilityService.logChat({
                    userId: user.userId,
                    role: user.role,
                    message,
                    intent: smallTalkIntent,
                    toolCalls: [],
                    provider: 'rule-based',
                    citationsCount: 0,
                    latencyMs: Date.now() - startedAt,
                    success: true,
                });
                return {
                    answer,
                    intent: smallTalkIntent,
                    toolCalls: [],
                    citations: [],
                    resultBlocks: [],
                    usedProvider: 'rule-based',
                    suggestions: [
                        'Get total stock quantity',
                        'Show low stock items',
                        'List category names',
                    ],
                };
            }
            if ((0, intents_1.shouldUseRag)(text))
                citations = await rag_1.ragService.retrieve(message, 3);
            results.push(...(await (0, tools_1.runAiTools)({
                message,
                text,
                intent,
                days,
                can: (permission) => hasRuntimePermission(user, permission),
                getCategories: ensureCategories,
            })));
            if (intent === 'help' && results.length > 0)
                effectiveIntent = 'custom-query';
            const llmAnswer = (0, intents_1.shouldUseLlmForAnswer)(text, effectiveIntent, results)
                ? await (0, llm_1.createLlmAnswer)(message, results, citations)
                : null;
            const answer = llmAnswer ?? (0, formatters_1.buildRuleBasedAnswer)(message, results, citations);
            const resultBlocks = (0, formatters_1.buildResultBlocks)(results);
            usedProvider = llmAnswer ? env_1.env.llmProvider : 'rule-based';
            await ai_observability_1.aiObservabilityService.logChat({
                userId: user.userId,
                role: user.role,
                message,
                intent: effectiveIntent,
                toolCalls: results.map((entry) => entry.tool),
                provider: usedProvider,
                citationsCount: citations.length,
                latencyMs: Date.now() - startedAt,
                success: true,
            });
            return {
                answer,
                intent: effectiveIntent,
                toolCalls: results.map((entry) => entry.tool),
                citations: citations.map((entry) => ({
                    source: entry.source,
                    title: entry.title,
                    score: entry.score,
                })),
                resultBlocks,
                usedProvider,
                suggestions: [
                    'Show low stock items',
                    'Profit loss for last 30 days',
                    'Top fast and slow movers for 90 days',
                ],
            };
        }
        catch (error) {
            await ai_observability_1.aiObservabilityService.logChat({
                userId: user.userId,
                role: user.role,
                message,
                intent: effectiveIntent,
                toolCalls: results.map((entry) => entry.tool),
                provider: usedProvider,
                citationsCount: citations.length,
                latencyMs: Date.now() - startedAt,
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    },
    analytics: async (days) => ai_observability_1.aiObservabilityService.getAnalytics(days),
    history: async (userId, limit = 20) => ai_observability_1.aiObservabilityService.getUserHistory(userId, limit),
};
