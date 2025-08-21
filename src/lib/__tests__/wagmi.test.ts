//// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks so vi.mock factories can reference them safely
const mocks = vi.hoisted(() => {
  const httpMock = vi.fn((url: string) => ({ url }));
  const getDefaultConfigMock = vi.fn((args: any) => args);
  return { httpMock, getDefaultConfigMock };
});

vi.mock('viem', () => ({
  http: mocks.httpMock,
}));

vi.mock('@rainbow-me/rainbowkit', () => ({
  getDefaultConfig: mocks.getDefaultConfigMock,
}));

import { SUPPORTED_CHAINS } from '../chains';

describe('wagmi config transports (Alchemy URLs)', () => {
  beforeEach(() => {
    mocks.httpMock.mockClear();
    mocks.getDefaultConfigMock.mockClear();
  });

  it('creates transports using Alchemy RPC URLs for each supported chain', async () => {
    // Ensure fresh module load for wagmi.ts with mocks applied
    vi.resetModules();
    const { wagmiConfig } = await import('../wagmi');

    // Validate getDefaultConfig received a transports object
    expect(mocks.getDefaultConfigMock).toHaveBeenCalledTimes(1);
    const arg = mocks.getDefaultConfigMock.mock.calls[0][0];
    expect(arg.transports).toBeTruthy();

    // Validate viem.http called with Alchemy URLs from SUPPORTED_CHAINS
    const ethUrl = SUPPORTED_CHAINS.ethereum.rpcUrls.alchemy.http[0];
    const arbUrl = SUPPORTED_CHAINS.arbitrum.rpcUrls.alchemy.http[0];
    const optUrl = SUPPORTED_CHAINS.optimism.rpcUrls.alchemy.http[0];
    const polUrl = SUPPORTED_CHAINS.polygon.rpcUrls.alchemy.http[0];

    // http was invoked with the expected URLs
    expect(mocks.httpMock).toHaveBeenCalledWith(ethUrl);
    expect(mocks.httpMock).toHaveBeenCalledWith(arbUrl);
    expect(mocks.httpMock).toHaveBeenCalledWith(optUrl);
    expect(mocks.httpMock).toHaveBeenCalledWith(polUrl);

    // Also ensure exported wagmiConfig is the object produced by our mock
    expect((wagmiConfig as any)).toBeTruthy();
  });
});