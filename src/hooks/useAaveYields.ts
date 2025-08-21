import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { aaveDataProvider } from '@/lib/providers/aave';
import {
  queryKeys,
  type SupportedChainId,
  type StablecoinAsset,
  type StablecoinYield,
} from '@/types';
import { useUIStore } from '@/store/ui';

/**
 * Normalize arrays for stable query keys:
 * - remove duplicates
 * - sort ascending
 */
function normalizeChains(chains: SupportedChainId[]): SupportedChainId[] {
  return Array.from(new Set(chains)).sort((a, b) => a - b) as SupportedChainId[];
}
function normalizeAssets(assets: StablecoinAsset[]): StablecoinAsset[] {
  return Array.from(new Set(assets)).sort() as StablecoinAsset[];
}

export interface UseAaveYieldsParams {
  chains?: SupportedChainId[];
  assets?: StablecoinAsset[];
  enabled?: boolean;
  refetchInterval?: number | false;
}

/**
 * Core hook using explicit params
 */
export function useAaveYields(params?: UseAaveYieldsParams) {
  const {
    chains: inputChains,
    assets: inputAssets,
    enabled: inputEnabled,
    refetchInterval,
  } = params ?? {};

  const chains = useMemo(
    () => normalizeChains(inputChains ?? [1, 42161, 10, 137]),
    [inputChains]
  );
  const assets = useMemo(
    () => normalizeAssets(inputAssets ?? ['USDC', 'USDT', 'DAI']),
    [inputAssets]
  );

  const queryKey = useMemo(() => queryKeys.aaveYields(chains, assets), [chains, assets]);

  return useQuery<StablecoinYield[]>({
    queryKey,
    queryFn: async () => {
      const data = await aaveDataProvider.fetchData(chains, assets);
      // Optional: sort by best supply - borrow spread descending
      return data.sort(
        (a, b) => (b.supplyAPY - b.borrowAPY) - (a.supplyAPY - a.borrowAPY)
      );
    },
    enabled: inputEnabled ?? true,
    staleTime: 1000 * 60 * 2, // 2 min
    gcTime: 1000 * 60 * 30, // 30 min
    retry: 2,
    refetchOnWindowFocus: false,
    refetchInterval,
    placeholderData: keepPreviousData, // keep previous data during refetch
  });
}

/**
 * Convenience hook bound to UI store (selectedChains/assets and autoRefresh)
 */
export function useAaveYieldsFromStore() {
  const selectedChains = useUIStore((s) => s.selectedChains) as SupportedChainId[];
  const selectedAssets = useUIStore((s) => s.selectedAssets);
  const autoRefresh = useUIStore((s) => s.autoRefresh);
  const refreshInterval = useUIStore((s) => s.refreshInterval);

  const chains = useMemo(() => normalizeChains(selectedChains), [selectedChains]);
  const assets = useMemo(() => normalizeAssets(selectedAssets), [selectedAssets]);

  return useAaveYields({
    chains,
    assets,
    enabled: true,
    refetchInterval: autoRefresh ? Math.max(5, refreshInterval) * 1000 : false,
  });
}