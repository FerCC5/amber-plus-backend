import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import * as userService from '../services/userService.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

const RegisterSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional()
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    wallet_address: user.wallet_address,
    points: user.points,
    created_at: user.created_at
  }
}

router.post('/register', async (req, res, next) => {
  try {
    const data = RegisterSchema.parse(req.body)
    const password_hash = await bcrypt.hash(data.password, 10)

    const user = userService.createUser({
      name: data.name,
      email: data.email,
      password_hash,
      wallet_address: data.wallet_address
    })

    const token = signToken(user)
    res.status(201).json({ user: publicUser(user), token })
  } catch (err) {
    if (err.code === 'DUPLICATE_EMAIL') {
      return res.status(409).json({ error: err.message })
    }
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    next(err)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const data = LoginSchema.parse(req.body)
    const user = userService.findUserByEmail(data.email)

    if (!user?.password_hash) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const valid = await bcrypt.compare(data.password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' })

    res.json({ user: publicUser(user), token: signToken(user) })
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    next(err)
  }
})

router.get('/me', authMiddleware, (req, res, next) => {
  try {
    const user = userService.findUserById(req.user.id)
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json(publicUser(user))
  } catch (err) { next(err) }
})

router.patch('/wallet', authMiddleware, (req, res, next) => {
  try {
    const { wallet_address } = req.body
    if (!wallet_address?.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: 'wallet_address inválida' })
    }

    const user = userService.updateUserWallet(req.user.id, wallet_address)
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json(publicUser(user))
  } catch (err) { next(err) }
})

export default router
