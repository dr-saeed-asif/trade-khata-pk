import { Router } from 'express'
import { authenticate, authorizePermission } from '../middleware/auth.middleware'
import { qrController } from '../controllers/qr.controller'

const router = Router()

router.get('/:code', authenticate, authorizePermission('qr.read'), qrController.getItemByCode)

export default router
