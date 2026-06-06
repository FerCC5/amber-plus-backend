const API = window.API || '/api'

let alertsDB = []
let communityUSD = 0
let totalTokensEmitidos = 0
let weeklyResolvedFast = 0
let authoritiesLog = []
let notifiedForTwoHour = new Set()
let loading = false
let blockchainConfig = null

function saveGamificationLocal() {
  localStorage.setItem('fenixAmberData', JSON.stringify({
    communityUSD,
    totalTokensEmitidos,
    weeklyResolvedFast,
    authoritiesLog
  }))
}

function loadGamificationLocal() {
  const stored = localStorage.getItem('fenixAmberData')
  if (!stored) return
  try {
    const data = JSON.parse(stored)
    communityUSD = data.communityUSD || 0
    totalTokensEmitidos = data.totalTokensEmitidos || 0
    weeklyResolvedFast = data.weeklyResolvedFast || 0
    authoritiesLog = data.authoritiesLog || []
  } catch (_) {}
}

function fromApiAlert(a) {
  const ts = new Date(a.created_at || a.last_seen_at).getTime()
  const resolved = a.status === 'resolved'
  return {
    id: a.id,
    nombre: a.child_name,
    edad: a.age,
    descripcion: a.physical_description || '',
    ubicacion: a.last_seen_location,
    contacto: `${a.contact_name} · ${a.contact_phone}`,
    foto: a.photo_url || '',
    timestamp: ts,
    lastSeenAt: a.last_seen_at || a.created_at || '',
    status: resolved ? 'resolved' : 'active',
    resolvedAt: a.resolved_at ? new Date(a.resolved_at).getTime() : null,
    microAmount: blockchainConfig?.micro_tx_usd || 0.45,
    tokenRewardGiven: false,
    apiStatus: a.status,
    blockchainTx: a.blockchain_tx_hash || null
  }
}

function parseContact(contacto) {
  const digits = contacto.replace(/\D/g, '')
  if (digits.length >= 10) {
    return { name: 'Responsable', phone: digits.slice(0, 20) }
  }
  return { name: contacto.slice(0, 255) || 'Responsable', phone: '0000000000' }
}

