import { alertService } from '../services/alert.service'
import { domainEvents } from './domain-events'
import { queueSystem } from './job-queue'

queueSystem.register('refresh-item-alerts', async (job) => {
  const itemId = String(job.payload.itemId ?? '')
  if (!itemId) return
  await alertService.syncItemAlerts(itemId)
})

queueSystem.register('refresh-all-alerts', async () => {
  await alertService.refreshAll()
})

domainEvents.on('inventory.item.created', (event) => {
  void queueSystem.enqueue('refresh-item-alerts', { itemId: event.payload.itemId })
})

domainEvents.on('inventory.item.updated', (event) => {
  void queueSystem.enqueue('refresh-item-alerts', { itemId: event.payload.itemId })
})

domainEvents.on('inventory.stock.mutated', (event) => {
  void queueSystem.enqueue('refresh-item-alerts', { itemId: event.payload.itemId })
})
