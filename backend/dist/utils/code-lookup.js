"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLocationCodeWhere = exports.buildItemCodeWhere = exports.normalizeScannedCode = void 0;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const normalizeScannedCode = (code) => code.trim();
exports.normalizeScannedCode = normalizeScannedCode;
const buildItemCodeWhere = (code) => {
    const normalized = (0, exports.normalizeScannedCode)(code);
    if (!normalized)
        return { id: '__invalid__' };
    if (UUID_PATTERN.test(normalized)) {
        return { qrValue: normalized };
    }
    const upper = normalized.toUpperCase();
    return {
        OR: [
            { qrValue: normalized },
            { barcodeValue: normalized },
            { barcodeValue: upper },
            { sku: { equals: normalized, mode: 'insensitive' } },
        ],
    };
};
exports.buildItemCodeWhere = buildItemCodeWhere;
const buildLocationCodeWhere = (code) => {
    const normalized = (0, exports.normalizeScannedCode)(code);
    if (!normalized)
        return { id: '__invalid__' };
    if (UUID_PATTERN.test(normalized)) {
        return { qrValue: normalized };
    }
    const upper = normalized.toUpperCase();
    return {
        OR: [
            { qrValue: normalized },
            { barcodeValue: normalized },
            { barcodeValue: upper },
        ],
    };
};
exports.buildLocationCodeWhere = buildLocationCodeWhere;
