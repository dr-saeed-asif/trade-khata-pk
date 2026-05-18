"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiController = void 0;
const ai_1 = require("../services/ai");
const rag_1 = require("../services/rag");
exports.aiController = {
    chat: async (req, res, next) => {
        try {
            const data = await ai_1.aiService.chat(req.body, req.user);
            res.json(data);
        }
        catch (error) {
            next(error);
        }
    },
    ingestRagDocument: async (req, res, next) => {
        try {
            const data = await rag_1.ragService.ingestDocument(req.body);
            if (!data.success) {
                res.status(400).json({ message: data.message });
                return;
            }
            res.status(201).json(data);
        }
        catch (error) {
            next(error);
        }
    },
    listRagSources: async (_req, res, next) => {
        try {
            const data = await rag_1.ragService.listSources();
            res.json(data);
        }
        catch (error) {
            next(error);
        }
    },
    analytics: async (req, res, next) => {
        try {
            const parsedDays = Number(req.query.days ?? 7);
            const days = Number.isFinite(parsedDays) ? Math.max(1, Math.min(90, Math.floor(parsedDays))) : 7;
            const data = await ai_1.aiService.analytics(days);
            res.json(data);
        }
        catch (error) {
            next(error);
        }
    },
    history: async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const parsedLimit = Number(req.query.limit ?? 20);
            const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(100, Math.floor(parsedLimit))) : 20;
            const data = await ai_1.aiService.history(req.user.userId, limit);
            res.json(data);
        }
        catch (error) {
            next(error);
        }
    },
};
