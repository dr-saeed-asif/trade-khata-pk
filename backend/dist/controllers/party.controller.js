"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partyController = void 0;
const party_service_1 = require("../services/party.service");
exports.partyController = {
    create: async (req, res, next) => {
        try {
            res.status(201).json(await party_service_1.partyService.create(req.body, req.user?.userId));
        }
        catch (error) {
            next(error);
        }
    },
    list: async (req, res, next) => {
        try {
            const type = req.query.type;
            res.json(await party_service_1.partyService.list({
                type,
                search: req.query.search,
                page: req.query.page,
                limit: req.query.limit,
            }));
        }
        catch (error) {
            next(error);
        }
    },
    getById: async (req, res, next) => {
        try {
            res.json(await party_service_1.partyService.getById(String(req.params.id)));
        }
        catch (error) {
            next(error);
        }
    },
    update: async (req, res, next) => {
        try {
            res.json(await party_service_1.partyService.update(String(req.params.id), req.body, req.user?.userId));
        }
        catch (error) {
            next(error);
        }
    },
    delete: async (req, res, next) => {
        try {
            await party_service_1.partyService.delete(String(req.params.id), req.user?.userId);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    },
};
