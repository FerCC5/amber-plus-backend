const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

function requireApiKey() {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    const err = new Error('ANTHROPIC_API_KEY no configurada')
    err.status = 503
    throw err
  }
}

async function callAnthropic(body) {
  requireApiKey()

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({ model: MODEL, ...body })
  })

  const data = await response.json()

  if (!response.ok) {
    const err = new Error(data.error?.message || 'Error al llamar a Anthropic')
    err.status = response.status === 401 ? 503 : 502
    throw err
  }

  const text = data.content?.[0]?.text
  if (!text) {
    const err = new Error('Respuesta vacía de Anthropic')
    err.status = 502
    throw err
  }

  return parseJsonFromText(text)
}

function parseJsonFromText(text) {
  const clean = text.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    const err = new Error('La IA no devolvió JSON válido')
    err.status = 502
    throw err
  }
}

export async function analyzeImage(image_base64) {
  return callAnthropic({
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: image_base64 }
        },
        {
          type: 'text',
          text: `Analiza esta imagen para una alerta de menor desaparecido. Responde SOLO en JSON con este formato exacto:
{
  "is_manipulated": false,
  "authenticity_score": 0.95,
  "quality_score": 0.88,
  "has_face": true,
  "estimated_age": 10,
  "description": "Menor de aproximadamente 10 años, cabello oscuro corto",
  "flags": []
}`
        }
      ]
    }]
  })
}

export async function filterReport({ child_name, age, description, location, circumstances }) {
  return callAnthropic({
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Evalúa si este reporte de menor desaparecido parece legítimo o sospechoso.
Nombre: ${child_name}, Edad: ${age}
Descripción: ${description}
Ubicación: ${location}
Circunstancias: ${circumstances}

Responde SOLO en JSON:
{
  "is_legitimate": true,
  "confidence": 0.92,
  "priority_score": 0.85,
  "flags": [],
  "recommendation": "Activar alerta inmediatamente"
}`
    }]
  })
}
