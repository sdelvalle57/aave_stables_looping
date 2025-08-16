// Types for yield calculations and financial computations

import type { StablecoinAsset, Chain } from './domain';

// Health factor calculation parameters
export interface HealthFactorParams {
  totalCollateralETH: bigint;
  totalDebtETH: bigint;
  liquidationThreshold: number;
}

// Liquidation risk assessment
export interface LiquidationRisk {
  healthFactor: number;
  liquidationPrice: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  warningMessage?: string;
}

// Depeg stress test parameters
export interface DepegStressTest {
  basePrice: number;
  stressPercentage: number; // e.g., 0.5 for 0.5%
  direction: 'up' | 'down';
  resultingHealthFactor: number;
  liquidationRisk: LiquidationRisk;
}

// Loop strategy parameters
export interface LoopStrategy {
  supplyAsset: StablecoinAsset;
  borrowAsset: StablecoinAsset;
  chain: Chain;
  maxLTV: number;
  targetLTV: number;
  loops: number;
  leverage: number;
}

// APY breakdown for transparency
export interface APYBreakdown {
  baseSupplyAPY: number;
  baseBorrowAPY: number;
  leverageMultiplier: number;
  netAPY: number;
  grossAPY: number;
  borrowCost: number;
  spreadAPY: number;
}

// Risk metrics for a position
export interface RiskMetrics {
  healthFactor: number;
  liquidationThreshold: number;
  currentLTV: number;
  maxLTV: number;
  utilizationRate: number;
  liquidationPrice: number;
  safetyMargin: number; // Distance from liquidation as percentage
}

// Yield comparison data
export interface YieldComparison {
  protocol: string;
  chain: Chain;
  asset: StablecoinAsset;
  apy: number;
  tvl: bigint;
  risk: 'low' | 'medium' | 'high';
  features: string[];
}

// Historical yield data point
export interface YieldHistoryPoint {
  timestamp: Date;
  supplyAPY: number;
  borrowAPY: number;
  utilization: number;
  spread: number;
}

// Calculation warnings and errors
export type CalculationWarning = 
  | 'NEGATIVE_SPREAD'
  | 'HIGH_UTILIZATION'
  | 'LOW_HEALTH_FACTOR'
  | 'NEAR_LIQUIDATION'
  | 'CAPS_EXCEEDED'
  | 'INSUFFICIENT_LIQUIDITY';

export interface CalculationResult<T> {
  data: T;
  warnings: CalculationWarning[];
  errors: string[];
  timestamp: Date;
}

// Optimization suggestions
export interface OptimizationSuggestion {
  type: 'reduce_leverage' | 'switch_asset' | 'change_protocol' | 'adjust_ltv';
  description: string;
  expectedImprovement: {
    apy?: number;
    healthFactor?: number;
    risk?: 'lower' | 'higher';
  };
  priority: 'low' | 'medium' | 'high';
}