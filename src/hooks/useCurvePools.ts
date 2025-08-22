import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { curveDataProvider } from '@/lib/providers/curve';
import { useUIStore } from '@/store/ui';
import {
  queryKeys,
  type SupportedChainId,
  type StablecoinAsset,
  type CurvePoolData,
} from '@/types';

// Normalizers mirroring useAaveYields
function normalizeChains(chains: SupportedChainId[]): SupportedChainId[] {
  return Array.from(new Set(chains)).sort((a, b) => a - b) as SupportedChainId[];
}
function normalizeAssets(assets: StablecoinAsset[]): StablecoinAsset[] {
  return Array.from(new Set(assets)).sort() as StablecoinAsset[];
}

export interface UseCurvePoolsParams {
  chains?: SupportedChainId[];
  assets?: StablecoinAsset[];
  enabled?: boolean;
  refetchInterval?: number | false;
}

/**
 * Fetch Curve pool data across chains/assets via CurveOnChainDataProvider
 * - on-chain-first; Convex boosted APY for Ethereum if configured
 */
export function useCurvePools(params?: UseCurvePoolsParams) {
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

  const queryKey = useMemo(() => queryKeys.curveData(chains), [chains]);

  return useQuery<CurvePoolData[]>({
    queryKey,
    queryFn: async () => {
      const data = await curveDataProvider.fetchData(chains, assets);
      // Sort by boosted APY desc
      return data.sort((a, b) => b.boostedAPY - a.boostedAPY);
    },
    enabled: inputEnabled ?? true,
    staleTime: 1000 * 90, // 90s for fresher Curve rates while avoiding thrash
    gcTime: 1000 * 60 * 30, // 30 min
    retry: 2,
    refetchOnWindowFocus: false,
    refetchInterval,
    placeholderData: keepPreviousData,
  });
}

/**
 * Convenience hook bound to UI store selections
 */
export function useCurvePoolsFromStore() {
  const selectedChains = useUIStore((s) => s.selectedChains) as SupportedChainId[];
  const selectedAssets = useUIStore((s) => s.selectedAssets);
  const autoRefresh = useUIStore((s) => s.autoRefresh);
  const refreshInterval = useUIStore((s) => s.refreshInterval);

  const chains = useMemo(() => normalizeChains(selectedChains), [selectedChains]);
  const assets = useMemo(() => normalizeAssets(selectedAssets), [selectedAssets]);

  return useCurvePools({
    chains,
    assets,
    enabled: true,
    refetchInterval: autoRefresh ? Math.max(5, refreshInterval) * 1000 : false,
  });
}