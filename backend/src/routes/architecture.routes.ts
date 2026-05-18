import { Router } from 'express'
import { authenticate, authorizePermission } from '../middleware/auth.middleware'
import { domainEvents } from '../architecture/domain-events'
import { queueSystem } from '../architecture/job-queue'

const router = Router()

router.use(authenticate)

router.get('/status', authorizePermission('dashboard.read'), (_req, res) => {
  res.json({
    eventDriven: true,
    queue: queueSystem.snapshot(),
    recentEvents: domainEvents.recent(),
  })
})

export default router
