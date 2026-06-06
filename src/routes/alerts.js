import { Router } from 'express'
import { z } from 'zod'
import * as alertService from '../services/alertService.js'
import * as userService from '../services/userService.js'
import { optionalAuth } from '../middleware/optionalAuth.js'

const router = Router()
const MAX_ALERTS_PER_DAY = Number(process.env.ALERTS_PER_DAY_LIMIT || 15)

const AlertSchema = z.object({
  child_name: z.string().min(2).max(255),
  age: z.number().int().min(0).max(120),
  gender: z.enum(['masculine', 'feminine', 'unspecified']).optional(),
  physical_description: z.string().min(10),
  last_seen_location: z.string().min(5),
  last_seen_at: z.string().datetime(),
  circumstances: z.string().optional(),
  contact_name: z.string().min(2),
  contact_phone: z.string().min(10),
  photo_ipfs_hash: z.string().optional(),
  photo_url: z.string().min(1).optional()
})

router.get('/', (req, res, next) => {
  try {
    const { status = 'active', limit = 20, offset = 0 } = req.query
    res.json(alertService.listAlerts({ status, limit, offset }))
  } catch (err) { next(err) }
})

router.get('/:id', (req, res, next) => {
  try {
    const alert = alertService.getAlertDetail(req.params.id)
    if (!alert) return res.status(404).json({ error: 'Alerta no encontrada' })
    res.json(alert)
  } catch (err) { next(err) }
})

router.post('/', (req, res, next) => {
  try {
    const currentCount = alertService.countAlertsCreatedToday()
    if (currentCount >= MAX_ALERTS_PER_DAY) {
      return res.status(429).json({
        error: `Límite de ${MAX_ALERTS_PER_DAY} alertas por día alcanzado. Intenta de nuevo mañana.`
      })
    }

    const data = AlertSchema.parse(req.body)
    const alert = alertService.createAlert(data)
    res.status(201).json(alert)
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    next(err)
  }
})

router.patch('/:id/status', (req, res, next) => {
  try {
    const { status } = req.body
    const valid = ['active', 'critical', 'resolved', 'false_report']
    if (!valid.includes(status)) return res.status(400).json({ error: 'Estado inválido' })

    const alert = alertService.updateAlertStatus(req.params.id, status)
    if (!alert) return res.status(404).json({ error: 'Alerta no encontrada' })
    res.json(alert)
  } catch (err) { next(err) }
})

router.post('/:id/sightings', optionalAuth, (req, res, next) => {
  try {
    const { location, description } = req.body
    if (!location) return res.status(400).json({ error: 'location requerida' })

    const sighting = alertService.createSighting(req.params.id, { location, description })
    if (!sighting) return res.status(404).json({ error: 'Alerta no encontrada' })

    if (req.user?.id) {
      userService.addUserPoints(req.user.id, 50)
    }

    res.status(201).json(sighting)
  } catch (err) { next(err) }
})

export default router
