import { Router } from 'express'
import { reportController } from '../controllers/report.controller'
import { authenticate, authorizePermission } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate)
router.get('/export-csv', authorizePermission('reports.export'), reportController.exportCsv)
router.get('/export-excel', authorizePermission('reports.export'), reportController.exportExcel)
router.get('/low-stock', authorizePermission('reports.read'), reportController.lowStock)
router.get('/recent', authorizePermission('reports.read'), reportController.recent)
router.get('/movement-trend', authorizePermission('reports.read'), reportController.movementTrend)
router.get('/movers', authorizePermission('reports.read'), reportController.movers)
router.get('/profit-loss', authorizePermission('reports.read'), reportController.profitLoss)

export default router
