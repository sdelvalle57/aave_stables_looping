/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';

import {
  percentBigInt,
  supplyCapUsedPct,
  borrowCapUsedPct,
} from '../utils';

import {
  calculateNetSpread,
  calculateLoopAPY,
  estimateHealthFactor,
  runDepegStress,
} from '../calculations';

describe('Cap usage helpers', () => {
  it('percentBigInt computes percentage correctly', () => {
    expect(percentBigInt(50n, 100n)).toBeCloseTo(50, 6);
    expect(percentBigInt(1n, 3n)).toBeCloseTo(33.33, 2); // ~33.33%
  });

  it('percentBigInt handles zero denominator', () => {
    expect(percentBigInt(1n, 0n)).toBe(0);
    expect(percentBigInt(0n, 0n)).toBe(0);
  });

  it('percentBigInt clamps to [0, 100]', () => {
    expect(percentBigInt(200n, 100n)).toBe(100);
    expect(percentBigInt(0n, 100n)).toBe(0);
  });

  it('supply/borrow cap used pct delegate to percentBigInt', () => {
    expect(supplyCapUsedPct(25n, 100n)).toBeCloseTo(25, 6);
    expect(borrowCapUsedPct(75n, 100n)).toBeCloseTo(75, 6);
  });
});

describe('Loop & spread calculations', () => {
  it('calculateNetSpread returns supply - borrow', () => {
    expect(calculateNetSpread(0.05, 0.03)).toBeCloseTo(0.02, 6);
    expect(calculateNetSpread(0.03, 0.05)).toBeCloseTo(-0.02, 6);
  });

  it('calculateLoopAPY computes multi-loop APY (ltv in percent)', () => {
    const res = calculateLoopAPY({
      supplyAPY: 0.05,
      borrowAPY: 0.03,
      ltv: 80, // 80%
      loops: 3,
    });
    // Using geometric series model:
    // l = 0.8; supplyMultiple = 1 + l + l^2 + l^3 = 2.952
    // grossAPY = 0.05 * 2.952 = 0.1476
    // borrowMultiple = supplyMultiple - 1 = 1.952
    // borrowCost = 0.03 * 1.952 = 0.05856
    // netAPY ≈ 0.08904
    expect(res.data.netAPY).toBeCloseTo(0.08904, 4);
    expect(res.warnings).not.toContain('NEGATIVE_SPREAD');
    expect(res.data.leverageMultiplier).toBeGreaterThan(1);
  });

  it('calculateLoopAPY warns on negative base spread (resupply < borrow)', () => {
    const res = calculateLoopAPY({
      supplyAPY: 0.02,
      borrowAPY: 0.04,
      ltv: 80,
      loops: 1,
    });
    // With l=0.8 & 1 loop, geometric series can still produce a small positive net APY.
    // We only require the NEGATIVE_SPREAD warning to be present.
    expect(res.warnings).toContain('NEGATIVE_SPREAD');
  });
});

describe('Health factor and depeg stress', () => {
  it('estimateHealthFactor computes HF with LT%', () => {
    const hf = estimateHealthFactor({
      totalCollateralETH: 1000n,
      totalDebtETH: 500n,
      liquidationThreshold: 85, // %
    });
    // HF = (1000 * 0.85) / 500 = 1.7
    expect(hf).toBeCloseTo(1.7, 6);
  });

  it('runDepegStress applies stress to collateral and recomputes HF', () => {
    const hfParams = {
      totalCollateralETH: 1000n,
      totalDebtETH: 500n,
      liquidationThreshold: 85,
    };
    const stress = runDepegStress(hfParams, 1, 'down'); // -1% collateral
    // Collateral ~ 990 => HF ≈ (990*0.85)/500 = 1.683
    expect(stress.direction).toBe('down');
    expect(stress.resultingHealthFactor).toBeCloseTo(1.683, 3);
    expect(['low', 'medium', 'high', 'critical']).toContain(stress.liquidationRisk.riskLevel);
  });
});