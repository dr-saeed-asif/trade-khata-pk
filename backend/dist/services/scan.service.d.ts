export declare const scanService: {
    create: (qrCode: string, note?: string, userId?: string) => Promise<{
        id: string;
        createdAt: Date;
        userId: string | null;
        itemId: string;
        qrCode: string;
        note: string | null;
    }>;
};
//# sourceMappingURL=scan.service.d.ts.map