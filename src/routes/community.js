import { Router } from 'express'
import * as userService from '../services/userService.js'
import {
  isBlockchainConfigured,
  verifyTransaction,
  getTreasuryAddress,
  ethToWei
} from '../services/blockchainService.js'

const router = Router()

router.get('/leaderboard', (req, res, next) => {
  try {
    res.json(userService.getLeaderboard())
  } catch (err) { next(err) }
})

router.get('/donations', (req, res, next) => {
  try {
    res.json(userService.listDonations())
  } catch (err) { next(err) }
})

router.post('/donations', async (req, res, next) => {
  try {
    const { donor_wallet, amount_eth, tx_hash, alert_id } = req.body
    if (!donor_wallet || !amount_eth || !tx_hash) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(donor_wallet)) {
      return res.status(400).json({ error: 'donor_wallet inválida' })
    }

    const treasury = getTreasuryAddress()
    if (isBlockchainConfigured() && treasury) {
      const minWei = (ethToWei(amount_eth) * 95n) / 100n
      const verification = await verifyTransaction(tx_hash, {
        expectedTo: treasury,
        minValueWei: minWei
      })
      if (verification.from?.toLowerCase() !== donor_wallet.toLowerCase()) {
        return res.status(400).json({
          error: 'La wallet del donante no coincide con la transacción'
        })
      }
    }

    const donation = userService.createDonation({
      donor_wallet,
      amount_eth,
      tx_hash,
      alert_id
    })
    res.status(201).json(donation)
  } catch (err) {
    if (err.code === 'DUPLICATE_TX') {
      return res.status(409).json({ error: err.message })
    }
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
})

export default router
