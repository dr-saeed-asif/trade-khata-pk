"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const alert_service_1 = require("../services/alert.service");
const domain_events_1 = require("./domain-events");
const job_queue_1 = require("./job-queue");
job_queue_1.queueSystem.register('refresh-item-alerts', async (job) => {
    const itemId = String(job.payload.itemId ?? '');
    if (!itemId)
        return;
    await alert_service_1.alertService.syncItemAlerts(itemId);
});
job_queue_1.queueSystem.register('refresh-all-alerts', async () => {
    await alert_service_1.alertService.refreshAll();
});
domain_events_1.domainEvents.on('inventory.item.created', (event) => {
    void job_queue_1.queueSystem.enqueue('refresh-item-alerts', { itemId: event.payload.itemId });
});
domain_events_1.domainEvents.on('inventory.item.updated', (event) => {
    void job_queue_1.queueSystem.enqueue('refresh-item-alerts', { itemId: event.payload.itemId });
});
domain_events_1.domainEvents.on('inventory.stock.mutated', (event) => {
    void job_queue_1.queueSystem.enqueue('refresh-item-alerts', { itemId: event.payload.itemId });
});
