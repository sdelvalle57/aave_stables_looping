/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the data hook to drive component rendering deterministically
vi.mock('@/hooks/useCurvePools', () => {
  return {
    useCurvePoolsFromStore: () => ({
      data: [
        {
          poolAddress: '0xpool1',
          name: 'Pool A',
          chain: 1,
          baseAPY: 0.02,
          boostedAPY: 0.05,
          tvl: 1_000_000_000_000_000_000n, // 1e18 -> $1.00
          pegDeviation: 0.001, // 0.1%
          assets: ['USDC', 'USDT'],
          lastUpdated: new Date(),
        },
        {
          poolAddress: '0xpool2',
          name: 'Pool B',
          chain: 1,
          baseAPY: 0.03,
          boostedAPY: 0.03,
          tvl: 3_000_000_000_000_000_000n, // 3e18 -> $3.00
          pegDeviation: 0.004, // 0.4% (should be red)
          assets: ['USDC', 'DAI'],
          lastUpdated: new Date(),
        },
      ],
      isLoading: false,
      error: undefined,
      isFetching: false,
    }),
  };
});

import { BoostedLPTable } from '@/components/BoostedLPTable';

describe('BoostedLPTable', () => {
  it('renders pool rows with formatted metrics', () => {
    render(<BoostedLPTable />);

    // Pool names
    expect(screen.getByText('Pool A')).toBeInTheDocument();
    expect(screen.getByText('Pool B')).toBeInTheDocument();

    // Base/Boosted APY formatting (percent)
    expect(screen.getByText('2.00%')).toBeInTheDocument();  // Pool A base
    expect(screen.getByText('5.00%')).toBeInTheDocument();  // Pool A boosted
    expect(screen.getByText('3.00%')).toBeInTheDocument();  // Pool B base/boosted

    // TVL compact formatting ($ values)
    expect(screen.getByText('$1.00')).toBeInTheDocument();
    expect(screen.getByText('$3.00')).toBeInTheDocument();
  });

  it('highlights peg deviation > 0.3% in red', () => {
    render(<BoostedLPTable />);
    // Peg deviation displays as percent with 2 decimals. 0.004 => 0.40%
    const redPeg = screen.getByText('0.40%');
    expect(redPeg).toBeInTheDocument();
    // Styled via class text-red-600 (Tailwind)
    expect(redPeg.className).toMatch(/text-red-600/);
  });
});