import { Router } from 'express'
import { authController } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { forgotPasswordSchema, loginSchema, registerSchema } from '../utils/validation-schemas'

const router = Router()

router.post('/register', validate(registerSchema), authController.register)
router.post('/login', validate(loginSchema), authController.login)
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword)
router.post('/refresh', authenticate, authController.refresh)

export default router
