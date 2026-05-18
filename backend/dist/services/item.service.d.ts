import { Prisma } from '@prisma/client';
interface ItemInput {
    name: string;
    sku: string;
    categoryId: string;
    quantity: number;
    price: number;
    supplier: string;
    location: string;
    description?: string;
    lowStockAt?: number;
}
export declare const itemService: {
    create: (input: ItemInput, userId?: string) => Promise<{
        category: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
        };
    } & {
        id: string;
        description: string | null;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        sku: string;
        categoryId: string;
        quantity: number;
        price: Prisma.Decimal;
        supplier: string;
        location: string;
        lowStockAt: number;
        qrValue: string;
    }>;
    list: (query: Record<string, string | undefined>) => Promise<{
        data: ({
            category: {
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
            };
        } & {
            id: string;
            description: string | null;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            sku: string;
            categoryId: string;
            quantity: number;
            price: Prisma.Decimal;
            supplier: string;
            location: string;
            lowStockAt: number;
            qrValue: string;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    getById: (id: string) => Promise<{
        category: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
        };
    } & {
        id: string;
        description: string | null;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        sku: string;
        categoryId: string;
        quantity: number;
        price: Prisma.Decimal;
        supplier: string;
        location: string;
        lowStockAt: number;
        qrValue: string;
    }>;
    getByQrCode: (code: string) => Promise<{
        category: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
        };
    } & {
        id: string;
        description: string | null;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        sku: string;
        categoryId: string;
        quantity: number;
        price: Prisma.Decimal;
        supplier: string;
        location: string;
        lowStockAt: number;
        qrValue: string;
    }>;
    update: (id: string, input: Partial<ItemInput>, userId?: string) => Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        sku: string;
        categoryId: string;
        quantity: number;
        price: Prisma.Decimal;
        supplier: string;
        location: string;
        lowStockAt: number;
        qrValue: string;
    }>;
    delete: (id: string, userId?: string) => Promise<void>;
};
export {};
//# sourceMappingURL=item.service.d.ts.map