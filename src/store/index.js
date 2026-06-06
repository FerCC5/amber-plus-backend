import { v4 as uuidv4 } from 'uuid'
import { loadFromDisk, scheduleSave, getDataFilePath } from './persistence.js'

const now = () => new Date().toISOString()

const alerts = new Map()
const sightings = []
const users = new Map()
const usersByEmail = new Map()
const donations = []

let initialized = false

function snapshot() {
  return {
    alerts: [...alerts.values()],
    sightings: [...sightings],
    users: [...users.values()],
    donations: [...donations]
  }
}

function persist() {
  scheduleSave(snapshot())
}

function rebuildUsersIndex() {
  usersByEmail.clear()
  for (const user of users.values()) {
    if (user.email) usersByEmail.set(user.email, user.id)
  }
}

function seedUsers() {
  const demo = [
    ['María G.', 1250],
    ['Carlos R.', 980],
    ['Ana L.', 875],
    ['Pedro M.', 720],
    ['Lucía V.', 650]
  ]
  for (const [name, points] of demo) {
    const id = uuidv4()
    users.set(id, {
      id,
      name,
      email: null,
      password_hash: null,
      wallet_address: null,
      points,
      created_at: now()
    })
  }
}

export async function initStore() {
  if (initialized) return

  const saved = loadFromDisk()
  if (saved) {
    for (const alert of saved.alerts || []) alerts.set(alert.id, alert)
    sightings.push(...(saved.sightings || []))
    for (const user of saved.users || []) users.set(user.id, user)
    for (const donation of saved.donations || []) donations.push(donation)
    rebuildUsersIndex()
    console.log(`📂 Datos cargados desde ${getDataFilePath()}`)
  } else {
    seedUsers()
    persist()
    console.log('📂 Store nuevo (usuarios demo creados)')
  }

  initialized = true
}

// --- Usuarios ---

export function createUser({ name, email, password_hash, wallet_address }) {
  const normalized = email.toLowerCase()
  if (usersByEmail.has(normalized)) {
    const err = new Error('El email ya está registrado')
    err.code = 'DUPLICATE_EMAIL'
    throw err
  }

  const id = uuidv4()
  const user = {
    id,
    name,
    email: normalized,
    password_hash,
    wallet_address: wallet_address || null,
    points: 0,
    created_at: now()
  }
  users.set(id, user)
  usersByEmail.set(normalized, id)
  persist()
  return user
}

export function findUserByEmail(email) {
  const id = usersByEmail.get(email.toLowerCase())
  return id ? users.get(id) : null
}

export function findUserById(id) {
  return users.get(id) || null
}

export function updateUserWallet(id, wallet_address) {
  const user = users.get(id)
  if (!user) return null
  user.wallet_address = wallet_address
  persist()
  return user
}

export function addUserPoints(id, amount) {
  const user = users.get(id)
  if (!user) return null
  user.points += amount
  persist()
  return user
}

export function getLeaderboard(limit = 10) {
  return [...users.values()]
    .sort((a, b) => b.points - a.points)
    .slice(0, limit)
    .map(({ id, name, points }) => ({ id, name, points }))
}

// --- Alertas ---

export function listAlerts({ status = 'active', limit = 20, offset = 0 } = {}) {
  const filtered = [...alerts.values()]
    .filter((a) => status === 'all' || a.status === status)
    .sort((a, b) => {
      const pa = a.ai_priority_score ?? -1
      const pb = b.ai_priority_score ?? -1
      if (pb !== pa) return pb - pa
      return new Date(b.created_at) - new Date(a.created_at)
    })

  const slice = filtered.slice(Number(offset), Number(offset) + Number(limit))
  return {
    alerts: slice.map(publicAlert),
    total: filtered.length
  }
}

export function countAlertsCreatedOnDay(day) {
  return [...alerts.values()].filter((a) => a.created_at?.slice(0, 10) === day).length
}

export function countAlertsCreatedToday() {
  const today = new Date().toISOString().slice(0, 10)
  return countAlertsCreatedOnDay(today)
}

export function getAlert(id) {
  return alerts.get(id) || null
}

