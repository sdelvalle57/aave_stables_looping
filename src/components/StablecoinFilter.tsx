import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/ui';
import type { StablecoinAsset } from '@/types';

const ALL_ASSETS: StablecoinAsset[] = ['USDC', 'USDT', 'DAI'];

export function StablecoinFilter() {
  const selectedAssets = useUIStore((s) => s.selectedAssets) as StablecoinAsset[];
  const setSelectedAssets = useUIStore((s) => s.setSelectedAssets);

  const selectedSet = useMemo(() => new Set(selectedAssets), [selectedAssets]);

  const toggleAsset = (asset: StablecoinAsset) => {
    const next = selectedSet.has(asset)
      ? selectedAssets.filter((a) => a !== asset)
      : [...selectedAssets, asset];
    setSelectedAssets(next as StablecoinAsset[]);
  };

  const selectAll = () => setSelectedAssets(ALL_ASSETS);
  const selectNone = () => setSelectedAssets([]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-semibold">Assets:</span>
      {ALL_ASSETS.map((asset) => {
        const active = selectedSet.has(asset);
        return (
          <Button
            key={asset}
            variant={active ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleAsset(asset)}
          >
            {asset}
          </Button>
        );
      })}
      <div className="ml-2 flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={selectAll}>
          All
        </Button>
        <Button size="sm" variant="outline" onClick={selectNone}>
          None
        </Button>
      </div>
    </div>
  );
}