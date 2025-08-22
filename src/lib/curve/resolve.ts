// Dynamic resolver for Curve pool addresses using public Curve API
// Purpose: fill missing poolAddress/lpTokenAddress/gaugeAddress in CURVE_POOLS_REGISTRY at runtime
//
// Notes:
// - This is best-effort. We match pools by contained stablecoin addresses and asset count.
// - For Polygon "Aave stables", we additionally check pool name hints containing 'aave'.
// - For USDC variants (USDC.e/native), we match against chain-specific alias addresses.
// - Requires VITE_CURVE_API_BASE (default: https://api.curve.fi). Endpoint: /api/getPools/{network}/main

import { STABLECOIN_METADATA, type SupportedChainId } from '@/types/chains';
import { getAddress } from 'viem';
import {
  CURVE_POOLS_REGISTRY,
  type CurvePoolRegistryItem,
  getPoolsForChain,
} from './pools';

// ChainId -> curve API network segment
function apiNetwork(chain: SupportedChainId): string {
  switch (chain) {
    case 1:
      return 'main';
    case 42161:
      return 'arbitrum';
    case 10:
      return 'optimism';
    case 137:
      return 'polygon';
    default:
      return 'main';
  }
}

type CurveApiPool = {
  id?: string;
  address?: string; // swap/pool address (varies by API; keep best-effort)
  coinsAddresses?: string[];
  name?: string;
  lpTokenAddress?: string;
  gaugeAddress?: string;
  usdTotal?: number;
};

type CurveApiResponse = {
  success: boolean;
  data?: {
    poolData?: CurveApiPool[];
  };
};

function sameAddr(a?: string, b?: string) {
  if (!a || !b) return false;
  try {
    return getAddress(a) === getAddress(b);
  } catch {
    return a.toLowerCase() === b.toLowerCase();
  }
}

// Chain-specific alias token addresses for stablecoins frequently used by Curve pools
// Covers USDC.e on Arbitrum/Optimism etc. Extendable if needed.
function stableAliases(chain: SupportedChainId): Record<string, string[]> {
  const out: Record<string, string[]> = {
    USDC: [],
    USDT: [],
    DAI: [],
  };
  if (chain === 42161) {
    // Arbitrum USDC.e
    out.USDC.push('0xFF970A61A04b1Ca14834A43f5dE4533eBDDB5CC8');
  }
  if (chain === 10) {
    // Optimism USDC.e
    out.USDC.push('0x7F5c764cbc14f9669b88837ca1490cca17cf1a57');
  }
  // Polygon Aave pools often use aTokens; we will match by name hint for those
  return out;
}

// Try to decide if an API pool matches the configured registry item by assets (quick filter)
function matchesAssets(chain: SupportedChainId, pool: CurveApiPool, item: CurvePoolRegistryItem): boolean {
  const coins = pool?.coinsAddresses ?? [];
  if (!coins.length) return false;

  // Map API coins to our StablecoinAsset labels using STABLECOIN_METADATA for this chain
  const assetsDetected = new Set<string>();
  const aliases = stableAliases(chain);
  for (const [asset, meta] of Object.entries(STABLECOIN_METADATA)) {
    // Accept primary address plus any aliases
    const addrs: string[] = [];
    const primary = meta.addresses[chain];
    if (primary) addrs.push(primary);
    addrs.push(...(aliases[asset] ?? []));
    // If any address matches, consider that asset present
    if (addrs.length && coins.some((c) => addrs.some((a) => sameAddr(c, a)))) {
      assetsDetected.add(asset);
    }
  }

  // Require at least the assets configured in item to be all present in pool
  // (item.assets is a subset we curated)
  const assetMatch = item.assets.every((a) => assetsDetected.has(a));
  if (assetMatch) return true;

  // Fallback heuristics by pool name when token addresses are wrappers (e.g., aTokens on Polygon)
  const name = (pool?.name ?? '').toLowerCase();
  if (chain === 137 && item.assets.length === 3 && name.includes('aave')) {
    return true;
  }
  if (item.assets.length === 2 && name.includes('2pool')) {
    return true;
  }

  return false;
}

// For polygon aave stables, prefer pool names with 'aave'
function hasAaveHint(name?: string): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes('aave') || n.includes('aave pool');
}

