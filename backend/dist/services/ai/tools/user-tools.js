"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runUserTools = void 0;
const admin_service_1 = require("../../admin.service");
const utils_1 = require("./utils");
const runUserTools = async (ctx) => {
    if (!((0, utils_1.includesUsersIntent)(ctx.text) && (0, utils_1.includesNamesIntent)(ctx.text) && ctx.can('users.read'))) {
        return [];
    }
    const users = await admin_service_1.adminService.listUsers();
    return [
        {
            tool: 'users-list',
            data: users.map((row) => ({
                name: row.name,
                email: row.email,
                role: row.role,
            })),
        },
    ];
};
exports.runUserTools = runUserTools;
