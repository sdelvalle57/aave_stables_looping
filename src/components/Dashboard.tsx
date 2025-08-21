import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useAaveYields } from '@/hooks/useAaveYields';
import { useUIStore } from '@/store/ui';
import { type SupportedChainId, type StablecoinAsset } from '@/types';
import { ChainSelector } from '@/components/ChainSelector';
import { StablecoinFilter } from './StablecoinFilter';
import { YieldCard } from './YieldCard';


function isFiniteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}


export function Dashboard() {
  const selectedChains = useUIStore((s) => s.selectedChains) as SupportedChainId[];
  const selectedAssets = useUIStore((s) => s.selectedAssets) as StablecoinAsset[];
  const autoRefresh = useUIStore((s) => s.autoRefresh);
  const setAutoRefresh = useUIStore((s) => s.setAutoRefresh);
  const refreshInterval = useUIStore((s) => s.refreshInterval);
  const setRefreshInterval = useUIStore((s) => s.setRefreshInterval);
  const darkMode = useUIStore((s) => s.darkMode);
  const toggleDarkMode = useUIStore((s) => s.toggleDarkMode);

  const { data, isLoading, isFetching, error } = useAaveYields({
    chains: selectedChains as SupportedChainId[],
    assets: selectedAssets,
    refetchInterval: autoRefresh ? Math.max(5, refreshInterval) * 1000 : false,
  });

  const spreadSorted = useMemo(() => {
    return (data ?? []).slice().sort((a, b) => (b.supplyAPY - b.borrowAPY) - (a.supplyAPY - a.borrowAPY));
  }, [data]);

  // Ensure only selected chains are rendered, and drop invalid/NaN rows defensively
  const filteredRows = useMemo(() => {
    const sel = new Set(selectedChains as SupportedChainId[]);
    return spreadSorted.filter((row) => {
      const chainOk = sel.has(row.chain as SupportedChainId);
      const apyOk =
        isFiniteNumber(row.supplyAPY) &&
        isFiniteNumber(row.borrowAPY) &&
        isFiniteNumber(row.utilization);
      return chainOk && apyOk;
    });
  }, [spreadSorted, selectedChains]);



  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <ChainSelector />
        <StablecoinFilter />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm font-semibold">Theme:</span>
          <Button
            variant={darkMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleDarkMode()}
          >
            {darkMode ? 'Dark' : 'Light'}
          </Button>
        </div>
      </div>


      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">Auto refresh:</span>
        <Button
          variant={autoRefresh ? 'default' : 'outline'}
          size="sm"
          onClick={() => setAutoRefresh(!autoRefresh)}
        >
          {autoRefresh ? 'On' : 'Off'}
        </Button>
        <span className="text-sm text-muted-foreground">Interval (s):</span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRefreshInterval(Math.max(5, refreshInterval - 5))}
          >
            -5
          </Button>
          <span className="text-sm">{refreshInterval}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRefreshInterval(Math.min(3600, refreshInterval + 5))}
          >
            +5
          </Button>
        </div>
        {isFetching && <span className="text-xs text-muted-foreground">Refreshing…</span>}
      </div>

      <div className="mt-2">
        {isLoading && <div className="text-sm text-muted-foreground">Loading yields…</div>}
        {error && (
          <div className="text-sm text-red-600">
            {(error as Error).message ?? 'Failed to load yields'}
          </div>
        )}
        {!isLoading && !error && filteredRows.length === 0 && (
          <div className="text-sm text-muted-foreground">No matching yields for current filters.</div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredRows.map((row, idx) => (
          <YieldCard key={`${row.chain}-${row.asset}-${idx}`} row={row} />
        ))}
      </div>
    </div>
  );
}