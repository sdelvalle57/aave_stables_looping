import { useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/ui';
import type { StablecoinAsset, SupportedChainId } from '@/types';
import { CalculatorChainSelect } from '@/components/calculator/CalculatorChainSelect';
import { useMarketAPY } from '@/hooks/useMarketAPY';
import { useLoopCalculation, useNetSpread } from '@/hooks/useCalculator';
import { invertLeverageToLTVPercent, computeTotals, leverageFromLTVPercent } from '@/lib/leverage';
import { formatPercentFromDecimal, formatPercentNumber } from '@/lib/utils';
import { estimateHealthFactor, runDepegStress } from '@/lib/calculations';
import { deriveEffectiveRiskParams } from '@/hooks/useRiskParams';
import { HealthBadge } from '@/components/HealthBadge';
import { RiskBands } from './RiskBands';

const ALL_ASSETS: StablecoinAsset[] = ['USDC', 'USDT', 'DAI'];

// Simple number formatting for fiat-like figures (display only)
function formatAmount(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// Health factor formatting
function formatHF(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  return n.toFixed(2);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">{title}</div>
      <div className="p-4 border rounded-md">{children}</div>
    </div>
  );
}

function AssetSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: StablecoinAsset;
  onChange: (asset: StablecoinAsset) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium mr-2">{label}</span>
      {ALL_ASSETS.map((asset) => (
        <Button
          key={asset}
          size="sm"
          variant={value === asset ? 'default' : 'outline'}
          onClick={() => onChange(asset)}
        >
          {asset}
        </Button>
      ))}
    </div>
  );
}

