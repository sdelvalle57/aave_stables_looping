// Supported stablecoin assets
export type StablecoinAsset = 'USDC' | 'USDT' | 'DAI' | 'FRAX';

// Protocol types
export type Protocol = 'aave' | 'curve' | 'convex' | 'makerdao' | 'pendle';

// Chain identifiers
export type SupportedChainId = 1 | 42161 | 10 | 137; // Ethereum, Arbitrum, Optimism, Polygon

// Chain names for display
export const CHAIN_NAMES: Record<SupportedChainId, string> = {
  1: 'Ethereum',
  42161: 'Arbitrum One',
  10: 'Optimism',
  137: 'Polygon PoS'
} as const;

// Protocol names for display
export const PROTOCOL_NAMES: Record<Protocol, string> = {
  aave: 'Aave v3',
  curve: 'Curve Finance',
  convex: 'Convex Finance',
  makerdao: 'MakerDAO',
  pendle: 'Pendle'
} as const;

// Stablecoin asset metadata
export const STABLECOIN_METADATA: Record<StablecoinAsset, {
  name: string;
  symbol: string;
  decimals: number;
  addresses: Partial<Record<SupportedChainId, `0x${string}`>>;
}> = {
  USDC: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    addresses: {
      1: '0xA0b86991C6218b36c1d19D4a2e9Eb0cE3606eB48', // Native USDC on Ethereum
      42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
    }
  },
  USDT: {
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    addresses: {
      1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
    }
  },
  DAI: {
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: 18,
    addresses: {
      1: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      42161: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      10: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      137: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
    }
  },
  FRAX: {
    name: 'Frax',
    symbol: 'FRAX',
    decimals: 18,
    addresses: {
      1: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
      42161: '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F',
      10: '0x2E3D870790dC77A83DD1d18184Acc7439A53f475',
      137: '0x45c32fA6DF82ead1e2EF74d17b76547EDdFaFF89'
    }
  }
} as const;

// Contract addresses by chain
export interface ContractAddresses {
  aavePoolDataProvider: `0x${string}`;
  aaveUiPoolDataProvider: `0x${string}`;
}

// Multicall configuration
export interface MulticallConfig {
  address: `0x${string}`;
  blockCreated: number;
}