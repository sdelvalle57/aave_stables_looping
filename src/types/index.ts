// Main types export file

import type { StablecoinAsset, Protocol, SupportedChainId } from './chains';
import type { AlertType } from './domain';

// Chain and protocol types
export type {
  StablecoinAsset,
  Protocol,
  SupportedChainId,
  ContractAddresses,
  MulticallConfig
} from './chains';

export {
  CHAIN_NAMES,
  PROTOCOL_NAMES,
  STABLECOIN_METADATA
} from './chains';

// Domain types
export type {
  Chain,
  StablecoinYield,
  CurvePoolData,
  LoopCalculation,
  LoopCalculatorParams,
  EModeCategory,
  AlertType,
  AlertRule,
  AlertNotification
} from './domain';

// Provider types
export type {
  DataProvider,
  AaveDataProvider,
  CurveDataProvider,
  DSRDataProvider,
  DSRHistoryPoint,
  PendleDataProvider,
  PendleYield,
  ProviderConfig,
  DataProviderFactory
} from './providers';

export {
  ProviderError,
  NetworkError,
  ContractError
} from './providers';

// Store types
export type {
  UIStore,
  PersistedUIState,
  ChainSelectionSlice,
  PreferencesSlice,
  CalculatorSlice,
  AlertsSlice,
  StoreActions
} from './store';

// Calculation types
export type {
  HealthFactorParams,
  LiquidationRisk,
  DepegStressTest,
  LoopStrategy,
  APYBreakdown,
  RiskMetrics,
  YieldComparison,
  YieldHistoryPoint,
  CalculationWarning,
  CalculationResult,
  OptimizationSuggestion
} from './calculations';

// Utility types
export type Address = `0x${string}`;

// React Query key types
export const queryKeys = {
  aaveYields: (chains: SupportedChainId[], assets: StablecoinAsset[]) => 
    ['aave', 'yields', chains, assets] as const,
  curveData: (chains: SupportedChainId[]) => 
    ['curve', 'pools', chains] as const,
  dsrRate: () => ['dsr', 'rate'] as const,
  pendleYields: (chains: SupportedChainId[], assets: StablecoinAsset[]) =>
    ['pendle', 'yields', chains, assets] as const,
  reserveDetails: (chain: SupportedChainId, asset: StablecoinAsset) =>
    ['reserve', 'details', chain, asset] as const,
} as const;

// Type guards
export const isStablecoinAsset = (asset: string): asset is StablecoinAsset => {
  return ['USDC', 'USDT', 'DAI'].includes(asset);
};

export const isProtocol = (protocol: string): protocol is Protocol => {
  return ['aave', 'curve', 'convex', 'makerdao', 'pendle'].includes(protocol);
};

export const isSupportedChainId = (chainId: number): chainId is SupportedChainId => {
  return [1, 42161, 10, 137].includes(chainId);
};

export const isAlertType = (type: string): type is AlertType => {
  return ['spread', 'boosted_apy', 'dsr_change'].includes(type);
};