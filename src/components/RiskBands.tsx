import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { riskLevelFromHF } from '@/components/HealthBadge';

export interface RiskBandsProps {
  baseHF: number;
  downHF: number;
  upHF: number;
  className?: string;
}

/**
 * RiskBands
 * Horizontal risk zones with markers for:
 *  - downHF (red), baseHF (blue), upHF (green)
 *
 * Zones:
 *  - critical: < 1.0
 *  - high: [1.0, 1.1)
 *  - medium: [1.1, 1.3)
 *  - low: ≥ 1.3
 *
 * Render scale is capped to [0, 2.5] HF for visualization.
 */
export function RiskBands({ baseHF, downHF, upHF, className }: RiskBandsProps) {
  const cap = 2.5;
  const clamp = (x: number) => (Number.isFinite(x) ? Math.max(0, Math.min(cap, x)) : cap);
  const pct = (x: number) => `${(clamp(x) / cap) * 100}%`;

  // Segment widths based on thresholds vs cap
  const wCritical = (Math.min(1.0, cap) / cap) * 100; // up to 1.0
  const wHigh = (Math.max(0, Math.min(1.1, cap) - 1.0) / cap) * 100; // 1.0 - 1.1
  const wMedium = (Math.max(0, Math.min(1.3, cap) - 1.1) / cap) * 100; // 1.1 - 1.3
  const wLow = Math.max(0, 100 - (wCritical + wHigh + wMedium)); // remaining to cap

  const markers = useMemo(
    () => [
      {
        key: 'down',
        title: `Stress down HF ${Number.isFinite(downHF) ? downHF.toFixed(2) : '∞'}`,
        left: pct(downHF),
        color: 'bg-red-500',
        aria: 'Stress down marker',
      },
      {
        key: 'base',
        title: `Base HF ${Number.isFinite(baseHF) ? baseHF.toFixed(2) : '∞'}`,
        left: pct(baseHF),
        color: 'bg-blue-500',
        aria: 'Base marker',
      },
      {
        key: 'up',
        title: `Stress up HF ${Number.isFinite(upHF) ? upHF.toFixed(2) : '∞'}`,
        left: pct(upHF),
        color: 'bg-green-500',
        aria: 'Stress up marker',
      },
    ],
    [baseHF, downHF, upHF]
  );

  // Ticks at thresholds
  const ticks = [
    { pos: pct(1.0), label: '1.0' },
    { pos: pct(1.1), label: '1.1' },
    { pos: pct(1.3), label: '1.3' },
    { pos: pct(2.0), label: '2.0' },
  ];

  function zoneTitle(min: number, max?: number) {
    const sample = max === undefined ? min : (min + (max ?? min)) / 2;
    const level = riskLevelFromHF(sample);
    return `Zone: ${level}`;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative h-6 w-full overflow-hidden rounded border">
        <div className="flex h-full w-full">
          <div
            className="h-full"
            style={{ width: `${wCritical}%` }}
            title={zoneTitle(0, 1.0)}
          >
            <div className="h-full w-full bg-red-200 dark:bg-red-900/30" />
          </div>
          <div
            className="h-full"
            style={{ width: `${wHigh}%` }}
            title={zoneTitle(1.0, 1.1)}
          >
            <div className="h-full w-full bg-red-100 dark:bg-red-900/20" />
          </div>
          <div
            className="h-full"
            style={{ width: `${wMedium}%` }}
            title={zoneTitle(1.1, 1.3)}
          >
            <div className="h-full w-full bg-yellow-100 dark:bg-yellow-900/20" />
          </div>
          <div
            className="h-full"
            style={{ width: `${wLow}%` }}
            title={zoneTitle(1.3, cap)}
          >
            <div className="h-full w-full bg-green-100 dark:bg-green-900/20" />
          </div>
        </div>

        {/* Threshold ticks */}
        {ticks.map((t) => (
          <div
            key={t.label}
            className="absolute top-0 h-full w-px bg-muted-foreground/40"
            style={{ left: t.pos }}
            aria-hidden
          />
        ))}

        {/* Markers */}
        {markers.map((m) => (
          <div
            key={m.key}
            className="absolute -top-1.5"
            style={{ left: m.left, transform: 'translateX(-50%)' }}
            title={m.title}
            aria-label={m.aria}
          >
            <div className={cn('h-3 w-3 rounded-full ring-2 ring-background', m.color)} />
          </div>
        ))}
      </div>

      {/* Tick labels */}
      <div className="relative h-5 text-[10px] text-muted-foreground">
        {ticks.map((t) => (
          <div
            key={t.label}
            className="absolute -translate-x-1/2"
            style={{ left: t.pos }}
          >
            {t.label}
          </div>
        ))}
        <div className="absolute right-0">2.5</div>
      </div>
    </div>
  );
}