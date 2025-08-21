// Core calculation utilities for looping, spreads, health factor, and depeg stress

import type {
  APYBreakdown,
  CalculationResult,
  CalculationWarning,
  HealthFactorParams,
  DepegStressTest,
} from '@/types/calculations';

// Small epsilon for float comparisons
const EPS = 1e-12;

// Sum of geometric series: 1 + r + r^2 + ... + r^n
function geometricSeriesSum(r: number, n: number): number {
  if (n < 0) return 0;
  if (Math.abs(r - 1) < EPS) return n + 1;
  return (1 - Math.pow(r, n + 1)) / (1 - r);
}

/**
 * Net spread (simple): supply - borrow
 * Both APYs are decimal rates (e.g., 0.05 for 5%)
 */
export function calculateNetSpread(supplyAPY: number, borrowAPY: number): number {
  return supplyAPY - borrowAPY;
}

/**
 * Calculate multi-loop net APY using geometric series.
 * APYs are decimals (e.g., 0.05 = 5%).
 * ltv is provided in percent (e.g., 80 for 80%).
 * loops is the number of loops (1-5 typically).
 *
 * Model:
 * - Supply multiple = 1 + l + l^2 + ... + l^loops
 * - Borrow multiple = l + l^2 + ... + l^loops = Supply multiple - 1
 * where l = ltv / 100
 */
export function calculateLoopAPY(params: {
  supplyAPY: number;
  borrowAPY: number;
  ltv: number; // percent (0-100)
  loops: number; // integer >= 0
}): CalculationResult<APYBreakdown> {
  const { supplyAPY, borrowAPY } = params;
  const ltvPct = Math.max(0, Math.min(100, params.ltv));
  const loops = Math.max(0, Math.floor(params.loops));

  const l = ltvPct / 100;
  const supplyMultiple = geometricSeriesSum(l, loops);
  const borrowMultiple = Math.max(0, supplyMultiple - 1); // l + l^2 + ... + l^loops

  const grossAPY = supplyAPY * supplyMultiple;
  const borrowCost = borrowAPY * borrowMultiple;
  const netAPY = grossAPY - borrowCost;

  const warnings: CalculationWarning[] = [];
  if (supplyAPY <= borrowAPY) {
    warnings.push('NEGATIVE_SPREAD');
  }

  const breakdown: APYBreakdown = {
    baseSupplyAPY: supplyAPY,
    baseBorrowAPY: borrowAPY,
    leverageMultiplier: supplyMultiple,
    grossAPY,
    borrowCost,
    netAPY,
    spreadAPY: calculateNetSpread(supplyAPY, borrowAPY),
  };

  return {
    data: breakdown,
    warnings,
    errors: [],
    timestamp: new Date(),
  };
}

/**
 * Estimate Health Factor (HF) using:
 * HF = (totalCollateralETH * liquidationThreshold%) / totalDebtETH
 * - liquidationThreshold is in percent (0-100)
 * - If totalDebtETH is 0 -> return Infinity
 */
export function estimateHealthFactor(params: HealthFactorParams): number {
  const { totalCollateralETH, totalDebtETH, liquidationThreshold } = params;

  if (totalDebtETH === 0n) {
    return Number.POSITIVE_INFINITY;
  }

  const lt = Math.max(0, Math.min(100, liquidationThreshold)) / 100;
  const collateral = Number(totalCollateralETH);
  const debt = Number(totalDebtETH);

  if (debt <= 0) return Number.POSITIVE_INFINITY;
  return (collateral * lt) / debt;
}

/**
 * Run a simple depeg stress on collateral to approximate HF impact.
 * Applies a percentage change to collateral and recomputes HF.
 */
export function runDepegStress(
  hfParams: HealthFactorParams,
  stressPercentage: number, // e.g., 0.5 for 0.5%
  direction: 'up' | 'down',
): DepegStressTest {
  const pct = Math.max(0, stressPercentage) / 100;
  const factor = direction === 'down' ? 1 - pct : 1 + pct;

  const stressedCollateral = BigInt(
    Math.max(0, Math.floor(Number(hfParams.totalCollateralETH) * factor)),
  );

  const stressed: HealthFactorParams = {
    totalCollateralETH: stressedCollateral,
    totalDebtETH: hfParams.totalDebtETH,
    liquidationThreshold: hfParams.liquidationThreshold,
  };

  const resultingHealthFactor = estimateHealthFactor(stressed);

  const riskLevel =
    resultingHealthFactor < 1
      ? 'critical'
      : resultingHealthFactor < 1.1
      ? 'high'
      : resultingHealthFactor < 1.3
      ? 'medium'
      : 'low';

  const test: DepegStressTest = {
    basePrice: 1,
    stressPercentage,
    direction,
    resultingHealthFactor,
    liquidationRisk: {
      healthFactor: resultingHealthFactor,
      liquidationPrice: 0,
      riskLevel,
      warningMessage:
        resultingHealthFactor < 1
          ? 'Position at risk of liquidation under stress.'
          : undefined,
    },
  };

  return test;
}