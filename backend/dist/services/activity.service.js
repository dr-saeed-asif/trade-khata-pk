"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityService = void 0;
const prisma_1 = require("../config/prisma");
exports.activityService = {
    create: async (payload) => prisma_1.prisma.activityLog.create({
        data: payload,
    }),
};
