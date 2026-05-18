import { Router } from 'express'
import { stockController } from '../controllers/stock.controller'
import { authenticate, authorizePermission } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import {
  stockAdjustmentSchema,
  stockInSchema,
  stockOutSchema,
  stockTransferSchema,
} from '../utils/validation-schemas'

const router = Router()

router.use(authenticate)
router.post('/in', authorizePermission('stock.write'), validate(stockInSchema), stockController.stockIn)
router.post('/out', authorizePermission('stock.write'), validate(stockOutSchema), stockController.stockOut)
router.post('/transfer', authorizePermission('stock.write'), validate(stockTransferSchema), stockController.transfer)
router.post('/adjustment', authorizePermission('stock.write'), validate(stockAdjustmentSchema), stockController.adjust)
router.get('/history', authorizePermission('stock.read'), stockController.history)

export default router
