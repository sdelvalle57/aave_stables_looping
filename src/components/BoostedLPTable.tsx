import { useMemo, useState } from 'react';
import { useCurvePoolsFromStore } from '@/hooks/useCurvePools';
import { CHAIN_NAMES } from '@/types';
import { cn, formatPercentFromDecimal, formatPercentNumber } from '@/lib/utils';

type SortKey = 'pool' | 'chain' | 'baseAPY' | 'boostedAPY' | 'tvl' | 'pegDeviation';
type SortDir = 'asc' | 'desc';

function HeaderButton({
  label,
  active,
  dir,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      {active && (
        <span aria-hidden className="text-xs text-muted-foreground">
          {dir === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </span>
  );
}

// TVL formatter: tvl is in 1e18 USD notionals. Compact format for UI.
function formatUsdApprox(tvl1e18: bigint): string {
  const asNumber = Number(tvl1e18) / 1e18;
  if (!Number.isFinite(asNumber)) return '—';
  if (asNumber >= 1_000_000_000) return `$${(asNumber / 1_000_000_000).toFixed(2)}B`;
  if (asNumber >= 1_000_000) return `$${(asNumber / 1_000_000).toFixed(2)}M`;
  if (asNumber >= 1_000) return `$${(asNumber / 1_000).toFixed(2)}K`;
  return `$${asNumber.toFixed(2)}`;
}

export function BoostedLPTable() {
  const { data, isLoading, error, isFetching } = useCurvePoolsFromStore();

  const [sortKey, setSortKey] = useState<SortKey>('boostedAPY');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function onSortClick(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'boostedAPY' ? 'desc' : 'asc');
    }
  }

  const sorted = useMemo(() => {
    const rows = (data ?? []).slice();
    rows.sort((a, b) => {
      const dirMul = sortDir === 'asc' ? 1 : -1;
      let av: number | string | bigint = 0;
      let bv: number | string | bigint = 0;

      switch (sortKey) {
        case 'pool':
          av = a.name; bv = b.name; break;
        case 'chain':
          av = a.chain; bv = b.chain; break;
        case 'baseAPY':
          av = a.baseAPY; bv = b.baseAPY; break;
        case 'boostedAPY':
          av = a.boostedAPY; bv = b.boostedAPY; break;
        case 'tvl':
          av = a.tvl; bv = b.tvl; break;
        case 'pegDeviation':
          av = a.pegDeviation; bv = b.pegDeviation; break;
      }

      if (typeof av === 'string' && typeof bv === 'string') {
        return av.localeCompare(bv) * dirMul;
      }
      if (typeof av === 'bigint' && typeof bv === 'bigint') {
        return (av > bv ? 1 : av < bv ? -1 : 0) * dirMul;
      }
      return ((av as number) - (bv as number)) * dirMul;
    });
    return rows;
  }, [data, sortKey, sortDir]);

  const skeletonRows = Array.from({ length: 5 }).map((_, i) => (
    <tr key={`sk-${i}`} className="animate-pulse">
      {Array.from({ length: 6 }).map((__, j) => (
        <td key={j} className="px-3 py-2">
          <div className="h-3 w-16 bg-muted rounded" />
        </td>
      ))}
    </tr>
  ));

  return (
    <div className="w-full overflow-x-auto rounded-lg border">
      <table role="table" className="w-full text-sm">
        <caption className="sr-only">Boosted Curve LP Pools</caption>
        <thead className="bg-muted/30">
          <tr>
            <th scope="col" className="px-3 py-2 text-left">
              <button
                type="button"
                className="select-none"
                aria-sort={sortKey === 'pool' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSortClick('pool')}
              >
                <HeaderButton label="Pool" active={sortKey === 'pool'} dir={sortDir} />
              </button>
            </th>
            <th scope="col" className="px-3 py-2 text-left">
              <button
                type="button"
                className="select-none"
                aria-sort={sortKey === 'chain' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSortClick('chain')}
              >
                <HeaderButton label="Chain" active={sortKey === 'chain'} dir={sortDir} />
              </button>
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              <button
                type="button"
                className="select-none"
                aria-sort={sortKey === 'baseAPY' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSortClick('baseAPY')}
              >
                <HeaderButton label="Base APY" active={sortKey === 'baseAPY'} dir={sortDir} />
              </button>
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              <button
                type="button"
                className="select-none"
                aria-sort={sortKey === 'boostedAPY' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSortClick('boostedAPY')}
              >
                <HeaderButton label="Boosted APY" active={sortKey === 'boostedAPY'} dir={sortDir} />
              </button>
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              <button
                type="button"
                className="select-none"
                aria-sort={sortKey === 'tvl' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSortClick('tvl')}
              >
                <HeaderButton label="TVL" active={sortKey === 'tvl'} dir={sortDir} />
              </button>
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              <button
                type="button"
                className="select-none"
                aria-sort={sortKey === 'pegDeviation' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSortClick('pegDeviation')}
              >
                <HeaderButton label="Peg deviation" active={sortKey === 'pegDeviation'} dir={sortDir} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? skeletonRows
            : sorted.map((r, idx) => {
                const pegRed = r.pegDeviation > 0.003; // > 0.3%
                return (
                  <tr key={`${r.chain}-${r.poolAddress}-${idx}`} className="border-t">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{CHAIN_NAMES[r.chain]}</td>
                    <td className="px-3 py-2 text-right">{formatPercentFromDecimal(r.baseAPY, 2)}</td>
                    <td className="px-3 py-2 text-right">{formatPercentFromDecimal(r.boostedAPY, 2)}</td>
                    <td className="px-3 py-2 text-right">{formatUsdApprox(r.tvl)}</td>
                    <td className={cn('px-3 py-2 text-right', pegRed ? 'text-red-600' : undefined)}>
                      {formatPercentNumber(r.pegDeviation * 100, 2)}
                    </td>
                  </tr>
                );
              })}
        </tbody>
      </table>

      <div className="px-3 py-2 text-xs">
        {error && (
          <div className="text-red-600">
            {(error as Error)?.message ?? 'Failed to load Curve pools'}
          </div>
        )}
        {!isLoading && !error && (data?.length ?? 0) === 0 && (
          <div className="text-muted-foreground">No Curve pools configured for current chains/assets.</div>
        )}
        {isFetching && <div className="text-muted-foreground">Refreshing…</div>}
      </div>
    </div>
  );
}