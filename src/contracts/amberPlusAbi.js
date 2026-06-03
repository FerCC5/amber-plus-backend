/** ABI del contrato AmberPlus — debe coincidir con contracts/AmberPlus.sol */
export const AMBER_PLUS_ABI = [
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
      { indexed: true, internalType: 'address', name: 'donor', type: 'address' },
      { indexed: true, internalType: 'bytes32', name: 'alertId', type: 'bytes32' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'DonationReceived',
    type: 'event'
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'backendAlertId', type: 'bytes32' }],
    name: 'registerAlert',
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
  },
  {
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'alerts',
    outputs: [
      { internalType: 'address', name: 'reporter', type: 'address' },
      { internalType: 'uint256', name: 'registeredAt', type: 'uint256' },
      { internalType: 'uint256', name: 'feePaid', type: 'uint256' },
      { internalType: 'bool', name: 'exists', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
]
