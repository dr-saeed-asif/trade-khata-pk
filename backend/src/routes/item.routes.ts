import { Router } from 'express'
import multer from 'multer'
import { itemController } from '../controllers/item.controller'
import { authenticate, authorizePermission } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { itemSchema, itemUpdateSchema } from '../utils/validation-schemas'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.use(authenticate)
router.post('/', authorizePermission('items.create'), validate(itemSchema), itemController.create)
router.post('/import', authorizePermission('items.import'), upload.single('file'), itemController.import)
router.post('/catalog/sync', authorizePermission('items.import'), itemController.syncCatalog)
router.get('/catalog', authorizePermission('items.read'), itemController.catalog)
router.get('/', authorizePermission('items.read'), itemController.list)
router.get('/:id/timeline', authorizePermission('items.timeline.read'), itemController.timeline)
router.get('/:id', authorizePermission('items.read'), itemController.getById)
router.put('/:id', authorizePermission('items.update'), validate(itemUpdateSchema), itemController.update)
router.delete('/:id', authorizePermission('items.delete'), itemController.delete)

export default router
