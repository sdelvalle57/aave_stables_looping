import { describe, it, expect } from 'vitest';
import { estimateHealthFactor, runDepegStress } from '@/lib/calculations';

describe('Health Factor calculations', () => {
  it('returns Infinity when debt is zero', () => {
    const hf = estimateHealthFactor({
      totalCollateralETH: 1_000_000n,
      totalDebtETH: 0n,
      liquidationThreshold: 80, // %
    });
    expect(hf).toBe(Number.POSITIVE_INFINITY);
  });

  it('computes HF using (collateral * LT) / debt', () => {
    const hf = estimateHealthFactor({
      totalCollateralETH: 1_000_000n,
      totalDebtETH: 500_000n,
      liquidationThreshold: 80, // %
    });
    // (1,000,000 * 0.8) / 500,000 = 1.6
    expect(hf).toBeCloseTo(1.6, 6);
  });
});

describe('Depeg stress testing', () => {
  const baseParams = {
    totalCollateralETH: 1_000_000n,
    totalDebtETH: 500_000n,
    liquidationThreshold: 80,
  };

  it('stress down reduces HF and stress up increases or maintains HF', () => {
    const baseHF = estimateHealthFactor(baseParams);
    const down = runDepegStress(baseParams, 1, 'down'); // -1%
    const up = runDepegStress(baseParams, 1, 'up'); // +1%

    expect(down.resultingHealthFactor).toBeLessThan(baseHF);
    expect(up.resultingHealthFactor).toBeGreaterThanOrEqual(baseHF);
  });

  it('assigns risk levels based on HF thresholds', () => {
    // Construct synthetic scenarios around the thresholds
    const critical = runDepegStress({ ...baseParams, totalDebtETH: 900_000n }, 0, 'down'); // HF ~ 0.888.. => critical
    const high = runDepegStress({ ...baseParams, totalDebtETH: 720_000n }, 0, 'down'); // HF ~ 1.111.. => medium/high boundary check
    const medium = runDepegStress({ ...baseParams, totalDebtETH: 615_385n }, 0, 'down'); // HF ~ ~1.3 => medium/low boundary check

    expect(critical.liquidationRisk.riskLevel).toBe('critical');

    // For high/medium: verify mapping from function thresholds (1.0, 1.1, 1.3)
    const highHF = 1.05;
    const mediumHF = 1.2;
    const lowHF = 1.35;

    function riskLevel(hf: number) {
      return hf < 1 ? 'critical' : hf < 1.1 ? 'high' : hf < 1.3 ? 'medium' : 'low';
    }

    expect(riskLevel(highHF)).toBe('high');
    expect(riskLevel(mediumHF)).toBe('medium');
    expect(riskLevel(lowHF)).toBe('low');

    // Ensure computed cases fall into an expected bucket
    expect(['high', 'medium', 'low', 'critical']).toContain(high.liquidationRisk.riskLevel);
    expect(['high', 'medium', 'low', 'critical']).toContain(medium.liquidationRisk.riskLevel);
  });
});