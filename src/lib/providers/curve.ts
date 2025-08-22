// Curve On-Chain Data Provider (on-chain-first, Convex boost on Ethereum when available)

import { createPublicClient, http, getAddress } from 'viem';
import { CurvePoolABI, ERC20ABI, CurveAddressProviderABI, CurveRegistryABI } from '@/lib/abis/curve';
import {
  CURVE_POOLS_REGISTRY,
  filterPoolsByAssets,
  getPoolsForChain,
  isPoolActivatable,
  type CurvePoolRegistryItem,
} from '@/lib/curve/pools';
import { ensureCurvePoolsResolved } from '@/lib/curve/resolve';
import {
  STABLECOIN_METADATA,
  type SupportedChainId,
} from '@/types/chains';
import {
  type Chain,
  type StablecoinAsset,
  type CurvePoolData,
} from '@/types/domain';
import {
  type CurveDataProvider,
  type ProviderConfig,
  ProviderError,
  NetworkError,
  ContractError,
} from '@/types/providers';
import { SUPPORTED_CHAINS } from '@/lib/chains';

// Default configuration (align roughly with Aave provider)
const DEFAULT_CONFIG: ProviderConfig = {
  updateInterval: 60_000, // 60s
  retryAttempts: 2,
  retryDelay: 1000,
  timeout: 10_000,
};

// Fixed-point helpers
const ONE_E18 = 10n ** 18n;
const ONE_E9 = 10n ** 9n;

// Utility: safe bigint conversion
function toBI(x: unknown): bigint {
  if (typeof x === 'bigint') return x;
  if (typeof x === 'number') return BigInt(Math.trunc(x));
  if (typeof x === 'string') return BigInt(x);
  return 0n;
}

// Compute change ratio using fixed-point integer math to reduce precision loss
// Returns decimal ratio as number (e.g., 0.01 for +1%)
function ratio(v1: bigint, v0: bigint): number {
  if (v0 === 0n) return 0;
  const num = (v1 - v0) * ONE_E9; // scale numerator
  const q = num / v0; // bigint scaled by 1e9
  return Number(q) / 1e9;
}

// Clamp helper
function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

// Attempt to map an on-chain token address to StablecoinAsset for a given chain
function tokenToStableAsset(chain: SupportedChainId, tokenAddr: string): StablecoinAsset | undefined {
  const addr = getAddress(tokenAddr) as `0x${string}`;
  const a = Object.entries(STABLECOIN_METADATA) as [StablecoinAsset, typeof STABLECOIN_METADATA[StablecoinAsset]][];
  for (const [asset, meta] of a) {
    const chainAddr = meta.addresses[chain];
    if (chainAddr && getAddress(chainAddr).toLowerCase() === addr.toLowerCase()) {
      return asset;
    }
  }
  return undefined;
}

// Provider implementation
export class CurveOnChainDataProvider implements CurveDataProvider {
  private clients: Map<Chain, any> = new Map();
  private fallbackClients: Map<Chain, any> = new Map();
  private config: ProviderConfig;
  // Track last virtual price per (chain,pool) for APR annualization between polls
  private lastVP: Map<string, { vp: bigint; ts: number }> = new Map();

  constructor(config: Partial<ProviderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeClients();
  }

  private initializeClients(): void {
    // Force default/public RPC to avoid bad or missing Alchemy keys causing zero-data reads
    function pickRpcUrl(urls: any) {
      return (urls?.default?.http?.[0] as string);
    }

    Object.values(SUPPORTED_CHAINS).forEach((chainConfig) => {
      const rpcHttp = pickRpcUrl((chainConfig as any).rpcUrls);
      const client = createPublicClient({
        chain: chainConfig as any,
        transport: http(rpcHttp),
      });
      this.clients.set(chainConfig.id as Chain, client);
      try {
        console.debug('[Curve] client init', { chainId: chainConfig.id, rpcHttp });
      } catch {}
    });
  }

  private getClient(chain: Chain): any {
    const c = this.clients.get(chain);
    if (!c) throw new Error(`No viem client for chain ${chain}`);
    return c;
  }

