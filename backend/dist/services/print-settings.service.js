"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printSettingsService = void 0;
const prisma_1 = require("../config/prisma");
const defaults = {
    id: 'default',
    companyName: 'Banu Adam Spices and Dry Fruits',
    companyNameUr: 'بانو آدم مصالحہ اور خشک میوہ',
    phone: '03005590770',
    address: '',
    logoUrl: null,
    termsAndConditions: 'سامان کی کوالٹی چیک کر کے لیں۔ بعد میں کوئی دعویٰ قبول نہیں ہوگا۔',
};
exports.printSettingsService = {
    get: async () => {
        const row = await prisma_1.prisma.printSettings.findUnique({ where: { id: 'default' } });
        if (!row) {
            return prisma_1.prisma.printSettings.create({ data: defaults });
        }
        return row;
    },
    update: async (payload) => {
        return prisma_1.prisma.printSettings.upsert({
            where: { id: 'default' },
            create: { ...defaults, ...payload, id: 'default' },
            update: {
                companyName: payload.companyName,
                companyNameUr: payload.companyNameUr,
                phone: payload.phone,
                address: payload.address,
                logoUrl: payload.logoUrl,
                termsAndConditions: payload.termsAndConditions,
            },
        });
    },
};
