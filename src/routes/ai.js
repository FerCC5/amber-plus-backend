import { Router } from 'express'
import * as aiService from '../services/aiService.js'
import * as alertService from '../services/alertService.js'

const router = Router()

router.post('/analyze-image', async (req, res, next) => {
  try {
    const { image_base64, alert_id } = req.body
    if (!image_base64) return res.status(400).json({ error: 'Imagen requerida' })

    const analysis = await aiService.analyzeImage(image_base64)

    if (alert_id && analysis.authenticity_score != null) {
      alertService.updateAlertAiScores(alert_id, {
        ai_authenticity_score: analysis.authenticity_score
      })
    }

    res.json(analysis)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
})

router.post('/filter-report', async (req, res, next) => {
  try {
    const { child_name, age, description, location, circumstances, alert_id } = req.body
    if (!child_name || age == null || !description || !location) {
      return res.status(400).json({
        error: 'Faltan campos: child_name, age, description, location'
      })
    }

    const result = await aiService.filterReport({
      child_name,
      age,
      description,
      location,
      circumstances
    })

    if (alert_id && result.priority_score != null) {
      alertService.updateAlertAiScores(alert_id, {
        ai_priority_score: result.priority_score
      })
    }

    res.json(result)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
})

export default router
