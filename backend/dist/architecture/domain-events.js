"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.domainEvents = void 0;
const node_events_1 = require("node:events");
const eventBus = new node_events_1.EventEmitter();
eventBus.setMaxListeners(50);
const recentEvents = [];
exports.domainEvents = {
    publish: (event) => {
        const payload = { ...event, occurredAt: new Date().toISOString() };
        recentEvents.unshift(payload);
        recentEvents.splice(50);
        eventBus.emit(payload.type, payload);
        eventBus.emit('*', payload);
    },
    on: (type, listener) => {
        eventBus.on(type, listener);
        return () => eventBus.off(type, listener);
    },
    recent: () => recentEvents.slice(0, 25),
};
