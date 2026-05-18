import { Router } from 'express'
import { purchaseController } from '../controllers/purchase.controller'
import { authenticate, authorizePermission } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { purchaseSchema } from '../utils/validation-schemas'

const router = Router()

router.use(authenticate)
router.get('/', authorizePermission('purchases.read'), purchaseController.list)
router.get('/:id', authorizePermission('purchases.read'), purchaseController.getById)
router.post('/', authorizePermission('purchases.create'), validate(purchaseSchema), purchaseController.create)
router.put('/:id', authorizePermission('purchases.create'), validate(purchaseSchema), purchaseController.update)
router.delete('/:id', authorizePermission('purchases.delete'), purchaseController.delete)

export default router