function ensureDescription(text) {
  const base = text?.trim() || 'Sin detalles adicionales'
  return base.length >= 10 ? base : `${base} — reporte Fénix`
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error?.message || data.error || data.message || `Error ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return data
}

async function uploadAlertPhoto(file, alertId) {
  const form = new FormData()
  form.append('photo', file)
  if (alertId) form.append('alert_id', alertId)

  const res = await fetch(`${API}/upload/photo`, {
    method: 'POST',
    body: form
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Error al subir la foto')
  }
  return data
}

async function loadAlertsFromApi() {
  const { alerts } = await apiFetch('/alerts?status=all&limit=200')
  alertsDB = (alerts || []).map(fromApiAlert)
  computeWeeklyResolved()
}

async function loadCommunityStats() {
  try {
    const { total_eth } = await apiFetch('/community/donations')
    if (total_eth > 0) {
      communityUSD = Math.max(communityUSD, total_eth * 3500)
    }
  } catch (_) {}
}

async function loadBlockchainConfig() {
  try {
    blockchainConfig = await AmberWallet.loadWalletConfig()
    updateWalletUI()
  } catch (err) {
    console.warn('Blockchain config:', err.message)
  }
}

function computeWeeklyResolved() {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  weeklyResolvedFast = alertsDB.filter((a) => {
    if (a.status !== 'resolved' || !a.resolvedAt) return false
    if (a.resolvedAt < weekAgo) return false
    const hours = (a.resolvedAt - a.timestamp) / (1000 * 60 * 60)
    return hours < 72
  }).length
}

function updateWalletUI() {
  const statusEl = document.getElementById('walletStatus')
  const btn = document.getElementById('btnConnectWallet')
  if (!statusEl || !btn) return

  const account = AmberWallet.getConnectedAccount()
  const mode = blockchainConfig?.payments_mode || 'simulated'
  const network = blockchainConfig?.network_name || '—'
  const modeLabel =
    mode === 'live' ? 'contrato + Alchemy' : mode === 'on-chain' ? 'contrato (MetaMask)' : 'simulación'

  if (account) {
    statusEl.textContent = `${AmberWallet.shortAddress(account)} · ${network} · ${modeLabel}`
    btn.textContent = 'Desconectar wallet'
    btn.classList.remove('btn-secundary')
  } else {
    statusEl.textContent = `${network} · ${modeLabel}`
    btn.textContent = 'Conectar wallet'
    btn.classList.add('btn-secundary')
  }
}

async function handleConnectWallet() {
  try {
    await AmberWallet.connectWallet()
    await AmberWallet.registerWalletOnServer()
    updateWalletUI()
    showToastFenix('✅ Wallet conectada', '#2ECC71')
  } catch (err) {
    showToastFenix(`❌ ${err.message}`, '#d9534f')
  }
}

async function handleToggleWallet() {
  const acct = AmberWallet.getConnectedAccount()
  if (acct) {
    // disconnect
    await AmberWallet.disconnectWallet()
    // optional: remove server wallet binding token if present
    // localStorage.removeItem('amberToken')
    updateWalletUI()
    showToastFenix('🔌 Wallet desconectada', '#f39c12')
    return
  }

  await handleConnectWallet()
}

async function loadInitialData() {
  loading = true
  renderFullUI()
  loadGamificationLocal()
  try {
    await loadBlockchainConfig()
    await Promise.all([loadAlertsFromApi(), loadCommunityStats()])
    if (authoritiesLog.length === 0) {
      authoritiesLog.push('🚨 Sistema conectado al backend Amber+. Alertas sincronizadas.')
    }
  } catch (err) {
    showToastFenix(`❌ No se pudo conectar al servidor: ${err.message}`, '#d9534f')
    document.getElementById('alertsContainerFenix').innerHTML =
      '<div style="text-align:center;padding:2rem;">Error al cargar. ¿Está corriendo <code>npm run dev</code>?</div>'
  } finally {
    loading = false
    renderFullUI()
    saveGamificationLocal()
  }
}

function notifyAuthoritiesMultiLevel(alertData, isUrgent = false) {
  const urgencyTag = isUrgent
    ? '⚠️⚠️⚠️ [URGENTE - PRIMERAS 2 HORAS] ⚠️⚠️⚠️'
    : '[NOTIFICACIÓN ESTÁNDAR]'
  const dateStr = new Date().toLocaleString()
  const messages = [
    `🏛️ AUTORIDAD ESTATAL ${urgencyTag}: Alerta ${alertData.id} - ${alertData.nombre}, ${alertData.edad} años. ${alertData.ubicacion}.`,
    `🚓 AUTORIDAD MUNICIPAL ${urgencyTag}: ${alertData.nombre} - ${alertData.descripcion}.`,
    `🇲🇽 FISCALÍA FEDERAL ${urgencyTag}: Última ubicación: ${alertData.ubicacion}.`
  ]
  messages.forEach((msg) => authoritiesLog.unshift(`[${dateStr}] ${msg}`))
  if (authoritiesLog.length > 25) authoritiesLog.pop()
  saveGamificationLocal()
  showToastFenix(
    `📢 AUTORIDADES NOTIFICADAS. ${isUrgent ? 'Prioridad máxima primeras 2h.' : ''}`,
    '#FF8C42'
  )
}

function needsWalletForChain() {
  const mode = blockchainConfig?.payments_mode
  return mode === 'live' || mode === 'on-chain'
}

async function ensureWalletConnected() {
  if (needsWalletForChain() && !AmberWallet.getConnectedAccount()) {
    await AmberWallet.connectWallet()
    updateWalletUI()
  }
}

function applyMicroTxGamification(amountUsd) {
  const communityShare = amountUsd * 0.5
  communityUSD += communityShare
  const tokensGenerated = Math.floor(amountUsd * 10)
  totalTokensEmitidos += tokensGenerated
  saveGamificationLocal()
  return { communityShare, tokensGenerated }
}

async function createFenixAlert(event) {
  event.preventDefault()
  const nombre = document.getElementById('nombreDes').value.trim()
  const edadRaw = document.getElementById('edadDes').value
  const edad = parseInt(edadRaw, 10)
  const descripcion = document.getElementById('descripDes').value.trim()
  const ubicacion = document.getElementById('ubicacionDes').value.trim()
  const contacto = document.getElementById('contactoDes').value.trim()
  const fotoInput = document.getElementById('fotoDes')
  const fotoFile = fotoInput?.files?.[0]
  const btn = document.getElementById('btnCreate')

  if (!nombre || edadRaw === '' || Number.isNaN(edad) || edad < 0 || !ubicacion || !contacto) {
    showToastFenix('❌ Campos obligatorios incompletos.', '#d9534f')
    return
  }

  const amountUsd = blockchainConfig?.micro_tx_usd || 0.45
  const amountEth = blockchainConfig?.micro_tx_eth || '0.0015'
  btn.disabled = true
  showToastFenix('📡 Guardando alerta en el servidor...', '#5bc0de')

  try {
    const { name, phone } = parseContact(contacto)
    const body = {
      child_name: nombre,
      age: edad,
      physical_description: ensureDescription(descripcion),
      last_seen_location: ubicacion,
      last_seen_at: new Date().toISOString(),
      contact_name: name,
      contact_phone: phone
    }

    const created = await apiFetch('/alerts', {
      method: 'POST',
      body: JSON.stringify(body)
    })

    let ipfsHash = created.photo_ipfs_hash || ''
    if (fotoFile) {
      try {
        const uploaded = await uploadAlertPhoto(fotoFile, created.id)
        created.photo_url = uploaded.photo_url
        ipfsHash = uploaded.ipfs_hash || ipfsHash
      } catch (uploadErr) {
        showToastFenix(`⚠️ Alerta creada pero la foto falló: ${uploadErr.message}`, '#f0ad4e')
      }
    }

    await ensureWalletConnected()
    showToastFenix(
      `💸 Alerta creada como pendiente. Confirma en MetaMask ~${amountEth} ETH para activarla.`,
      '#5bc0de'
    )

    const payment = await AmberWallet.registerAlertOnChain({
      alertUuid: created.id,
      ipfsHash: ipfsHash || undefined,
      amountEth
    })

    const { communityShare, tokensGenerated } = applyMicroTxGamification(amountUsd)

    let registrationSuccess = false
    try {
      await apiFetch('/blockchain/register', {
        method: 'POST',
        body: JSON.stringify({
          alert_id: created.id,
          tx_hash: payment.txHash
        })
      })
      registrationSuccess = true
      created.status = 'active'
      created.blockchain_tx_hash = payment.txHash
    } catch (chainErr) {
      showToastFenix(`⚠️ Alerta guardada, pero la confirmación en blockchain falló: ${chainErr.message}`, '#f0ad4e')
    }

    if (registrationSuccess) {
      const newAlert = fromApiAlert(created)
      newAlert.microAmount = amountUsd
      newAlert.blockchainTx = payment.txHash
      alertsDB.unshift(newAlert)
      notifyAuthoritiesMultiLevel(newAlert, true)
    }

    const modeNote = payment.simulated ? ' (tx simulada)' : ` · tx ${payment.txHash.slice(0, 10)}…`
    showToastFenix(
      `✅ Alerta para ${nombre} guardada${modeNote}. Fondo +$${communityShare.toFixed(2)} USD, +${tokensGenerated} Tokens.`,
      '#2ECC71'
    )
    document.getElementById('fenixForm').reset()
    if (fotoInput) fotoInput.value = ''
    const preview = document.getElementById('fotoPreview')
    if (preview) preview.innerHTML = ''
    computeWeeklyResolved()
    renderFullUI()
    saveGamificationLocal()
    await loadCommunityStats()
    renderDonationsList()
  } catch (err) {
    showToastFenix(`❌ Error al crear alerta: ${err.message}`, '#d9534f')
  } finally {
    btn.disabled = false
  }
}

async function submitDonation(event) {
  event.preventDefault()
  const amountInput = document.getElementById('donationAmount')
  const alertSelect = document.getElementById('donationAlertId')
  const btn = document.getElementById('btnDonate')
  const amountEth = parseFloat(amountInput.value)

  if (!amountEth || amountEth <= 0) {
    showToastFenix('❌ Indica un monto válido en ETH', '#d9534f')
    return
  }

  btn.disabled = true
  showToastFenix('💸 Enviando donación desde tu wallet...', '#5bc0de')

  try {
    await ensureWalletConnected()

    const payment = await AmberWallet.donateOnChain({
      amountEth: String(amountEth),
      alertUuid: alertSelect?.value || undefined
    })
    const donor = AmberWallet.getConnectedAccount() || payment.from

    await apiFetch('/community/donations', {
      method: 'POST',
      body: JSON.stringify({
        donor_wallet: donor,
        amount_eth: amountEth,
        tx_hash: payment.txHash,
        alert_id: alertSelect?.value || undefined
      })
    })

    communityUSD += amountEth * 3500
    saveGamificationLocal()
    showToastFenix(
      `✅ Donación de ${amountEth} ETH registrada${payment.simulated ? ' (simulada)' : ''}`,
      '#2ECC71'
    )
    amountInput.value = ''
    await loadCommunityStats()
    renderFullUI()
    renderDonationsList()
  } catch (err) {
    showToastFenix(`❌ Donación: ${err.message}`, '#d9534f')
  } finally {
    btn.disabled = false
  }
}

async function renderDonationsList() {
  const listEl = document.getElementById('donationsList')
  if (!listEl) return

  try {
    const { donations, total_eth } = await apiFetch('/community/donations?limit=8')
    if (!donations?.length) {
      listEl.innerHTML = '<div style="font-size:0.75rem;color:#9aabcc;">Aún no hay donaciones.</div>'
      return
    }
    listEl.innerHTML = donations
      .map(
        (d) =>
          `<div style="font-size:0.7rem;margin-bottom:6px;">` +
          `💎 ${AmberWallet.shortAddress(d.donor_wallet)} · ${d.amount_eth} ETH` +
          `</div>`
      )
      .join('')
    const totalEl = document.getElementById('donationsTotal')
    if (totalEl) totalEl.textContent = `${total_eth.toFixed(4)} ETH`
  } catch (_) {
    listEl.innerHTML = '<div style="font-size:0.75rem;color:#9aabcc;">No se pudo cargar donaciones.</div>'
  }
}

function populateDonationAlerts() {
  const select = document.getElementById('donationAlertId')
  if (!select) return
  const active = alertsDB.filter((a) => a.status === 'active')
  select.innerHTML =
    '<option value="">Fondo general (sin alerta específica)</option>' +
    active
      .map((a) => `<option value="${a.id}">${escapeHtml(a.nombre)}</option>`)
      .join('')
}

async function resolveFenixAlert(alertId) {
  const alert = alertsDB.find((a) => a.id === alertId)
  if (!alert || alert.status === 'resolved') return

  try {
    await apiFetch(`/alerts/${alertId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'resolved' })
    })

    const nowTime = Date.now()
    const hoursSince = (nowTime - alert.timestamp) / (1000 * 60 * 60)
    alert.status = 'resolved'
    alert.resolvedAt = nowTime

    if (hoursSince < 72) {
      const earlyBonus = alert.microAmount * 0.3
      communityUSD += earlyBonus
      totalTokensEmitidos += Math.floor(earlyBonus * 8)
      computeWeeklyResolved()
      showToastFenix(
        `✨ ¡RESUELTA ANTES DE 72h! +$${earlyBonus.toFixed(2)} USD al fondo comunitario.`,
        '#FFD966'
      )
    } else {
      showToastFenix('🕊️ Localizado después de 72h. Sin bono rápido.', '#aaa')
    }

    authoritiesLog.unshift(
      `[${new Date().toLocaleString()}] ✅ CASO CERRADO: ${alert.nombre} localizado. Sincronizado con Amber+ API.`
    )
    saveGamificationLocal()
    renderFullUI()
    populateDonationAlerts()
  } catch (err) {
    showToastFenix(`❌ Error al resolver: ${err.message}`, '#d9534f')
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function openAlertModal(alert) {
  const modal = document.getElementById('alertDetailModal')
  if (!modal) return
  modal.querySelector('.modal-title').textContent = `${alert.nombre}, ${alert.edad} años`
  modal.querySelector('#alertDetailStatus').textContent = alert.status === 'active' ? 'ACTIVA' : alert.status.toUpperCase()
  modal.querySelector('#alertDetailTime').textContent = alert.timestamp
    ? new Date(alert.timestamp).toLocaleString()
    : 'Sin fecha'
  modal.querySelector('#alertDetailName').textContent = alert.nombre
  modal.querySelector('#alertDetailAge').textContent = alert.edad
  modal.querySelector('#alertDetailLocation').textContent = alert.ubicacion
  modal.querySelector('#alertDetailLastSeen').textContent = alert.lastSeenAt ? new Date(alert.lastSeenAt).toLocaleString() : 'No disponible'
  modal.querySelector('#alertDetailContact').textContent = alert.contacto
  modal.querySelector('#alertDetailDescription').textContent = alert.descripcion
  modal.querySelector('#alertDetailTx').textContent = alert.blockchainTx || 'No hay transacción'

  const photoContainer = modal.querySelector('#alertDetailPhoto')
  if (photoContainer) {
    if (alert.foto) {
      photoContainer.innerHTML = `<img src="${escapeHtml(alert.foto)}" alt="Foto de alerta" />`
    } else {
      photoContainer.innerHTML = '<div class="modal-no-photo">Sin foto disponible</div>'
    }
  }

  modal.classList.remove('hidden')
}

function closeAlertModal() {
  const modal = document.getElementById('alertDetailModal')
  if (!modal) return
  modal.classList.add('hidden')
}

function onPhotoSelected(event) {
  const file = event.target.files?.[0]
  const preview = document.getElementById('fotoPreview')
  if (!preview) return
  if (!file) {
    preview.innerHTML = ''
    return
  }
  const url = URL.createObjectURL(file)
  preview.innerHTML = `<img src="${url}" alt="Vista previa" style="max-width:100%;max-height:120px;border-radius:1rem;margin-top:8px;">`
}

function renderFullUI() {
  const container = document.getElementById('alertsContainerFenix')
  if (!container) return

  if (loading) {
    container.innerHTML = '<div style="text-align:center;padding:2rem;">Cargando desde el servidor...</div>'
    return
  }

  const now = Date.now()
  const activeAlerts = alertsDB.filter((a) => a.status === 'active')
  document.getElementById('statActive').innerText = activeAlerts.length
  document.getElementById('statFund').innerText = communityUSD.toFixed(2)
  document.getElementById('statTokens').innerText = totalTokensEmitidos
  document.getElementById('statResolvedWeek').innerText = weeklyResolvedFast

  populateDonationAlerts()

  const pendingAlerts = alertsDB.filter((a) => a.status === 'pending')

  const pendingContainer = document.getElementById('pendingAlertsContainerFenix')
  if (pendingContainer) {
    if (pendingAlerts.length === 0) {
      pendingContainer.style.display = 'none'
      pendingContainer.innerHTML = ''
    } else {
      pendingContainer.style.display = 'block'
      pendingContainer.innerHTML = `
        <div style="background:#111b34;border:1px solid #FFB347;border-radius:1.2rem;padding:1rem;margin-bottom:1rem;">
          <strong style="display:block;margin-bottom:0.5rem;color:#FFB347;">⚠️ Alertas pendientes de pago</strong>
          <p style="margin:0;margin-bottom:0.75rem;font-size:0.85rem;color:#cbd3e1;">Hay ${pendingAlerts.length} alerta(s) creadas pero aún no confirmadas en MetaMask. No aparecerán como activas hasta que el pago se complete.</p>
          <div id="pendingAlertsList" style="display:grid;gap:0.75rem;"></div>
        </div>
      `
      const pendingList = pendingContainer.querySelector('#pendingAlertsList')
      if (pendingList) {
        pendingAlerts
          .slice()
          .sort((a, b) => b.timestamp - a.timestamp)
          .forEach((alert) => {
            const item = document.createElement('div')
            item.className = 'alert-item-fenix'
            item.style.cursor = 'pointer'
            item.innerHTML = `
              <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;">
                <strong>${escapeHtml(alert.nombre)}, ${alert.edad} años</strong>
                <span class="badge-priority" style="background:#5bc0de;">⏳ PENDIENTE</span>
              </div>
              <div style="font-size:0.8rem;color:#cbd3e1;">📍 ${escapeHtml(alert.ubicacion)}</div>
              <div style="font-size:0.75rem;color:#cbd3e1;">📝 ${escapeHtml(alert.descripcion.substring(0, 70))}</div>
            `
            item.addEventListener('click', () => openAlertModal(alert))
            pendingList.appendChild(item)
          })
      }
    }
  }

  if (activeAlerts.length === 0) {
    container.innerHTML =
      '<div style="text-align:center;padding:1rem;">No hay alertas activas en este momento.</div>'
  } else {
    container.innerHTML = ''
    activeAlerts
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .forEach((alert) => {
        const hoursSince = (now - alert.timestamp) / (1000 * 60 * 60)
        const isFirst2 = alert.status === 'active' && hoursSince <= 2
        const isOver72 = alert.status === 'active' && hoursSince > 72
        let stateChip = ''
        if (alert.status === 'active') {
          if (isFirst2) stateChip = '<span class="badge-priority">🚨 PRIMERAS 2 HORAS · URGENTE</span>'
          else if (isOver72)
            stateChip =
              '<span class="badge-priority" style="background:#a94442;">⚠️ +72 HORAS · CRÍTICO</span>'
          else stateChip = '<span class="badge-priority" style="background:#FFB347;">🔴 ACTIVA</span>'
        } else {
          stateChip = '<span class="badge-priority badge-resolved">✔️ RESUELTA (bajada)</span>'
        }

        const timeText =
          hoursSince < 1
            ? `🕒 hace ${Math.floor((now - alert.timestamp) / 1000 / 60)} minutos`
            : `🕒 hace ${hoursSince.toFixed(1)} horas`

        const fotoSrc = alert.foto?.startsWith('/')
          ? alert.foto
          : alert.foto

        const item = document.createElement('div')
        item.className = `alert-item-fenix ${alert.status === 'resolved' ? 'alert-resolved' : ''}`
        item.innerHTML = `
          <div style="display:flex; justify-content:space-between;">
            <strong>${escapeHtml(alert.nombre)}, ${alert.edad} años</strong> ${stateChip}
          </div>
          <div style="font-size:0.8rem;">📍 ${escapeHtml(alert.ubicacion)}</div>
          <div style="font-size:0.75rem;">📝 ${escapeHtml(alert.descripcion.substring(0, 70))}</div>
          <div style="font-size:0.7rem;">📞 ${escapeHtml(alert.contacto)}
            ${alert.foto ? ` <a href="${escapeHtml(fotoSrc)}" target="_blank" rel="noopener" style="color:#FFB347;">📸 Foto</a>` : ''}
            ${alert.blockchainTx ? ` <span style="color:#9aabcc;">⛓ ${escapeHtml(alert.blockchainTx.slice(0, 12))}…</span>` : ''}
          </div>
          <div class="token-reward">${timeText}</div>
        `

        if (alert.status === 'active') {
          const resolveBtn = document.createElement('button')
          resolveBtn.className = 'btn-secundary'
          resolveBtn.style.cssText = 'margin-top:6px;padding:6px;'
          resolveBtn.textContent = '✅ MARCAR COMO APARECIÓ (bajar alerta)'
          resolveBtn.addEventListener('click', (evt) => {
            evt.stopPropagation()
            resolveFenixAlert(alert.id)
          })
          item.appendChild(resolveBtn)
        }
        item.addEventListener('click', () => openAlertModal(alert))

        container.appendChild(item)
      })
  }

  const logArea = document.querySelector('.authority-badge')
  if (logArea && authoritiesLog.length) {
    let logHtml =
      '<div style="font-size:0.65rem;background:#0A0F1A;padding:8px;border-radius:1rem;margin-top:10px;max-height:100px;overflow-y:auto;">'
    authoritiesLog.slice(0, 5).forEach((log) => {
      logHtml += `📢 ${escapeHtml(log.substring(0, 100))}...<br>`
    })
    logHtml += '</div>'
    let dynamicLog = document.getElementById('dynamicLog')
    if (!dynamicLog) {
      dynamicLog = document.createElement('div')
      dynamicLog.id = 'dynamicLog'
      logArea.parentNode.appendChild(dynamicLog)
    }
    dynamicLog.innerHTML = logHtml
  }
}

function showToastFenix(msg, bg) {
  const t = document.createElement('div')
  t.innerText = msg
  t.style.cssText =
    'position:fixed;bottom:20px;right:20px;background:' +
    bg +
    ';color:#fff;padding:10px 20px;border-radius:50px;z-index:9999;font-weight:bold;font-size:0.8rem;box-shadow:0 4px 12px black;max-width:90%;'
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 3500)
}

