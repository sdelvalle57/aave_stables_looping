import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { supportedChains, SUPPORTED_CHAINS } from './chains';
import { http } from 'viem';

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!WALLETCONNECT_PROJECT_ID) {
  console.warn('VITE_WALLETCONNECT_PROJECT_ID not found in environment variables');
}

// Create transport configuration using Alchemy RPC endpoints
const transports = {
  [SUPPORTED_CHAINS.ethereum.id]: http(SUPPORTED_CHAINS.ethereum.rpcUrls.alchemy.http[0]),
  [SUPPORTED_CHAINS.arbitrum.id]: http(SUPPORTED_CHAINS.arbitrum.rpcUrls.alchemy.http[0]),
  [SUPPORTED_CHAINS.optimism.id]: http(SUPPORTED_CHAINS.optimism.rpcUrls.alchemy.http[0]),
  [SUPPORTED_CHAINS.polygon.id]: http(SUPPORTED_CHAINS.polygon.rpcUrls.alchemy.http[0]),
};

export const wagmiConfig = getDefaultConfig({
  appName: 'Stablecoin Yield Monitor',
  projectId: WALLETCONNECT_PROJECT_ID || 'fallback-project-id',
  chains: supportedChains,
  transports,
  ssr: false, // We're not using SSR
});

// Export config for use in providers
export { wagmiConfig as config };