  // Build or reuse a fallback client that always uses the chain's default RPC
  private getFallbackClient(chain: Chain): any {
    let c = this.fallbackClients.get(chain);
    if (!c) {
      const chainConfig = Object.values(SUPPORTED_CHAINS).find((cfg) => (cfg as any).id === chain) as any;
      const defaultRpc = (chainConfig?.rpcUrls?.default?.http?.[0]) as string;
      c = createPublicClient({ chain: chainConfig as any, transport: http(defaultRpc) });
      this.fallbackClients.set(chain, c);
    }
    return c;
  }

  // Read with layered fallbacks:
  //  1) primary client
  //  2) public CORS-friendly RPCs (mainnet): Flashbots, Llama, Cloudflare, Ankr
  //  3) chain default RPC
  private async readWithFallback<T>(chain: Chain, client: any, req: any): Promise<T> {
    // 1) primary
    try {
      return (await client.readContract(req)) as T;
    } catch (e1: any) {
      // 2) public RPCs for mainnet – best-effort first (helps browser CORS)
      if (chain === 1) {
        const chainConfig = Object.values(SUPPORTED_CHAINS).find((cfg) => (cfg as any).id === chain) as any;
        const publicUrls = [
          'https://rpc.flashbots.net',
          'https://eth.llamarpc.com',
          'https://cloudflare-eth.com',
          'https://rpc.ankr.com/eth',
        ];
        for (const url of publicUrls) {
          try {
            const temp = createPublicClient({ chain: chainConfig as any, transport: http(url) });
            const res = (await temp.readContract(req)) as T;
            try {
              console.warn('[Curve] readWithFallback via public RPC', { url, address: String(req?.address) });
            } catch {}
            return res;
          } catch {}
        }
      }
      // 3) chain default fallback
      try {
        const fb = this.getFallbackClient(chain);
        return (await fb.readContract(req)) as T;
      } catch (e2: any) {
        const orig = e2 instanceof Error ? e2 : e1 instanceof Error ? e1 : undefined;
        throw new ContractError('curve', chain, String(req?.address ?? '0x'), orig);
      }
    }
  }

  // Check if we already have at least one activatable pool for a chain
  private hasActivatablePools(chain: Chain): boolean {
    try {
      const pools = getPoolsForChain(chain as SupportedChainId);
      return pools.some((p) => p.poolAddress && p.lpTokenAddress);
    } catch {
      return false;
    }
  }

