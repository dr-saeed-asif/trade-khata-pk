import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
export declare const validate: <T>(schema: ZodType<T>) => (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=validate.middleware.d.ts.map