import type { UserRole } from '@prisma/client';
export interface JwtPayload {
    userId: string;
    role: UserRole;
}
export declare const signToken: (payload: JwtPayload) => never;
export declare const verifyToken: (token: string) => JwtPayload;
//# sourceMappingURL=jwt.d.ts.map