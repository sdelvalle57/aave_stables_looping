// Supported stablecoin assets
export type StablecoinAsset = 'USDC' | 'USDT' | 'DAI' | 'FRAX';

// Protocol types
export type Protocol = 'aave' | 'curve' | 'convex' | 'makerdao' | 'pendle';

// Chain identifiers
export type SupportedChainId = 1 | 42161 | 10 | 137; // Ethereum, Arbitrum, Optimism, Polygon

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