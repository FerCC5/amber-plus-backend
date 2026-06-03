import { Router } from 'express'
import * as alertService from '../services/alertService.js'
import {
  isBlockchainConfigured,
  verifyTransaction,
  generateSimulatedRegistration,
  getBlockchainConfig,
  getTreasuryAddress,
  ethToWei
} from '../services/blockchainService.js'

const router = Router()

router.get('/status', (req, res) => {
  res.json({
    ...getBlockchainConfig(),
    storage: 'json'
  })
})

router.get('/config', (req, res) => {
  res.json(getBlockchainConfig())
})

router.get('/alerts', (req, res, next) => {
  try {
    res.json(alertService.listBlockchainAlerts())
  } catch (err) { next(err) }
})

router.post('/register', async (req, res, next) => {
  try {
    const { alert_id, tx_hash } = req.body
    if (!alert_id) return res.status(400).json({ error: 'alert_id requerido' })

    const alert = alertService.getAlert(alert_id)
    if (!alert) return res.status(404).json({ error: 'Alerta no encontrada' })

    if (alert.blockchain_tx_hash) {
      return res.status(409).json({
        error: 'La alerta ya está registrada en blockchain',
        tx_hash: alert.blockchain_tx_hash
      })
    }

    let registration

    if (isBlockchainConfigured() && getTreasuryAddress()) {
      if (!tx_hash) {
        return res.status(400).json({
          error: 'tx_hash requerido. Paga la microtransacción desde tu wallet y envía el hash.'
        })
      }
      const microEth = process.env.MICRO_TX_ETH || '0.00015'
      const minWei = (ethToWei(microEth) * 95n) / 100n
      const verification = await verifyTransaction(tx_hash, {
        expectedTo: getTreasuryAddress(),
        minValueWei: minWei
      })
      if (!verification.verified) {
        return res.status(400).json({ error: 'La transacción falló en blockchain' })
      }
      registration = {
        tx_hash,
        alert_id: `AP-${alert_id.slice(0, 8).toUpperCase()}`,
        simulated: false,
        verification
      }
    } else {
      registration = generateSimulatedRegistration()
    }

    alertService.updateAlertBlockchain(
      alert_id,
      registration.tx_hash,
      registration.alert_id
    )

    res.json({
      success: true,
      tx_hash: registration.tx_hash,
      alert_id: registration.alert_id,
      network: process.env.ALCHEMY_NETWORK || 'base-sepolia',
      simulated: registration.simulated,
      verification: registration.verification || null,
      message: registration.simulated
        ? 'Alerta registrada (modo simulación — configura ALCHEMY_API_KEY para verificación real)'
        : 'Alerta verificada y registrada en blockchain'
    })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
})

router.get('/verify/:tx_hash', async (req, res, next) => {
  try {
    const txHash = req.params.tx_hash
    const alert = alertService.findAlertByTxHash(txHash)

    let onChain = null
    if (isBlockchainConfigured()) {
      try {
        onChain = await verifyTransaction(txHash)
      } catch (err) {
        if (err.status !== 404) throw err
      }
    }

    if (!alert && !onChain?.verified) {
      return res.status(404).json({ error: 'Transacción no encontrada' })
    }

    res.json({
      verified: Boolean(onChain?.verified || alert),
      on_chain: onChain,
      alert: alert || null
    })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
})

export default router
