const NETWORKS = {
  'base-sepolia': 'https://base-sepolia.g.alchemy.com/v2',
  'base-mainnet': 'https://base-mainnet.g.alchemy.com/v2',
  'eth-sepolia': 'https://eth-sepolia.g.alchemy.com/v2'
}

const CHAIN_IDS = {
  'base-sepolia': 84532,
  'base-mainnet': 8453,
  'eth-sepolia': 11155111
}

const NETWORK_NAMES = {
  'base-sepolia': 'Base Sepolia',
  'base-mainnet': 'Base',
  'eth-sepolia': 'Ethereum Sepolia'
}

export function getTreasuryAddress() {
  const addr = process.env.TREASURY_WALLET || process.env.CONTRACT_ADDRESS
  return addr?.trim() || null
}

export function getBlockchainConfig() {
  const network = process.env.ALCHEMY_NETWORK || 'base-sepolia'
  const treasury = getTreasuryAddress()
  const alchemy = isBlockchainConfigured()
  const livePayments = Boolean(alchemy && treasury)

  return {
    treasury_address: treasury,
    contract_address: process.env.CONTRACT_ADDRESS?.trim() || null,
    network,
    network_name: NETWORK_NAMES[network] || network,
    chain_id: CHAIN_IDS[network] || 84532,
    micro_tx_eth: process.env.MICRO_TX_ETH || '0.00015',
    micro_tx_usd: Number(process.env.MICRO_TX_USD || 0.45),
    alchemy_configured: alchemy,
    payments_mode: livePayments ? 'live' : 'simulated'
  }
}

export function ethToWei(eth) {
  const [whole, frac = ''] = String(eth).split('.')
  const fracPadded = (frac + '000000000000000000').slice(0, 18)
  return BigInt(whole || '0') * 10n ** 18n + BigInt(fracPadded || '0')
}

export function weiToEth(wei) {
  const w = BigInt(wei)
  const whole = w / 10n ** 18n
  const frac = w % 10n ** 18n
  const fracStr = frac.toString().padStart(18, '0').replace(/0+$/, '')
  return fracStr ? `${whole}.${fracStr}` : String(whole)
}

export function isBlockchainConfigured() {
  return Boolean(process.env.ALCHEMY_API_KEY)
}

async function alchemyRpc(method, params = []) {
  const apiKey = process.env.ALCHEMY_API_KEY
  if (!apiKey) {
    const err = new Error('Alchemy no configurado. Añade ALCHEMY_API_KEY en .env')
    err.status = 503
    throw err
  }

  const network = process.env.ALCHEMY_NETWORK || 'base-sepolia'
  const baseUrl = NETWORKS[network]
  if (!baseUrl) {
    const err = new Error(`Red no soportada: ${network}`)
    err.status = 400
    throw err
  }

  const response = await fetch(`${baseUrl}/${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  })

  const data = await response.json()
  if (data.error) {
    const err = new Error(data.error.message || 'Error en Alchemy RPC')
    err.status = 502
    throw err
  }
  return data.result
}

export async function verifyTransaction(txHash, options = {}) {
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    const err = new Error('tx_hash inválido')
    err.status = 400
    throw err
  }

  const [tx, receipt] = await Promise.all([
    alchemyRpc('eth_getTransactionByHash', [txHash]),
    alchemyRpc('eth_getTransactionReceipt', [txHash])
  ])

  if (!tx || !receipt) {
    const err = new Error('Transacción no encontrada en la red')
    err.status = 404
    throw err
  }

  const success = receipt.status === '0x1'
  if (!success) {
    const err = new Error('La transacción falló en blockchain')
    err.status = 400
    throw err
  }

  const expectedTo = (
    options.expectedTo ||
    (options.requireContract !== false ? process.env.CONTRACT_ADDRESS : null) ||
    getTreasuryAddress()
  )?.toLowerCase()

  if (expectedTo && tx.to?.toLowerCase() !== expectedTo) {
    const err = new Error('La transacción no fue enviada a la dirección del fondo Amber+')
    err.status = 400
    throw err
  }

  const valueWei = BigInt(tx.value || '0x0')
  if (options.minValueWei !== undefined && valueWei < BigInt(options.minValueWei)) {
    const err = new Error('El monto enviado es menor al requerido')
    err.status = 400
    throw err
  }

  const block = await alchemyRpc('eth_getBlockByNumber', [receipt.blockNumber, false])

  return {
    verified: success,
    tx_hash: txHash,
    block_number: parseInt(receipt.blockNumber, 16),
    from: tx.from,
    to: tx.to,
    value_wei: valueWei.toString(),
    value_eth: weiToEth(valueWei),
    contract_address: process.env.CONTRACT_ADDRESS || null,
    treasury_address: getTreasuryAddress(),
    network: process.env.ALCHEMY_NETWORK || 'base-sepolia',
    timestamp: block ? new Date(parseInt(block.timestamp, 16) * 1000).toISOString() : null,
    gas_used: parseInt(receipt.gasUsed, 16)
  }
}

export function generateSimulatedRegistration() {
  const fake_tx = '0x' + [...Array(64)].map(() =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
  const fake_id = 'AP-' + Date.now().toString().slice(-6)
  return { tx_hash: fake_tx, alert_id: fake_id, simulated: true }
}
