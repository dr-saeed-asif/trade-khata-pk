import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@prisma/client';
export declare const authenticate: (req: Request, _res: Response, next: NextFunction) => void;
export declare const authorize: (roles: UserRole[]) => (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map