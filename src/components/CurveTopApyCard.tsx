import { useMemo } from 'react';
import { useCurvePoolsFromStore } from '@/hooks/useCurvePools';
import { CHAIN_NAMES, type SupportedChainId } from '@/types';
import { formatPercentFromDecimal } from '@/lib/utils';

export function CurveTopApyCard() {
  const { data, isLoading, error, isFetching } = useCurvePoolsFromStore();

  const top = useMemo(() => {
    const rows = (data ?? []).slice();
    rows.sort((a, b) => b.boostedAPY - a.boostedAPY);
    return rows[0];
  }, [data]);

  return (
    <div className="p-4 border rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Top Curve boosted APY</div>
        {isFetching && <div className="text-xs text-muted-foreground">Refreshing…</div>}
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading Curve pools…</div>}
      {error && (
        <div className="text-sm text-red-600">
          {(error as Error)?.message ?? 'Failed to load Curve pools'}
        </div>
      )}

      {!isLoading && !error && !top && (
        <div className="text-sm text-muted-foreground">No Curve pools available for current selection.</div>
      )}

      {top && (
        <div className="space-y-2">
          <div className="text-2xl font-bold">
            {formatPercentFromDecimal(top.boostedAPY, 2)}
          </div>
          <div className="text-sm text-muted-foreground">
            {top.name} · {CHAIN_NAMES[top.chain as SupportedChainId]}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-muted-foreground">Base APY</div>
              <div className="font-medium">{formatPercentFromDecimal(top.baseAPY, 2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Peg deviation</div>
              <div className={`font-medium ${top.pegDeviation > 0.003 ? 'text-red-600' : ''}`}>
                {(top.pegDeviation * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}