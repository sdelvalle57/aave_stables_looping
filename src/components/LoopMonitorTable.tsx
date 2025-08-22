import { useMemo, useState } from 'react';
import type { LoopMonitorRow, SortDirection } from '@/types';
import { CHAIN_NAMES, PROTOCOL_NAMES } from '@/types';
import { cn, formatPercentFromDecimal, formatPercentNumber } from '@/lib/utils';

type SortKey =
  | 'chain'
  | 'protocol'
  | 'supplyAsset'
  | 'borrowAsset'
  | 'supplyAPY'
  | 'borrowAPY'
  | 'netSpread'
  | 'utilization'
  | 'supplyCapUsedPct'
  | 'borrowCapUsedPct'
  | 'eModeLTV'
  | 'eModeLT'
  | 'borrowable';

export interface LoopMonitorTableProps {
  rows: LoopMonitorRow[];
  isLoading?: boolean;
}

function HeaderButton({
  label,
  active,
  dir,
}: {
  label: string;
  active: boolean;
  dir: SortDirection;
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

export function LoopMonitorTable({ rows, isLoading }: LoopMonitorTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('netSpread');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  function onSortClick(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // default direction per column
      setSortDir(key === 'netSpread' ? 'desc' : 'asc');
    }
  }

  const sorted = useMemo(() => {
    const arr = rows.slice();
    arr.sort((a, b) => {
      const dirMul = sortDir === 'asc' ? 1 : -1;
      let av: number | string | boolean = 0;
      let bv: number | string | boolean = 0;

      switch (sortKey) {
        case 'chain':
          av = a.chain; bv = b.chain; break;
        case 'protocol':
          av = a.protocol; bv = b.protocol; break;
        case 'supplyAsset':
          av = a.supplyAsset; bv = b.supplyAsset; break;
        case 'borrowAsset':
          av = a.borrowAsset; bv = b.borrowAsset; break;
        case 'supplyAPY':
          av = a.supplyAPY; bv = b.supplyAPY; break;
        case 'borrowAPY':
          av = a.borrowAPY; bv = b.borrowAPY; break;
        case 'netSpread':
          av = a.netSpread; bv = b.netSpread; break;
        case 'utilization':
          av = a.utilization; bv = b.utilization; break;
        case 'supplyCapUsedPct':
          av = a.supplyCapUsedPct; bv = b.supplyCapUsedPct; break;
        case 'borrowCapUsedPct':
          av = a.borrowCapUsedPct; bv = b.borrowCapUsedPct; break;
        case 'eModeLTV':
          av = a.eModeLTV; bv = b.eModeLTV; break;
        case 'eModeLT':
          av = a.eModeLT; bv = b.eModeLT; break;
        case 'borrowable':
          av = a.borrowable ? 1 : 0; bv = b.borrowable ? 1 : 0; break;
      }

      if (typeof av === 'string' && typeof bv === 'string') {
        return av.localeCompare(bv) * dirMul;
      }
      // coerce to number
      return ((av as number) - (bv as number)) * dirMul;
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  const skeletonRows = Array.from({ length: 6 }).map((_, i) => (
    <tr key={`sk-${i}`} className="animate-pulse">
      {Array.from({ length: 13 }).map((__, j) => (
        <td key={j} className="px-3 py-2">
          <div className="h-3 w-16 bg-muted rounded" />
        </td>
      ))}
    </tr>
  ));

  return (
    <div className="w-full overflow-x-auto rounded-lg border">
      <table role="table" className="w-full text-sm">
        <caption className="sr-only">Loop Monitor pairs (Aave v3)</caption>
        <thead className="bg-muted/30">
          <tr>
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
            <th scope="col" className="px-3 py-2 text-left">
              <button
                type="button"
                className="select-none"
                aria-sort={sortKey === 'protocol' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSortClick('protocol')}
              >
                <HeaderButton label="Protocol" active={sortKey === 'protocol'} dir={sortDir} />
              </button>
            </th>
            <th scope="col" className="px-3 py-2 text-left">
              <button
                type="button"
                className="select-none"
                aria-sort={sortKey === 'supplyAsset' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSortClick('supplyAsset')}
              >
                <HeaderButton label="Supply" active={sortKey === 'supplyAsset'} dir={sortDir} />
              </button>
            </th>
            <th scope="col" className="px-3 py-2 text-left">
              <button
                type="button"
                className="select-none"
                aria-sort={sortKey === 'borrowAsset' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSortClick('borrowAsset')}
              >
                <HeaderButton label="Borrow" active={sortKey === 'borrowAsset'} dir={sortDir} />
              </button>
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              <button
                type="button"
                className="select-none"
                aria-sort={sortKey === 'supplyAPY' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSortClick('supplyAPY')}
              >
                <HeaderButton label="Supply APY" active={sortKey === 'supplyAPY'} dir={sortDir} />
              </button>
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              <button
                type="button"
                className="select-none"
                aria-sort={sortKey === 'borrowAPY' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSortClick('borrowAPY')}
              >
                <HeaderButton label="Borrow APY" active={sortKey === 'borrowAPY'} dir={sortDir} />
              </button>
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              <button
                type="button"
                className="select-none"
                aria-sort={sortKey === 'netSpread' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSortClick('netSpread')}
              >
                <HeaderButton label="Net spread" active={sortKey === 'netSpread'} dir={sortDir} />
              </button>
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              <button
                type="button"
                className="select-none"
                aria-sort={sortKey === 'utilization' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSortClick('utilization')}
              >
                <HeaderButton label="Utilization" active={sortKey === 'utilization'} dir={sortDir} />
              </button>
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              <button
                type="button"
                className="select-none"
                aria-sort={sortKey === 'supplyCapUsedPct' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSortClick('supplyCapUsedPct')}
              >
                <HeaderButton label="Supply cap used" active={sortKey === 'supplyCapUsedPct'} dir={sortDir} />
              </button>
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              <button
                type="button"
                className="select-none"
                aria-sort={sortKey === 'borrowCapUsedPct' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSortClick('borrowCapUsedPct')}
              >
                <HeaderButton label="Borrow cap used" active={sortKey === 'borrowCapUsedPct'} dir={sortDir} />
              </button>
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              <button
                type="button"
                className="select-none"
                aria-sort={sortKey === 'eModeLTV' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSortClick('eModeLTV')}
              >
                <HeaderButton label="E-Mode LTV" active={sortKey === 'eModeLTV'} dir={sortDir} />
              </button>
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              <button
                type="button"
                className="select-none"
                aria-sort={sortKey === 'eModeLT' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSortClick('eModeLT')}
              >
                <HeaderButton label="E-Mode LT" active={sortKey === 'eModeLT'} dir={sortDir} />
              </button>
            </th>
            <th scope="col" className="px-3 py-2 text-center">
              <button
                type="button"
                className="select-none"
                aria-sort={sortKey === 'borrowable' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSortClick('borrowable')}
              >
                <HeaderButton label="Borrowable" active={sortKey === 'borrowable'} dir={sortDir} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? skeletonRows
            : sorted.map((r, idx) => {
                const highUtil = Number.isFinite(r.utilization) && r.utilization >= 90;
                const highSupplyCap = r.supplyCapUsedPct >= 95;
                const highBorrowCap = r.borrowCapUsedPct >= 95;
                const negativeSpread = r.netSpread < 0;

                return (
                  <tr
                    key={`${r.chain}-${r.supplyAsset}-${r.borrowAsset}-${idx}`}
                    className={cn(
                      'border-t',
                      negativeSpread ? 'bg-red-50/50 dark:bg-red-950/20' : undefined
                    )}
                  >
                    <td className="px-3 py-2">{CHAIN_NAMES[r.chain]}</td>
                    <td className="px-3 py-2">{PROTOCOL_NAMES[r.protocol]}</td>
                    <td className="px-3 py-2">{r.supplyAsset}</td>
                    <td className="px-3 py-2">{r.borrowAsset}</td>
                    <td className="px-3 py-2 text-right">
                      {formatPercentFromDecimal(r.supplyAPY, 2)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatPercentFromDecimal(r.borrowAPY, 2)}
                    </td>
                    <td className={cn('px-3 py-2 text-right', negativeSpread ? 'text-red-600' : undefined)}>
                      {formatPercentFromDecimal(r.netSpread, 2)}
                    </td>
                    <td className={cn('px-3 py-2 text-right', highUtil ? 'text-yellow-600' : undefined)}>
                      {formatPercentNumber(r.utilization, 2)}
                    </td>
                    <td className={cn('px-3 py-2 text-right', highSupplyCap ? 'text-yellow-600' : undefined)}>
                      {formatPercentNumber(r.supplyCapUsedPct, 2)}
                    </td>
                    <td className={cn('px-3 py-2 text-right', highBorrowCap ? 'text-yellow-600' : undefined)}>
                      {formatPercentNumber(r.borrowCapUsedPct, 2)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatPercentNumber(r.eModeLTV, 0)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatPercentNumber(r.eModeLT, 0)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={cn(
                          'rounded px-2 py-0.5 text-xs',
                          r.borrowable
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                        )}
                      >
                        {r.borrowable ? 'yes' : 'no'}
                      </span>
                    </td>
                  </tr>
                );
              })}
        </tbody>
      </table>

      {/* Health warning badges summary */}
      <div className="px-3 py-2 text-xs">
        <div className="flex flex-wrap gap-2">
          <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
            Utilization ≥ 90%
          </span>
          <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
            Any cap ≥ 95%
          </span>
          <span className="rounded bg-red-100 px-2 py-0.5 text-red-800 dark:bg-red-900/20 dark:text-red-300">
            Negative spread
          </span>
        </div>
      </div>
    </div>
  );
}