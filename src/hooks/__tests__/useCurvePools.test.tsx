/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/providers/curve', () => {
  return {
    curveDataProvider: {
      fetchData: vi.fn(),
    },
  };
});

import { curveDataProvider } from '@/lib/providers/curve';
import { useCurvePools } from '@/hooks/useCurvePools';
import type { CurvePoolData } from '@/types';

function wrapperFactory() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 1000 },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

describe('useCurvePools', () => {
  it('returns data sorted by boosted APY (desc)', async () => {
    const now = new Date();
    const rows: CurvePoolData[] = [
      {
        poolAddress: '0xpool1',
        name: 'Pool A',
        chain: 1,
        baseAPY: 0.02,
        boostedAPY: 0.05,
        tvl: 1000n * 10n ** 18n,
        pegDeviation: 0.001,
        assets: ['USDC', 'USDT'],
        lastUpdated: now,
      },
      {
        poolAddress: '0xpool2',
        name: 'Pool B',
        chain: 1,
        baseAPY: 0.03,
        boostedAPY: 0.03,
        tvl: 2000n * 10n ** 18n,
        pegDeviation: 0.0005,
        assets: ['USDC', 'DAI'],
        lastUpdated: now,
      },
    ];

    (curveDataProvider.fetchData as any).mockResolvedValueOnce(rows);

    const { result } = renderHook(
      () =>
        useCurvePools({
          chains: [1],
          assets: ['USDC', 'USDT', 'DAI'],
          enabled: true,
          refetchInterval: false,
        }),
      { wrapper: wrapperFactory() }
    );

    await waitFor(() => {
      expect(result.current.data).toBeTruthy();
    });

    const data = result.current.data!;
    expect(data.length).toBe(2);
    // Sorted desc by boostedAPY -> Pool A (0.05) first
    expect(data[0].name).toBe('Pool A');
    expect(data[0].boostedAPY).toBeGreaterThanOrEqual(data[1].boostedAPY);
  });

  it('propagates query errors', async () => {
    (curveDataProvider.fetchData as any).mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(
      () =>
        useCurvePools({
          chains: [1],
          assets: ['USDC', 'USDT'],
          enabled: true,
          refetchInterval: false,
        }),
      { wrapper: wrapperFactory() }
    );

    await waitFor(() => {
      // When query fails, error should be set
      expect(result.current.error).toBeTruthy();
    });
  });
});