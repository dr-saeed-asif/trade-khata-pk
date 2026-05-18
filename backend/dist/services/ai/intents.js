"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldUseLlmForAnswer = exports.shouldUseRag = exports.detectSmallTalkIntent = exports.isGreetingMessage = exports.extractDays = exports.detectIntent = void 0;
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
exports.detectIntent = detectIntent;
const extractDays = (message) => {
    const match = message.match(/(\d{1,3})\s*day/i);
    const parsed = Number(match?.[1] ?? 30);
    if (!Number.isFinite(parsed))
        return 30;
    return Math.max(1, Math.min(365, Math.floor(parsed)));
};
exports.extractDays = extractDays;
const hasAnyWord = (text, words) => words.some((word) => text.includes(word));
const isGreetingMessage = (text) => {
    const normalized = text.trim().toLowerCase();
    if (!normalized)
        return false;
    return /^(hi|hello|hey|salam|assalam o alaikum|aoa|good morning|good evening|good afternoon)[!. ]*$/.test(normalized);
};
exports.isGreetingMessage = isGreetingMessage;
const detectSmallTalkIntent = (text) => {
    const normalized = text.trim().toLowerCase();
    if (!normalized)
        return null;
    if (/^(thanks|thank you|thx|jazakallah|jazak allah)[!. ]*$/.test(normalized))
        return 'thanks';
    if (/^(ok|okay|k|done|great|nice|good)[!. ]*$/.test(normalized))
        return 'acknowledgement';
    if (/^(who are you|what are you|what can you do|help me|help)[?.! ]*$/.test(normalized))
        return 'help';
    return null;
};
exports.detectSmallTalkIntent = detectSmallTalkIntent;
const shouldUseRag = (text) => hasAnyWord(text, ['how', 'why', 'explain', 'policy', 'sop', 'guide', 'documentation', 'process']);
exports.shouldUseRag = shouldUseRag;
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
exports.shouldUseLlmForAnswer = shouldUseLlmForAnswer;
