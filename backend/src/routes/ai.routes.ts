import { Router } from 'express'
import { aiController } from '../controllers/ai.controller'
import { authenticate, authorizePermission } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate)
router.post('/chat', authorizePermission('ai.chat'), aiController.chat)
router.get('/history', authorizePermission('ai.chat'), aiController.history)
router.get('/analytics', authorizePermission('reports.read'), aiController.analytics)
router.get('/rag/sources', authorizePermission('settings.read'), aiController.listRagSources)
router.post('/rag/documents', authorizePermission('settings.read'), aiController.ingestRagDocument)

export default router
