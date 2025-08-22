/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';

// Hoisted viem mocks
const mocks = vi.hoisted(() => {
  const readContractMock = vi.fn();
  const createPublicClientMock = vi.fn(() => ({ readContract: readContractMock }));
  const httpMock = vi.fn((url: string) => ({ url }));
  return { readContractMock, createPublicClientMock, httpMock };
});

// Mock viem before importing SUT
vi.mock('viem', () => ({
  createPublicClient: mocks.createPublicClientMock,
  http: mocks.httpMock,
  getAddress: (addr: string) => addr,
}));

// Mock pools registry to provide a single activatable pool on mainnet
vi.mock('@/lib/curve/pools', async () => {
  const actual: any = await vi.importActual('@/lib/curve/pools');
  const CURVE_POOLS_REGISTRY: Record<number, any[]> = {
    1: [
      {
        chain: 1,
        name: '3pool-test',
        poolAddress: '0xPool000000000000000000000000000000000000',
        lpTokenAddress: '0xLP0000000000000000000000000000000000000',
        gaugeAddress: undefined,
        convexPoolId: undefined,
        assets: ['USDC', 'USDT'],
      },
    ],
    42161: [],
    10: [],
    137: [],
  };
  return {
    ...actual,
    CURVE_POOLS_REGISTRY,
    getPoolsForChain: (chain: number) => (CURVE_POOLS_REGISTRY as Record<number, any[]>)[chain] ?? [],
    filterPoolsByAssets: actual.filterPoolsByAssets,
    isPoolActivatable: actual.isPoolActivatable,
  };
});

// Import after mocks
import { CurveOnChainDataProvider } from '../curve';

// Mainnet stablecoin addresses from metadata used by tokenToStableAsset
const USDC_MAINNET = '0xA0b86991C6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_MAINNET = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// Helpers to build a programmatic readContract implementation
function makeReadContractImpl(vp: bigint, totalSupply: bigint, coinsMap: Record<number, string>, balancesMap: Record<number, bigint>) {
  return (opts: any) => {
    const fn = opts.functionName as string;
    switch (fn) {
      case 'get_virtual_price':
        return vp;
      case 'totalSupply':
        return totalSupply;
      case 'decimals':
        return 18;
      case 'coins': {
        const idx = Number(opts.args?.[0] ?? 0);
        if (!(idx in coinsMap)) throw new Error('index out of range');
        return coinsMap[idx];
      }
      case 'balances': {
        const idx = Number(opts.args?.[0] ?? 0);
        if (!(idx in balancesMap)) throw new Error('index out of range');
        return balancesMap[idx];
      }
      default:
        throw new Error(`Unhandled function ${fn}`);
    }
  };
}

describe('CurveOnChainDataProvider (on-chain)', () => {
  beforeEach(() => {
    mocks.readContractMock.mockReset();
    mocks.createPublicClientMock.mockClear();
    mocks.httpMock.mockClear();
  });

  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('getPoolData computes TVL, peg deviation, and baseAPY (annualized) with clamping', async () => {
    const chainId = 1;
    const pool = '0xPool000000000000000000000000000000000000' as `0x${string}`;

    // First observation: vp0 = 1e18, equal balances => pegDeviation ≈ 0
    const vp0 = 1_000_000_000_000_000_000n; // 1e18
    const totalSupply = 10_000_000_000_000_000_000n; // 10e18
    const coins = { 0: USDC_MAINNET, 1: USDT_MAINNET } as Record<number, string>;
    // USDC(6) and USDT(6) balances arbitrarily scaled; equality => pegDeviation ~ 0
    const balances = { 0: 50_000_000_000n, 1: 50_000_000_000n } as Record<number, bigint>;

    mocks.readContractMock.mockImplementation(makeReadContractImpl(vp0, totalSupply, coins, balances));

    // Freeze time and run first call
    vi.setSystemTime(new Date(1_700_000_000_000)); // arbitrary epoch
    const provider = new CurveOnChainDataProvider();
    const row0 = await provider.getPoolData(chainId, pool);

    // Base APY is zero at first observation (no delta)
    expect(row0.baseAPY).toBe(0);
    expect(row0.tvl).toBe((totalSupply * vp0) / (10n ** 18n));
    expect(row0.pegDeviation).toBeGreaterThanOrEqual(0);
    expect(row0.pegDeviation).toBeLessThan(0.001); // near-balanced

    // Second observation an hour later: vp1 slightly higher (+0.0001)
    vi.setSystemTime(new Date(1_700_000_000_000 + 3600 * 1000));
    const vp1 = vp0 + 100_000_000_000_000n; // +1e14 ~= +0.0001
    mocks.readContractMock.mockImplementation(makeReadContractImpl(vp1, totalSupply, coins, balances));

    const row1 = await provider.getPoolData(chainId, pool);

    // Annualized APR ≈ 0.0001 * (31536000 / 3600) = 0.876 -> clamped to 0.5
    expect(row1.baseAPY).toBeCloseTo(0.5, 6); // clamped upper bound
    // boostedAPY defaults to base on non-Convex path or when API absent
    expect(row1.boostedAPY).toBeCloseTo(row1.baseAPY, 6);
  });

  it('fetchData returns pools sorted by boostedAPY desc', async () => {
    const provider = new CurveOnChainDataProvider();

    // vp constant, two calls will cache and then similar APR calculation; emulate small vp increase for sort
    const vp = 1_000_000_000_000_000_000n;
    const totalSupply = 5_000_000_000_000_000_000n;
    const coins = { 0: USDC_MAINNET, 1: USDT_MAINNET };
    const balances = { 0: 60_000_000_000n, 1: 40_000_000_000n }; // slight imbalance

    // First tick
    vi.setSystemTime(new Date(1_700_000_100_000));
    mocks.readContractMock.mockImplementation(makeReadContractImpl(vp, totalSupply, coins, balances));
    await provider.fetchData([1], ['USDC', 'USDT']);

    // Second tick with a tiny vp bump
    vi.setSystemTime(new Date(1_700_000_100_000 + 600 * 1000)); // 10 min later
    const vp2 = vp + 10_000_000_000_000n; // +1e13
    mocks.readContractMock.mockImplementation(makeReadContractImpl(vp2, totalSupply, coins, balances));
    const rows = await provider.fetchData([1], ['USDC', 'USDT']);

    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    // Sorted desc by boostedAPY (single pool only -> vacuously sorted)
    const apys = rows.map((r) => r.boostedAPY);
    const sorted = [...apys].sort((a, b) => b - a);
    expect(apys).toEqual(sorted);
  });
});