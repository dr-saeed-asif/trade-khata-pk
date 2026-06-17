"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../config/prisma");
const api_error_1 = require("../utils/api-error");
const jwt_1 = require("../utils/jwt");
const activity_service_1 = require("./activity.service");
const role_permissions_service_1 = require("./role-permissions.service");
const findUserByLoginIdentifier = async (identifier) => {
    const value = identifier.trim();
    return prisma_1.prisma.user.findFirst({
        where: {
            OR: [
                { email: { equals: value, mode: 'insensitive' } },
                { username: { equals: value, mode: 'insensitive' } },
            ],
        },
    });
};
exports.authService = {
    register: async (input) => {
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email: input.email } });
        if (existingUser)
            throw new api_error_1.ApiError(409, 'Email already in use');
        const passwordHash = await bcrypt_1.default.hash(input.password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                name: input.name,
                email: input.email,
                passwordHash,
                role: 'USER',
            },
        });
        await activity_service_1.activityService.create({
            action: 'REGISTER',
            entityType: 'USER',
            entityId: user.id,
            description: 'User registered',
            userId: user.id,
        });
        const permissions = await (0, role_permissions_service_1.resolveUserPermissions)(user.id, user.role);
        const token = (0, jwt_1.signToken)({ userId: user.id, role: user.role, permissions });
        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                permissions,
            },
        };
    },
    login: async (input) => {
        const user = await findUserByLoginIdentifier(input.identifier);
        if (!user)
            throw new api_error_1.ApiError(401, 'Invalid email/username or password');
        const valid = await bcrypt_1.default.compare(input.password, user.passwordHash);
        if (!valid)
            throw new api_error_1.ApiError(401, 'Invalid email/username or password');
        await activity_service_1.activityService.create({
            action: 'LOGIN',
            entityType: 'USER',
            entityId: user.id,
            description: 'User logged in',
            userId: user.id,
        });
        const permissions = await (0, role_permissions_service_1.resolveUserPermissions)(user.id, user.role);
        const token = (0, jwt_1.signToken)({ userId: user.id, role: user.role, permissions });
        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                permissions,
            },
        };
    },
    forgotPassword: async (input) => {
        const user = await prisma_1.prisma.user.findUnique({ where: { email: input.email } });
        if (user) {
            await activity_service_1.activityService.create({
                action: 'PASSWORD_RESET_REQUEST',
                entityType: 'USER',
                entityId: user.id,
                description: 'Password reset requested',
                userId: user.id,
            });
        }
        return {
            message: 'If an account exists for this email, an administrator will help you reset your password. Please contact your system admin.',
        };
    },
    refreshSession: async (userId) => {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new api_error_1.ApiError(404, 'User not found');
        const permissions = await (0, role_permissions_service_1.resolveUserPermissions)(user.id, user.role);
        const token = (0, jwt_1.signToken)({ userId: user.id, role: user.role, permissions });
        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                permissions,
            },
        };
    },
};
