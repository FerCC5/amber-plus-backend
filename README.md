# Fenix (Amber Response Network) 🐦🔥

> **Plataforma descentralizada que combina Inteligencia Artificial y tecnología Web3 para acelerar la búsqueda de personas desaparecidas mediante reportes inmutables, automatización de alertas y un sistema económico de mitigación de spam.**

---

## 📋 1. Identificación del Problema
La desaparición de personas representa una problemática social crítica donde las **primeras horas son vitales**. Sin embargo, los sistemas actuales (como la Alerta Amber tradicional) presentan graves limitaciones:
* **Demoras burocráticas:** La distribución de alertas depende de procesos administrativos centralizados que retrasan la difusión estratégica durante horas cruciales.
* **Falta de veracidad (Spam):** Las autoridades reciben reportes falsos o duplicados que consumen recursos operativos y dificultan la identificación de casos reales.
* **Vulnerabilidad de los datos:** Los sistemas centralizados son susceptibles a pérdidas de información, alteraciones o ataques informáticos que comprometen los registros.
* **Escasa participación ciudadana:** La población carece de mecanismos simples, interactivos y confiables para colaborar activamente en la difusión y seguimiento de alertas.

---

## 💡 2. La Solución: Fenix
**Fenix** integra Inteligencia Artificial y tecnología Blockchain para crear un sistema transparente, seguro y descentralizado que reestructura el flujo de emergencia bajo un modelo lógico-económico:

* **Validación Inteligente:** La IA analiza automáticamente imágenes, textos y metadatos para detectar inconsistencias y reducir la generación de reportes falsos antes de subirlos a la red.
* **Sistema de Incentivos (Staking / Escrow):** Se implementa un mecanismo de depósitos en garantía mediante microtransacciones cripto que promueve la autenticidad de la información enviada y elimina el spam por penalización económica.
* **Notificación Inmediata:** Los reportes validados activan Webhooks y APIs automatizados hacia dependencias gubernamentales (municipales, estatales y federales) y ONGs, reduciendo tiempos de respuesta a milisegundos[cite: 1].
* **Oráculo de IA y Cierre Automático:** Un agente de IA monitorea bases de datos y fuentes oficiales[cite: 1]. Al detectar el hallazgo oficial de la persona, actúa como un oráculo firmando la resolución en la blockchain, cerrando el caso y liberando los fondos en garantía de vuelta al ciudadano.
* **Participación Comunitaria Interactiva:** Los usuarios pueden propagar alertas en redes sociales mediante enlaces interactivos (como Solana Blinks), realizar donaciones directas o confirmar avistamientos con un clic.

---

## 🛠️ 3. Arquitectura Técnica y Stack
Este repositorio (**amber-plus-backend**) aloja la lógica centralizada y la orquestación de servicios distribuidos del ecosistema.

| Capa / Componente | Tecnología | Función Crítica |
| :--- | :--- | :--- |
| **El Cerebro (IA)** | Modelos NLP y Computer Vision | Validación automática de archivos multimedia, detección de anomalías y funcionalidad de Oráculo autónomo. |
| **El Corazón (Web3)** | Smart Contracts (Arbitrum / Solana) | Gestión inmutable de alertas, contratos inteligentes de fideicomiso (*escrow*) y control de tiempos (2h/72h). |
| **Interacción Social** | Solana Actions & Blinks | Compartición rápida de alertas interactivas en redes sociales y pasarela para micro-donaciones comunitarias. |
| **Almacenamiento Descentralizado**  Resguardo seguro de imágenes y evidencia digital pesada; la blockchain solo almacena el *hash* criptográfico. |
| **Persistencia y Analítica** |Consulta de reportes, persistencia de datos y backend core para consumo de la App. |

### Flujo Operativo del Sistema



# Amber+ Backend
API para alertas de menores desaparecidos. Datos persistidos en `data/store.json` (sin base de datos).

## Requisitos
- Node.js 18+
- API keys opcionales: Anthropic (IA), Pinata (IPFS), Alchemy (blockchain)

