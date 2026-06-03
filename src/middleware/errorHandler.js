export const errorHandler = (err, req, res, next) => {
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: err.errors })
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Archivo demasiado grande (máx. 5 MB)' })
  }

  if (err.message === 'Solo se permiten imágenes') {
    return res.status(400).json({ error: err.message })
  }

  console.error(`[ERROR] ${err.message}`)
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message
  })
}
