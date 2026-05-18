import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api-error';
export declare const notFoundHandler: (_req: Request, _res: Response, next: NextFunction) => void;
export declare const errorHandler: (err: Error | ApiError | {
    statusCode?: number;
    message?: string;
}, _req: Request, res: Response, _next: NextFunction) => void;
//# sourceMappingURL=error.middleware.d.ts.map