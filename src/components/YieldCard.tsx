import type { StablecoinYield, SupportedChainId } from '@/types';
import { CHAIN_NAMES } from '@/types';
import { formatPercentFromDecimal, formatPercentNumber, getCapUsagePercentages } from '@/lib/utils';

interface YieldCardProps {
  row: StablecoinYield;
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

export function YieldCard({ row }: YieldCardProps) {
  const spread = row.supplyAPY - row.borrowAPY;

  const { supplyCapUsedPct, borrowCapUsedPct } = getCapUsagePercentages(
    row.totalSupply,
    row.totalBorrow,
    row.supplyCap,
    row.borrowCap
  );

  const highUtil = isFiniteNumber(row.utilization) && row.utilization >= 90;
  const highSupplyCap = supplyCapUsedPct >= 95;
  const highBorrowCap = borrowCapUsedPct >= 95;

  return (
    <div className="p-4 border rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold">
          {CHAIN_NAMES[row.chain as SupportedChainId]} · {row.asset}
        </div>
        <div className="text-xs text-muted-foreground">Aave v3</div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-muted-foreground">Supply APY</div>
          <div className="font-medium">
            {isFiniteNumber(row.supplyAPY) ? formatPercentFromDecimal(row.supplyAPY, 2) : '—'}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Borrow APY</div>
          <div className="font-medium">
            {isFiniteNumber(row.borrowAPY) ? formatPercentFromDecimal(row.borrowAPY, 2) : '—'}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Spread</div>
          <div className={`font-medium ${spread < 0 ? 'text-red-600' : ''}`}>
            {isFiniteNumber(spread) ? formatPercentFromDecimal(spread, 2) : '—'}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Utilization</div>
          <div className={`font-medium ${highUtil ? 'text-yellow-600' : ''}`}>
            {isFiniteNumber(row.utilization) ? formatPercentNumber(row.utilization, 2) : '—'}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Supply cap used</div>
          <div className={`font-medium ${highSupplyCap ? 'text-yellow-600' : ''}`}>
            {formatPercentNumber(supplyCapUsedPct, 2)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Borrow cap used</div>
          <div className={`font-medium ${highBorrowCap ? 'text-yellow-600' : ''}`}>
            {formatPercentNumber(borrowCapUsedPct, 2)}
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
              {'Supply cap >=95%'}
            </span>
          )}
          {highBorrowCap && (
            <span className="mr-2 rounded bg-yellow-100 px-2 py-0.5 text-yellow-800">
              {'Borrow cap >=95%'}
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
}