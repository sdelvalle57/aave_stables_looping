import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { supportedChains, SUPPORTED_CHAINS } from './chains';
import { http } from 'viem';

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!WALLETCONNECT_PROJECT_ID) {
  console.warn('VITE_WALLETCONNECT_PROJECT_ID not found in environment variables');
}

// Create transport configuration with safe Alchemy fallback to default RPC when env key is missing/invalid
function pickRpcUrl(urls: any) {
  const alchemy = urls?.alchemy?.http?.[0] as string | undefined;
  const invalid =
    !alchemy ||
    alchemy.includes('/undefined') ||
    alchemy.includes('your_alchemy_api_key_here') ||
    alchemy.endsWith('/v2/') ||
    (alchemy.split('/v2/')[1]?.length ?? 0) < 20;
  return invalid ? (urls?.default?.http?.[0] as string) : alchemy;
}

const transports = {
  [SUPPORTED_CHAINS.ethereum.id]: http(pickRpcUrl(SUPPORTED_CHAINS.ethereum.rpcUrls)),
  [SUPPORTED_CHAINS.arbitrum.id]: http(pickRpcUrl(SUPPORTED_CHAINS.arbitrum.rpcUrls)),
  [SUPPORTED_CHAINS.optimism.id]: http(pickRpcUrl(SUPPORTED_CHAINS.optimism.rpcUrls)),
  [SUPPORTED_CHAINS.polygon.id]: http(pickRpcUrl(SUPPORTED_CHAINS.polygon.rpcUrls)),
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