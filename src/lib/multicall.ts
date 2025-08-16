import { multicall } from 'viem/actions';
import { createPublicClient, http } from 'viem';
import { SUPPORTED_CHAINS, MULTICALL_CONFIG } from './chains';
import type { Abi } from 'viem';

// Create public clients for each supported chain
const publicClients: Record<number, any> = {};

// Initialize clients dynamically to avoid type issues
function getOrCreateClient(chainId: number) {
  if (publicClients[chainId]) {
    return publicClients[chainId];
  }

  const chainConfig = Object.values(SUPPORTED_CHAINS).find(chain => chain.id === chainId);
  if (!chainConfig) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  const client = createPublicClient({
    chain: chainConfig,
    transport: http(chainConfig.rpcUrls.alchemy.http[0]),
  });

  publicClients[chainId] = client;
  return client;
}

export interface MulticallContract {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: unknown[];
}

/**
 * Execute multiple contract calls in a single transaction using multicall
 */
export async function executeMulticall(
  chainId: number,
  contracts: MulticallContract[]
): Promise<unknown[]> {
  const client = getOrCreateClient(chainId);

  const multicallConfig = MULTICALL_CONFIG[chainId as keyof typeof MULTICALL_CONFIG];
  if (!multicallConfig) {
    throw new Error(`Multicall not configured for chain ID: ${chainId}`);
  }

  try {
    const results = await multicall(client, {
      contracts: contracts as any,
      multicallAddress: multicallConfig.address,
    });

    return results.map((result, index) => {
      if (result.status === 'failure') {
        console.warn(`Multicall failed for contract ${contracts[index].address}:`, result.error);
        return null;
      }
      return result.result;
    });
  } catch (error) {
    console.error('Multicall execution failed:', error);
    throw error;
  }
}

/**
 * Get public client for a specific chain
 */
export function getPublicClient(chainId: number) {
  return getOrCreateClient(chainId);
}

/**
 * Check if multicall is supported on a chain
 */
export function isMulticallSupported(chainId: number): boolean {
  return chainId in MULTICALL_CONFIG;
}