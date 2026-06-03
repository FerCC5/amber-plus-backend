import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import { fileURLToPath } from 'url'
import { rateLimit } from 'express-rate-limit'
import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '../public')

import authRouter from './routes/auth.js'
import alertsRouter from './routes/alerts.js'
import aiRouter from './routes/ai.js'
import blockchainRouter from './routes/blockchain.js'
import communityRouter from './routes/community.js'
import uploadRouter from './routes/upload.js'
import { errorHandler } from './middleware/errorHandler.js'
import { initStore } from './store/index.js'
import { getDataFilePath } from './store/persistence.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:', 'wss:']
    }
  }
}))
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' }
})
app.use('/api/', limiter)

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    project: 'Amber+',
    version: '1.0.0',
    storage: 'json',
    data_file: getDataFilePath(),
    timestamp: new Date().toISOString()
  })
})

app.use('/api/auth', authRouter)
app.use('/api/alerts', alertsRouter)
app.use('/api/ai', aiRouter)
app.use('/api/blockchain', blockchainRouter)
app.use('/api/community', communityRouter)
app.use('/api/upload', uploadRouter)

app.use(express.static(publicDir))

app.use(errorHandler)

await initStore()

app.listen(PORT, () => {
  console.log(`🚨 Amber+ corriendo en http://localhost:${PORT}`)
  console.log(`   Frontend: http://localhost:${PORT}/`)
})
