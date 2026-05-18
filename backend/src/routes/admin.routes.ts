import { Router } from 'express'
import { adminController } from '../controllers/admin.controller'
import { authenticate, authorizePermission } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import {
	adminRoleCreateSchema,
	adminRoleUpdateSchema,
	adminUserCreateSchema,
	adminUserUpdateSchema,
} from '../utils/validation-schemas'

const router = Router()

router.use(authenticate)
router.get('/users', authorizePermission('users.read'), adminController.users)
router.post('/users', authorizePermission('users.create'), validate(adminUserCreateSchema), adminController.createUser)
router.put('/users/:id', authorizePermission('users.update'), validate(adminUserUpdateSchema), adminController.updateUser)
router.delete('/users/:id', authorizePermission('users.delete'), adminController.deleteUser)
router.get('/roles', authorizePermission('roles.read'), adminController.roles)
router.post('/roles', authorizePermission('roles.create'), validate(adminRoleCreateSchema), adminController.createRole)
router.put('/roles/:id', authorizePermission('roles.update'), validate(adminRoleUpdateSchema), adminController.updateRole)
router.delete('/roles/:id', authorizePermission('roles.delete'), adminController.deleteRole)

export default router