import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import routes from './routes'
import { errorHandler, notFoundHandler } from './middleware/error.middleware'
import './architecture/bootstrap'

export const app = express()

app.use(helmet())
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/', routes)
app.use(notFoundHandler)
app.use(errorHandler)
