import type { UserRole } from '@prisma/client';
export declare const authService: {
    register: (input: {
        name: string;
        email: string;
        password: string;
        role?: UserRole;
    }) => Promise<{
        token: never;
        user: {
            id: string;
            createdAt: Date;
            name: string;
            email: string;
            passwordHash: string;
            role: import("@prisma/client").$Enums.UserRole;
            updatedAt: Date;
        };
    }>;
    login: (input: {
        email: string;
        password: string;
    }) => Promise<{
        token: never;
        user: {
            id: string;
            createdAt: Date;
            name: string;
            email: string;
            passwordHash: string;
            role: import("@prisma/client").$Enums.UserRole;
            updatedAt: Date;
        };
    }>;
};
//# sourceMappingURL=auth.service.d.ts.map