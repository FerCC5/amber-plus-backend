const API = '/api'

let walletConfig = null
let connectedAccount = null

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

async function loadWalletConfig() {
  if (walletConfig) return walletConfig
  const res = await fetch(`${API}/blockchain/config`)
  if (!res.ok) throw new Error('No se pudo cargar la configuración blockchain')
  walletConfig = await res.json()
  return walletConfig
}

function getEthereum() {
  return window.ethereum || window.web3?.currentProvider
}

async function connectWallet() {
  const provider = getEthereum()
  if (!provider) {
    throw new Error('Instala MetaMask u otra wallet compatible (window.ethereum)')
  }

  const config = await loadWalletConfig()
  const accounts = await provider.request({ method: 'eth_requestAccounts' })
  connectedAccount = accounts[0]

  const chainHex = '0x' + Number(config.chain_id).toString(16)
  const currentChain = await provider.request({ method: 'eth_chainId' })

  if (currentChain?.toLowerCase() !== chainHex.toLowerCase()) {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainHex }]
      })
    } catch (switchErr) {
      if (switchErr.code === 4902) {
        throw new Error(
          `Agrega la red ${config.network_name} (chainId ${config.chain_id}) en tu wallet`
        )
      }
      throw switchErr
    }
  }

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

async function sendEthPayment(amountEth) {
  const config = await loadWalletConfig()

  if (config.payments_mode === 'simulated' || !config.treasury_address) {
    return simulatePayment(amountEth)
  }

  if (!connectedAccount) {
    await connectWallet()
  }

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

window.AmberWallet = {
  loadWalletConfig,
  connectWallet,
  sendEthPayment,
  getConnectedAccount,
  shortAddress,
  registerWalletOnServer
}
