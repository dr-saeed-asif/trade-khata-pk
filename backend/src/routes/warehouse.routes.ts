import { Router } from 'express'
import { warehouseController } from '../controllers/warehouse.controller'
import { authenticate, authorizePermission } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { warehouseSchema } from '../utils/validation-schemas'

const router = Router()

router.use(authenticate)
router.get('/', authorizePermission('items.read'), warehouseController.list)
router.post('/', authorizePermission('categories.manage'), validate(warehouseSchema), warehouseController.create)

export default router
