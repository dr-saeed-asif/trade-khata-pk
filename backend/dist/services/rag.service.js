"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ragService = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const zod_1 = require("zod");
const ragDocumentInputSchema = zod_1.z.object({
    source: zod_1.z.string().trim().min(2).max(120),
    title: zod_1.z.string().trim().min(2).max(160),
    content: zod_1.z.string().trim().min(30).max(50000),
});
const ragDataDir = node_path_1.default.join(process.cwd(), 'data');
const ragIndexPath = node_path_1.default.join(ragDataDir, 'rag-index.json');
const stopWords = new Set([
    'the', 'is', 'a', 'an', 'of', 'to', 'and', 'or', 'for', 'in', 'on', 'with', 'by', 'from', 'as',
    'at', 'be', 'this', 'that', 'it', 'are', 'was', 'were', 'can', 'could', 'should', 'how', 'what',
    'when', 'where', 'why', 'which', 'about',
]);
const normalizeText = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const tokenize = (value) => normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 2 && !stopWords.has(token));
const toChunks = (source, title, content) => {
    const words = content.split(/\s+/);
    const chunkSize = 140;
    const overlap = 24;
    const chunks = [];
    for (let start = 0; start < words.length; start += chunkSize - overlap) {
        const end = Math.min(start + chunkSize, words.length);
        const body = words.slice(start, end).join(' ').trim();
        if (!body)
            continue;
        const id = `${source}-${Date.now()}-${start}`;
        chunks.push({
            id,
            source,
            title,
            content: body,
            tokens: tokenize(`${title} ${body}`),
        });
        if (end >= words.length)
            break;
    }
    return chunks;
};
const scoreChunk = (queryTokens, chunk) => {
    if (!queryTokens.length || !chunk.tokens.length)
        return 0;
    const chunkSet = new Set(chunk.tokens);
    let overlap = 0;
    for (const token of queryTokens) {
        if (chunkSet.has(token))
            overlap += 1;
    }
    return overlap / Math.sqrt(queryTokens.length * chunkSet.size);
};
const ensureStore = async () => {
    await (0, promises_1.mkdir)(ragDataDir, { recursive: true });
    try {
        await (0, promises_1.readFile)(ragIndexPath, 'utf8');
    }
    catch {
        await (0, promises_1.writeFile)(ragIndexPath, JSON.stringify({ chunks: [] }, null, 2), 'utf8');
    }
};
const readStore = async () => {
    await ensureStore();
    const raw = await (0, promises_1.readFile)(ragIndexPath, 'utf8');
    const parsed = JSON.parse(raw);
    return { chunks: parsed.chunks ?? [] };
};
const writeStore = async (store) => {
    await ensureStore();
    await (0, promises_1.writeFile)(ragIndexPath, JSON.stringify(store, null, 2), 'utf8');
};
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
        const store = await readStore();
        const filtered = store.chunks.filter((chunk) => !(chunk.source === source && chunk.title === title));
        const newChunks = toChunks(source, title, content);
        const updated = [...filtered, ...newChunks];
        await writeStore({ chunks: updated });
        return {
            success: true,
            source,
            title,
            chunkCount: newChunks.length,
            totalChunks: updated.length,
        };
    },
    retrieve: async (query, take = 3) => {
        const store = await readStore();
        const queryTokens = tokenize(query);
        const ranked = store.chunks
            .map((chunk) => ({ chunk, score: scoreChunk(queryTokens, chunk) }))
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
        const store = await readStore();
        const unique = new Map();
        for (const chunk of store.chunks) {
            const key = `${chunk.source}::${chunk.title}`;
            const existing = unique.get(key);
            if (existing) {
                existing.chunkCount += 1;
            }
            else {
                unique.set(key, {
                    source: chunk.source,
                    title: chunk.title,
                    chunkCount: 1,
                });
            }
        }
        return Array.from(unique.values()).sort((a, b) => a.source.localeCompare(b.source));
    },
};
