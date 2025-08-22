import type { Chain, Protocol, StablecoinAsset } from './domain';

export type SortDirection = 'asc' | 'desc';

export interface LoopMonitorRow {
  // Identity
  chain: Chain;
  protocol: Protocol;

  // Pair
  supplyAsset: StablecoinAsset;
  borrowAsset: StablecoinAsset;

  // Rates and spread (decimals, e.g., 0.05 = 5%)
  supplyAPY: number;
  borrowAPY: number;
  netSpread: number;

  // Utilization of the borrow asset reserve (percent 0..100)
  utilization: number;

  // Caps usage (percent 0..100)
  supplyCapUsedPct: number;
  borrowCapUsedPct: number;

  // Effective E-Mode values chosen for display (percent 0..100)
  eModeLTV: number;
  eModeLT: number;
  eModeCategoryId?: number;

  // Borrowable status of the borrow asset on the protocol
  borrowable: boolean;

  // Timestamps (optional)
  lastUpdated?: Date;
}