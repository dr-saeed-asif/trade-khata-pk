"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePagination = void 0;
const parsePagination = (query, defaultLimit = 10) => {
    const page = Math.max(1, Math.floor(Number(query?.page ?? '1')) || 1);
    const limit = Math.max(1, Math.min(100, Math.floor(Number(query?.limit ?? String(defaultLimit)) || defaultLimit)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};
exports.parsePagination = parsePagination;
