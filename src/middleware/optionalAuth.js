import jwt from 'jsonwebtoken'

export const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return next()

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    // Token inválido: continuar como anónimo
  }
  next()
}
