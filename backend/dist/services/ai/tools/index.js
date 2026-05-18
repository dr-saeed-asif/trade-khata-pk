"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAiTools = void 0;
const report_tools_1 = require("./report-tools");
const inventory_tools_1 = require("./inventory-tools");
const category_tools_1 = require("./category-tools");
const user_tools_1 = require("./user-tools");
const fallback_tool_1 = require("./fallback-tool");
const runAiTools = async (ctx) => {
    const results = [];
    results.push(...(await (0, report_tools_1.runReportTools)(ctx)));
    results.push(...(await (0, inventory_tools_1.runInventoryTools)(ctx, results)));
    results.push(...(await (0, category_tools_1.runCategoryTools)(ctx)));
    results.push(...(await (0, user_tools_1.runUserTools)(ctx)));
    results.push(...(await (0, fallback_tool_1.runFallbackSnapshotTool)(ctx, results)));
    return results;
};
exports.runAiTools = runAiTools;
