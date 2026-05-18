"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizePermission = exports.authorize = exports.authenticate = void 0;
const api_error_1 = require("../utils/api-error");
const jwt_1 = require("../utils/jwt");
const permissions_1 = require("../config/permissions");
const authenticate = (req, _res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
        return next(new api_error_1.ApiError(401, 'Authorization token is required'));
    }
    const token = authorization.replace('Bearer ', '');
    try {
        req.user = (0, jwt_1.verifyToken)(token);
        next();
    }
    catch {
        next(new api_error_1.ApiError(401, 'Invalid or expired token'));
    }
};
exports.authenticate = authenticate;
const authorize = (roles) => (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return next(new api_error_1.ApiError(403, 'Insufficient permissions'));
    }
    next();
};
exports.authorize = authorize;
const authorizePermission = (permission) => (req, _res, next) => {
    if (!req.user) {
        return next(new api_error_1.ApiError(403, 'Insufficient permissions'));
    }
    const userPermissions = req.user.permissions;
    if (Array.isArray(userPermissions) && userPermissions.length > 0) {
        if (!userPermissions.includes(permission)) {
            return next(new api_error_1.ApiError(403, 'Insufficient permissions'));
        }
        return next();
    }
    if (!(0, permissions_1.hasPermission)(req.user.role, permission)) {
        return next(new api_error_1.ApiError(403, 'Insufficient permissions'));
    }
    next();
};
exports.authorizePermission = authorizePermission;
