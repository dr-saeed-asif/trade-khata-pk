import type { NextFunction, Request, Response } from 'express';
export declare const itemController: {
    create: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    list: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    update: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    delete: (req: Request, res: Response, next: NextFunction) => Promise<void>;
};
//# sourceMappingURL=item.controller.d.ts.map