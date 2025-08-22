import { useEffect, useMemo, useState } from 'react';
import { useUIStore } from '@/store/ui';
import { aaveDataProvider } from '@/lib/providers/aave';
import type {
  StablecoinYield,
  EModeCategory,
  Chain,
  StablecoinAsset,
  LoopMonitorRow,
} from '@/types';
import { getCapUsagePercentages } from '@/lib/utils';

/**
 * Build LoopMonitorRow pairs from protocol yields.
 * - Includes same-asset pairs.
 * - Utilization shown is the borrow asset utilization.
 * - E-Mode LTV/LT comes from shared stable category when both assets share it; otherwise base values from the supply asset.
 */
export function useLoopMonitorRows(yields: StablecoinYield[]) {
  const selectedAssets = useUIStore((s) => s.selectedAssets);

  // Group yields by chain and asset for quick lookup
  const byChainAndAsset = useMemo(() => {
    const map = new Map<Chain, Map<StablecoinAsset, StablecoinYield>>();
    for (const y of yields) {
      if (!map.has(y.chain)) map.set(y.chain, new Map());
      map.get(y.chain)!.set(y.asset, y);
    }
    return map;
  }, [yields]);

  // Chains present in current dataset
  const chains = useMemo(() => Array.from(byChainAndAsset.keys()), [byChainAndAsset]);

  // E-Mode categories per chain (fetched once per chain)
  const [eModeByChain, setEModeByChain] = useState<Map<Chain, EModeCategory[]>>(new Map());
  const [loadingEMode, setLoadingEMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadCategories() {
      setLoadingEMode(true);
      try {
        const entries = await Promise.all(
          chains.map(async (c) => {
            try {
              const cats = await aaveDataProvider.getEModeCategories(c);
              return [c, cats] as const;
            } catch {
              return [c, [] as EModeCategory[]] as const;
            }
          })
        );
        if (!cancelled) {
          const m = new Map<Chain, EModeCategory[]>();
          for (const [c, cats] of entries) m.set(c, cats);
          setEModeByChain(m);
        }
      } finally {
        if (!cancelled) setLoadingEMode(false);
      }
    }
    if (chains.length) loadCategories();
    return () => {
      cancelled = true;
    };
  }, [chains]);

  // Build pair rows
  const rows: LoopMonitorRow[] = useMemo(() => {
    const out: LoopMonitorRow[] = [];

    for (const chain of chains) {
      const assetsMap = byChainAndAsset.get(chain)!;

      // Filter to assets that exist in map and in the selected set
      const assets: StablecoinAsset[] = (selectedAssets as StablecoinAsset[]).filter((a) =>
        assetsMap.has(a)
      );

      for (let i = 0; i < assets.length; i++) {
        for (let j = 0; j < assets.length; j++) {
          const supplyAsset = assets[i];
          const borrowAsset = assets[j];

          const supply = assetsMap.get(supplyAsset)!;
          const borrow = assetsMap.get(borrowAsset)!;

          const supplyAPY = supply.supplyAPY;
          const borrowAPY = borrow.borrowAPY;
          const netSpread = supplyAPY - borrowAPY;

          const utilization = borrow.utilization;

          const { supplyCapUsedPct, borrowCapUsedPct } = getCapUsagePercentages(
            supply.totalSupply,
            borrow.totalBorrow,
            supply.supplyCap,
            borrow.borrowCap
          );

          // Determine E-Mode values
          const categories = eModeByChain.get(chain) ?? [];
          const sharedCatId =
            supply.eModeCategory && borrow.eModeCategory && supply.eModeCategory === borrow.eModeCategory
              ? supply.eModeCategory
              : undefined;
          const sharedCat = categories.find((c) => c.id === sharedCatId);
          const eModeLTV = sharedCat ? sharedCat.ltv : supply.ltv;
          const eModeLT = sharedCat ? sharedCat.liquidationThreshold : supply.liquidationThreshold;

          // Borrowable heuristic if provider did not provide it
          const borrowable =
            typeof borrow.borrowable === 'boolean'
              ? borrow.borrowable
              : borrow.borrowCap > 0n && borrow.borrowAPY >= 0;

          out.push({
            chain,
            protocol: supply.protocol,
            supplyAsset,
            borrowAsset,
            supplyAPY,
            borrowAPY,
            netSpread,
            utilization,
            supplyCapUsedPct,
            borrowCapUsedPct,
            eModeLTV,
            eModeLT,
            eModeCategoryId: sharedCatId,
            borrowable,
            lastUpdated:
              (supply.lastUpdated && borrow.lastUpdated
                ? new Date(Math.max(+supply.lastUpdated, +borrow.lastUpdated))
                : supply.lastUpdated) || new Date(),
          });
        }
      }
    }

    // Default sort: net spread desc, then utilization asc
    return out.sort((a, b) => {
      const d = b.netSpread - a.netSpread;
      if (d !== 0) return d;
      return a.utilization - b.utilization;
    });
  }, [byChainAndAsset, chains, selectedAssets, eModeByChain]);

  return { rows, loadingEMode };
}