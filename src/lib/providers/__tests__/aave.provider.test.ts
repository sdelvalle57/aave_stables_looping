/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use hoisted mocks so vi.mock factories can reference them safely
const mocks = vi.hoisted(() => {
  const readContractMock = vi.fn();
  const createPublicClientMock = vi.fn(() => ({ readContract: readContractMock }));
  const httpMock = vi.fn((url: string) => ({ url }));
  return { readContractMock, createPublicClientMock, httpMock };
});

// Mock viem before importing the SUT so constructor wiring uses our stubs
vi.mock('viem', () => ({
  createPublicClient: mocks.createPublicClientMock,
  http: mocks.httpMock,
  // Minimal getAddress passthrough for tests (no checksum enforcement needed here)
  getAddress: (addr: string) => addr,
}));

 // (removed) not needed after ProtocolDataProvider path switch

// Import after mocks are registered
import { aaveDataProvider } from '../aave';

describe('AaveV3DataProvider URL calls', () => {
  beforeEach(() => {
    mocks.readContractMock.mockReset();
    mocks.createPublicClientMock.mockClear();
    mocks.httpMock.mockClear();
  });

  it('fetches reserve data via ProtocolDataProvider and maps borrowable/config fields correctly', async () => {
    // Arrange ProtocolDataProvider path mocks:
    // 1) getPoolDataProvider -> returns PDP address
    const PDP = '0x1111111111111111111111111111111111111111' as const;
    mocks.readContractMock.mockResolvedValueOnce(PDP);

    // 2) getReserveData -> tuple-like object
    const rd = {
      unbacked: 0n,
      accruedToTreasuryScaled: 0n,
      totalAToken: 1_000_000n,
      totalStableDebt: 200_000n,
      totalVariableDebt: 300_000n,
      liquidityRate: 5_000_000_000_000_000_000_000_0000n, // 0.05
      variableBorrowRate: 3_000_000_000_000_000_000_000_0000n, // 0.03
      stableBorrowRate: 0n,
      averageStableBorrowRate: 0n,
      liquidityIndex: 0n,
      variableBorrowIndex: 0n,
      lastUpdateTimestamp: 0n,
    };

    // 3) getReserveCaps
    const caps = {
      borrowCap: 10_000_000n,
      supplyCap: 20_000_000n,
    };

    // 4) getReserveConfigurationData (includes borrowingEnabled)
    const config = {
      decimals: 6n,
      ltv: 8000n,
      liquidationThreshold: 8500n,
      liquidationBonus: 10500n,
      reserveFactor: 1000n,
      usageAsCollateralEnabled: true,
      borrowingEnabled: true,
      stableBorrowRateEnabled: false,
      isActive: true,
      isFrozen: false,
    };

    // Push rd, caps, config in the same order our implementation calls them
    mocks.readContractMock.mockResolvedValueOnce(rd);   // getReserveData
    mocks.readContractMock.mockResolvedValueOnce(caps); // getReserveCaps
    mocks.readContractMock.mockResolvedValueOnce(config); // getReserveConfigurationData

    // Act
    const chainId = 1;
    const result = await aaveDataProvider.getReserveData(chainId, 'USDC');

    // Assert: function names in sequence (first call must be getPoolDataProvider)
    expect(mocks.readContractMock).toHaveBeenCalled();
    const first = mocks.readContractMock.mock.calls[0][0];
    expect(first.functionName).toBe('getPoolDataProvider');

    // Assert: parsed values are sane and borrowable mapped
    expect(result.protocol).toBe('aave');
    expect(result.asset).toBe('USDC');
    expect(result.chain).toBe(1);
    expect(result.supplyAPY).toBeGreaterThan(0.049);
    expect(result.supplyAPY).toBeLessThan(0.051);
    expect(result.borrowAPY).toBeGreaterThan(0.029);
    expect(result.borrowAPY).toBeLessThan(0.031);
    expect(result.totalSupply).toBe(1_000_000n);
    expect(result.totalBorrow).toBe(500_000n);
    expect(result.supplyCap).toBe(20_000_000n * 10n ** 6n);
    expect(result.borrowCap).toBe(10_000_000n * 10n ** 6n);
    expect(result.ltv).toBeCloseTo(80);
    expect(result.liquidationThreshold).toBeCloseTo(85);
    expect(result.reserveFactor).toBeCloseTo(10);
    expect(result.borrowable).toBe(true);
  });

  it('calls UiPoolDataProviderV3.getReservesList and returns addresses', async () => {
    // Arrange: mock getReservesList values
    const list = [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
    ] as const;
    mocks.readContractMock.mockResolvedValueOnce(list);

    // Act
    const addrs = await aaveDataProvider.getReservesList(1);

    // Assert
    expect(mocks.readContractMock).toHaveBeenCalledTimes(1);
    const args = mocks.readContractMock.mock.calls[0][0];
    expect(args.functionName).toBe('getReservesList');
    expect(Array.isArray(addrs)).toBe(true);
    expect(addrs.length).toBe(2);
    expect(addrs[0]).toBe(list[0]);
  });
});