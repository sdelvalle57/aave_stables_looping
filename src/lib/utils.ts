import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Numeric and BigInt helpers for caps usage
export function percentBigInt(numerator: bigint, denominator: bigint): number {
  if (denominator === 0n) return 0;
  const pct = Number((numerator * 10000n) / denominator) / 100;
  // Clamp to [0, 100] for UI friendliness
  return Math.max(0, Math.min(100, pct));
}

export function supplyCapUsedPct(totalSupply: bigint, supplyCap: bigint): number {
  return percentBigInt(totalSupply, supplyCap);
}

export function borrowCapUsedPct(totalBorrow: bigint, borrowCap: bigint): number {
  return percentBigInt(totalBorrow, borrowCap);
}

export function getCapUsagePercentages(
  totalSupply: bigint,
  totalBorrow: bigint,
  supplyCap: bigint,
  borrowCap: bigint
): { supplyCapUsedPct: number; borrowCapUsedPct: number } {
  return {
    supplyCapUsedPct: supplyCapUsedPct(totalSupply, supplyCap),
    borrowCapUsedPct: borrowCapUsedPct(totalBorrow, borrowCap),
  };
}

// Percent formatting helpers
export function formatPercentFromDecimal(decimal: number, digits = 2): string {
  const n = Number.isFinite(decimal) ? decimal * 100 : 0;
  return `${n.toFixed(digits)}%`;
}

export function formatPercentNumber(num: number, digits = 2): string {
  const n = Number.isFinite(num) ? num : 0;
  return `${n.toFixed(digits)}%`;
}
