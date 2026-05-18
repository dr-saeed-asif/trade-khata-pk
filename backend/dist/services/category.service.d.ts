export declare const categoryService: {
    create: (name: string, userId?: string) => Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
    }>;
    list: () => Promise<{
        id: string;
        name: string;
        itemsCount: number;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    update: (id: string, name: string, userId?: string) => Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
    }>;
    delete: (id: string, userId?: string) => Promise<void>;
};
//# sourceMappingURL=category.service.d.ts.map