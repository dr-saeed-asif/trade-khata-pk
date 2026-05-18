"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchCategoryFromQuery = exports.extractCategoryNameFromQuery = exports.extractSearchTerm = exports.includesTotalStockQuantityIntent = exports.includesCategoryNamesIntent = exports.includesInventoryDetailsIntent = exports.includesNamesIntent = exports.includesUsersIntent = exports.includesExpiredIntent = exports.includesLowStockIntent = exports.asksForTop = exports.asksForCount = exports.hasAnyWord = void 0;
const hasAnyWord = (text, words) => words.some((word) => text.includes(word));
exports.hasAnyWord = hasAnyWord;
const asksForCount = (text) => (0, exports.hasAnyWord)(text, ['count', 'total', 'kitna', 'kitni', 'number of', 'how many']);
exports.asksForCount = asksForCount;
const asksForTop = (text) => (0, exports.hasAnyWord)(text, ['top', 'highest', 'most', 'max']);
exports.asksForTop = asksForTop;
const includesLowStockIntent = (text) => (0, exports.hasAnyWord)(text, ['low stock', 'low-stock', 'reorder', 'restock', 'out of stock', 'stock kam']);
exports.includesLowStockIntent = includesLowStockIntent;
const includesExpiredIntent = (text) => (0, exports.hasAnyWord)(text, ['expired', 'expiry', 'expire', 'near expiry', 'expiring']);
exports.includesExpiredIntent = includesExpiredIntent;
const includesUsersIntent = (text) => (0, exports.hasAnyWord)(text, ['user', 'users', 'team members', 'staff', 'employee', 'employees']);
exports.includesUsersIntent = includesUsersIntent;
const includesNamesIntent = (text) => (0, exports.hasAnyWord)(text, ['name', 'names', 'list', 'all', 'get']);
exports.includesNamesIntent = includesNamesIntent;
const includesInventoryDetailsIntent = (text) => (0, exports.hasAnyWord)(text, ['inventory details', 'all inventory', 'full inventory', 'get all inventory', 'all items details']);
exports.includesInventoryDetailsIntent = includesInventoryDetailsIntent;
const includesCategoryNamesIntent = (text) => (0, exports.hasAnyWord)(text, ['category names', 'categories names', 'list categories', 'all categories', 'category list']) ||
    ((0, exports.hasAnyWord)(text, ['category', 'categories']) && (0, exports.hasAnyWord)(text, ['name', 'names', 'list']));
exports.includesCategoryNamesIntent = includesCategoryNamesIntent;
const includesTotalStockQuantityIntent = (text) => {
    const normalized = text.toLowerCase();
    if (!(0, exports.hasAnyWord)(normalized, ['stock']))
        return false;
    if (!(0, exports.hasAnyWord)(normalized, ['total', 'sum']))
        return false;
    return /stock.*(qty|quantity)|(?:qty|quantity).*(stock)|sum\s+of\s+stock/i.test(normalized);
};
exports.includesTotalStockQuantityIntent = includesTotalStockQuantityIntent;
const searchNoiseWords = new Set([
    'show', 'find', 'lookup', 'search', 'items', 'item', 'inventory', 'products', 'product', 'for', 'in', 'the',
    'with', 'about', 'please', 'mujhe', 'mujhy', 'mjy', 'data', 'details', 'total', 'count', 'how', 'many',
    'kya', 'kitna', 'kitni',
]);
const extractSearchTerm = (message) => {
    const words = message
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .filter((word) => !searchNoiseWords.has(word));
    if (!words.length)
        return message;
    return words.slice(0, 6).join(' ');
};
exports.extractSearchTerm = extractSearchTerm;
const extractCategoryNameFromQuery = (text) => {
    const normalized = text.toLowerCase();
    const patterns = [
        /category\s+([a-z0-9\-\s]+)/i,
        /categories\s+([a-z0-9\-\s]+)/i,
        /in\s+([a-z0-9\-\s]+)\s+category/i,
    ];
    for (const pattern of patterns) {
        const match = normalized.match(pattern);
        const value = match?.[1]?.trim();
        if (value && value.length > 1) {
            return value.replace(/\s+/g, ' ');
        }
    }
    return null;
};
exports.extractCategoryNameFromQuery = extractCategoryNameFromQuery;
const matchCategoryFromQuery = (query, categories) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized)
        return null;
    const exact = categories.find((row) => row.name.toLowerCase() === normalized);
    if (exact)
        return exact;
    const partial = categories.find((row) => normalized.includes(row.name.toLowerCase()) || row.name.toLowerCase().includes(normalized));
    return partial ?? null;
};
exports.matchCategoryFromQuery = matchCategoryFromQuery;
