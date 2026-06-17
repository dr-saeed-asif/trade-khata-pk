import { Router } from 'express'
import { authController } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { forgotPasswordSchema, loginSchema, registerSchema, updateProfileSchema, changePasswordSchema, deleteAccountSchema } from '../utils/validation-schemas'

const router = Router()

router.post('/register', validate(registerSchema), authController.register)
router.post('/login', validate(loginSchema), authController.login)
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword)
router.post('/refresh', authenticate, authController.refresh)
router.get('/me', authenticate, authController.profile)
router.put('/me', authenticate, validate(updateProfileSchema), authController.updateProfile)
router.put('/me/password', authenticate, validate(changePasswordSchema), authController.changePassword)
router.delete('/me', authenticate, validate(deleteAccountSchema), authController.deleteAccount)

export default router
