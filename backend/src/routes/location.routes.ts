import { Router } from 'express'
import { locationController } from '../controllers/location.controller'
import { authenticate, authorizePermission } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { locationSchema } from '../utils/validation-schemas'

const router = Router()

router.use(authenticate)
router.get('/scan/:code', authorizePermission('items.read'), locationController.scan)
router.get('/:id/items', authorizePermission('items.read'), locationController.items)
router.get('/', authorizePermission('items.read'), locationController.list)
router.post('/', authorizePermission('categories.manage'), validate(locationSchema), locationController.create)

export default router
