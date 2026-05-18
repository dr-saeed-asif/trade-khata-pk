import { EventEmitter } from 'node:events'

export type DomainEventType =
  | 'inventory.item.created'
  | 'inventory.item.updated'
  | 'inventory.stock.mutated'
  | 'inventory.location.created'

export type DomainEvent = {
  type: DomainEventType
  payload: Record<string, unknown>
  occurredAt: string
}

const eventBus = new EventEmitter()
eventBus.setMaxListeners(50)

const recentEvents: DomainEvent[] = []

export const domainEvents = {
  publish: (event: Omit<DomainEvent, 'occurredAt'>) => {
    const payload: DomainEvent = { ...event, occurredAt: new Date().toISOString() }
    recentEvents.unshift(payload)
    recentEvents.splice(50)
    eventBus.emit(payload.type, payload)
    eventBus.emit('*', payload)
  },
  on: (type: DomainEventType, listener: (event: DomainEvent) => void) => {
    eventBus.on(type, listener)
    return () => eventBus.off(type, listener)
  },
  recent: () => recentEvents.slice(0, 25),
}
