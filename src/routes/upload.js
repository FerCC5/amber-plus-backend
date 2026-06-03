import { Router } from 'express'
import multer from 'multer'
import { uploadToIPFS } from '../services/ipfsService.js'
import * as alertService from '../services/alertService.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten imágenes'))
    }
    cb(null, true)
  }
})

router.post('/photo', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo "photo" requerido' })
    }

    const filename = req.file.originalname || `alert-photo-${Date.now()}.jpg`
    const { hash, url } = await uploadToIPFS(req.file.buffer, filename)

    const { alert_id } = req.body
    if (alert_id) {
      const updated = alertService.updateAlertPhoto(alert_id, hash, url)
      if (!updated) {
        return res.status(404).json({ error: 'Alerta no encontrada' })
      }
    }

    res.status(201).json({
      ipfs_hash: hash,
      photo_url: url,
      alert_id: alert_id || null
    })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
})

export default router
