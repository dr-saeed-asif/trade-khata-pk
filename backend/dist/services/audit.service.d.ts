interface AuditPayload {
    entityType: string;
    entityId: string;
    oldData?: unknown;
    newData?: unknown;
    userId?: string;
    itemId?: string;
}
export declare const auditService: {
    create: (payload: AuditPayload) => Promise<{
        id: string;
        entityType: string;
        entityId: string;
        createdAt: Date;
        userId: string | null;
        itemId: string | null;
        oldData: import("@prisma/client/runtime/library").JsonValue | null;
        newData: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
};
export {};
//# sourceMappingURL=audit.service.d.ts.map