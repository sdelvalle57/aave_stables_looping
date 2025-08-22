import { useMemo } from 'react';
import { useAaveYields } from '@/hooks/useAaveYields';
import type { SupportedChainId, StablecoinAsset, StablecoinYield } from '@/types';

export interface UseMarketAPYParams {
  chain: SupportedChainId;
  depositAsset: StablecoinAsset;
  borrowAsset: StablecoinAsset;
  refetchIntervalMs?: number | false;
}

export interface MarketAPYResult {
  supplyAPY?: number; // decimal (e.g., 0.05)
  borrowAPY?: number; // decimal
  isLoading: boolean;
  isFetching: boolean;
  error?: unknown;
  hasData: boolean;
  updatedAt?: Date;
}

/**
 * Derive calculator-ready APYs from the Aave yields source for a specific chain and asset pair.
 * - supplyAPY is taken from the deposit asset's supply APY
 * - borrowAPY is taken from the borrow asset's variable borrow APY
 */
export function useMarketAPY(params: UseMarketAPYParams): MarketAPYResult {
  const { chain, depositAsset, borrowAsset, refetchIntervalMs } = params;

  const { data, isLoading, isFetching, error } = useAaveYields({
    chains: [chain],
    assets: [depositAsset, borrowAsset],
    refetchInterval: refetchIntervalMs ?? false,
  });

  const lookup = useMemo(() => {
    const map = new Map<string, StablecoinYield>();
    for (const row of data ?? []) {
      map.set(`${row.chain}-${row.asset}`, row);
    }
    return map;
  }, [data]);

  const deposit = lookup.get(`${chain}-${depositAsset}`);
  const borrow = lookup.get(`${chain}-${borrowAsset}`);

  const supplyAPY = deposit?.supplyAPY;
  const borrowAPY = borrow?.borrowAPY;

  const hasData = typeof supplyAPY === 'number' && typeof borrowAPY === 'number';

  const updatedAt = useMemo(() => {
    if (!deposit?.lastUpdated && !borrow?.lastUpdated) return undefined;
    const times = [deposit?.lastUpdated, borrow?.lastUpdated].filter(Boolean) as Date[];
    return new Date(Math.max(...times.map((d) => +d)));
  }, [deposit?.lastUpdated, borrow?.lastUpdated]);

  return {
    supplyAPY,
    borrowAPY,
    isLoading,
    isFetching,
    error,
    hasData,
    updatedAt,
  };
}