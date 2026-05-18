"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const domain_events_1 = require("../architecture/domain-events");
const job_queue_1 = require("../architecture/job-queue");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/status', (0, auth_middleware_1.authorizePermission)('dashboard.read'), (_req, res) => {
    res.json({
        eventDriven: true,
        queue: job_queue_1.queueSystem.snapshot(),
        recentEvents: domain_events_1.domainEvents.recent(),
    });
});
exports.default = router;
