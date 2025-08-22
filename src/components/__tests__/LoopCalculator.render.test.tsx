/// <reference types="vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoopCalculator } from '@/components/LoopCalculator';
import { useUIStore } from '@/store/ui';

// Mock market APY hook to avoid network/React Query and control APYs in tests
const apyState = {
  supplyAPY: 0.06,
  borrowAPY: 0.03,
  isLoading: false,
  isFetching: false,
  error: undefined as unknown,
  hasData: true,
  updatedAt: new Date(),
};

vi.mock('@/hooks/useMarketAPY', () => {
  return {
    useMarketAPY: () => apyState,
  };
});

function setAPY(supply: number, borrow: number) {
  apyState.supplyAPY = supply;
  apyState.borrowAPY = borrow;
}

function setDefaultCalculatorParams() {
  useUIStore.setState({
    calculatorParams: {
      chain: 1,
      depositAsset: 'USDC',
      borrowAsset: 'USDC',
      principal: 10_000n,
      targetLTV: 50,
      loops: 1,
      targetLeverage: 1,
    },
  } as any);
}

function getMetricValueAfterLabel(label: string): string {
  // Find the label div then take the next sibling with the value text
  const labelEl = screen.getByText(label);
  const container = labelEl.parentElement?.parentElement ?? labelEl.parentElement ?? undefined;
  if (!container) throw new Error(`Container not found for label: ${label}`);
  const valueEl = container.querySelector('.font-medium');
  if (!valueEl) throw new Error(`Value element not found for label: ${label}`);
  return (valueEl.textContent || '').trim();
}

function parseAmount(text: string): number {
  // Remove thousands separators and trailing 'x' if present
  const cleaned = text.replace(/[^\d.-]/g, '');
  return Number.parseFloat(cleaned);
}

describe('LoopCalculator render behavior', () => {
  beforeEach(() => {
    setDefaultCalculatorParams();
    setAPY(0.06, 0.03);
  });

  it('updates totals and leverage in real time when loops slider changes', async () => {
    const { rerender } = render(<LoopCalculator />);

    // Capture initial totals and leverage
    const initialBorrowed = parseAmount(getMetricValueAfterLabel('Total borrowed'));
    const initialLeverage = parseAmount(getMetricValueAfterLabel('Leverage multiplier'));

    // Change loops from 1 to 3 (first slider is Loops)
    const sliders = screen.getAllByRole('slider');
    const loopsSlider = sliders[0]; // Loops
    fireEvent.change(loopsSlider, { target: { value: '3' } });

    // Re-render to reflect state update (zustand updates are synchronous but ensure refresh)
    rerender(<LoopCalculator />);

    const updatedBorrowed = parseAmount(getMetricValueAfterLabel('Total borrowed'));
    const updatedLeverage = parseAmount(getMetricValueAfterLabel('Leverage multiplier'));

    expect(updatedBorrowed).toBeGreaterThan(initialBorrowed);
    expect(updatedLeverage).toBeGreaterThan(initialLeverage);

    // Loops count label near slider should reflect new value
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows Negative spread badge when borrow APY >= supply APY', async () => {
    const { rerender } = render(<LoopCalculator />);

    // Initially positive spread — badge should not be present
    expect(screen.queryByText('Negative spread')).toBeNull();

    // Flip to negative spread
    setAPY(0.02, 0.04);
    rerender(<LoopCalculator />);

    // Now the badge should appear
    expect(screen.getByText('Negative spread')).toBeInTheDocument();
  });
});
describe('LoopCalculator health factor and stress', () => {
  beforeEach(() => {
    // Default params and APYs (supply > borrow) from existing helpers
    useUIStore.setState({
      calculatorParams: {
        chain: 1,
        depositAsset: 'USDC',
        borrowAsset: 'USDC',
        principal: 10_000n,
        targetLTV: 50,
        loops: 1,
        targetLeverage: 1,
      },
    } as any);
    apyState.supplyAPY = 0.06;
    apyState.borrowAPY = 0.03;
  });

  it('renders Health factor badge and RiskBands', () => {
    render(<LoopCalculator />);

    // Health factor label present
    expect(screen.getByText('Health factor')).toBeInTheDocument();

    // Risk bands tick labels present
    expect(screen.getByText('1.0')).toBeInTheDocument();
    expect(screen.getByText('2.5')).toBeInTheDocument();

    // At least one HF badge visible
    const badges = screen.getAllByText('HF');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('updates stressed HF when stress slider changes (via quick buttons)', () => {
    const { rerender } = render(<LoopCalculator />);

    // Helper to extract the text content of a metric card by its label
    function getCardText(label: string): string {
      const labelEl = screen.getByText(label);
      const container =
        labelEl.closest('.p-3') || labelEl.parentElement || undefined;
      if (!container) throw new Error(`No container for label: ${label}`);
      return (container.textContent || '').trim();
    }

    const beforeDown = getCardText('Stress down');

    // Click quick button to set ±1%
    fireEvent.click(screen.getByText('±1%'));
    rerender(<LoopCalculator />);

    const afterDown = getCardText('Stress down');

    expect(afterDown).not.toEqual(beforeDown);

    // Three badges should exist: down, base, up
    const badges = screen.getAllByText('HF');
    expect(badges.length).toBeGreaterThanOrEqual(3);
  });
});