async function autoMonitorTwoHours() {
  const now = Date.now()
  for (const alert of alertsDB) {
    if (alert.status !== 'active') continue
    const hours = (now - alert.timestamp) / (1000 * 60 * 60)
    if (hours <= 2 && !notifiedForTwoHour.has(alert.id)) {
      notifiedForTwoHour.add(alert.id)
      notifyAuthoritiesMultiLevel(alert, true)
    }
    if (hours > 72 && alert.apiStatus !== 'critical') {
      try {
        await apiFetch(`/alerts/${alert.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'critical' })
        })
        alert.apiStatus = 'critical'
      } catch (_) {}
    }
  }
  try {
    await loadAlertsFromApi()
    renderFullUI()
  } catch (_) {
    renderFullUI()
  }
}

window.onWalletAccountChanged = () => updateWalletUI()

window.addEventListener('DOMContentLoaded', () => {
  loadInitialData().then(() => renderDonationsList())
  document.getElementById('fenixForm').addEventListener('submit', createFenixAlert)
  document.getElementById('donationForm')?.addEventListener('submit', submitDonation)
  document.getElementById('btnConnectWallet')?.addEventListener('click', handleToggleWallet)
  document.getElementById('fotoDes')?.addEventListener('change', onPhotoSelected)
  document.getElementById('alertDetailModalClose')?.addEventListener('click', closeAlertModal)
  document.getElementById('alertDetailModal')?.addEventListener('click', (evt) => {
    if (evt.target === evt.currentTarget) closeAlertModal()
  })
  setInterval(() => {
    autoMonitorTwoHours()
  }, 45000)
})
