"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiObservabilityService = void 0;
const node_crypto_1 = require("node:crypto");
const store_1 = require("./store");
const average = (values) => {
    if (!values.length)
        return 0;
    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
};
exports.aiObservabilityService = {
    logChat: async (record) => {
        const store = await (0, store_1.readLogStore)();
        store.logs.push({
            ...record,
            id: (0, node_crypto_1.randomUUID)(),
            createdAt: new Date().toISOString(),
        });
        if (store.logs.length > 2000)
            store.logs = store.logs.slice(-2000);
        await (0, store_1.writeLogStore)(store);
    },
    getUserHistory: async (userId, limit = 20) => {
        const store = await (0, store_1.readLogStore)();
        return store.logs
            .filter((row) => row.userId === userId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, Math.max(1, Math.min(100, limit)));
    },
    getAnalytics: async (days = 7) => {
        const store = await (0, store_1.readLogStore)();
        const from = Date.now() - days * 24 * 60 * 60 * 1000;
        const filtered = store.logs.filter((row) => new Date(row.createdAt).getTime() >= from);
        const successCount = filtered.filter((row) => row.success).length;
        const failureCount = filtered.length - successCount;
        const providerUsage = filtered.reduce((acc, row) => {
            acc[row.provider] = (acc[row.provider] ?? 0) + 1;
            return acc;
        }, {});
        const intentUsage = filtered.reduce((acc, row) => {
            acc[row.intent] = (acc[row.intent] ?? 0) + 1;
            return acc;
        }, {});
        return {
            days,
            totalRequests: filtered.length,
            successCount,
            failureCount,
            avgLatencyMs: average(filtered.map((row) => row.latencyMs)),
            avgToolsPerRequest: average(filtered.map((row) => row.toolCalls.length)),
            avgCitationsPerRequest: average(filtered.map((row) => row.citationsCount)),
            providerUsage,
            intentUsage,
            generatedAt: new Date().toISOString(),
        };
    },
};
