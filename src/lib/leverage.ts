// Leverage and geometric-series helpers for Loop Calculator

// Small epsilon for float comparisons
const EPS = 1e-12;

/**
 * Sum of geometric series: 1 + r + r^2 + ... + r^n
 * - Handles r ~ 1 with stable branch
 */
export function geometricSeriesSum(r: number, n: number): number {
  const loops = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  const rr = Number.isFinite(r) ? r : 0;
  if (loops < 0) return 0;
  if (Math.abs(rr - 1) < EPS) return loops + 1;
  return (1 - Math.pow(rr, loops + 1)) / (1 - rr);
}

/**
 * Compute leverage multiplier S (total supply multiple) from LTV percent and loops.
 * - ltvPercent: 0..100
 * - loops: integer >= 0
 * 
 * Model:
 *   l = LTV% / 100
 *   S = 1 + l + l^2 + ... + l^N
 *   B = S - 1
 */
export function leverageFromLTVPercent(ltvPercent: number, loops: number): number {
  const ltvPct = Math.max(0, Math.min(100, Number.isFinite(ltvPercent) ? ltvPercent : 0));
  const l = ltvPct / 100;
  const n = Math.max(0, Math.floor(Number.isFinite(loops) ? loops : 0));
  return geometricSeriesSum(l, n);
}

/**
 * Invert leverage to LTV percent for a fixed number of loops using monotonic bisection.
 * Solves for l in [0, 1) such that:
 *   1 + l + l^2 + ... + l^N = targetLeverage
 *
 * Notes:
 * - If targetLeverage <= 1, returns 0 (no leverage).
 * - If targetLeverage >= N+1 (the asymptote as l -> 1), returns an LTV% very near 100%.
 * - Caller should clamp to a protocol/UI max LTV afterward (e.g., 90%).
 */
export function invertLeverageToLTVPercent(targetLeverage: number, loops: number, options?: {
  maxIterations?: number;
  tolerance?: number;
}): number {
  const n = Math.max(0, Math.floor(Number.isFinite(loops) ? loops : 0));
  const S = Math.max(1, Number.isFinite(targetLeverage) ? targetLeverage : 1);
  const maxS = n + 1; // as l -> 1, sum -> n+1

  if (S <= 1 + EPS) return 0;
  if (S >= maxS - 1e-9) return 99.999; // practically 100% (caller should clamp further)

  const maxIterations = options?.maxIterations ?? 64;
  const tolerance = options?.tolerance ?? 1e-6;

  // Bisection over l in [0, hi], hi close to 1 but < 1 to avoid division issues
  let lo = 0;
  let hi = 0.999999; // near-1 upper bound
  let mid = 0.5;

  const f = (l: number) => geometricSeriesSum(l, n);

  for (let i = 0; i < maxIterations; i++) {
    mid = (lo + hi) / 2;
    const Smid = f(mid);
    const diff = Smid - S;
    if (Math.abs(diff) < tolerance) break;
    if (diff < 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const lPercent = mid * 100;
  // Numerical guard: 0..100 (caller can impose stricter caps)
  return Math.max(0, Math.min(100, lPercent));
}

/**
 * Compute totals and multipliers for a given principal, LTV% and loops.
 * Returns:
 *  - supplyMultiple S
 *  - borrowMultiple B = S - 1
 *  - totalSupplied = principal * S
 *  - totalBorrowed = principal * B
 *
 * principal is treated as a display-only number (e.g., whole tokens).
 */
export function computeTotals(principal: number, ltvPercent: number, loops: number): {
  supplyMultiple: number;
  borrowMultiple: number;
  totalSupplied: number;
  totalBorrowed: number;
} {
  const p = Math.max(0, Number.isFinite(principal) ? principal : 0);
  const S = leverageFromLTVPercent(ltvPercent, loops);
  const B = Math.max(0, S - 1);
  return {
    supplyMultiple: S,
    borrowMultiple: B,
    totalSupplied: p * S,
    totalBorrowed: p * B,
  };
}