export function getAlertDetail(id) {
  const alert = alerts.get(id)
  if (!alert) return null
  return {
    ...alert,
    sightings: sightings
      .filter((s) => s.alert_id === id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }
}

export function createAlert(data) {
  const id = uuidv4()
  const timestamp = now()
  const alert = {
    id,
    ...data,
    status: 'pending',
    ai_priority_score: null,
    ai_authenticity_score: null,
    blockchain_tx_hash: null,
    blockchain_alert_id: null,
    created_at: timestamp,
    updated_at: timestamp,
    resolved_at: null
  }
  alerts.set(id, alert)
  persist()
  return alert
}

export function updateAlertStatus(id, status) {
  const alert = alerts.get(id)
  if (!alert) return null
  alert.status = status
  alert.updated_at = now()
  if (status === 'resolved') alert.resolved_at = now()
  persist()
  return alert
}

export function updateAlertPhoto(id, photo_ipfs_hash, photo_url) {
  const alert = alerts.get(id)
  if (!alert) return null
  alert.photo_ipfs_hash = photo_ipfs_hash
  alert.photo_url = photo_url
  alert.updated_at = now()
  persist()
  return alert
}

export function updateAlertBlockchain(id, blockchain_tx_hash, blockchain_alert_id) {
  const alert = alerts.get(id)
  if (!alert) return null
  alert.blockchain_tx_hash = blockchain_tx_hash
  alert.blockchain_alert_id = blockchain_alert_id
  if (alert.status === 'pending') {
    alert.status = 'active'
  }
  alert.updated_at = now()
  persist()
  return alert
}

export function updateAlertAiScores(id, { ai_authenticity_score, ai_priority_score }) {
  const alert = alerts.get(id)
  if (!alert) return null
  if (ai_authenticity_score != null) alert.ai_authenticity_score = ai_authenticity_score
  if (ai_priority_score != null) alert.ai_priority_score = ai_priority_score
  alert.updated_at = now()
  persist()
  return alert
}

export function listBlockchainAlerts() {
  return [...alerts.values()]
    .filter((a) => a.blockchain_tx_hash)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(({ id, child_name, blockchain_tx_hash, blockchain_alert_id, created_at }) => ({
      id,
      child_name,
      blockchain_tx_hash,
      blockchain_alert_id,
      created_at
    }))
}

export function findAlertByTxHash(txHash) {
  return [...alerts.values()].find((a) => a.blockchain_tx_hash === txHash) || null
}

function publicAlert(alert) {
  const {
    id, child_name, age, gender, physical_description,
    last_seen_location, last_seen_at,
    status, photo_url, photo_ipfs_hash, ai_priority_score, ai_authenticity_score,
    blockchain_tx_hash, blockchain_alert_id,
    contact_name, contact_phone,
    created_at, resolved_at
  } = alert
  return {
    id, child_name, age, gender, physical_description,
    last_seen_location, last_seen_at,
    status, photo_url, photo_ipfs_hash, ai_priority_score, ai_authenticity_score,
    blockchain_tx_hash, blockchain_alert_id,
    contact_name, contact_phone,
    created_at, resolved_at
  }
}

// --- Avistamientos ---

export function createSighting(alert_id, { location, description }) {
  if (!alerts.has(alert_id)) return null
  const sighting = {
    id: uuidv4(),
    alert_id,
    location,
    description: description || null,
    created_at: now()
  }
  sightings.push(sighting)
  persist()
  return sighting
}

// --- Donaciones ---

export function listDonations(limit = 20) {
  const sorted = [...donations]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit)
    .map(({ donor_wallet, amount_eth, tx_hash, created_at }) => ({
      donor_wallet,
      amount_eth,
      tx_hash,
      created_at
    }))

  const total_eth = donations.reduce((sum, d) => sum + Number(d.amount_eth), 0)
  return { donations: sorted, total_eth }
}

export function createDonation({ donor_wallet, amount_eth, tx_hash, alert_id }) {
  if (donations.some((d) => d.tx_hash === tx_hash)) {
    const err = new Error('tx_hash ya registrado')
    err.code = 'DUPLICATE_TX'
    throw err
  }

  const donation = {
    id: uuidv4(),
    donor_wallet,
    amount_eth: Number(amount_eth),
    tx_hash,
    alert_id: alert_id || null,
    created_at: now()
  }
  donations.push(donation)
  persist()
  return donation
}
