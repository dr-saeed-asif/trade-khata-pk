"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmService = void 0;
const env_1 = require("../../../config/env");
const cost_1 = require("./cost");
const EMPTY_USAGE = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
const SYSTEM_PROMPT = 'You are an inventory operations copilot for a QR inventory management system. ' +
    'Use available tools to fetch real data before answering inventory questions. ' +
    'Never invent stock levels, SKUs, or reports. ' +
    'When the user refers to "these items", "previous results", or similar follow-ups, use conversation context and recent tool outputs. ' +
    'Keep answers concise with bullet points and actionable recommendations.';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const parseUsage = (usage) => ({
    promptTokens: usage?.prompt_tokens ?? 0,
    completionTokens: usage?.completion_tokens ?? 0,
    totalTokens: usage?.total_tokens ?? 0,
});
const isRetryableStatus = (status) => status === 429 || status === 500 || status === 502 || status === 503;
const resolveProviderLabel = () => {
    if (env_1.env.llmProvider === 'ollama')
        return 'ollama';
    if (env_1.env.llmProvider === 'qwen' || env_1.env.llmBaseUrl.includes('dashscope'))
        return 'qwen';
    if (env_1.env.llmProvider === 'openai')
        return 'openai';
    return env_1.env.llmProvider;
};
/** OpenAI-compatible APIs expect assistant tool_calls without empty string content issues. */
const formatMessagesForApi = (messages) => messages.map((message) => {
    if (message.role === 'assistant' && message.tool_calls?.length) {
        return {
            role: message.role,
            content: message.content || null,
            tool_calls: message.tool_calls,
        };
    }
    if (message.role === 'tool') {
        return {
            role: message.role,
            tool_call_id: message.tool_call_id,
            content: message.content,
        };
    }
    return { role: message.role, content: message.content };
});
const readErrorBody = async (response) => {
    try {
        const text = await response.text();
        return text.slice(0, 500);
    }
    catch {
        return '';
    }
};
exports.llmService = {
    isEnabled: () => {
        if (env_1.env.llmProvider === 'rule-based')
            return false;
        if (env_1.env.llmProvider === 'ollama')
            return true;
        return Boolean(env_1.env.llmApiKey);
    },
    getProviderLabel: resolveProviderLabel,
    buildSystemPrompt: (sessionSummary) => {
        if (!sessionSummary)
            return SYSTEM_PROMPT;
        return `${SYSTEM_PROMPT}\n\nConversation summary:\n${sessionSummary}`;
    },
    complete: async (messages, tools) => {
        if (!exports.llmService.isEnabled())
            return null;
        const baseUrl = env_1.env.llmBaseUrl.replace(/\/$/, '');
        let lastError = null;
        for (let attempt = 0; attempt <= env_1.env.llmMaxRetries; attempt++) {
            const startedAt = Date.now();
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), env_1.env.llmTimeoutMs);
            try {
                if (env_1.env.llmProvider === 'ollama') {
                    const response = await fetch(`${baseUrl}/api/chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        signal: controller.signal,
                        body: JSON.stringify({
                            model: env_1.env.llmModel,
                            stream: false,
                            messages: messages.map((m) => ({ role: m.role, content: m.content })),
                            options: {
                                temperature: env_1.env.llmTemperature,
                                num_predict: env_1.env.llmMaxTokens,
                            },
                        }),
                    });
                    if (!response.ok) {
                        if (isRetryableStatus(response.status) && attempt < env_1.env.llmMaxRetries) {
                            await sleep(300 * (attempt + 1));
                            continue;
                        }
                        return null;
                    }
                    const payload = (await response.json());
                    return {
                        content: payload.message?.content ?? null,
                        toolCalls: [],
                        usage: EMPTY_USAGE,
                        model: env_1.env.llmModel,
                        provider: 'ollama',
                        latencyMs: Date.now() - startedAt,
                    };
                }
                if (!env_1.env.llmApiKey)
                    return null;
                const body = {
                    model: env_1.env.llmModel,
                    temperature: env_1.env.llmTemperature,
                    max_tokens: env_1.env.llmMaxTokens,
                    messages: formatMessagesForApi(messages),
                };
                if (tools?.length) {
                    body.tools = tools;
                    body.tool_choice = 'auto';
                    // Qwen Cloud defaults parallel_tool_calls to false; explicit for compatibility
                    body.parallel_tool_calls = false;
                }
                const response = await fetch(`${baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${env_1.env.llmApiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                });
                if (!response.ok) {
                    const errorBody = await readErrorBody(response);
                    if (errorBody) {
                        console.error(`[LLM] ${resolveProviderLabel()} request failed (${response.status}):`, errorBody);
                    }
                    if (isRetryableStatus(response.status) && attempt < env_1.env.llmMaxRetries) {
                        await sleep(300 * (attempt + 1));
                        continue;
                    }
                    lastError = new Error(`LLM request failed with status ${response.status}`);
                    return null;
                }
                const payload = (await response.json());
                const choice = payload.choices?.[0]?.message;
                return {
                    content: choice?.content ?? null,
                    toolCalls: choice?.tool_calls?.map((tc) => ({
                        id: tc.id,
                        type: 'function',
                        function: tc.function,
                    })) ?? [],
                    usage: parseUsage(payload.usage),
                    model: env_1.env.llmModel,
                    provider: resolveProviderLabel(),
                    latencyMs: Date.now() - startedAt,
                };
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error('LLM request failed');
                if (attempt < env_1.env.llmMaxRetries) {
                    await sleep(300 * (attempt + 1));
                    continue;
                }
                return null;
            }
            finally {
                clearTimeout(timeout);
            }
        }
        if (lastError)
            return null;
        return null;
    },
    runToolCallingLoop: async (userMessage, contextMessages, tools, executeTool, sessionSummary) => {
        if (!exports.llmService.isEnabled())
            return null;
        const messages = [
            { role: 'system', content: exports.llmService.buildSystemPrompt(sessionSummary) },
            ...contextMessages,
            { role: 'user', content: userMessage },
        ];
        const toolCallsExecuted = [];
        let totalUsage = { ...EMPTY_USAGE };
        let totalLlmLatencyMs = 0;
        const maxIterations = 5;
        for (let i = 0; i < maxIterations; i++) {
            const result = await exports.llmService.complete(messages, tools);
            if (!result)
                return null;
            totalLlmLatencyMs += result.latencyMs;
            totalUsage = {
                promptTokens: totalUsage.promptTokens + result.usage.promptTokens,
                completionTokens: totalUsage.completionTokens + result.usage.completionTokens,
                totalTokens: totalUsage.totalTokens + result.usage.totalTokens,
            };
            if (!result.toolCalls.length) {
                if (!result.content)
                    return null;
                return {
                    answer: result.content,
                    toolCallsExecuted,
                    usage: totalUsage,
                    estimatedCostUsd: (0, cost_1.estimateLlmCostUsd)(result.model, totalUsage.promptTokens, totalUsage.completionTokens),
                    llmLatencyMs: totalLlmLatencyMs,
                    provider: result.provider,
                    model: result.model,
                };
            }
            messages.push({
                role: 'assistant',
                content: result.content ?? '',
                tool_calls: result.toolCalls,
            });
            for (const toolCall of result.toolCalls) {
                const toolName = toolCall.function.name;
                toolCallsExecuted.push(toolName);
                let args = {};
                try {
                    args = JSON.parse(toolCall.function.arguments);
                }
                catch {
                    args = {};
                }
                let output;
                try {
                    output = await executeTool(toolName, args);
                }
                catch (error) {
                    output = {
                        error: error instanceof Error ? error.message : 'Tool execution failed',
                    };
                }
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(output),
                });
            }
        }
        return null;
    },
};
