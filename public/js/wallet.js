window.API = window.API || '/api'

let walletConfig = null
let connectedAccount = null

const SEPOLIA_CHAIN = {
  chainId: '0xaa36a7',
  chainName: 'Sepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://rpc.sepolia.org'],
  blockExplorerUrls: ['https://sepolia.etherscan.io']
}

function shortAddress(addr) {
  if (!addr) return ''
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function ethToWeiHex(eth) {
  const [whole, frac = ''] = String(eth).split('.')
  const fracPadded = (frac + '000000000000000000').slice(0, 18)
  const wei = BigInt(whole || '0') * 10n ** 18n + BigInt(fracPadded || '0')
  return '0x' + wei.toString(16)
}

/** Mismo cálculo que uuidToAlertId / ethers.id en el contrato */
function alertIdFromUuid(alertUuid) {
  if (!window.ethers?.id) {
    throw new Error('ethers.js no cargado — recarga la página')
  }
  return window.ethers.id(alertUuid)
}

async function loadWalletConfig() {
  if (walletConfig) return walletConfig
  const res = await fetch(`${API}/blockchain/config`)
  if (!res.ok) throw new Error('No se pudo cargar la configuración blockchain')
  walletConfig = await res.json()
  return walletConfig
}

function getEthereum() {
  // Soporta MetaMask, Coinbase Wallet, Brave Wallet, Opera, y otros proveedores EIP-1193
  return window.ethereum || window.web3?.currentProvider
}

async function getAvailableWallets() {
  const wallets = []
  
  if (window.ethereum?.isMetaMask) wallets.push({ name: 'MetaMask', provider: window.ethereum })
  if (window.ethereum?.isCoinbaseWallet) wallets.push({ name: 'Coinbase Wallet', provider: window.ethereum })
  if (window.ethereum?.isBraveWallet) wallets.push({ name: 'Brave Wallet', provider: window.ethereum })
  if (window.ethereum?.isOkxWallet) wallets.push({ name: 'OKX Wallet', provider: window.ethereum })
  if (window.ethereum && !wallets.length) wallets.push({ name: 'Wallet', provider: window.ethereum })
  
  return wallets
}

async function switchToConfiguredChain(config) {
  const provider = getEthereum()
  const chainHex = '0x' + Number(config.chain_id).toString(16)
  const currentChain = await provider.request({ method: 'eth_chainId' })

  if (currentChain?.toLowerCase() === chainHex.toLowerCase()) return

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainHex }]
    })
  } catch (switchErr) {
    if (switchErr.code === 4902 && Number(config.chain_id) === 11155111) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [SEPOLIA_CHAIN]
      })
      return
    }
    throw new Error(
      `Cambia a ${config.network_name} (chainId ${config.chain_id})`
    )
  }
}

async function connectWallet(walletName = null) {
  let provider = null
  
  // Si se especifica nombre, usa ese; si no, usa el disponible
  if (walletName === 'Coinbase' && window.ethereum?.isCoinbaseWallet) {
    provider = window.ethereum
  } else if (walletName === 'Brave' && window.ethereum?.isBraveWallet) {
    provider = window.ethereum
  } else if (walletName === 'OKX' && window.ethereum?.isOkxWallet) {
    provider = window.ethereum
  } else {
    provider = getEthereum()
  }
  
  if (!provider) {
    throw new Error('Instala MetaMask, Coinbase Wallet, Brave Wallet, o compatible con EIP-1193')
  }

  const config = await loadWalletConfig()
  const accounts = await provider.request({ method: 'eth_requestAccounts' })
  connectedAccount = accounts[0]

  await switchToConfiguredChain(config)

  provider.removeEventListener?.('accountsChanged', onAccountsChanged)
  provider.addEventListener?.('accountsChanged', onAccountsChanged)
  provider.on?.('accountsChanged', onAccountsChanged)

  return connectedAccount
}

function onAccountsChanged(accounts) {
  connectedAccount = accounts[0] || null
  if (typeof window.onWalletAccountChanged === 'function') {
    window.onWalletAccountChanged(connectedAccount)
  }
}

function getConnectedAccount() {
  return connectedAccount
}

function usesContract(config) {
  return Boolean(config?.contract_address)
}

function shouldUseRealWallet(config) {
  return config?.payments_mode === 'live' || config?.payments_mode === 'on-chain'
}

