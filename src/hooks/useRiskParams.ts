import type { SupportedChainId, StablecoinAsset } from '@/types';
import type { ReserveParams } from '@/hooks/useMarketAPY';

/**
 * Effective risk params used for HF/LTV in the calculator.
 * mode: whether we applied stablecoin E-Mode defaults or base deposit params.
 */
export interface EffectiveRiskParams {
  ltv: number; // percent (0..100)
  liquidationThreshold: number; // percent (0..100)
  mode: 'emode' | 'base';
}

const STABLE_ASSETS: ReadonlySet<StablecoinAsset> = new Set(['USDC', 'USDT', 'DAI']);
const STABLE_EMODE_DEFAULT: EffectiveRiskParams = {
  ltv: 93,
  liquidationThreshold: 95,
  mode: 'emode',
};

/**
 * Determine whether both assets are stablecoins on the same chain (always true in calc)
 * and thus eligible for Stablecoin E-Mode defaults.
 */
export function isStableStablePair(
  _chain: SupportedChainId,
  depositAsset: StablecoinAsset,
  borrowAsset: StablecoinAsset
): boolean {
  return STABLE_ASSETS.has(depositAsset) && STABLE_ASSETS.has(borrowAsset);
}

/**
 * Derive effective LTV/LT following policy:
 * - If stable-stable pair on same chain, use Stablecoin E-Mode defaults (93/95).
 * - Else, fall back to deposit reserve base params when available.
 * - As a last resort, return conservative zeros (HF will be Infinity or 0 depending on totals).
 */
export function deriveEffectiveRiskParams(args: {
  chain: SupportedChainId;
  depositAsset: StablecoinAsset;
  borrowAsset: StablecoinAsset;
  depositParams?: ReserveParams;
  borrowParams?: ReserveParams;
}): EffectiveRiskParams {
  const { chain, depositAsset, borrowAsset, depositParams } = args;

  if (isStableStablePair(chain, depositAsset, borrowAsset)) {
    return STABLE_EMODE_DEFAULT;
  }

  if (depositParams &&
      Number.isFinite(depositParams.ltv) && Number.isFinite(depositParams.liquidationThreshold)) {
    return {
      ltv: Math.max(0, Math.min(100, depositParams.ltv)),
      liquidationThreshold: Math.max(0, Math.min(100, depositParams.liquidationThreshold)),
      mode: 'base',
    };
  }

  // Conservative fallback
  return { ltv: 0, liquidationThreshold: 0, mode: 'base' };
}