  // Core read for a single pool
  async getPoolData(chain: Chain, poolAddress: `0x${string}`): Promise<CurvePoolData> {
    const client = this.getClient(chain);
    try {
      console.debug('[Curve] getPoolData start', { chain, poolAddress });
    } catch {}

    // Resolve registry entry (needed for fallback paths)
    const registryPool = (getPoolsForChain(chain as SupportedChainId) ?? []).find(
      (p) => p.poolAddress && getAddress(p.poolAddress).toLowerCase() === getAddress(poolAddress).toLowerCase()
    );

    // 1) Read virtual price with fallback
    let vp: bigint;
    try {
      vp = (await this.readWithFallback<bigint>(chain, client, {
        address: poolAddress,
        abi: CurvePoolABI,
        functionName: 'get_virtual_price',
      })) as bigint;
    } catch (e) {
      // Mainnet: fallback via AddressProvider -> Registry.get_virtual_price_from_lp_token(lp)
      if (chain === 1 && registryPool?.lpTokenAddress) {
        try {
          const addressProvider = '0x0000000022D53366457F9d5E68Ec105046FC4383' as `0x${string}`;
          const registry = (await this.readWithFallback<`0x${string}`>(chain, client, {
            address: addressProvider,
            abi: CurveAddressProviderABI,
            functionName: 'get_registry',
          })) as `0x${string}`;
          const lpToken = getAddress(registryPool.lpTokenAddress) as `0x${string}`;
          vp = (await this.readWithFallback<bigint>(chain, client, {
            address: registry,
            abi: CurveRegistryABI,
            functionName: 'get_virtual_price_from_lp_token',
            args: [lpToken],
          })) as bigint;
        } catch (e2) {
          throw new ContractError('curve', chain, poolAddress, e2 instanceof Error ? e2 : undefined);
        }
      } else {
        throw new ContractError('curve', chain, poolAddress, e instanceof Error ? e : undefined);
      }
    }

    // 2) Ensure LP token address (required for TVL & further reads)
    if (!registryPool?.lpTokenAddress) {
      throw new ProviderError(
        `LP token address missing for pool ${poolAddress} on chain ${chain}`,
        'curve',
        chain
      );
    }
    const lpAddr = getAddress(registryPool.lpTokenAddress) as `0x${string}`;

    // 3) Read LP total supply (ERC20) with fallback
    let totalSupply: bigint;
    let _lpDecimals: number;
    try {
      totalSupply = await this.readWithFallback<bigint>(chain, client, {
        address: lpAddr,
        abi: ERC20ABI,
        functionName: 'totalSupply',
      });
      _lpDecimals = await this.readWithFallback<number>(chain, client, {
        address: lpAddr,
        abi: ERC20ABI,
        functionName: 'decimals',
      });
    } catch (e) {
      throw new ContractError('curve', chain, lpAddr, e instanceof Error ? e : undefined);
    }

    // 4) Compute TVL approximation in 1e18 USD notionals: tvl ≈ totalSupply * virtual_price / 1e18
    const tvl = (totalSupply * vp) / ONE_E18;

    // 5) Compute peg deviation via balances(i) and coins(i)
    // Probe up to 4 coins (most stables pools are 2 or 3)
    const coins: { idx: number; token?: `0x${string}`; balance?: bigint; asset?: StablecoinAsset }[] = [];
    for (let i = 0; i < 4; i++) {
      try {
        const tokenAddr = await this.readWithFallback<`0x${string}`>(chain, client, {
          address: poolAddress,
          abi: CurvePoolABI,
          functionName: 'coins',
          args: [BigInt(i)],
        });
        const bal = await this.readWithFallback<bigint>(chain, client, {
          address: poolAddress,
          abi: CurvePoolABI,
          functionName: 'balances',
          args: [BigInt(i)],
        });
        const asset = tokenToStableAsset(chain as SupportedChainId, tokenAddr);
        coins.push({ idx: i, token: getAddress(tokenAddr) as `0x${string}`, balance: bal, asset });
      } catch {
        // stop on first failure
        break;
      }
    }

    // Normalize balances by token decimals (from metadata) and only include known stables
    const normalized: number[] = [];
    for (const c of coins) {
      if (!c.asset || c.balance == null) continue;
      const meta = STABLECOIN_METADATA[c.asset];
      // decimals in metadata are small (6 or 18) so JS Number is fine for normalization
      const denom = 10 ** meta.decimals;
      const v = Number(c.balance) / denom;
      if (Number.isFinite(v)) normalized.push(v);
    }
    let pegDeviation = 0;
    if (normalized.length > 0) {
      const sum = normalized.reduce((a, b) => a + b, 0);
      if (sum > 0) {
        const shares = normalized.map((v) => v / sum);
        const target = 1 / normalized.length;
        pegDeviation = Math.max(...shares.map((s) => Math.abs(s - target)));
      }
    }

    // 6) Base APY via virtual price growth vs last observation
    const now = Math.floor(Date.now() / 1000);
    const key = `${chain}-${poolAddress.toLowerCase()}`;
    const last = this.lastVP.get(key);
    let baseAPY = 0;
    if (last && now > last.ts) {
      const r = ratio(vp, last.vp);
      const dt = now - last.ts;
      const apr = r * (365 * 24 * 3600) / dt;
      // Clamp insane values; APY here treated as APR for small dt approximation
      baseAPY = clamp(apr, -0.2, 0.5);
    }
    // Update last
    this.lastVP.set(key, { vp, ts: now });

    // 7) Boosted APY via Convex on Ethereum only (best-effort)
    let boostedAPY = baseAPY;
    if (chain === 1 && typeof import.meta !== 'undefined') {
      const base = (import.meta as any).env?.VITE_CONVEX_API_BASE as string | undefined;
      const pid = registryPool?.convexPoolId;
      if (base && Number.isInteger(pid)) {
        try {
          // Note: Convex API shape may differ; this is a best-effort placeholder endpoint.
          // Implementors can update the path/field mapping as needed.
          const resp = await fetch(`${base}/api/curve/pools/${pid}`, { method: 'GET' });
          if (resp.ok) {
            const json: any = await resp.json();
            // Prefer a weekly APY style field if provided, else a general 'apy'
            const cvxAPY: number | undefined = json?.apyWeek ?? json?.apy ?? json?.apy_base ?? undefined;
            if (typeof cvxAPY === 'number' && Number.isFinite(cvxAPY)) {
              // If API returns percentage (e.g., 5 for 5%), convert to decimal if needed.
              boostedAPY = cvxAPY > 1 ? cvxAPY / 100 : cvxAPY;
            }
          }
        } catch (e) {
          const ne = new NetworkError('curve', chain as any, e instanceof Error ? e : undefined);
          try {
            console.warn('[Curve] Convex API error', ne);
          } catch {}
          // Keep baseAPY on API failure
        }
      }
    }

    // 8) Build result
    return {
      poolAddress,
      name: registryPool?.name ?? 'Curve Pool',
      chain: chain as SupportedChainId,
      baseAPY,
      boostedAPY,
      tvl,
      pegDeviation,
      assets: (registryPool?.assets ?? []) as StablecoinAsset[],
      lastUpdated: new Date(),
    };
  }

