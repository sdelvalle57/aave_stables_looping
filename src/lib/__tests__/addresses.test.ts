/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import { CONTRACT_ADDRESSES, SUPPORTED_CHAINS } from '../../lib/chains';
import { POOL_ADDRESSES_PROVIDER } from '../../lib/abis/aave';

const hex40 = /^0x[a-fA-F0-9]{40}$/;
const supportedChainIds = Object.values(SUPPORTED_CHAINS).map((c) => c.id);

describe('Aave contract constants', () => {
  it('CONTRACT_ADDRESSES present and valid for all supported chains', () => {
    supportedChainIds.forEach((chainId) => {
      const entry = (CONTRACT_ADDRESSES as any)[chainId];
      expect(entry, `Missing CONTRACT_ADDRESSES for chain ${chainId}`).toBeTruthy();
      expect(entry.aavePoolDataProvider, `Missing aavePoolDataProvider for chain ${chainId}`).toBeTruthy();
      expect(entry.aaveUiPoolDataProvider, `Missing aaveUiPoolDataProvider for chain ${chainId}`).toBeTruthy();
      expect(
        hex40.test(entry.aavePoolDataProvider),
        `Invalid aavePoolDataProvider for chain ${chainId}: ${entry.aavePoolDataProvider}`
      ).toBe(true);
      expect(
        hex40.test(entry.aaveUiPoolDataProvider),
        `Invalid aaveUiPoolDataProvider for chain ${chainId}: ${entry.aaveUiPoolDataProvider}`
      ).toBe(true);
    });
  });

  it('POOL_ADDRESSES_PROVIDER present and valid for all supported chains', () => {
    supportedChainIds.forEach((chainId) => {
      const addr = (POOL_ADDRESSES_PROVIDER as any)[chainId];
      expect(addr, `Missing POOL_ADDRESSES_PROVIDER for chain ${chainId}`).toBeTruthy();
      expect(
        hex40.test(addr),
        `Invalid POOL_ADDRESSES_PROVIDER for chain ${chainId}: ${addr}`
      ).toBe(true);
    });
  });
});
it('CONTRACT_ADDRESSES values match expected canonical addresses', () => {
  // ProtocolDataProvider (aka PoolDataProvider)
  expect(CONTRACT_ADDRESSES[1].aavePoolDataProvider).toBe('0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3');
  expect(CONTRACT_ADDRESSES[42161].aavePoolDataProvider).toBe('0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654');
  expect(CONTRACT_ADDRESSES[10].aavePoolDataProvider).toBe('0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654');
  expect(CONTRACT_ADDRESSES[137].aavePoolDataProvider).toBe('0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654');

  // UiPoolDataProviderV3
  expect(CONTRACT_ADDRESSES[1].aaveUiPoolDataProvider).toBe('0x91c0eA31b49B69Ea18607702c5d9aC360bf3dE7d');
  expect(CONTRACT_ADDRESSES[42161].aaveUiPoolDataProvider).toBe('0x145dE30c929a065582da84Cf96F88460dB9745A7');
  expect(CONTRACT_ADDRESSES[10].aaveUiPoolDataProvider).toBe('0x145dE30c929a065582da84Cf96F88460dB9745A7');
  expect(CONTRACT_ADDRESSES[137].aaveUiPoolDataProvider).toBe('0x145dE30c929a065582da84Cf96F88460dB9745A7');
});

it('POOL_ADDRESSES_PROVIDER values match expected canonical addresses', () => {
  expect(POOL_ADDRESSES_PROVIDER[1]).toBe('0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e');      // Ethereum
  expect(POOL_ADDRESSES_PROVIDER[42161]).toBe('0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb');   // Arbitrum
  expect(POOL_ADDRESSES_PROVIDER[10]).toBe('0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb');     // Optimism
  expect(POOL_ADDRESSES_PROVIDER[137]).toBe('0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb');    // Polygon
});