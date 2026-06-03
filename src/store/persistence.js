import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../../data')
const DATA_FILE = process.env.DATA_FILE || path.join(DATA_DIR, 'store.json')

let saveTimer = null

export function getDataFilePath() {
  return DATA_FILE
}

export function loadFromDisk() {
  if (!fs.existsSync(DATA_FILE)) return null

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    console.error('[store] No se pudo leer datos:', err.message)
    return null
  }
}

export function scheduleSave(snapshot) {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
      fs.writeFileSync(DATA_FILE, JSON.stringify(snapshot, null, 2), 'utf8')
    } catch (err) {
      console.error('[store] No se pudo guardar datos:', err.message)
    }
  }, 300)
}