  async getTopStablePools(chain: Chain): Promise<CurvePoolData[]> {
    // Resolve only if we don't already have activatable entries (avoid CORS in browser)
    if (!this.hasActivatablePools(chain)) {
      try {
        await ensureCurvePoolsResolved(chain as SupportedChainId);
      } catch {}
    }
    const pools = getPoolsForChain(chain as SupportedChainId).filter(isPoolActivatable);
    try {
      console.debug('[Curve] top pools after resolve', {
        chain,
        count: pools.length,
      });
    } catch {}
    const out: CurvePoolData[] = [];
    for (const p of pools) {
      try {
        const row = await this.getPoolData(chain, getAddress(p.poolAddress!) as `0x${string}`);
        out.push(row);
      } catch (e) {
        console.warn('[Curve] getTopStablePools skip', { chain, name: p.name, e });
      }
    }
    // Sort by boosted APY desc
    out.sort((a, b) => b.boostedAPY - a.boostedAPY);
    return out;
  }

  async getPoolsByAssets(chain: Chain, assets: StablecoinAsset[]): Promise<CurvePoolData[]> {
    if (!this.hasActivatablePools(chain)) {
      try {
        await ensureCurvePoolsResolved(chain as SupportedChainId);
      } catch {}
    }
    const pools = filterPoolsByAssets(getPoolsForChain(chain as SupportedChainId), assets).filter(
      isPoolActivatable
    );
    try {
      console.debug('[Curve] pools by assets', {
        chain,
        assets,
        count: pools.length,
      });
    } catch {}
    const out: CurvePoolData[] = [];
    for (const p of pools) {
      try {
        const row = await this.getPoolData(chain, getAddress(p.poolAddress!) as `0x${string}`);
        out.push(row);
      } catch (e) {
        console.warn('[Curve] getPoolsByAssets skip', { chain, name: p.name, e });
      }
    }
    out.sort((a, b) => b.boostedAPY - a.boostedAPY);
    return out;
  }

  async fetchData(chains: Chain[], assets: StablecoinAsset[]): Promise<CurvePoolData[]> {
    const out: CurvePoolData[] = [];
    for (const c of chains) {
      if (!this.isSupported(c)) continue;
      // Resolve only if necessary to avoid CORS in the browser
      if (!this.hasActivatablePools(c)) {
        try {
          await ensureCurvePoolsResolved(c as SupportedChainId);
        } catch {}
      }
      // 1) Try asset-filtered activatable pools
      let pools = filterPoolsByAssets(getPoolsForChain(c as SupportedChainId), assets).filter(
        isPoolActivatable
      );
      // 2) Fallback: if none matched the selected assets, try all curated activatable pools
      if (!pools.length) {
        pools = getPoolsForChain(c as SupportedChainId).filter(isPoolActivatable);
      }
      try {
        console.debug('[Curve] fetchData pools', {
          chain: c,
          selectedAssets: assets,
          activatable: pools.length,
        });
      } catch {}
      for (const p of pools) {
        try {
          const row = await this.getPoolData(c, getAddress(p.poolAddress!) as `0x${string}`);
          out.push(row);
        } catch (e) {
          console.warn('[Curve] fetchData skip', { chain: c, name: p.name, e });
        }
      }
    }
    out.sort((a, b) => b.boostedAPY - a.boostedAPY);
    return out;
  }

  isSupported(chain: Chain): boolean {
    return this.clients.has(chain);
  }

  getUpdateInterval(): number {
    return this.config.updateInterval;
  }
}

// Export a default instance
export const curveDataProvider = new CurveOnChainDataProvider();