### Instalación Local
```bash
# 1. Clonar e ingresar al repositorio de la arquitectura lógica
git clone [https://github.com/FerCC5/amber-plus-backend.git](https://github.com/FerCC5/amber-plus-backend.git)
cd amber-plus-backend
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
| `ALERTS_PER_DAY_LIMIT` | Límite global diario de avisos creados |

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

---------------------------------------------------------------------------------------------------------
                                       ENGLISH VERSION
---------------------------------------------------------------------------------------------------------


# Fenix (Amber Response Network) 🐦🔥

> **A decentralized platform merging Artificial Intelligence and Web3 technology to accelerate missing persons searches through immutable reports, automated alerts, and an incentive-driven spam mitigation system.**[cite: 1]

---

## 📋 1. Problem Statement
The disappearance of an individual is a critical social crisis where the **first hours are vital**[cite: 1]. However, legacy frameworks (such as traditional Amber Alerts) suffer from severe systemic limitations[cite: 1]:
* **Bureaucratic Delays:** Alert deployment relies on centralized administrative processing, hindering strategic dissemination during critical early windows[cite: 1].
* **Lack of Veracity (Spam):** Authorities are flooded with fraudulent or duplicate reports, draining operational resources and obscuring legitimate emergencies[cite: 1].
* **Data Vulnerability:** Centralized registries remain susceptible to data loss, unauthorized alterations, or cyberattacks that compromise records[cite: 1].
* **Low Civic Engagement:** The general public lacks streamlined, interactive, and trustworthy channels to actively assist in distributing and tracking alerts[cite: 1].

---

## 💡 2. The Solution: Fenix
**Fenix** integrates Artificial Intelligence and Blockchain technology to establish a transparent, secure, and decentralized system that restructures emergency response workflows under a crypto-economic framework[cite: 1]:

* **Intelligent Validation:** AI models dynamically analyze images, descriptions, and metadata to flag inconsistencies and minimize fraudulent reports prior to on-chain deployment[cite: 1].
* **Incentive Framework (Staking / Escrow):** An escrow-backed staking mechanism utilizing crypto microtransactions enforces report authenticity, heavily penalizing spam through economic friction[cite: 1].
* **Instantaneous Notification:** Verified entries instantly trigger automated Webhooks and APIs routed to municipal, state, and federal law enforcement agencies alongside NGOs, slashing response latency to milliseconds[cite: 1].
* **AI Oracle & Autonomous Resolution:** An autonomous AI agent continuously monitors official public databases[cite: 1]. Upon identifying an official recovery bulletin, it operates as a Web3 oracle to sign the case resolution on-chain, closing the alert and releasing escrowed funds back to the citizen[cite: 1].
* **Interactive Community Outreach:** Users can seamlessly propagate alerts across social media via interactive components (such as Solana Blinks), allowing one-click donations or sighting verifications[cite: 1].

---

## 🛠️ 3. Technical Architecture & Stack
This repository (**amber-plus-backend**) serves as the core orchestration engine and logical architecture for the distributed ecosystem.

| Layer / Component | Technology | Critical Function |
| :--- | :--- | :--- |
| **The Brain (AI)** | NLP & Computer Vision Models | Automated multimedia validation, anomaly detection, and autonomous Web3 Oracle functionality[cite: 1]. |
| **The Heart (Web3)** | Smart Contracts (Arbitrum / Solana) | Immutable alert lifecycle management, secure escrow accounts, and time-lock rule enforcement (2h/72h)[cite: 1, 2]. |
| **Social Engagement** | Solana Actions & Blinks | High-velocity distribution of interactive social alerts and integrated community micro-donations[cite: 1]. |
| **Decentralized Storage** | IPFS / Filecoin | Secure hosting for heavy cryptographic digital evidence and media; only hashes populate the ledger[cite: 1]. |
| **Persistence & Analytics**| PostgreSQL / SQL / Django ORM | Scalable report querying, core data persistence, and primary API gateway engine[cite: 1]. |

### System Operational Flow

## ⚙️ 4. Critical Business Logic (Smart Contracts)
To protect emergency services from infrastructure flooding, the smart contract regulates escrow transactions through rigid temporal thresholds:
* **The 2-Hour Window (Voluntary Withdrawal):** If the reporting user cancels or marks the individual as found within the first two hours, the smart contract executes a 100% refund of the staked escrow.
* **The 72-Hour Threshold (Oracle Resolution):** If the AI Oracle independently verifies the recovery through public institutional channels within 72 hours, the escrowed guarantee is released back to the citizen[cite: 1].
* **Spam Penalization:** If a report is proven to be fraudulent or malicious, the staked deposit is slashed or burned by the protocol, protecting the network's operational bandwidth[cite: 1].

---

## 💼 5. Tokenomics & Sustainability
1. **Protocol Fee:** A minimal 0.5% protocol fee is levied strictly on community-driven voluntary donations processed through social Blinks to sustain underlying node infrastructure[cite: 1].
2. **Institutional Premium API:** Tiered API subscription models for NGOs, human rights organizations, and government agencies needing structured, verified historical datasets and real-time analytical monitoring[cite: 1].
3. **Public Analytical Services:** Advanced telemetry reports detailing public safety vector metrics, geographical risk heatmaps, and temporal crime trends[cite: 1].

---

# Amber+ Backend (Project Infrastructure)
Missing minors alert tracking API. State and data persistence are automated via `data/store.json` (lightweight, database-free architecture).

## Requirements
- Node.js 18+
- Optional API Keys: Anthropic (AI Ecosystem), Pinata (IPFS Provider), Alchemy (Blockchain Node Infrastructure)

### Local Setup
```bash
# 1. Clone and access the repository core
git clone [https://github.com/FerCC5/amber-plus-backend.git](https://github.com/FerCC5/amber-plus-backend.git)
cd amber-plus-backend

# 2. Install package architecture dependencies
npm install

# 3. Configure environment infrastructure
cp .env.example .env
# Edit .env with your specific private credentials

# 4. Spin up local development server
npm run dev

