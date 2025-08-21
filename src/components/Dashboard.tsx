import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useAaveYieldsFromStore } from '@/hooks/useAaveYields';
import { useUIStore } from '@/store/ui';
import { CHAIN_NAMES, type SupportedChainId, type StablecoinAsset } from '@/types';

const ALL_ASSETS: StablecoinAsset[] = ['USDC', 'USDT', 'DAI', 'FRAX'];
const ALL_CHAINS: SupportedChainId[] = Object.keys(CHAIN_NAMES).map((k) => Number(k)) as SupportedChainId[];

function formatPct(n: number, digits = 2) {
  return `${n.toFixed(digits)}%`;
}

function pctBig(n: bigint, d: bigint): number {
  if (d === 0n) return 0;
  // Convert to Number for display purposes (may lose precision for very large values)
  const nn = Number(n);
  const dd = Number(d);
  return dd === 0 ? 0 : (nn / dd) * 100;
}

export function Dashboard() {
  const selectedChains = useUIStore((s) => s.selectedChains) as SupportedChainId[];
  const selectedAssets = useUIStore((s) => s.selectedAssets);
  const setSelectedChains = useUIStore((s) => s.setSelectedChains);
  const setSelectedAssets = useUIStore((s) => s.setSelectedAssets);
  const autoRefresh = useUIStore((s) => s.autoRefresh);
  const setAutoRefresh = useUIStore((s) => s.setAutoRefresh);
  const refreshInterval = useUIStore((s) => s.refreshInterval);
  const setRefreshInterval = useUIStore((s) => s.setRefreshInterval);

  const { data, isLoading, isFetching, error } = useAaveYieldsFromStore();

  const spreadSorted = useMemo(() => {
    return (data ?? []).slice().sort((a, b) => (b.supplyAPY - b.borrowAPY) - (a.supplyAPY - a.borrowAPY));
  }, [data]);

  const toggleChain = (chainId: SupportedChainId) => {
    const next = selectedChains.includes(chainId)
      ? selectedChains.filter((c) => c !== chainId)
      : [...selectedChains, chainId];
    setSelectedChains(next as SupportedChainId[]);
  };

  const toggleAsset = (asset: StablecoinAsset) => {
    const next = selectedAssets.includes(asset)
      ? selectedAssets.filter((a) => a !== asset)
      : [...selectedAssets, asset];
    setSelectedAssets(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">Chains:</span>
        {ALL_CHAINS.map((cid) => {
          const active = selectedChains.includes(cid);
          return (
            <Button
              key={cid}
              variant={active ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleChain(cid)}
            >
              {CHAIN_NAMES[cid]}
            </Button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">Assets:</span>
        {ALL_ASSETS.map((asset) => {
          const active = selectedAssets.includes(asset);
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {spreadSorted.map((row, idx) => {
          const spread = row.supplyAPY - row.borrowAPY;
          const supplyCapPct = pctBig(row.totalSupply, row.supplyCap);
          const borrowCapPct = pctBig(row.totalBorrow, row.borrowCap);
          const highUtil = row.utilization >= 90;
          const highSupplyCap = supplyCapPct >= 95;
          const highBorrowCap = borrowCapPct >= 95;

          return (
            <div key={`${row.chain}-${row.asset}-${idx}`} className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold">
                  {CHAIN_NAMES[row.chain as SupportedChainId]} · {row.asset}
                </div>
                <div className="text-xs text-muted-foreground">Aave v3</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Supply APY</div>
                  <div className="font-medium">{formatPct(row.supplyAPY * 100)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Borrow APY</div>
                  <div className="font-medium">{formatPct(row.borrowAPY * 100)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Spread</div>
                  <div className={`font-medium ${spread < 0 ? 'text-red-600' : ''}`}>
                    {formatPct(spread * 100)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Utilization</div>
                  <div className={`font-medium ${highUtil ? 'text-yellow-600' : ''}`}>
                    {formatPct(row.utilization, 2)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Supply cap used</div>
                  <div className={`font-medium ${highSupplyCap ? 'text-yellow-600' : ''}`}>
                    {formatPct(supplyCapPct, 2)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Borrow cap used</div>
                  <div className={`font-medium ${highBorrowCap ? 'text-yellow-600' : ''}`}>
                    {formatPct(borrowCapPct, 2)}
                  </div>
                </div>
              </div>

              {(highUtil || highSupplyCap || highBorrowCap || spread < 0) && (
                <div className="text-xs">
                  {highUtil && (
                    <span className="mr-2 rounded bg-yellow-100 px-2 py-0.5 text-yellow-800">
                      High utilization
                    </span>
                  )}
                  {highSupplyCap && (
                    <span className="mr-2 rounded bg-yellow-100 px-2 py-0.5 text-yellow-800">
                      Supply cap &gt;=95%
                    </span>
                  )}
                  {highBorrowCap && (
                    <span className="mr-2 rounded bg-yellow-100 px-2 py-0.5 text-yellow-800">
                      Borrow cap &gt;=95%
                    </span>
                  )}
                  {spread < 0 && (
                    <span className="mr-2 rounded bg-red-100 px-2 py-0.5 text-red-800">
                      Negative spread
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}