import { Router } from 'express'
import { partyController } from '../controllers/party.controller'
import { authenticate, authorizePermission } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { partySchema } from '../utils/validation-schemas'

const router = Router()

router.use(authenticate)
router.get('/', authorizePermission('parties.read'), partyController.list)
router.get('/:id', authorizePermission('parties.read'), partyController.getById)
router.post('/', authorizePermission('parties.manage'), validate(partySchema), partyController.create)
router.put('/:id', authorizePermission('parties.manage'), validate(partySchema), partyController.update)
router.delete('/:id', authorizePermission('parties.manage'), partyController.delete)

export default router
