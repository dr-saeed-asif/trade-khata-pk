"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ragService = void 0;
const zod_1 = require("zod");
const store_1 = require("./store");
const text_1 = require("./text");
const ragDocumentInputSchema = zod_1.z.object({
    source: zod_1.z.string().trim().min(2).max(120),
    title: zod_1.z.string().trim().min(2).max(160),
    content: zod_1.z.string().trim().min(30).max(50000),
});
exports.ragService = {
    ingestDocument: async (payload) => {
        const parsed = ragDocumentInputSchema.safeParse(payload);
        if (!parsed.success) {
            return {
                success: false,
                message: parsed.error.issues[0]?.message ?? 'Invalid rag document payload',
            };
        }
        const { source, title, content } = parsed.data;
        const store = await (0, store_1.readRagStore)();
        const filtered = store.chunks.filter((chunk) => !(chunk.source === source && chunk.title === title));
        const newChunks = (0, text_1.toChunks)(source, title, content);
        const updated = [...filtered, ...newChunks];
        await (0, store_1.writeRagStore)({ chunks: updated });
        return {
            success: true,
            source,
            title,
            chunkCount: newChunks.length,
            totalChunks: updated.length,
        };
    },
    retrieve: async (query, take = 3) => {
        const store = await (0, store_1.readRagStore)();
        const queryTokens = (0, text_1.tokenize)(query);
        const ranked = store.chunks
            .map((chunk) => ({ chunk, score: (0, text_1.scoreChunk)(queryTokens, chunk) }))
            .filter((row) => row.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, Math.max(1, Math.min(8, take)));
        return ranked.map((row) => ({
            source: row.chunk.source,
            title: row.chunk.title,
            content: row.chunk.content,
            score: Number(row.score.toFixed(3)),
        }));
    },
    listSources: async () => {
        const store = await (0, store_1.readRagStore)();
        const unique = new Map();
        for (const chunk of store.chunks) {
            const key = `${chunk.source}::${chunk.title}`;
            const existing = unique.get(key);
            if (existing)
                existing.chunkCount += 1;
            else
                unique.set(key, { source: chunk.source, title: chunk.title, chunkCount: 1 });
        }
        return Array.from(unique.values()).sort((a, b) => a.source.localeCompare(b.source));
    },
};
