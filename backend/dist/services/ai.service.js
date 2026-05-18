"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = void 0;
const zod_1 = require("zod");
const permissions_1 = require("../config/permissions");
const env_1 = require("../config/env");
const category_service_1 = require("./category.service");
const api_error_1 = require("../utils/api-error");
const rag_service_1 = require("./rag.service");
const ai_observability_service_1 = require("./ai-observability.service");
const tools_1 = require("./ai/tools");
const chatInputSchema = zod_1.z.object({
    message: zod_1.z.string().min(2).max(2000),
});
const hasRuntimePermission = (user, permission) => {
    const fromToken = user.permissions?.includes(permission) ?? false;
    return fromToken || (0, permissions_1.hasPermission)(user.role, permission);
};
const extractDays = (message) => {
    const match = message.match(/(\d{1,3})\s*day/i);
    const parsed = Number(match?.[1] ?? 30);
    if (!Number.isFinite(parsed))
        return 30;
    return Math.max(1, Math.min(365, Math.floor(parsed)));
};
const detectIntent = (message) => {
    const text = message.toLowerCase();
    if (text.includes('profit') || text.includes('loss') || text.includes('margin'))
        return 'profit-loss';
    if (text.includes('mover') || text.includes('fast moving') || text.includes('slow moving'))
        return 'movers';
    if (text.includes('trend') || text.includes('movement'))
        return 'movement-trend';
    if (text.includes('low stock') || text.includes('reorder'))
        return 'low-stock';
    if (text.includes('recent'))
        return 'recent';
    if (text.includes('item') || text.includes('sku') || text.includes('search'))
        return 'search-items';
    return 'help';
};
const hasAnyWord = (text, words) => words.some((word) => text.includes(word));
const shouldUseRag = (text) => hasAnyWord(text, ['how', 'why', 'explain', 'policy', 'sop', 'guide', 'documentation', 'process']);
const shouldUseLlmForAnswer = (text, intent, results) => {
    const dataHeavyTools = new Set(['inventory-details', 'users-list', 'search-items', 'low-stock', 'recent']);
    const hasDataHeavyTool = results.some((result) => dataHeavyTools.has(result.tool));
    if (hasDataHeavyTool)
        return false;
    if (results.some((result) => result.tool === 'category-list'))
        return true;
    if (intent === 'help')
        return true;
    if (hasAnyWord(text, ['explain', 'summary', 'summarize', 'insight', 'analysis', 'recommend']))
        return true;
    return false;
};
const compactResultsForLlm = (results) => results.map((entry) => {
    if (Array.isArray(entry.data)) {
        return {
            tool: entry.tool,
            data: entry.data.slice(0, 8),
        };
    }
    if (typeof entry.data === 'object' && entry.data && 'data' in entry.data) {
        const row = entry.data;
        return {
            ...entry,
            data: {
                ...row,
                data: Array.isArray(row.data) ? row.data.slice(0, 8) : row.data,
            },
        };
    }
    return entry;
});
const buildResultBlocks = (results) => {
    const blocks = [];
    for (const result of results) {
        if (result.tool === 'search-items') {
            const data = result.data;
            blocks.push({
                key: 'search-items',
                title: `Matching Items (${data.total ?? 0})`,
                rows: (data.data ?? []).slice(0, 8).map((row) => ({
                    name: row.name ?? '-',
                    sku: row.sku ?? '-',
                    qty: row.quantity ?? 0,
                    available: row.availableQty ?? 0,
                    category: row.category ?? '-',
                    location: row.location ?? '-',
                })),
            });
            continue;
        }
        if (result.tool === 'inventory-details' && typeof result.data === 'object' && result.data) {
            const data = result.data;
            blocks.push({
                key: 'inventory-details',
                title: `Inventory Details (${data.total ?? 0})`,
                rows: (data.data ?? []).slice(0, 20).map((row) => ({
                    name: row.name ?? '-',
                    sku: row.sku ?? '-',
                    qty: row.quantity ?? 0,
                    available: row.availableQty ?? 0,
                    category: row.category ?? '-',
                    supplier: row.supplier ?? '-',
                    location: row.location ?? '-',
                })),
            });
            continue;
        }
        if (result.tool === 'low-stock' && Array.isArray(result.data)) {
            const rows = result.data
                .slice(0, 10)
                .map((row) => ({
                name: row.name ?? '-',
                sku: row.sku ?? '-',
                qty: row.quantity ?? 0,
                threshold: row.lowStockAt ?? 0,
                category: row.categoryName ?? '-',
            }));
            blocks.push({ key: 'low-stock', title: 'Low Stock Items', rows });
            continue;
        }
        if (result.tool === 'recent' && Array.isArray(result.data)) {
            const rows = result.data
                .slice(0, 8)
                .map((row) => ({
                name: row.name ?? '-',
                sku: row.sku ?? '-',
                qty: row.quantity ?? 0,
                category: row.category?.name ?? '-',
            }));
            blocks.push({ key: 'recent', title: 'Recent Items', rows });
            continue;
        }
        if (result.tool === 'top-categories-by-items' && Array.isArray(result.data)) {
            blocks.push({
                key: 'top-categories-by-items',
                title: 'Top Categories',
                rows: result.data.map((row) => ({
                    category: row.name,
                    items: row.itemsCount,
                })),
            });
            continue;
        }
        if (result.tool === 'users-list' && Array.isArray(result.data)) {
            const rows = result.data
                .slice(0, 30)
                .map((row) => ({
                name: row.name ?? '-',
                email: row.email ?? '-',
                role: row.role ?? '-',
            }));
            blocks.push({ key: 'users-list', title: `Users (${result.data.length})`, rows });
            continue;
        }
        if (result.tool === 'category-list' && Array.isArray(result.data)) {
            const rows = result.data
                .slice(0, 30)
                .map((row) => ({
                category: row.name ?? '-',
                items: row.itemsCount ?? 0,
            }));
            blocks.push({ key: 'category-list', title: `Categories (${result.data.length})`, rows });
            continue;
        }
        if (result.tool === 'stock-total-quantity' && typeof result.data === 'object' && result.data) {
            const row = result.data;
            blocks.push({
                key: 'stock-total-quantity',
                title: 'Total Stock Quantity',
                metrics: {
                    totalStockQuantity: row.totalStockQuantity ?? 0,
                    totalReservedQuantity: row.totalReservedQuantity ?? 0,
                    totalAvailableQuantity: row.totalAvailableQuantity ?? 0,
                },
            });
            continue;
        }
        if (typeof result.data === 'object' && result.data) {
            blocks.push({
                key: result.tool,
                title: result.tool.replaceAll('-', ' '),
                metrics: result.data,
            });
        }
    }
    return blocks;
};
const toolSummary = (toolName, data) => {
    if (toolName === 'profit-loss' && typeof data === 'object' && data) {
        const row = data;
        return `Profit/Loss (${row.days ?? 30} days): revenue ${row.revenue ?? 0}, expense ${row.expense ?? 0}, gross profit ${row.grossProfit ?? 0}, margin ${row.marginPct ?? 0}%.`;
    }
    if (toolName === 'movement-trend' && typeof data === 'object' && data) {
        const row = data;
        return `Movement trend (${row.days ?? 30} days): IN ${row.totals?.in ?? 0}, OUT ${row.totals?.out ?? 0}, TRANSFER ${row.totals?.transfer ?? 0}, ADJUSTMENT ${row.totals?.adjustment ?? 0}.`;
    }
    if (toolName === 'movers' && typeof data === 'object' && data) {
        const row = data;
        const fast = row.fastMoving?.slice(0, 3).map((x) => `${x.name} (${x.soldQty})`).join(', ') ?? 'None';
        const slow = row.slowMoving?.slice(0, 3).map((x) => `${x.name} (${x.soldQty})`).join(', ') ?? 'None';
        return `Top movers (${row.days ?? 30} days). Fast: ${fast}. Slow: ${slow}.`;
    }
    if (toolName === 'low-stock' && Array.isArray(data)) {
        return `Low stock items found: ${data.length}.`;
    }
    if (toolName === 'recent' && Array.isArray(data)) {
        return `Recent items count: ${data.length}.`;
    }
    if (toolName === 'search-items' && typeof data === 'object' && data) {
        const row = data;
        return `Matching items found: ${row.total ?? 0}.`;
    }
    if (toolName === 'category-count' && typeof data === 'object' && data) {
        const row = data;
        const sample = row.sample?.length ? ` Sample: ${row.sample.join(', ')}.` : '';
        return `Total categories: ${row.totalCategories ?? 0}.${sample}`;
    }
    if (toolName === 'item-count' && typeof data === 'object' && data) {
        const row = data;
        return `Total items: ${row.totalItems ?? 0}.`;
    }
    if (toolName === 'top-categories-by-items' && Array.isArray(data)) {
        const sample = data
            .slice(0, 5)
            .map((row) => {
            const item = row;
            return `${item.name ?? 'Unknown'} (${item.itemsCount ?? 0})`;
        })
            .join(', ');
        return sample ? `Top categories by items: ${sample}.` : 'No category ranking data available.';
    }
    if (toolName === 'category-item-count' && typeof data === 'object' && data) {
        const row = data;
        return `Items in category "${row.category ?? 'unknown'}": ${row.totalItems ?? 0}.`;
    }
    if (toolName === 'category-low-stock-count' && typeof data === 'object' && data) {
        const row = data;
        return `Low stock items in category "${row.category ?? 'unknown'}": ${row.lowStockItems ?? 0}.`;
    }
    if (toolName === 'expired-count' && typeof data === 'object' && data) {
        const row = data;
        return `Expired items found: ${row.totalExpiredItems ?? 0}.`;
    }
    if (toolName === 'system-snapshot' && typeof data === 'object' && data) {
        const row = data;
        return `Snapshot -> items: ${row.totalItems ?? 0}, categories: ${row.totalCategories ?? 0}, low stock: ${row.lowStockItems ?? 0}, recent: ${row.recentItems ?? 0}.`;
    }
    if (toolName === 'users-list' && Array.isArray(data)) {
        const names = data.map((row) => row.name).filter(Boolean);
        const preview = names.slice(0, 8).join(', ');
        return `Total users: ${names.length}. ${preview ? `Names: ${preview}${names.length > 8 ? ' ...' : ''}.` : ''}`;
    }
    if (toolName === 'inventory-details' && typeof data === 'object' && data) {
        const row = data;
        const preview = (row.data ?? [])
            .slice(0, 5)
            .map((item) => item.name ?? 'Unknown')
            .join(', ');
        return `Total inventory items: ${row.total ?? 0}.${preview ? ` Sample: ${preview}.` : ''}`;
    }
    if (toolName === 'category-list' && Array.isArray(data)) {
        const names = data.map((row) => row.name).filter(Boolean);
        const preview = names.slice(0, 10).join(', ');
        return `Total categories: ${names.length}.${preview ? ` Names: ${preview}${names.length > 10 ? ' ...' : ''}.` : ''}`;
    }
    if (toolName === 'stock-total-quantity' && typeof data === 'object' && data) {
        const row = data;
        return `Total stock quantity: ${row.totalStockQuantity ?? 0}, reserved: ${row.totalReservedQuantity ?? 0}, available: ${row.totalAvailableQuantity ?? 0}.`;
    }
    return 'Data retrieved from inventory system.';
};
const buildRuleBasedAnswer = (message, results, citations) => {
    if (!results.length) {
        const guidance = [
            'I can help with inventory analytics.',
            'Try queries like:',
            '- Show low stock items',
            '- Profit loss for last 30 days',
            '- Top fast and slow movers',
            '- Search item by SKU',
        ];
        if (citations.length) {
            guidance.push('', 'I also found related documentation context in the knowledge base.');
        }
        return guidance.join('\n');
    }
    const sections = results.map((entry) => `- ${toolSummary(entry.tool, entry.data)}`);
    const answer = [`Question: ${message}`, '', 'Insights:', ...sections];
    if (citations.length) {
        answer.push('', 'Documentation context was also used for this answer.');
    }
    return answer.join('\n');
};
const createLlmAnswer = async (message, results, citations) => {
    if (env_1.env.llmProvider === 'rule-based')
        return null;
    const baseUrl = env_1.env.llmBaseUrl.replace(/\/$/, '');
    const systemPrompt = 'You are an inventory assistant. Use only supplied tool outputs. Do not invent data. Keep response concise with clear bullet points and recommendation.';
    const userPrompt = `User question: ${message}\n\nTool outputs:\n${JSON.stringify(compactResultsForLlm(results))}\n\nRAG citations:\n${JSON.stringify(citations.slice(0, 3))}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env_1.env.llmTimeoutMs);
    try {
        if (env_1.env.llmProvider === 'ollama') {
            const response = await fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
                body: JSON.stringify({
                    model: env_1.env.llmModel,
                    stream: false,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    options: {
                        temperature: env_1.env.llmTemperature,
                        num_predict: env_1.env.llmMaxTokens,
                    },
                }),
            });
            if (!response.ok)
                return null;
            const payload = (await response.json());
            return payload.message?.content ?? null;
        }
        if (!env_1.env.llmApiKey)
            return null;
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env_1.env.llmApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: env_1.env.llmModel,
                temperature: env_1.env.llmTemperature,
                max_tokens: env_1.env.llmMaxTokens,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
            }),
            signal: controller.signal,
        });
        if (!response.ok)
            return null;
        const payload = (await response.json());
        return payload.choices?.[0]?.message?.content ?? null;
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(timeout);
    }
};
exports.aiService = {
    chat: async (input, user) => {
        if (!user)
            throw new api_error_1.ApiError(401, 'Unauthorized');
        const startedAt = Date.now();
        const parsed = chatInputSchema.safeParse(input);
        if (!parsed.success) {
            throw new api_error_1.ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid request payload');
        }
        const { message } = parsed.data;
        const intent = detectIntent(message);
        let effectiveIntent = intent;
        const days = extractDays(message);
        const results = [];
        let usedProvider = 'rule-based';
        let citations = [];
        const text = message.toLowerCase();
        let cachedCategories = null;
        const ensureCategories = async () => {
            if (!cachedCategories)
                cachedCategories = await category_service_1.categoryService.list();
            return cachedCategories;
        };
        try {
            if (shouldUseRag(text)) {
                citations = await rag_service_1.ragService.retrieve(message, 3);
            }
            results.push(...(await (0, tools_1.runAiTools)({
                message,
                text,
                intent,
                days,
                can: (permission) => hasRuntimePermission(user, permission),
                getCategories: ensureCategories,
            })));
            if (intent === 'help' && results.length > 0) {
                effectiveIntent = 'custom-query';
            }
            const llmAnswer = shouldUseLlmForAnswer(text, effectiveIntent, results)
                ? await createLlmAnswer(message, results, citations)
                : null;
            const answer = llmAnswer ?? buildRuleBasedAnswer(message, results, citations);
            const resultBlocks = buildResultBlocks(results);
            usedProvider = llmAnswer ? env_1.env.llmProvider : 'rule-based';
            await ai_observability_service_1.aiObservabilityService.logChat({
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
            await ai_observability_service_1.aiObservabilityService.logChat({
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
    analytics: async (days) => ai_observability_service_1.aiObservabilityService.getAnalytics(days),
    history: async (userId, limit = 20) => ai_observability_service_1.aiObservabilityService.getUserHistory(userId, limit),
};
