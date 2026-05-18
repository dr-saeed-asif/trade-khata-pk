export declare const reportService: {
    exportCsv: () => Promise<string>;
    lowStock: () => Promise<unknown>;
    recent: () => Promise<({
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
        price: import("@prisma/client/runtime/library").Decimal;
        supplier: string;
        location: string;
        lowStockAt: number;
        qrValue: string;
    })[]>;
};
//# sourceMappingURL=report.service.d.ts.map