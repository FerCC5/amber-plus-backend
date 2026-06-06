/** ABI AmberPlus (Remix) — registerAlert, registerAlertWithIpfs, donate */
window.AMBER_PLUS_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: '_alertFee', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'backendAlertId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'reporter', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'feePaid', type: 'uint256' }
    ],
    name: 'AlertRegistered',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'backendAlertId', type: 'bytes32' },
      { indexed: false, internalType: 'string', name: 'ipfsHash', type: 'string' }
    ],
    name: 'AlertRegisteredWithIpfs',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'donor', type: 'address' },
      { indexed: true, internalType: 'bytes32', name: 'alertId', type: 'bytes32' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'DonationReceived',
    type: 'event'
  },
  {
    inputs: [{ internalType: 'string', name: 'uuid', type: 'string' }],
    name: 'uuidToAlertId',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'backendAlertId', type: 'bytes32' }],
    name: 'registerAlert',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'backendAlertId', type: 'bytes32' },
      { internalType: 'string', name: 'ipfsHashInfo', type: 'string' }
    ],
    name: 'registerAlertWithIpfs',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'backendAlertId', type: 'bytes32' }],
    name: 'donate',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'donateGeneral',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'alertFee',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
]
