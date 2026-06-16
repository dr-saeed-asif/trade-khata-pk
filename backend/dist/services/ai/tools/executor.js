"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolExecutor = void 0;
const inventory_read_tools_1 = require("./inventory-read-tools");
const registry_1 = require("./registry");
const hasToolPermission = (permissions, can) => {
    const list = Array.isArray(permissions) ? permissions : [permissions];
    return list.every((p) => can(p));
};
exports.toolExecutor = {
    execute: async (toolName, input, ctx) => {
        const startedAt = Date.now();
        const registered = (0, registry_1.getToolByName)(toolName);
        if (!registered) {
            return {
                toolName,
                input,
                output: null,
                success: false,
                errorMessage: `Unknown tool: ${toolName}`,
                executionMs: Date.now() - startedAt,
            };
        }
        if (!hasToolPermission(registered.permissions, ctx.can)) {
            return {
                toolName,
                input,
                output: null,
                success: false,
                errorMessage: 'Permission denied for this tool',
                executionMs: Date.now() - startedAt,
            };
        }
        const handler = inventory_read_tools_1.inventoryReadTools[registered.name];
        if (!handler) {
            return {
                toolName,
                input,
                output: null,
                success: false,
                errorMessage: `Tool handler not implemented: ${toolName}`,
                executionMs: Date.now() - startedAt,
            };
        }
        try {
            const output = await handler(input);
            return {
                toolName,
                input,
                output,
                success: true,
                executionMs: Date.now() - startedAt,
            };
        }
        catch (error) {
            return {
                toolName,
                input,
                output: null,
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Tool execution failed',
                executionMs: Date.now() - startedAt,
            };
        }
    },
};
