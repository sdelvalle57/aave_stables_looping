import { mainnet, arbitrum, optimism, polygon } from 'viem/chains';

// Environment variables with fallbacks
const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;

if (!ALCHEMY_API_KEY) {
  console.warn('VITE_ALCHEMY_API_KEY not found in environment variables');
}

// Chain configuration with Alchemy RPC endpoints
export const SUPPORTED_CHAINS = {
  ethereum: {
    ...mainnet,
    rpcUrls: {
      ...mainnet.rpcUrls,
      alchemy: {
        http: [`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
        webSocket: [`wss://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
      },
    },
  },
  arbitrum: {
    ...arbitrum,
    rpcUrls: {
      ...arbitrum.rpcUrls,
      alchemy: {
        http: [`https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
        webSocket: [`wss://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
      },
    },
  },
  optimism: {
    ...optimism,
    rpcUrls: {
      ...optimism.rpcUrls,
      alchemy: {
        http: [`https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
        webSocket: [`wss://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
      },
    },
  },
  polygon: {
    ...polygon,
    rpcUrls: {
      ...polygon.rpcUrls,
      alchemy: {
        http: [`https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
        webSocket: [`wss://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
      },
    },
  },
} as const;

// Export chains as array for wagmi config
export const supportedChains = [
  SUPPORTED_CHAINS.ethereum,
  SUPPORTED_CHAINS.arbitrum,
  SUPPORTED_CHAINS.optimism,
  SUPPORTED_CHAINS.polygon,
] as const;

// Contract addresses for each chain
export const CONTRACT_ADDRESSES = {
  [mainnet.id]: {
    aavePoolDataProvider: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3' as const,
    aaveUiPoolDataProvider: '0x91c0eA31b49B69Ea18607702c5d9aC360bf3dE7d' as const,
  },
  [arbitrum.id]: {
    aavePoolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654' as const,
    aaveUiPoolDataProvider: '0x145dE30c929a065582da84Cf96F88460dB9745A7' as const,
  },
  [optimism.id]: {
    aavePoolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654' as const,
    aaveUiPoolDataProvider: '0x145dE30c929a065582da84Cf96F88460dB9745A7' as const,
  },
  [polygon.id]: {
    aavePoolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654' as const,
    aaveUiPoolDataProvider: '0x145dE30c929a065582da84Cf96F88460dB9745A7' as const,
  },
} as const;

// Type definitions
export type SupportedChain = keyof typeof SUPPORTED_CHAINS;
export type ChainConfig = typeof SUPPORTED_CHAINS[SupportedChain];

// Helper functions
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return Object.values(SUPPORTED_CHAINS).find(chain => chain.id === chainId);
}

export function isChainSupported(chainId: number): boolean {
  return supportedChains.some(chain => chain.id === chainId);
}

export function getContractAddresses(chainId: number) {
  return CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
}

// Multicall configuration
export const MULTICALL_CONFIG = {
  [mainnet.id]: {
    address: '0xcA11bde05977b3631167028862bE2a173976CA11' as const,
    blockCreated: 14353601,
  },
  [arbitrum.id]: {
    address: '0xcA11bde05977b3631167028862bE2a173976CA11' as const,
    blockCreated: 7654707,
  },
  [optimism.id]: {
    address: '0xcA11bde05977b3631167028862bE2a173976CA11' as const,
    blockCreated: 4286263,
  },
  [polygon.id]: {
    address: '0xcA11bde05977b3631167028862bE2a173976CA11' as const,
    blockCreated: 25770160,
  },
} as const;