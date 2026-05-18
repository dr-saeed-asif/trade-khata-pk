"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const node_path_1 = require("node:path");
const client_1 = require("@prisma/client");
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)(__dirname, '../../.env') });
const maskUrl = (url) => url.replace(/:([^:@/]+)@/, ':***@');
const run = async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('DATABASE_URL is not set in backend/.env');
        process.exit(1);
    }
    if (databaseUrl.includes('YOUR_PASSWORD')) {
        console.error('Replace YOUR_PASSWORD in backend/.env with your real PostgreSQL password.');
        process.exit(1);
    }
    console.log('Connecting to:', maskUrl(databaseUrl));
    const prisma = new client_1.PrismaClient();
    try {
        await prisma.$queryRaw `SELECT 1 as ok`;
        console.log('OK — PostgreSQL connection works.');
    }
    catch (error) {
        console.error('Connection failed.');
        if (error instanceof Error)
            console.error(error.message);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
};
void run();
