/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Define hoisted mocks so vi.mock factories can reference them safely
const mocks = vi.hoisted(() => {
  const createPublicClientMock = vi.fn();
  const httpMock = vi.fn((url: string) => ({ url }));
  const multicallMock = vi.fn();
  return { createPublicClientMock, httpMock, multicallMock };
});

vi.mock('viem', () => ({
  createPublicClient: mocks.createPublicClientMock,
  http: mocks.httpMock,
}));

vi.mock('viem/actions', () => ({
  multicall: mocks.multicallMock,
}));

import { SUPPORTED_CHAINS, MULTICALL_CONFIG } from '../chains';
import { executeMulticall, getPublicClient, isMulticallSupported } from '../multicall';

describe('multicall utilities URL/transport usage', () => {
  beforeEach(() => {
    mocks.createPublicClientMock.mockReset();
    mocks.httpMock.mockReset();
    mocks.multicallMock.mockReset();

    // Each created client exposes a no-op shape the code expects
    mocks.createPublicClientMock.mockImplementation(({ chain, transport }) => ({
      chain,
      transport,
    }));
  });

  it('getPublicClient uses Alchemy HTTP for each supported chain', () => {
    const chainIds = [
      SUPPORTED_CHAINS.ethereum.id,
      SUPPORTED_CHAINS.arbitrum.id,
      SUPPORTED_CHAINS.optimism.id,
      SUPPORTED_CHAINS.polygon.id,
    ];

    // Call getPublicClient which should trigger client creation and viem.http usage
    chainIds.forEach((id) => {
      const client = getPublicClient(id);
      expect(client).toBeTruthy();
    });

    // Validate http is called with the alchemy URLs
    expect(mocks.httpMock).toHaveBeenCalledWith(SUPPORTED_CHAINS.ethereum.rpcUrls.alchemy.http[0]);
    expect(mocks.httpMock).toHaveBeenCalledWith(SUPPORTED_CHAINS.arbitrum.rpcUrls.alchemy.http[0]);
    expect(mocks.httpMock).toHaveBeenCalledWith(SUPPORTED_CHAINS.optimism.rpcUrls.alchemy.http[0]);
    expect(mocks.httpMock).toHaveBeenCalledWith(SUPPORTED_CHAINS.polygon.rpcUrls.alchemy.http[0]);

    // getPublicClient called again should reuse cached clients (no extra http/create calls)
    mocks.httpMock.mockClear();
    mocks.createPublicClientMock.mockClear();
    chainIds.forEach((id) => {
      const client = getPublicClient(id);
      expect(client).toBeTruthy();
    });
    expect(mocks.httpMock).not.toHaveBeenCalled();
    expect(mocks.createPublicClientMock).not.toHaveBeenCalled();
  });

  it('executeMulticall passes the configured multicall address per chain', async () => {
    const chainId = SUPPORTED_CHAINS.ethereum.id;

    const contracts = [
      {
        address: '0x0000000000000000000000000000000000000001' as const,
        abi: [] as any,
        functionName: 'foo',
        args: [],
      },
      {
        address: '0x0000000000000000000000000000000000000002' as const,
        abi: [] as any,
        functionName: 'bar',
        args: [123],
      },
    ];

    // Mock viem multicall to return success for both calls
    mocks.multicallMock.mockResolvedValueOnce([
      { status: 'success', result: '0xabc' },
      { status: 'success', result: 42n },
    ]);

    const results = await executeMulticall(chainId, contracts as any);

    expect(mocks.multicallMock).toHaveBeenCalledTimes(1);
    const [clientArg, optionsArg] = mocks.multicallMock.mock.calls[0];

    // clientArg should be the created client
    expect(clientArg).toBeTruthy();

    // optionsArg.multicallAddress should match configured address
    expect(optionsArg.multicallAddress).toBe(MULTICALL_CONFIG[chainId].address);

    // Contracts are forwarded
    expect(optionsArg.contracts).toHaveLength(2);
    expect(results).toEqual(['0xabc', 42n]);
  });

  it('isMulticallSupported reflects configured chains', () => {
    expect(isMulticallSupported(SUPPORTED_CHAINS.ethereum.id)).toBe(true);
    expect(isMulticallSupported(SUPPORTED_CHAINS.arbitrum.id)).toBe(true);
    expect(isMulticallSupported(SUPPORTED_CHAINS.optimism.id)).toBe(true);
    expect(isMulticallSupported(SUPPORTED_CHAINS.polygon.id)).toBe(true);
  });
});