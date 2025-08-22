import { describe, it, expect } from 'vitest';
import { deriveEffectiveRiskParams } from '@/hooks/useRiskParams';

describe('deriveEffectiveRiskParams (stable E-Mode policy)', () => {
  it('returns stablecoin E-Mode defaults for stable-stable pairs on supported chains', () => {
    const eff = deriveEffectiveRiskParams({
      chain: 1, // mainnet
      depositAsset: 'USDC',
      borrowAsset: 'USDT',
      depositParams: { ltv: 80, liquidationThreshold: 85 },
      borrowParams: { ltv: 78, liquidationThreshold: 83 },
    });
    expect(eff.mode).toBe('emode');
    expect(eff.ltv).toBe(93);
    expect(eff.liquidationThreshold).toBe(95);
  });

  it('ignores base params when E-Mode applies (still returns 93/95)', () => {
    const eff = deriveEffectiveRiskParams({
      chain: 137, // polygon
      depositAsset: 'DAI',
      borrowAsset: 'USDC',
      depositParams: { ltv: 75, liquidationThreshold: 80 },
      borrowParams: { ltv: 70, liquidationThreshold: 76 },
    });
    expect(eff.mode).toBe('emode');
    expect(eff.ltv).toBe(93);
    expect(eff.liquidationThreshold).toBe(95);
  });

  it('falls back to base deposit params when not stable-stable (defensive)', () => {
    // Force non-stable by casting (project only exposes USDC/USDT/DAI, so this is a defensive branch test)
    const eff = deriveEffectiveRiskParams({
      chain: 1,
      depositAsset: 'USDC',
      borrowAsset: 'FAKE' as unknown as 'USDC',
      depositParams: { ltv: 80, liquidationThreshold: 85 },
      borrowParams: undefined,
    });
    expect(eff.mode).toBe('base');
    expect(eff.ltv).toBe(80);
    expect(eff.liquidationThreshold).toBe(85);
  });

  it('returns conservative zeros if no params and not stable-stable', () => {
    const eff = deriveEffectiveRiskParams({
      chain: 1,
      depositAsset: 'USDC',
      borrowAsset: 'FAKE' as unknown as 'USDC',
      depositParams: undefined,
      borrowParams: undefined,
    });
    expect(eff.mode).toBe('base');
    expect(eff.ltv).toBe(0);
    expect(eff.liquidationThreshold).toBe(0);
  });
});