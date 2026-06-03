import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const PINATA_API = 'https://api.pinata.cloud'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localUploadDir = path.join(__dirname, '../../public/uploads')

function ensureUploadDir() {
  if (!fs.existsSync(localUploadDir)) {
    fs.mkdirSync(localUploadDir, { recursive: true })
  }
}

async function uploadToPinata(buffer, filename) {
  const apiKey = process.env.PINATA_API_KEY
  const secretKey = process.env.PINATA_SECRET_KEY

  const form = new FormData()
  form.append('file', buffer, { filename })
  form.append('pinataMetadata', JSON.stringify({
    name: filename,
    keyvalues: { project: 'amber-plus' }
  }))
  form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))

  const { data } = await axios.post(
    `${PINATA_API}/pinning/pinFileToIPFS`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        pinata_api_key: apiKey,
        pinata_secret_api_key: secretKey
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    }
  )

  const hash = data.IpfsHash
  const url = `https://gateway.pinata.cloud/ipfs/${hash}`
  return { hash, url, local: false }
}

function uploadLocally(buffer, filename) {
  ensureUploadDir()
  const ext = path.extname(filename) || '.jpg'
  const safeName = `${uuidv4()}${ext}`
  const filePath = path.join(localUploadDir, safeName)
  fs.writeFileSync(filePath, buffer)
  const hash = `local-${safeName}`
  const url = `/uploads/${safeName}`
  return { hash, url, local: true }
}

export async function uploadToIPFS(buffer, filename) {
  const apiKey = process.env.PINATA_API_KEY?.trim()
  const secretKey = process.env.PINATA_SECRET_KEY?.trim()

  if (apiKey && secretKey) {
    try {
      return await uploadToPinata(buffer, filename)
    } catch (err) {
      console.warn('Pinata falló, usando almacenamiento local:', err.message)
    }
  }

  return uploadLocally(buffer, filename)
}
