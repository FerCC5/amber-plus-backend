# Amber+ Backend

API para alertas de menores desaparecidos. Datos persistidos en `data/store.json` (sin base de datos).

## Requisitos

- Node.js 18+
- API keys opcionales: Anthropic (IA), Pinata (IPFS), Alchemy (blockchain)

## Instalación

```bash
npm install
cp .env.example .env
# Edita .env con tus claves
npm run dev
```

## Frontend (Propuesta Fénix — HTML)

El frontend está en `public/index.html` y se sirve desde el mismo servidor que la API.

1. `npm run dev` → abre **http://localhost:3001/**
2. Crear alertas, subir foto desde el dispositivo, avistamientos, auth, IA, blockchain y leaderboard integrados en la UI.
3. Fotos: IPFS (Pinata) si está configurado; si no, se guardan en `public/uploads/`.
4. Microtransacciones: pendientes de implementar.

### Frontend alternativo (Vite + React)

Opcional: `Downloads/AI-WEB3-WALLET-main/.../frontend` con `VITE_API_URL=http://localhost:3001` y `CORS_ORIGIN=http://localhost:5173`.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto (default 3001) |
| `JWT_SECRET` | Secreto para tokens de auth |
| `CORS_ORIGIN` | Origen permitido del frontend |
| `ANTHROPIC_API_KEY` | Análisis de imágenes y reportes |
| `PINATA_API_KEY` / `PINATA_SECRET_KEY` | Subida de fotos a IPFS |
| `ALCHEMY_API_KEY` | Verificación de transacciones |
| `CONTRACT_ADDRESS` | Contrato Amber+ en Base Sepolia |

## Endpoints

### General
- `GET /health` — estado del servidor

### Auth
- `POST /api/auth/register` — `{ name, email, password }`
- `POST /api/auth/login` — `{ email, password }`
- `GET /api/auth/me` — requiere `Authorization: Bearer <token>`
- `PATCH /api/auth/wallet` — `{ wallet_address }`

### Alertas
- `GET /api/alerts?status=active&limit=20`
- `GET /api/alerts/:id` — incluye `sightings`
- `POST /api/alerts` — crear alerta
- `PATCH /api/alerts/:id/status` — `{ status }`
- `POST /api/alerts/:id/sightings` — `{ location, description }` (+50 pts si hay token)

### Upload
- `POST /api/upload/photo` — multipart `photo`, opcional `alert_id`

### IA
- `POST /api/ai/analyze-image` — `{ image_base64, alert_id? }`
- `POST /api/ai/filter-report` — `{ child_name, age, description, location, alert_id? }`

### Blockchain
- `GET /api/blockchain/status`
- `POST /api/blockchain/register` — `{ alert_id, tx_hash? }`
- `GET /api/blockchain/verify/:tx_hash`

### Comunidad
- `GET /api/community/leaderboard`
- `GET /api/community/donations`
- `POST /api/community/donations`

## Persistencia

Los datos se guardan en `data/store.json` automáticamente. Esta carpeta está en `.gitignore`.
