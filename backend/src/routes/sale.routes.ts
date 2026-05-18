import { Router } from 'express'
import { saleController } from '../controllers/sale.controller'
import { authenticate, authorizePermission } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { saleSchema } from '../utils/validation-schemas'

const router = Router()

router.use(authenticate)
router.get('/', authorizePermission('sales.read'), saleController.list)
router.get('/:id', authorizePermission('sales.read'), saleController.getById)
router.post('/', authorizePermission('sales.create'), validate(saleSchema), saleController.create)
router.put('/:id', authorizePermission('sales.create'), validate(saleSchema), saleController.update)
router.delete('/:id', authorizePermission('sales.delete'), saleController.delete)

export default router
