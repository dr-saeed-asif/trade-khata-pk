"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearLoginFailures = exports.recordLoginFailure = exports.loginBruteForceGuard = exports.loginRateLimiter = exports.apiRateLimiter = void 0;
const api_error_1 = require("../utils/api-error");
const rateLimitStore = new Map();
const loginAttemptStore = new Map();
const getClientIp = (req) => req.ip || req.socket.remoteAddress || 'unknown';
const getLoginAttemptKey = (email, ip) => `${email.toLowerCase()}::${ip}`;
const createRateLimiter = ({ windowMs, maxRequests, keyGenerator, message = 'Too many requests, please try again later.', }) => {
    return (req, _res, next) => {
        const now = Date.now();
        const key = keyGenerator ? keyGenerator(req) : getClientIp(req);
        const existing = rateLimitStore.get(key);
        if (!existing || existing.resetAt <= now) {
            rateLimitStore.set(key, {
                count: 1,
                resetAt: now + windowMs,
            });
            return next();
        }
        if (existing.count >= maxRequests) {
            return next(new api_error_1.ApiError(429, message));
        }
        existing.count += 1;
        rateLimitStore.set(key, existing);
        return next();
    };
};
const loginBruteForceWindowMs = Number(process.env.LOGIN_BRUTE_FORCE_WINDOW_MS ?? 15 * 60 * 1000);
const loginBruteForceMaxFailures = Number(process.env.LOGIN_BRUTE_FORCE_MAX_FAILURES ?? 5);
const loginBruteForceLockMs = Number(process.env.LOGIN_BRUTE_FORCE_LOCK_MS ?? 15 * 60 * 1000);
exports.apiRateLimiter = createRateLimiter({
    windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    maxRequests: Number(process.env.API_RATE_LIMIT_MAX_REQUESTS ?? 200),
});
exports.loginRateLimiter = createRateLimiter({
    windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    maxRequests: Number(process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS ?? 20),
    keyGenerator: (req) => `login::${getClientIp(req)}`,
    message: 'Too many login attempts. Please try again later.',
});
const loginBruteForceGuard = (req, _res, next) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    if (!email)
        return next();
    const key = getLoginAttemptKey(email, getClientIp(req));
    const existing = loginAttemptStore.get(key);
    if (!existing)
        return next();
    if (existing.lockUntil > Date.now()) {
        return next(new api_error_1.ApiError(429, 'Account temporarily locked due to repeated failed login attempts.'));
    }
    if (existing.firstFailureAt + loginBruteForceWindowMs <= Date.now()) {
        loginAttemptStore.delete(key);
    }
    return next();
};
exports.loginBruteForceGuard = loginBruteForceGuard;
const recordLoginFailure = (email, ip) => {
    const key = getLoginAttemptKey(email, ip);
    const now = Date.now();
    const existing = loginAttemptStore.get(key);
    if (!existing || existing.firstFailureAt + loginBruteForceWindowMs <= now) {
        loginAttemptStore.set(key, {
            failedCount: 1,
            firstFailureAt: now,
            lockUntil: 0,
        });
        return;
    }
    const nextFailedCount = existing.failedCount + 1;
    const lockUntil = nextFailedCount >= loginBruteForceMaxFailures ? now + loginBruteForceLockMs : 0;
    loginAttemptStore.set(key, {
        failedCount: nextFailedCount,
        firstFailureAt: existing.firstFailureAt,
        lockUntil,
    });
};
exports.recordLoginFailure = recordLoginFailure;
const clearLoginFailures = (email, ip) => {
    const key = getLoginAttemptKey(email, ip);
    loginAttemptStore.delete(key);
};
exports.clearLoginFailures = clearLoginFailures;
