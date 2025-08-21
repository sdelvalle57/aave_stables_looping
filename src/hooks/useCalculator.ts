import { useMemo } from 'react';
import type {
  LoopCalculatorParams,
  HealthFactorParams,
  CalculationResult,
  APYBreakdown,
} from '@/types';
import { useUIStore } from '@/store/ui';
import {
  calculateNetSpread,
  calculateLoopAPY,
  estimateHealthFactor,
  runDepegStress,
} from '@/lib/calculations';

export interface UseNetSpreadResult {
  netAPY: number;
  hasNegativeSpread: boolean;
}

/**
 * Compute net spread = supply - borrow (APYs as decimals e.g. 0.05 = 5%)
 */
export function useNetSpread(supplyAPY: number, borrowAPY: number): UseNetSpreadResult {
  return useMemo(() => {
    const net = calculateNetSpread(supplyAPY, borrowAPY);
    return {
      netAPY: net,
      hasNegativeSpread: supplyAPY <= borrowAPY,
    };
  }, [supplyAPY, borrowAPY]);
}

export interface UseLoopCalculationParams {
  supplyAPY: number; // decimal
  borrowAPY: number; // decimal
  ltvPercent: number; // 0..100
  loops: number; // 0..N
}

export interface UseLoopCalculationResult extends CalculationResult<APYBreakdown> {}

/**
 * Compute looped net APY using geometric series (APYs as decimals)
 */
export function useLoopCalculation(params: UseLoopCalculationParams): UseLoopCalculationResult {
  const { supplyAPY, borrowAPY, ltvPercent, loops } = params;
  return useMemo(
    () =>
      calculateLoopAPY({
        supplyAPY,
        borrowAPY,
        ltv: ltvPercent,
        loops,
      }),
    [supplyAPY, borrowAPY, ltvPercent, loops]
  );
}

export interface UseHealthFactorParams extends HealthFactorParams {}
export interface UseHealthFactorResult {
  healthFactor: number;
}

/**
 * Estimate health factor
 */
export function useHealthFactor(params: UseHealthFactorParams): UseHealthFactorResult {
  return useMemo(
    () => ({
      healthFactor: estimateHealthFactor(params),
    }),
    [params.totalCollateralETH, params.totalDebtETH, params.liquidationThreshold]
  );
}

export interface UseDepegStressParams extends HealthFactorParams {
  stressPercentage: number; // e.g. 0.5 for 0.5%
  direction: 'up' | 'down';
}

export function useDepegStress(params: UseDepegStressParams) {
  const { stressPercentage, direction, ...hf } = params;
  return useMemo(() => runDepegStress(hf, stressPercentage, direction), [hf, stressPercentage, direction]);
}

/**
 * Integration point bound to UI store: consume calculatorParams and produce loop calc skeletons.
 * Note: This hook requires external APY inputs (supply/borrow) from current selected market.
 * Compose it in pages by pulling APYs from providers and passing them here.
 */
export function useCalculatorFromStore(apy: { supplyAPY: number; borrowAPY: number }) {
  const params = useUIStore((s) => s.calculatorParams) as LoopCalculatorParams;

  // Convert LTV percent from store (already 0..100 per schema)
  const loopCalc = useLoopCalculation({
    supplyAPY: apy.supplyAPY,
    borrowAPY: apy.borrowAPY,
    ltvPercent: params.targetLTV,
    loops: params.loops,
  });

  const spread = useNetSpread(apy.supplyAPY, apy.borrowAPY);

  return {
    params,
    loopCalc,
    spread,
  };
}