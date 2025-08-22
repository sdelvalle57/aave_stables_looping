import type {
  Chain,
  StablecoinAsset,
  StablecoinYield,
  EModeCategory,
  LoopMonitorRow,
} from '@/types';
import { getCapUsagePercentages } from '@/lib/utils';

export type EModeMap = Map<Chain, EModeCategory[]>;

/**
 * Pure builder for LoopMonitorRow from protocol yields.
 * - Includes same-asset pairs
 * - Utilization comes from borrow asset
 * - E-Mode LTV/LT uses shared stable category when both assets share it; else base values from supply asset
 */
export function buildLoopRowsFromYields(
  yields: StablecoinYield[],
  eModeByChain: EModeMap,
  selectedAssets: StablecoinAsset[]
): LoopMonitorRow[] {
  // Group by chain and asset
  const byChainAndAsset = new Map<Chain, Map<StablecoinAsset, StablecoinYield>>();
  for (const y of yields) {
    if (!byChainAndAsset.has(y.chain)) byChainAndAsset.set(y.chain, new Map());
    byChainAndAsset.get(y.chain)!.set(y.asset, y);
  }

  const chains = Array.from(byChainAndAsset.keys());
  const out: LoopMonitorRow[] = [];

  for (const chain of chains) {
    const assetsMap = byChainAndAsset.get(chain)!;

    // Filter to available assets on this chain and current selection
    const assets = selectedAssets.filter((a) => assetsMap.has(a));

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

        // E-Mode values
        const categories = eModeByChain.get(chain) ?? [];
        const sharedCatId =
          supply.eModeCategory && borrow.eModeCategory && supply.eModeCategory === borrow.eModeCategory
            ? supply.eModeCategory
            : undefined;
        const sharedCat = categories.find((c) => c.id === sharedCatId);
        const eModeLTV = sharedCat ? sharedCat.ltv : supply.ltv;
        const eModeLT = sharedCat ? sharedCat.liquidationThreshold : supply.liquidationThreshold;

        // Borrowable fallback
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
}