export function LoopCalculator() {
  const params = useUIStore((s) => s.calculatorParams);
  const update = useUIStore((s) => s.updateCalculatorParams);
  const autoRefresh = useUIStore((s) => s.autoRefresh);
  const refreshInterval = useUIStore((s) => s.refreshInterval);

  // Local UI state for principal as a human-friendly number; persist as bigint on commit
  const [principalInput, setPrincipalInput] = useState(() => {
    try {
      return Number(params.principal ?? 0n);
    } catch {
      return 0;
    }
  });

  const setDepositAsset = (asset: StablecoinAsset) => update({ depositAsset: asset });
  const setBorrowAsset = (asset: StablecoinAsset) => update({ borrowAsset: asset });

  const setLoops = (n: number) => update({ loops: Math.max(1, Math.min(5, Math.floor(n))) });
  const setLTV = (pct: number) => update({ targetLTV: Math.max(0, Math.min(90, Math.round(pct))) });
  const [stressPct, setStressPct] = useState(0.5); // percent (0..1)

  const commitPrincipal = useCallback(() => {
    const val = Number.isFinite(principalInput) ? Math.max(0, Math.floor(principalInput)) : 0;
    let bi = 0n;
    try {
      bi = BigInt(val);
    } catch {
      bi = 0n;
    }
    update({ principal: bi });
  }, [principalInput, update]);

  // Market APYs for selected pair
  const apy = useMarketAPY({
    chain: params.chain as SupportedChainId,
    depositAsset: params.depositAsset,
    borrowAsset: params.borrowAsset,
    refetchIntervalMs: autoRefresh ? Math.max(5, refreshInterval) * 1000 : false,
  });

  const supplyAPY = apy.supplyAPY ?? 0;
  const borrowAPY = apy.borrowAPY ?? 0;

  // Calculations using hooks
  const loopCalc = useLoopCalculation({
    supplyAPY,
    borrowAPY,
    ltvPercent: params.targetLTV,
    loops: params.loops,
  });

  const spread = useNetSpread(supplyAPY, borrowAPY);

  // Derived totals based on principal (display only)
  const principalNumber = useMemo(() => {
    try {
      return Number(params.principal ?? 0n);
    } catch {
      return 0;
    }
  }, [params.principal]);

  const totals = useMemo(
    () => computeTotals(principalNumber, params.targetLTV, params.loops),
    [principalNumber, params.targetLTV, params.loops]
  );

  // Leverage multiplier displayed should be consistent with calculateLoopAPY
  const leverageMultiplier = useMemo(
    () => leverageFromLTVPercent(params.targetLTV, params.loops),
    [params.targetLTV, params.loops]
  );

  const netAPY = loopCalc.data?.netAPY ?? 0;
  const annualProfit = principalNumber * netAPY;

  // Effective risk params (E-Mode defaults for stable-stable, else base deposit params)
  const effectiveRisk = useMemo(
    () =>
      deriveEffectiveRiskParams({
        chain: params.chain as SupportedChainId,
        depositAsset: params.depositAsset,
        borrowAsset: params.borrowAsset,
        depositParams: apy.depositParams,
        borrowParams: apy.borrowParams,
      }),
    [
      params.chain,
      params.depositAsset,
      params.borrowAsset,
      apy.depositParams,
      apy.borrowParams,
    ]
  );

  // Build HF inputs using proportional scaling (units cancel in ratio)
  const { collateralBI, debtBI } = useMemo(() => {
    const c = Math.max(0, Math.floor(totals.totalSupplied * 1e6));
    const d = Math.max(0, Math.floor(totals.totalBorrowed * 1e6));
    return { collateralBI: BigInt(c), debtBI: BigInt(d) };
  }, [totals.totalSupplied, totals.totalBorrowed]);

  const baseHF = useMemo(
    () =>
      estimateHealthFactor({
        totalCollateralETH: collateralBI,
        totalDebtETH: debtBI,
        liquidationThreshold: effectiveRisk.liquidationThreshold,
      }),
    [collateralBI, debtBI, effectiveRisk.liquidationThreshold]
  );

  const hfParams = useMemo(
    () => ({
      totalCollateralETH: collateralBI,
      totalDebtETH: debtBI,
      liquidationThreshold: effectiveRisk.liquidationThreshold,
    }),
    [collateralBI, debtBI, effectiveRisk.liquidationThreshold]
  );

  const stressDown = useMemo(() => runDepegStress(hfParams, stressPct, 'down'), [hfParams, stressPct]);
  const stressUp = useMemo(() => runDepegStress(hfParams, stressPct, 'up'), [hfParams, stressPct]);

  const baseRiskLevel: 'low' | 'medium' | 'high' | 'critical' = useMemo(() => {
    return baseHF < 1 ? 'critical' : baseHF < 1.1 ? 'high' : baseHF < 1.3 ? 'medium' : 'low';
  }, [baseHF]);

  // Bi-directional leverage input: updates LTV
  const onLeverageChange = (val: number) => {
    const target = Math.max(1, Math.min(5, Number.isFinite(val) ? val : 1));
    const inv = invertLeverageToLTVPercent(target, params.loops, { tolerance: 1e-6, maxIterations: 64 });
    // Clamp to UI limit 90%
    setLTV(Math.min(90, inv));
  };

  const disabled = !apy.hasData || apy.isLoading;

  return (
    <div className="space-y-6">
      <Section title="Parameters">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <CalculatorChainSelect />
            <AssetSelect label="Deposit" value={params.depositAsset} onChange={setDepositAsset} />
            <AssetSelect label="Borrow" value={params.borrowAsset} onChange={setBorrowAsset} />

            <div className="flex items-center gap-3">
              <div className="text-sm font-medium min-w-[90px]">Principal</div>
              <input
                type="number"
                min={0}
                step={1}
                className="w-40 rounded-md border px-2 py-1 text-sm bg-background"
                value={Number.isFinite(principalInput) ? principalInput : 0}
                onChange={(e) => setPrincipalInput(Number(e.target.value))}
                onBlur={commitPrincipal}
              />
              <span className="text-xs text-muted-foreground">units</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm font-medium min-w-[90px]">Loops</div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={params.loops}
                onChange={(e) => setLoops(Number(e.target.value))}
                className="w-56"
              />
              <span className="text-sm w-10 text-center">{params.loops}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm font-medium min-w-[90px]">Target LTV</div>
              <input
                type="range"
                min={0}
                max={90}
                step={1}
                value={params.targetLTV}
                onChange={(e) => setLTV(Number(e.target.value))}
                className="w-56"
              />
              <span className="text-sm w-14 text-center">{formatPercentNumber(params.targetLTV, 0)}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm font-medium min-w-[90px]">Target leverage</div>
              <input
                type="number"
                min={1}
                max={5}
                step={0.01}
                className="w-24 rounded-md border px-2 py-1 text-sm bg-background"
                value={Number.isFinite(leverageMultiplier) ? leverageMultiplier.toFixed(2) : '1.00'}
                onChange={(e) => onLeverageChange(Number(e.target.value))}
              />
              <span className="text-xs text-muted-foreground">x</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-medium">Market APYs</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 border rounded-md">
                <div className="text-muted-foreground">Supply APY ({params.depositAsset})</div>
                <div className="font-medium">
                  {apy.isLoading ? 'Loading…' : formatPercentFromDecimal(supplyAPY, 2)}
                </div>
              </div>
              <div className="p-3 border rounded-md">
                <div className="text-muted-foreground">Borrow APY ({params.borrowAsset})</div>
                <div className={`font-medium ${borrowAPY >= supplyAPY ? 'text-red-600' : ''}`}>
                  {apy.isLoading ? 'Loading…' : formatPercentFromDecimal(borrowAPY, 2)}
                </div>
              </div>
              <div className="p-3 border rounded-md col-span-2">
                <div className="text-muted-foreground">Spread</div>
                <div className={`font-medium ${spread.hasNegativeSpread ? 'text-red-600' : ''}`}>
                  {formatPercentFromDecimal(spread.netAPY, 2)}
                </div>
              </div>
              {!!apy.error && (
                <div className="text-xs text-red-600 col-span-2">
                  {(apy.error as Error).message ?? 'Failed to load APYs'}
                </div>
              )}
              {apy.isFetching && <div className="text-xs text-muted-foreground col-span-2">Refreshing…</div>}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Results">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 border rounded-md">
            <div className="text-muted-foreground">Leverage multiplier</div>
            <div className="font-medium">{Number.isFinite(leverageMultiplier) ? leverageMultiplier.toFixed(3) : '—'}x</div>
          </div>
          <div className="p-3 border rounded-md">
            <div className="text-muted-foreground">Current LTV</div>
            <div className="font-medium">{formatPercentNumber(params.targetLTV, 0)}</div>
          </div>
          <div className="p-3 border rounded-md">
            <div className="text-muted-foreground">Net APY</div>
            <div className={`font-medium ${netAPY < 0 ? 'text-red-600' : ''}`}>
              {formatPercentFromDecimal(netAPY, 2)}
            </div>
          </div>
          <div className="p-3 border rounded-md">
            <div className="text-muted-foreground">Total supplied</div>
            <div className="font-medium">{formatAmount(totals.totalSupplied, 2)}</div>
          </div>
          <div className="p-3 border rounded-md">
            <div className="text-muted-foreground">Total borrowed</div>
            <div className="font-medium">{formatAmount(totals.totalBorrowed, 2)}</div>
          </div>
          <div className="p-3 border rounded-md">
            <div className="text-muted-foreground">Annual profit</div>
            <div className={`font-medium ${annualProfit < 0 ? 'text-red-600' : ''}`}>
              {formatAmount(annualProfit, 2)}
            </div>
          </div>
          <div className="p-3 border rounded-md">
            <div className="text-muted-foreground">Health factor</div>
            <HealthBadge value={baseHF} />
          </div>
          <div className="p-3 border rounded-md">
            <div className="text-muted-foreground">Effective LT</div>
            <div className="font-medium">{formatPercentNumber(effectiveRisk.liquidationThreshold, 0)}</div>
          </div>
          <div className="p-3 border rounded-md">
            <div className="text-muted-foreground">Risk level</div>
            <div
              className={`font-medium ${
                baseRiskLevel === 'critical'
                  ? 'text-red-600'
                  : baseRiskLevel === 'high'
                  ? 'text-red-600'
                  : baseRiskLevel === 'medium'
                  ? 'text-yellow-600'
                  : 'text-green-700'
              }`}
            >
              {baseRiskLevel}
            </div>
          </div>
        </div>

        {/* Depeg stress controls and results */}
        <div className="mt-4 space-y-3">
          <div className="text-sm font-medium">Depeg stress</div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={stressPct}
              onChange={(e) => setStressPct(Number(e.target.value))}
              className="w-56"
            />
            <span className="text-sm w-16 text-center">{formatPercentNumber(stressPct, 1)}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setStressPct(0.5)}>
                ±0.5%
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStressPct(1)}>
                ±1%
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 border rounded-md">
              <div className="text-muted-foreground">Stress down</div>
              <HealthBadge value={stressDown.resultingHealthFactor} />
            </div>
            <div className="p-3 border rounded-md">
              <div className="text-muted-foreground">Base</div>
              <HealthBadge value={baseHF} />
            </div>
            <div className="p-3 border rounded-md">
              <div className="text-muted-foreground">Stress up</div>
              <HealthBadge value={stressUp.resultingHealthFactor} />
            </div>
          </div>
        </div>

{/* Risk bands visualization */}
          <RiskBands
            baseHF={baseHF}
            downHF={stressDown.resultingHealthFactor}
            upHF={stressUp.resultingHealthFactor}
            className="mt-2"
          />
        {spread.hasNegativeSpread && (
          <div className="text-xs mt-2">
            <span className="mr-2 rounded bg-red-100 px-2 py-0.5 text-red-800">Negative spread</span>
          </div>
        )}

        {disabled && (
          <div className="text-xs text-muted-foreground mt-2">
            Results will display when market APYs are available for the selected pair.
          </div>
        )}
      </Section>
    </div>
  );
}