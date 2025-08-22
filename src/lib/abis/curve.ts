// Minimal ABIs for Curve stable pools and ERC20 LP tokens

// Common stable-swap pool interface subset used for on-chain reads
// - get_virtual_price(): 1e18-scaled virtual price
// - balances(i): raw token balance for coin index i
// - coins(i): token address for coin index i
export const CurvePoolABI = [
  {
    stateMutability: 'view',
    type: 'function',
    name: 'get_virtual_price',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    name: 'balances',
    inputs: [{ name: 'i', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    name: 'coins',
    inputs: [{ name: 'i', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// Minimal ERC20 subset for LP tokens
export const ERC20ABI = [
  {
    stateMutability: 'view',
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

// Curve Address Provider (mainnet): 0x0000000022D53366457F9d5E68Ec105046FC4383
export const CurveAddressProviderABI = [
  {
    stateMutability: 'view',
    type: 'function',
    name: 'get_registry',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// Curve Registry (stable) minimal
export const CurveRegistryABI = [
  {
    stateMutability: 'view',
    type: 'function',
    name: 'get_virtual_price_from_lp_token',
    inputs: [{ name: '_lp', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;