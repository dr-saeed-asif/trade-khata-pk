import type { NextFunction, Request, Response } from 'express';
export declare const reportController: {
    exportCsv: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
    lowStock: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
    recent: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
};
//# sourceMappingURL=report.controller.d.ts.map