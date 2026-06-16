"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const prisma_1 = require("../config/prisma");
const seed_admin_1 = require("./seed-admin");
const seed_stock_1 = require("./seed-stock");
const seed_commerce_1 = require("./seed-commerce");
const seed_inventory_demo_1 = require("./seed-inventory-demo");
const seed_ai_1 = require("./seed-ai");
const run = async () => {
    console.log('=== Database seed started ===\n');
    console.log('1/6 Admin user');
    await (0, seed_admin_1.seedAdmin)();
    console.log('\n2/6 Grocery catalog + inventory demo data');
    await (0, seed_inventory_demo_1.seedInventoryDemo)();
    console.log('\n3/6 Manager user');
    await (0, seed_inventory_demo_1.seedManagerUser)();
    console.log('\n4/6 Stock movements demo');
    await (0, seed_stock_1.seedStock)();
    console.log('\n5/6 Commerce (parties, purchases, sales)');
    await (0, seed_commerce_1.seedCommerce)();
    console.log('\n6/6 AI copilot demo conversation');
    await (0, seed_ai_1.seedAiDemo)();
    const [users, items, parties, purchases, sales, conversations] = await Promise.all([
        prisma_1.prisma.user.count(),
        prisma_1.prisma.item.count(),
        prisma_1.prisma.party.count(),
        prisma_1.prisma.purchase.count(),
        prisma_1.prisma.sale.count(),
        prisma_1.prisma.aiConversation.count(),
    ]);
    console.log('\n=== Seed complete ===');
    console.log(`  Users:         ${users}`);
    console.log(`  Items:         ${items}`);
    console.log(`  Parties:       ${parties}`);
    console.log(`  Purchases:     ${purchases}`);
    console.log(`  Sales:         ${sales}`);
    console.log(`  Conversations: ${conversations}`);
    console.log('\nLogin credentials (from .env):');
    console.log(`  Admin:   ${process.env.ADMIN_EMAIL ?? 'admin@inventory.local'}`);
    console.log(`  Manager: ${process.env.MANAGER_EMAIL ?? 'manager@inventory.local'}`);
};
run()
    .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('P1000') || message.includes('Authentication failed')) {
        console.error('\nPostgreSQL login failed. Check DATABASE_URL in backend/.env\n');
    }
    console.error(error);
    process.exit(1);
})
    .finally(() => prisma_1.prisma.$disconnect());
