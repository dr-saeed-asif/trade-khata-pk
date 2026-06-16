"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateLlmCostUsd = void 0;
const MODEL_COST_PER_1M = {
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4-turbo': { input: 10, output: 30 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    'qwen-plus': { input: 0.4, output: 1.2 },
    'qwen-turbo': { input: 0.05, output: 0.2 },
    'qwen-max': { input: 1.6, output: 6.4 },
};
const estimateLlmCostUsd = (model, promptTokens, completionTokens) => {
    let rates = MODEL_COST_PER_1M[model];
    if (!rates) {
        if (model.startsWith('qwen-plus'))
            rates = MODEL_COST_PER_1M['qwen-plus'];
        else if (model.startsWith('qwen-turbo') || model.startsWith('qwen-flash'))
            rates = MODEL_COST_PER_1M['qwen-turbo'];
        else if (model.startsWith('qwen-max') || model.startsWith('qwen3'))
            rates = MODEL_COST_PER_1M['qwen-max'];
        else
            rates = model.includes('qwen') ? MODEL_COST_PER_1M['qwen-plus'] : MODEL_COST_PER_1M['gpt-4o-mini'];
    }
    const inputCost = (promptTokens / 1_000_000) * rates.input;
    const outputCost = (completionTokens / 1_000_000) * rates.output;
    return Number((inputCost + outputCost).toFixed(6));
};
exports.estimateLlmCostUsd = estimateLlmCostUsd;
