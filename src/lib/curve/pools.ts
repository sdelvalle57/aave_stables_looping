// Curated Curve stable pools registry (MVP)
// Addresses will be filled/verified; provider will skip pools lacking required addresses.
// This file defines pool metadata used by the CurveDataProvider to know which pools to read on-chain.

import type { SupportedChainId, StablecoinAsset, Address } from '@/types';

export interface CurvePoolRegistryItem {
  chain: SupportedChainId;
  name: string;
  // Core pool (StableSwap) contract address (required for activation)
  poolAddress?: Address;
  // LP token address (may be same as pool or a separate ERC20)
  lpTokenAddress?: Address;
  // Optional gauge address (Ethereum mainnet typically)
  gaugeAddress?: Address;
  // Optional Convex pool id (Ethereum only)
  convexPoolId?: number;
  // Stablecoins involved (subset of ['USDC','USDT','DAI'])
  assets: StablecoinAsset[];
}

// Per-chain curated defaults (placeholders left undefined where not yet verified)
export const CURVE_POOLS_REGISTRY: Record<SupportedChainId, CurvePoolRegistryItem[]> = {
  // Ethereum mainnet (1)
  1: [
    {
      chain: 1,
      name: '3pool',
      // Curve 3pool (DAI/USDC/USDT) — mainnet
      // Source: widely referenced registry addresses
      poolAddress: '0xbEbC44782C7dB0a1A60Cb6Fe97d0a7a59BAbE807',
      lpTokenAddress: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
      // Gauge is optional for our use case; omit to avoid mismatches
      gaugeAddress: undefined,
      // Convex pool id for 3pool (subject to API mapping); best-known default
      convexPoolId: 9,
      assets: ['USDC', 'USDT', 'DAI'],
    },
  ],

  // Arbitrum One (42161)
  42161: [
    {
      chain: 42161,
      name: '2pool',
      // TODO: fill verified addresses (USDC/USDT pool)
      poolAddress: undefined,
      lpTokenAddress: undefined,
      gaugeAddress: undefined,
      assets: ['USDC', 'USDT'],
    },
  ],

  // Optimism (10)
  10: [
    {
      chain: 10,
      name: '2pool',
      // TODO: fill verified addresses (USDC/USDT pool)
      poolAddress: undefined,
      lpTokenAddress: undefined,
      gaugeAddress: undefined,
      assets: ['USDC', 'USDT'],
    },
  ],

  // Polygon PoS (137)
  137: [
    {
      chain: 137,
      name: 'Aave 3pool',
      // TODO: fill verified addresses (Aave-backed DAI/USDC/USDT)
      poolAddress: undefined,
      lpTokenAddress: undefined,
      gaugeAddress: undefined,
      assets: ['USDC', 'USDT', 'DAI'],
    },
  ],
};

/**
 * Get curated pools for a chain.
 */
export function getPoolsForChain(chain: SupportedChainId): CurvePoolRegistryItem[] {
  return CURVE_POOLS_REGISTRY[chain] ?? [];
}

/**
 * Filter pools by asset membership (at least one asset overlap).
 */
export function filterPoolsByAssets(
  pools: CurvePoolRegistryItem[],
  assets: StablecoinAsset[]
): CurvePoolRegistryItem[] {
  if (!assets?.length) return pools;
  const set = new Set(assets);
  return pools.filter((p) => p.assets.some((a) => set.has(a)));
}

/**
 * Detect whether a pool entry is fully activatable (has required addresses).
 */
export function isPoolActivatable(p: CurvePoolRegistryItem): boolean {
  return Boolean(p.poolAddress && p.lpTokenAddress);
}