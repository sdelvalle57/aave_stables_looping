import React from 'react';
import { cn } from '@/lib/utils';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export function riskLevelFromHF(hf: number): RiskLevel {
  if (!Number.isFinite(hf)) return 'low';
  return hf < 1 ? 'critical' : hf < 1.1 ? 'high' : hf < 1.3 ? 'medium' : 'low';
}

function formatHF(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  return n.toFixed(2);
}

export interface HealthBadgeProps {
  value: number;
  label?: string;
  className?: string;
}

/**
 * Compact badge showing Health Factor with color-coded risk level.
 */
export function HealthBadge({ value, label = 'HF', className }: HealthBadgeProps) {
  const level = riskLevelFromHF(value);
  const styles =
    level === 'critical'
      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      : level === 'high'
      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      : level === 'medium'
      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium',
        styles,
        className
      )}
      title={`Risk: ${level}`}
    >
      <span>{label}</span>
      <span>{formatHF(value)}</span>
    </span>
  );
}