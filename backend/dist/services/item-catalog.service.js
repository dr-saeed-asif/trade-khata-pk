"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.itemCatalogService = void 0;
const node_crypto_1 = require("node:crypto");
const prisma_1 = require("../config/prisma");
const grocery_catalog_1 = require("../data/grocery-catalog");
const qr_1 = require("../utils/qr");
const CATALOG_SEED_SUPPLIER = 'Catalog Seed';
const seedSku = (name) => {
    const slug = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || 'ITEM';
    return `CAT-${(0, node_crypto_1.randomUUID)().slice(0, 8).toUpperCase()}-${slug}`;
};
const isCatalogSeededItem = (supplier, description) => supplier === CATALOG_SEED_SUPPLIER || description === 'Seeded from grocery catalog';
exports.itemCatalogService = {
    rememberDeletedCatalogItem: async (name) => {
        const normalized = name.trim();
        if (!normalized)
            return;
        const isCatalogItem = grocery_catalog_1.groceryCatalog.some((category) => category.items.some((itemName) => itemName.toLowerCase() === normalized.toLowerCase()));
        if (!isCatalogItem)
            return;
        try {
            await prisma_1.prisma.catalogSeedExclusion.upsert({
                where: { name: normalized },
                update: {},
                create: { name: normalized },
            });
        }
        catch {
            // Table may not exist until migration is applied.
        }
    },
    syncCatalogToDatabase: async () => {
        let created = 0;
        let existing = 0;
        let skipped = 0;
        let excludedNames = new Set();
        try {
            const excludedRows = await prisma_1.prisma.catalogSeedExclusion.findMany({ select: { name: true } });
            excludedNames = new Set(excludedRows.map((row) => row.name.toLowerCase()));
        }
        catch {
            // Table may not exist until migration is applied.
        }
        for (const category of grocery_catalog_1.groceryCatalog) {
            const categoryRow = await prisma_1.prisma.category.upsert({
                where: { name: category.name },
                update: {},
                create: { name: category.name },
            });
            for (const itemName of category.items) {
                if (excludedNames.has(itemName.toLowerCase())) {
                    skipped += 1;
                    continue;
                }
                const alreadyExists = await prisma_1.prisma.item.findFirst({
                    where: { name: itemName },
                    select: { id: true },
                });
                if (alreadyExists) {
                    existing += 1;
                    continue;
                }
                const sku = seedSku(itemName);
                await prisma_1.prisma.item.create({
                    data: {
                        name: itemName,
                        sku,
                        quantity: 0,
                        reservedQty: 0,
                        price: 0,
                        supplier: CATALOG_SEED_SUPPLIER,
                        location: 'General',
                        description: 'Seeded from grocery catalog',
                        categoryId: categoryRow.id,
                        qrValue: (0, qr_1.generateQrValue)(),
                        barcodeValue: (0, qr_1.generateBarcodeValue)(sku),
                        categories: {
                            create: [{ categoryId: categoryRow.id }],
                        },
                    },
                });
                created += 1;
            }
        }
        return {
            created,
            existing,
            skipped,
            totalCatalogItems: grocery_catalog_1.groceryCatalog.reduce((acc, cat) => acc + cat.items.length, 0),
        };
    },
    listCatalogItemNames: async () => {
        const names = await prisma_1.prisma.item.findMany({
            select: { name: true },
            distinct: ['name'],
            orderBy: { name: 'asc' },
        });
        return names.map((row) => row.name);
    },
    isCatalogSeededItem,
};
