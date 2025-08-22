/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import { buildLoopRowsFromYields, type EModeMap } from '../loopMonitor.util';
import type { StablecoinYield, EModeCategory, StablecoinAsset } from '../../types';

const chain = 1 as const;

function mkYield(p: Partial<StablecoinYield>): StablecoinYield {
  return {
    protocol: 'aave',
    chain,
    asset: 'USDC',
    supplyAPY: 0.05,
    borrowAPY: 0.03,
    utilization: 80, // percent
    totalSupply: 1_000_000n,
    totalBorrow: 500_000n,
    supplyCap: 10_000_000n,
    borrowCap: 5_000_000n,
    borrowable: true,
    ltv: 80, // percent
    liquidationThreshold: 85, // percent
    reserveFactor: 10,
    eModeCategory: 1,
    lastUpdated: new Date(),
    ...p,
  };
}

describe('buildLoopRowsFromYields', () => {
  it('builds pairwise rows including same-asset pairs and sorts by net spread desc then utilization asc', () => {
    const usdc = mkYield({
      asset: 'USDC',
      supplyAPY: 0.06, // 6%
      borrowAPY: 0.03, // 3%
      utilization: 70,
      totalSupply: 2_000_000n,
      totalBorrow: 800_000n,
      supplyCap: 10_000_000n,
      borrowCap: 6_000_000n,
      eModeCategory: 1,
    });

    const usdt = mkYield({
      asset: 'USDT',
      supplyAPY: 0.05,
      borrowAPY: 0.035,
      utilization: 90, // high
      totalSupply: 1_000_000n,
      totalBorrow: 900_000n,
      supplyCap: 5_000_000n,
      borrowCap: 4_000_000n,
      // test missing explicit borrowable -> fallback heuristic should kick in
      borrowable: undefined,
      eModeCategory: 1,
    });

    const yields: StablecoinYield[] = [usdc, usdt];
    const selectedAssets: StablecoinAsset[] = ['USDC', 'USDT', 'DAI']; // DAI absent -> filtered out

    // E-Mode stable category
    const cats: EModeCategory[] = [
      { id: 1, ltv: 93, liquidationThreshold: 95, liquidationBonus: 1, priceSource: '0x0000000000000000000000000000000000000000', label: 'Stablecoins' },
    ];
    const eModeByChain: EModeMap = new Map([[chain, cats]]);

    const rows = buildLoopRowsFromYields(yields, eModeByChain, selectedAssets);

    // Should include four combinations: USDC->USDC, USDC->USDT, USDT->USDC, USDT->USDT
    expect(rows.length).toBe(4);

    // Find a specific pair row USDC (supply) -> USDT (borrow)
    const rowUSDC_USDT = rows.find(r => r.supplyAsset === 'USDC' && r.borrowAsset === 'USDT');
    expect(rowUSDC_USDT).toBeTruthy();

    // Utilization taken from borrow asset (USDT)
    expect(rowUSDC_USDT!.utilization).toBe(usdt.utilization);

    // Net spread = supplyAPY (USDC) - borrowAPY (USDT)
    expect(rowUSDC_USDT!.netSpread).toBeCloseTo(usdc.supplyAPY - usdt.borrowAPY, 10);

    // Caps usage percentages computed correctly
    // supplyCapUsedPct uses the supply asset (USDC) totals
    const expectedSupplyPct = Number((usdc.totalSupply * 10000n) / usdc.supplyCap) / 100;
    // borrowCapUsedPct uses the borrow asset (USDT) totals
    const expectedBorrowPct = Number((usdt.totalBorrow * 10000n) / usdt.borrowCap) / 100;
    expect(rowUSDC_USDT!.supplyCapUsedPct).toBeCloseTo(expectedSupplyPct, 6);
    expect(rowUSDC_USDT!.borrowCapUsedPct).toBeCloseTo(expectedBorrowPct, 6);

    // E-Mode values from shared category (id 1)
    expect(rowUSDC_USDT!.eModeLTV).toBe(93);
    expect(rowUSDC_USDT!.eModeLT).toBe(95);
    expect(rowUSDC_USDT!.eModeCategoryId).toBe(1);

    // Borrowable: explicit or heuristic fallback
    // For USDT row borrowable should be true due to borrowCap > 0 and non-negative APY
    expect(rowUSDC_USDT!.borrowable).toBe(true);

    // Sorting: rows should be ordered by netSpread desc; compute spreads
    const spreads = rows.map(r => r.netSpread);
    const sortedSpreads = [...spreads].sort((a, b) => b - a);
    expect(spreads).toEqual(sortedSpreads);
  });

  it('falls back to base LTV/LT when shared E-Mode category is not present', () => {
    const dai = mkYield({
      asset: 'DAI',
      supplyAPY: 0.04,
      borrowAPY: 0.03,
      utilization: 50,
      ltv: 75,
      liquidationThreshold: 80,
      eModeCategory: undefined, // no category
    });

    const usdc = mkYield({
      asset: 'USDC',
      supplyAPY: 0.05,
      borrowAPY: 0.03,
      utilization: 60,
      ltv: 80,
      liquidationThreshold: 85,
      eModeCategory: 1,
    });

    const rows = buildLoopRowsFromYields([dai, usdc], new Map([[chain, []]]), ['DAI', 'USDC']);

    const rowDAI_USDC = rows.find(r => r.supplyAsset === 'DAI' && r.borrowAsset === 'USDC');
    expect(rowDAI_USDC).toBeTruthy();
    // No shared category -> use base values from supply asset (DAI)
    expect(rowDAI_USDC!.eModeLTV).toBe(75);
    expect(rowDAI_USDC!.eModeLT).toBe(80);
    expect(rowDAI_USDC!.eModeCategoryId).toBeUndefined();
  });
});