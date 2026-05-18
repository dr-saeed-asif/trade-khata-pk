"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeRagStore = exports.readRagStore = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const ragDataDir = node_path_1.default.join(process.cwd(), 'data');
const ragIndexPath = node_path_1.default.join(ragDataDir, 'rag-index.json');
const ensureStore = async () => {
    await (0, promises_1.mkdir)(ragDataDir, { recursive: true });
    try {
        await (0, promises_1.readFile)(ragIndexPath, 'utf8');
    }
    catch {
        await (0, promises_1.writeFile)(ragIndexPath, JSON.stringify({ chunks: [] }, null, 2), 'utf8');
    }
};
const readRagStore = async () => {
    await ensureStore();
    const raw = await (0, promises_1.readFile)(ragIndexPath, 'utf8');
    const parsed = JSON.parse(raw);
    return { chunks: parsed.chunks ?? [] };
};
exports.readRagStore = readRagStore;
const writeRagStore = async (store) => {
    await ensureStore();
    await (0, promises_1.writeFile)(ragIndexPath, JSON.stringify(store, null, 2), 'utf8');
};
exports.writeRagStore = writeRagStore;
