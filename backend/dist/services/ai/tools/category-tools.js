"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCategoryTools = void 0;
const category_service_1 = require("../../category.service");
const item_service_1 = require("../../item.service");
const utils_1 = require("./utils");
const runCategoryTools = async (ctx) => {
    const results = [];
    if ((0, utils_1.asksForCount)(ctx.text) && (0, utils_1.hasAnyWord)(ctx.text, ['category', 'categories']) && ctx.can('categories.read')) {
        const categories = (await category_service_1.categoryService.list({ limit: '500' })).data;
        results.push({
            tool: 'category-count',
            data: {
                totalCategories: categories.length,
                sample: categories.slice(0, 5).map((row) => row.name),
            },
        });
    }
    if ((0, utils_1.asksForCount)(ctx.text) && (0, utils_1.hasAnyWord)(ctx.text, ['item', 'items', 'inventory', 'products']) && ctx.can('items.read')) {
        results.push({
            tool: 'item-count',
            data: { totalItems: (await item_service_1.itemService.list({ page: '1', limit: '1' })).total },
        });
    }
    if ((0, utils_1.asksForTop)(ctx.text) && (0, utils_1.hasAnyWord)(ctx.text, ['category', 'categories']) && ctx.can('categories.read')) {
        const categories = await ctx.getCategories();
        results.push({
            tool: 'top-categories-by-items',
            data: [...categories].sort((a, b) => b.itemsCount - a.itemsCount).slice(0, 5),
        });
    }
    const requestedCategory = (0, utils_1.extractCategoryNameFromQuery)(ctx.text);
    if (requestedCategory && ctx.can('categories.read') && ctx.can('items.read')) {
        const categories = await ctx.getCategories();
        const matched = (0, utils_1.matchCategoryFromQuery)(requestedCategory, categories);
        if (matched) {
            results.push({
                tool: 'category-item-count',
                data: {
                    category: matched.name,
                    totalItems: (await item_service_1.itemService.list({ page: '1', limit: '1', categoryId: matched.id })).total,
                },
            });
            if ((0, utils_1.includesLowStockIntent)(ctx.text)) {
                results.push({
                    tool: 'category-low-stock-count',
                    data: {
                        category: matched.name,
                        lowStockItems: (await item_service_1.itemService.list({ page: '1', limit: '100', categoryId: matched.id, lowStock: 'true' })).total,
                    },
                });
            }
        }
    }
    if ((0, utils_1.includesCategoryNamesIntent)(ctx.text) && ctx.can('categories.read')) {
        const categories = await ctx.getCategories();
        results.push({
            tool: 'category-list',
            data: categories.map((row) => ({ name: row.name, itemsCount: row.itemsCount })),
        });
    }
    return results;
};
exports.runCategoryTools = runCategoryTools;
