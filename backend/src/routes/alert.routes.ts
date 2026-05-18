import { Router } from 'express'
import { alertController } from '../controllers/alert.controller'
import { authenticate, authorizePermission } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate)
router.get('/summary', authorizePermission('alerts.read'), alertController.summary)
router.get('/', authorizePermission('alerts.read'), alertController.list)
router.post('/refresh', authorizePermission('alerts.manage'), alertController.refresh)
router.post('/mark-all-read', authorizePermission('alerts.manage'), alertController.markAllRead)
router.post('/:id/read', authorizePermission('alerts.manage'), alertController.markRead)

export default router