/**
 * Ensure pools on a chain have pool and LP addresses filled using Curve API when missing.
 * Mutates CURVE_POOLS_REGISTRY in-place for the given chain.
 */
export async function ensureCurvePoolsResolved(chain: SupportedChainId): Promise<void> {
  // Avoid browser CORS by skipping runtime resolution client-side.
  // Prefill registry addresses (e.g., mainnet 3pool) or resolve on a backend if needed.
  if (typeof window !== 'undefined') {
    try {
      console.warn('[Curve Resolver] Skipping API resolution in browser due to CORS');
    } catch {}
    return;
  }
  const base = (import.meta as any)?.env?.VITE_CURVE_API_BASE || 'https://api.curve.fi';
  const network = apiNetwork(chain);
  const url = `${base}/api/getPools/${network}/main`;

  let json: CurveApiResponse | undefined;
  try {
    const resp = await fetch(url);
    // Some Curve endpoints can respond with 403 while still returning a valid JSON body.
    // Attempt to parse JSON regardless of status; proceed if it contains poolData.
    try {
      json = (await resp.json()) as CurveApiResponse;
    } catch {
      // If body isn't JSON, fall back to status check and bail if not ok.
      if (!resp.ok) return;
    }
  } catch {
    return;
  }
 
  const pools = json?.data?.poolData ?? [];
  try {
    console.debug('[Curve Resolver] API response', {
      url,
      success: json?.success,
      poolsCount: pools.length,
      chain,
      network,
    });
  } catch {}
  if (!pools.length) {
    try {
      console.warn('[Curve Resolver] No poolData from API', { url, success: json?.success });
    } catch {}
    return;
  }

  const reg = CURVE_POOLS_REGISTRY[chain] ?? [];
  try {
    console.debug('[Curve Resolver] Registry entries before resolve', {
      chain,
      count: reg.length,
      unresolved: reg.filter((r) => !(r.poolAddress && r.lpTokenAddress)).map((r) => r.name),
    });
  } catch {}
  for (const item of reg) {
    // skip already activatable entries
    if (item.poolAddress && item.lpTokenAddress) continue;

    // Find candidate pools matching assets; on polygon prefer 'aave' pool for 3-asset match
    let candidates = pools.filter((p) => matchesAssets(chain, p, item));

    if (chain === 137 && item.assets.length === 3) {
      const withAave = candidates.filter((c) => hasAaveHint(c.name));
      if (withAave.length) candidates = withAave;
    }

    // If still empty, fallback to heuristic by name when item suggests 2-pool
    if (!candidates.length && item.assets.length === 2) {
      candidates = pools.filter((p) => (p.name ?? '').toLowerCase().includes('2pool'));
    }

    if (!candidates.length) continue;

    // Select the pool with max usdTotal as a heuristic
    const selected = candidates.reduce((best, cur) => {
      const bu = typeof best.usdTotal === 'number' ? best.usdTotal : -1;
      const cu = typeof cur.usdTotal === 'number' ? cur.usdTotal : -1;
      return cu > bu ? cur : best;
    }, candidates[0]);

    // Best-effort mapping:
    // - address: many Curve APIs use 'address' for swap/pool
    // - lpTokenAddress: directly usable
    // - gaugeAddress: optional
    const poolAddr = selected.address ? (getAddress(selected.address) as `0x${string}`) : undefined;
    const lpAddr = selected.lpTokenAddress ? (getAddress(selected.lpTokenAddress) as `0x${string}`) : undefined;
    const gaugeAddr = selected.gaugeAddress ? (getAddress(selected.gaugeAddress) as `0x${string}`) : undefined;

    if (poolAddr) item.poolAddress = poolAddr;
    if (lpAddr) item.lpTokenAddress = lpAddr;
    if (gaugeAddr) item.gaugeAddress = gaugeAddr;
  }
  try {
    const after = CURVE_POOLS_REGISTRY[chain] ?? [];
    console.debug('[Curve Resolver] Registry after resolve', {
      chain,
      activatable: after.filter((r) => r.poolAddress && r.lpTokenAddress).map((r) => r.name),
    });
  } catch {}
}