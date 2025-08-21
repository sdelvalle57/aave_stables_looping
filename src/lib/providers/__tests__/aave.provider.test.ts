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

import { CONTRACT_ADDRESSES } from '../../chains';

// Import after mocks are registered
import { aaveDataProvider } from '../aave';

describe('AaveV3DataProvider URL calls', () => {
  beforeEach(() => {
    mocks.readContractMock.mockReset();
    mocks.createPublicClientMock.mockClear();
    mocks.httpMock.mockClear();
  });

  it('calls UiPoolDataProviderV3.getReservesData with correct address/args and parses reserve data', async () => {
    // Arrange: mock getReservesData return shape
    const USDC = '0xA0b86991C6218b36c1d19D4a2e9Eb0cE3606eB48'.toLowerCase();
    const reservesArray = [
      {
        underlyingAsset: USDC,
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        baseLTVasCollateral: 8000n,
        reserveLiquidationThreshold: 8500n,
        reserveLiquidationBonus: 10500n,
        reserveFactor: 1000n,
        usageAsCollateralEnabled: true,
        borrowingEnabled: true,
        stableBorrowRateEnabled: false,
        isActive: true,
        isFrozen: false,
        liquidityIndex: 0n,
        variableBorrowIndex: 0n,
        liquidityRate: 5_000_000_000_000_000_000_000_0000n, // 0.05 RAY
        variableBorrowRate: 3_000_000_000_000_000_000_000_0000n, // 0.03 RAY
        stableBorrowRate: 0n,
        lastUpdateTimestamp: 0,
        aTokenAddress: '0x0000000000000000000000000000000000000000',
        stableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
        variableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
        interestRateStrategyAddress: '0x0000000000000000000000000000000000000000',
        availableLiquidity: 1_000_000_000n,
        totalPrincipalStableDebt: 100_000_000n,
        averageStableRate: 0n,
        stableDebtLastUpdateTimestamp: 0n,
        totalScaledVariableDebt: 300_000_000n,
        priceInMarketReferenceCurrency: 0n,
        priceOracle: '0x0000000000000000000000000000000000000000',
        eModeCategoryId: 1,
        borrowCap: 10_000_000n,
        supplyCap: 20_000_000n,
      },
    ];

    mocks.readContractMock.mockResolvedValueOnce([reservesArray, {}]);

    // Act
    const chainId = 1;
    const result = await aaveDataProvider.getReserveData(chainId, 'USDC');

    // Assert: readContract invocation
    expect(mocks.readContractMock).toHaveBeenCalledTimes(1);
    const callArgs = mocks.readContractMock.mock.calls[0][0];
    expect(callArgs.address).toBe(CONTRACT_ADDRESSES[1].aaveUiPoolDataProvider);
    expect(callArgs.functionName).toBe('getReservesData');
    expect(callArgs.args).toBeDefined();
    expect(callArgs.args[0]).toBeDefined();

    // Assert: parsed values
    expect(result.protocol).toBe('aave');
    expect(result.asset).toBe('USDC');
    expect(result.chain).toBe(1);
    expect(result.supplyAPY).toBeGreaterThan(0.049);
    expect(result.supplyAPY).toBeLessThan(0.051);
    expect(result.borrowAPY).toBeGreaterThan(0.029);
    expect(result.borrowAPY).toBeLessThan(0.031);
    expect(typeof result.utilization).toBe('number');
    expect(result.totalSupply).toBeTypeOf('bigint');
    expect(result.totalBorrow).toBeTypeOf('bigint');
    expect(result.supplyCap).toBeTypeOf('bigint');
    expect(result.borrowCap).toBeTypeOf('bigint');
    // eMode mapped to optional
    expect(result.eModeCategory).toBe(1);
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
    expect(args.address).toBe(CONTRACT_ADDRESSES[1].aaveUiPoolDataProvider);
    expect(args.functionName).toBe('getReservesList');
    expect(Array.isArray(addrs)).toBe(true);
    expect(addrs.length).toBe(2);
    expect(addrs[0]).toBe(list[0]);
  });
});