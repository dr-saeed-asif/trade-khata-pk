"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLlmAnswer = void 0;
const env_1 = require("../../config/env");
const formatters_1 = require("./formatters");
const createLlmAnswer = async (message, results, citations) => {
    if (env_1.env.llmProvider === 'rule-based')
        return null;
    const baseUrl = env_1.env.llmBaseUrl.replace(/\/$/, '');
    const systemPrompt = 'You are an inventory assistant. Use only supplied tool outputs. Do not invent data. Keep response concise with clear bullet points and recommendation.';
    const userPrompt = `User question: ${message}\n\nTool outputs:\n${JSON.stringify((0, formatters_1.compactResultsForLlm)(results))}\n\nRAG citations:\n${JSON.stringify(citations.slice(0, 3))}`;
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
exports.createLlmAnswer = createLlmAnswer;
