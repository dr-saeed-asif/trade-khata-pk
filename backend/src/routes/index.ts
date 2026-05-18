import { Router } from 'express'
import authRoutes from './auth.routes'
import itemRoutes from './item.routes'
import categoryRoutes from './category.routes'
import qrRoutes from './qr.routes'
import scanRoutes from './scan.routes'
import warehouseRoutes from './warehouse.routes'
import locationRoutes from './location.routes'
import reportRoutes from './report.routes'
import alertRoutes from './alert.routes'
import stockRoutes from './stock.routes'
import adminRoutes from './admin.routes'
import graphqlRoutes from './graphql.routes'
import architectureRoutes from './architecture.routes'
import aiRoutes from './ai.routes'
import partyRoutes from './party.routes'
import saleRoutes from './sale.routes'
import purchaseRoutes from './purchase.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/items', itemRoutes)
router.use('/categories', categoryRoutes)
router.use('/qr', qrRoutes)
router.use('/scan', scanRoutes)
router.use('/warehouses', warehouseRoutes)
router.use('/locations', locationRoutes)
router.use('/reports', reportRoutes)
router.use('/alerts', alertRoutes)
router.use('/stock', stockRoutes)
router.use('/admin', adminRoutes)
router.use('/graphql', graphqlRoutes)
router.use('/architecture', architectureRoutes)
router.use('/ai', aiRoutes)
router.use('/parties', partyRoutes)
router.use('/sales', saleRoutes)
router.use('/purchases', purchaseRoutes)

export default router
