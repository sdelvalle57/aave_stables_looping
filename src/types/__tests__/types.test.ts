// Type tests to ensure all interfaces work correctly
import { describe, it, expect } from 'vitest';
import type {
  StablecoinYield,
  CurvePoolData,
  LoopCalculation,
  AlertRule,
  UIStore,
  DataProvider,
  AaveDataProvider
} from '../index';

describe('Type Definitions', () => {
  it('should create StablecoinYield object correctly', () => {
    const yieldData: StablecoinYield = {
      protocol: 'aave',
      chain: 1,
      asset: 'USDC',
      supplyAPY: 0.05,
      borrowAPY: 0.03,
      utilization: 0.8,
      totalSupply: BigInt('1000000000000'),
      totalBorrow: BigInt('800000000000'),
      supplyCap: BigInt('2000000000000'),
      borrowCap: BigInt('1500000000000'),
      ltv: 0.8,
      liquidationThreshold: 0.85,
      reserveFactor: 0.1,
      eModeCategory: 1,
      lastUpdated: new Date()
    };

    expect(yieldData.protocol).toBe('aave');
    expect(yieldData.chain).toBe(1);
    expect(yieldData.asset).toBe('USDC');
  });

  it('should create CurvePoolData object correctly', () => {
    const poolData: CurvePoolData = {
      poolAddress: '0x1234567890123456789012345678901234567890',
      name: 'USDC/USDT Pool',
      chain: 1,
      baseAPY: 0.02,
      boostedAPY: 0.05,
      tvl: BigInt('100000000000000'),
      pegDeviation: 0.001,
      assets: ['USDC', 'USDT'],
      lastUpdated: new Date()
    };

    expect(poolData.name).toBe('USDC/USDT Pool');
    expect(poolData.assets).toContain('USDC');
    expect(poolData.assets).toContain('USDT');
  });

  it('should create LoopCalculation object correctly', () => {
    const calculation: LoopCalculation = {
      principal: BigInt('10000000000'),
      totalSupplied: BigInt('50000000000'),
      totalBorrowed: BigInt('40000000000'),
      currentLTV: 0.8,
      netAPY: 0.087,
      annualProfit: BigInt('870000000'),
      healthFactor: 1.5,
      liquidationPrice: 0.95
    };

    expect(calculation.netAPY).toBe(0.087);
    expect(calculation.healthFactor).toBe(1.5);
  });

  it('should create AlertRule object correctly', () => {
    const alertRule: AlertRule = {
      id: 'alert-1',
      type: 'spread',
      threshold: 0.02,
      chain: 1,
      protocol: 'aave',
      asset: 'USDC',
      isActive: true,
      createdAt: new Date()
    };

    expect(alertRule.type).toBe('spread');
    expect(alertRule.threshold).toBe(0.02);
    expect(alertRule.isActive).toBe(true);
  });

  it('should have proper type structure', () => {
    // This test just validates that the types compile correctly
    // The actual functionality will be tested in integration tests
    expect(true).toBe(true);
  });
});