/**
 * Llama registerAlert / registerAlertWithIpfs en tu contrato desplegado en Remix.
 */
async function registerAlertOnChain({ alertUuid, ipfsHash, amountEth }) {
  const config = await loadWalletConfig()

  if (!shouldUseRealWallet(config) || !usesContract(config)) {
    return simulatePayment(amountEth || config.micro_tx_eth)
  }

  if (!connectedAccount) await connectWallet()

  const iface = new window.ethers.Interface(window.AMBER_PLUS_ABI)
  const alertIdBytes32 = alertIdFromUuid(alertUuid)
  const valueHex = ethToWeiHex(amountEth ?? config.micro_tx_eth)

  let data
  if (ipfsHash && String(ipfsHash).trim()) {
    data = iface.encodeFunctionData('registerAlertWithIpfs', [
      alertIdBytes32,
      String(ipfsHash).trim()
    ])
  } else {
    data = iface.encodeFunctionData('registerAlert', [alertIdBytes32])
  }

  const provider = getEthereum()
  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [{
      from: connectedAccount,
      to: config.contract_address,
      data,
      value: valueHex
    }]
  })

  return {
    txHash,
    simulated: false,
    from: connectedAccount,
    amountEth: Number(amountEth ?? config.micro_tx_eth),
    alertIdBytes32
  }
}

async function sendEthPayment(amountEth) {
  const config = await loadWalletConfig()

  if (!shouldUseRealWallet(config)) {
    return simulatePayment(amountEth)
  }

  if (usesContract(config)) {
    throw new Error('Usa registerAlertOnChain con el ID de la alerta ya creada en el servidor')
  }

  if (!connectedAccount) await connectWallet()

  const provider = getEthereum()
  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [{
      from: connectedAccount,
      to: config.treasury_address,
      value: ethToWeiHex(amountEth)
    }]
  })

  return {
    txHash,
    simulated: false,
    from: connectedAccount,
    amountEth: Number(amountEth)
  }
}

async function donateOnChain({ amountEth, alertUuid }) {
  const config = await loadWalletConfig()

  if (!shouldUseRealWallet(config) || !usesContract(config)) {
    return sendEthPayment(amountEth)
  }

  if (!connectedAccount) await connectWallet()

  const iface = new window.ethers.Interface(window.AMBER_PLUS_ABI)
  const valueHex = ethToWeiHex(amountEth)

  let data
  if (alertUuid) {
    data = iface.encodeFunctionData('donate', [alertIdFromUuid(alertUuid)])
  } else {
    data = iface.encodeFunctionData('donateGeneral', [])
  }

  const provider = getEthereum()
  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [{
      from: connectedAccount,
      to: config.contract_address,
      data,
      value: valueHex
    }]
  })

  return { txHash, simulated: false, from: connectedAccount, amountEth: Number(amountEth) }
}

function simulatePayment(amountEth) {
  const fakeTx = '0x' + [...Array(64)].map(() =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')

  return Promise.resolve({
    txHash: fakeTx,
    simulated: true,
    from: connectedAccount || '0x0000000000000000000000000000000000000000',
    amountEth: Number(amountEth)
  })
}

async function registerWalletOnServer() {
  const token = localStorage.getItem('amberToken')
  if (!token || !connectedAccount) return null

  try {
    const res = await fetch(`${API}/auth/wallet`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ wallet_address: connectedAccount })
    })
    if (res.ok) return res.json()
  } catch (_) {}

  return null
}

async function disconnectWallet() {
  const provider = getEthereum()
  try {
    provider?.removeEventListener?.('accountsChanged', onAccountsChanged)
    provider?.off?.('accountsChanged', onAccountsChanged)
    provider?.removeListener?.('accountsChanged', onAccountsChanged)
  } catch (_) {}

  connectedAccount = null
  if (typeof window.onWalletAccountChanged === 'function') {
    window.onWalletAccountChanged(null)
  }

  return true
}

window.AmberWallet = {
  loadWalletConfig,
  connectWallet,
  getAvailableWallets,
  registerAlertOnChain,
  sendEthPayment,
  donateOnChain,
  alertIdFromUuid,
  getConnectedAccount,
  shortAddress,
  registerWalletOnServer
  ,disconnectWallet
}
