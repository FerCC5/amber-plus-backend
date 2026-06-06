# Conectar contrato Remix (Sepolia)

## 1. Edita `.env`

```env
CONTRACT_ADDRESS=0xD03bB0Fc74Ad69193014AcCDCa6a6B5816b72BFd
TREASURY_WALLET=0xD03bB0Fc74Ad69193014AcCDCa6a6B5816b72BFd
ALCHEMY_NETWORK=eth-sepolia
MICRO_TX_ETH=0.0015
```

Opcional (verificación automática de txs):

```env
ALCHEMY_API_KEY=tu_clave
```

Crea la clave en [Alchemy](https://dashboard.alchemy.com/) → app → **Ethereum Sepolia**.

## 2. Arranca el servidor

```bash
npm install
npm run dev
```

Abre http://localhost:3001

## 3. MetaMask

- Red: **Sepolia**
- ETH de prueba para gas + **0.0015 ETH** por alerta

## 4. Probar

1. **Conectar wallet**
2. Crear alerta → MetaMask pide confirmar `registerAlert` / `registerAlertWithIpfs`
3. El backend guarda el `tx_hash` en la alerta

## Modos

| `payments_mode` | Condición |
|-----------------|-----------|
| `on-chain` | `CONTRACT_ADDRESS` sin Alchemy |
| `live` | `CONTRACT_ADDRESS` + `ALCHEMY_API_KEY` |
| `simulated` | Sin dirección de contrato |
