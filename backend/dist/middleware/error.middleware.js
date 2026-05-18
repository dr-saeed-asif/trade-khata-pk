"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = void 0;
const api_error_1 = require("../utils/api-error");
const notFoundHandler = (_req, _res, next) => {
    next(new api_error_1.ApiError(404, 'Route not found'));
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (err, _req, res, _next) => {
    const statusCode = err instanceof api_error_1.ApiError
        ? err.statusCode
        : typeof err === 'object' && err !== null && 'statusCode' in err
            ? (err.statusCode ?? 500)
            : 500;
    const message = err.message ?? 'Internal server error';
    res.status(statusCode).json({ message });
};
exports.errorHandler = errorHandler;
