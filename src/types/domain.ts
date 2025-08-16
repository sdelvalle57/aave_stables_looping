// Core domain types for the Stablecoin Yield Monitor

import type { StablecoinAsset, Protocol, SupportedChainId } from './chains';

// Re-export for convenience
export type { StablecoinAsset, Protocol, SupportedChainId } from './chains';

// Chain type for better type safety
export type Chain = SupportedChainId;

// Core stablecoin yield data structure
export interface StablecoinYield {
  protocol: Protocol;
  chain: Chain;
  asset: StablecoinAsset;
  supplyAPY: number;
  borrowAPY: number;
  utilization: number;
  totalSupply: bigint;
  totalBorrow: bigint;
  supplyCap: bigint;
  borrowCap: bigint;
  ltv: number;
  liquidationThreshold: number;
  reserveFactor: number;
  eModeCategory?: number;
  lastUpdated: Date;
}

// Curve pool data structure
export interface CurvePoolData {
  poolAddress: `0x${string}`;
  name: string;
  chain: Chain;
  baseAPY: number;
  boostedAPY: number;
  tvl: bigint;
  pegDeviation: number;
  assets: StablecoinAsset[];
  lastUpdated: Date;
}

// Loop calculation results
export interface LoopCalculation {
  principal: bigint;
  totalSupplied: bigint;
  totalBorrowed: bigint;
  currentLTV: number;
  netAPY: number;
  annualProfit: bigint;
  healthFactor: number;
  liquidationPrice: number;
}

// Loop calculation input parameters
export interface LoopCalculatorParams {
  chain: Chain;
  depositAsset: StablecoinAsset;
  borrowAsset: StablecoinAsset;
  principal: bigint;
  targetLTV: number;
  loops: number;
  targetLeverage?: number;
}

// E-Mode category information
export interface EModeCategory {
  id: number;
  ltv: number;
  liquidationThreshold: number;
  liquidationBonus: number;
  priceSource: `0x${string}`;
  label: string;
}

// Alert rule types
export type AlertType = 'spread' | 'boosted_apy' | 'dsr_change';

export interface AlertRule {
  id: string;
  type: AlertType;
  threshold: number;
  chain?: Chain;
  protocol?: Protocol;
  asset?: StablecoinAsset;
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

// Alert notification data
export interface AlertNotification {
  id: string;
  ruleId: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}