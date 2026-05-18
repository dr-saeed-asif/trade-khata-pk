import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { executeGraphQL } from '../graphql/schema'

const router = Router()

router.post('/', authenticate, async (req, res, next) => {
  try {
    const result = await executeGraphQL(String(req.body.query ?? ''), req.body.variables ?? {}, {
      userId: req.user?.userId,
    })

    if (result.errors?.length) {
      return res.status(400).json({ errors: result.errors.map((error) => error.message), data: result.data ?? null })
    }

    res.json({ data: result.data })
  } catch (error) {
    next(error)
  }
})

export default router
