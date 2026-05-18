"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapImportRecord = exports.skuFromImport = exports.defaultImportLocation = exports.defaultImportSupplier = exports.defaultImportCategory = void 0;
const node_crypto_1 = require("node:crypto");
exports.defaultImportCategory = 'Spices and Dry Fruits';
exports.defaultImportSupplier = 'Banu Adam Spices and Dry Fruits';
exports.defaultImportLocation = 'General';
const skuFromImport = (name, itemCode) => {
    const code = itemCode?.trim();
    if (code)
        return code.slice(0, 64);
    const hash = (0, node_crypto_1.createHash)('sha256').update(name.trim()).digest('hex').slice(0, 12).toUpperCase();
    return `ITM-${hash}`;
};
exports.skuFromImport = skuFromImport;
const pick = (record, keys) => {
    for (const key of keys) {
        const value = record[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return String(value).trim();
        }
    }
    return '';
};
const pickNumber = (record, keys) => {
    const raw = pick(record, keys);
    if (!raw)
        return 0;
    const parsed = Number(raw.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
};
const mapImportRecord = (record) => {
    const name = pick(record, ['Item Name', 'item name', 'name', 'Name']);
    const itemCode = pick(record, ['Item Code', 'item code', 'itemCode', 'ItemCode', 'code', 'Code', 'SKU', 'sku']);
    const salePrice = pickNumber(record, ['Sale Price', 'sale price', 'salePrice', 'price', 'Price']);
    const purchasePrice = pickNumber(record, ['Purchase Price', 'purchase price', 'purchasePrice']);
    const onlineStorePrice = pickNumber(record, ['Online Store Price', 'online store price', 'onlineStorePrice']);
    const discountType = pick(record, ['Discount Type', 'discount type', 'discountType']);
    const saleDiscount = pickNumber(record, ['Sale Discount', 'sale discount', 'saleDiscount']);
    const quantity = pickNumber(record, ['quantity', 'Quantity', 'qty', 'Qty', 'On Hand', 'on hand']);
    const descriptionParts = [];
    if (purchasePrice > 0)
        descriptionParts.push(`Purchase: Rs ${purchasePrice}`);
    if (onlineStorePrice > 0 && onlineStorePrice !== salePrice) {
        descriptionParts.push(`Online: Rs ${onlineStorePrice}`);
    }
    if (saleDiscount > 0) {
        descriptionParts.push(`Discount: ${saleDiscount}${discountType.includes('%') ? '%' : ''}`);
    }
    return {
        name,
        sku: (0, exports.skuFromImport)(name, itemCode),
        category: pick(record, ['category', 'Category']) || exports.defaultImportCategory,
        quantity,
        reservedQty: pickNumber(record, ['reservedQty', 'ReservedQty', 'Reserved', 'reserved']),
        price: salePrice,
        supplier: pick(record, ['supplier', 'Supplier']) || exports.defaultImportSupplier,
        location: pick(record, ['location', 'Location']) || exports.defaultImportLocation,
        description: pick(record, ['description', 'Description']) || descriptionParts.join(' · ') || undefined,
        expiryDate: pick(record, ['expiryDate', 'ExpiryDate', 'Expiry', 'expiry']) || undefined,
        batchNumber: pick(record, ['batchNumber', 'BatchNumber']) || undefined,
        lotNumber: pick(record, ['lotNumber', 'LotNumber']) || undefined,
    };
};
exports.mapImportRecord = mapImportRecord;
