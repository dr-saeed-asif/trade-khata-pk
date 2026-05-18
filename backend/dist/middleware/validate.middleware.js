"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const validate = (schema) => (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return next({
            statusCode: 400,
            message: parsed.error.issues.map((issue) => issue.message).join(', '),
        });
    }
    req.body = parsed.data;
    next();
};
exports.validate = validate;
