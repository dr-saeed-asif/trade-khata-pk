interface ActivityPayload {
    action: string;
    entityType: string;
    entityId: string;
    description?: string;
    userId?: string;
    itemId?: string;
}
export declare const activityService: {
    create: (payload: ActivityPayload) => Promise<{
        id: string;
        action: string;
        entityType: string;
        entityId: string;
        description: string | null;
        createdAt: Date;
        userId: string | null;
        itemId: string | null;
    }>;
};
export {};
//# sourceMappingURL=activity.service.d.ts.map