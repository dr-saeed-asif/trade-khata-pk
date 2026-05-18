"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const schema_1 = require("../graphql/schema");
const router = (0, express_1.Router)();
router.post('/', auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const result = await (0, schema_1.executeGraphQL)(String(req.body.query ?? ''), req.body.variables ?? {}, {
            userId: req.user?.userId,
        });
        if (result.errors?.length) {
            return res.status(400).json({ errors: result.errors.map((error) => error.message), data: result.data ?? null });
        }
        res.json({ data: result.data });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
