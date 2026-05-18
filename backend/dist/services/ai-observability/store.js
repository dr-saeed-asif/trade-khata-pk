"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeLogStore = exports.readLogStore = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const logsDir = node_path_1.default.join(process.cwd(), 'data');
const logsPath = node_path_1.default.join(logsDir, 'ai-observability.json');
const ensureStore = async () => {
    await (0, promises_1.mkdir)(logsDir, { recursive: true });
    try {
        await (0, promises_1.readFile)(logsPath, 'utf8');
    }
    catch {
        await (0, promises_1.writeFile)(logsPath, JSON.stringify({ logs: [] }, null, 2), 'utf8');
    }
};
const readLogStore = async () => {
    await ensureStore();
    const raw = await (0, promises_1.readFile)(logsPath, 'utf8');
    const parsed = JSON.parse(raw);
    return { logs: parsed.logs ?? [] };
};
exports.readLogStore = readLogStore;
const writeLogStore = async (store) => {
    await ensureStore();
    await (0, promises_1.writeFile)(logsPath, JSON.stringify(store, null, 2), 'utf8');
};
exports.writeLogStore = writeLogStore;
