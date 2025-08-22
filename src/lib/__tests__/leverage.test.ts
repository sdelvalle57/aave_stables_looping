/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import {
  geometricSeriesSum,
  leverageFromLTVPercent,
  invertLeverageToLTVPercent,
  computeTotals,
} from '../leverage';

describe('geometric series and leverage helpers', () => {
  it('geometricSeriesSum matches manual sum', () => {
    const l = 0.8;
    const n = 3;
    const expected = 1 + l + l * l + l * l * l; // 1 + 0.8 + 0.64 + 0.512 = 2.952
    expect(geometricSeriesSum(l, n)).toBeCloseTo(expected, 12);
  });

  it('leverageFromLTVPercent computes S = 1 + l + ... + l^N for percent LTV', () => {
    const S = leverageFromLTVPercent(80, 3);
    expect(S).toBeCloseTo(2.952, 12);
  });

  it('invertLeverageToLTVPercent inverts leverage back to original LTV within tolerance', () => {
    const loops = 3;
    const ltv = 80;
    const S = leverageFromLTVPercent(ltv, loops);
    const inv = invertLeverageToLTVPercent(S, loops, { tolerance: 1e-8, maxIterations: 64 });
    expect(inv).toBeCloseTo(ltv, 3);
  });

  it('invertLeverageToLTVPercent clamps for extreme S', () => {
    // For loops=3, max S as l->1 is 4. Target beyond should clamp near 100.
    const inv = invertLeverageToLTVPercent(10, 3);
    expect(inv).toBeGreaterThan(90);
  });

  it('computeTotals produces consistent totals with leverage multiplier', () => {
    const principal = 10_000;
    const ltv = 80; // %
    const loops = 3;
    const { supplyMultiple, borrowMultiple, totalSupplied, totalBorrowed } = computeTotals(
      principal,
      ltv,
      loops
    );

    expect(supplyMultiple).toBeCloseTo(2.952, 12);
    expect(borrowMultiple).toBeCloseTo(1.952, 12);
    expect(totalSupplied).toBeCloseTo(29_520, 6);
    expect(totalBorrowed).toBeCloseTo(19_520, 6);
  });

  it('monotonic relation: higher target S => higher inferred LTV (fixed loops)', () => {
    const loops = 2;
    const ltv1 = invertLeverageToLTVPercent(1.5, loops);
    const ltv2 = invertLeverageToLTVPercent(2.0, loops);
    expect(ltv2).toBeGreaterThan(ltv1);
  });
});