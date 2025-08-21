// Aave v3 Data Provider Implementation

import { createPublicClient, http } from 'viem';
import type {
  StablecoinYield,
  EModeCategory,
  Chain,
  StablecoinAsset,
} from '../../types/domain';
import type { AaveDataProvider, ProviderConfig } from '../../types/providers';
import { STABLECOIN_METADATA, type SupportedChainId } from '../../types/chains';
import { SUPPORTED_CHAINS, getContractAddresses } from '../chains';
import {
  UiPoolDataProviderV3ABI,
  POOL_ADDRESSES_PROVIDER,
  rayToDecimal,
} from '../abis/aave';

// Default configuration
const DEFAULT_CONFIG: ProviderConfig = {
  updateInterval: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000,
  timeout: 10000,
};

export class AaveV3DataProvider implements AaveDataProvider {
  // Use a permissive type to avoid viem generic incompatibilities across chain configs
  private clients: Map<Chain, any> = new Map();
  private config: ProviderConfig;

  constructor(config: Partial<ProviderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeClients();
  }

  private initializeClients(): void {
    // Initialize viem clients for each supported chain with fallback if Alchemy key is invalid/missing
    function pickRpcUrl(urls: any) {
      const alchemy = urls?.alchemy?.http?.[0] as string | undefined;
      const invalid =
        !alchemy ||
        alchemy.includes('/undefined') ||
        alchemy.includes('your_alchemy_api_key_here') ||
        alchemy.endsWith('/v2/') ||
        (alchemy.split('/v2/')[1]?.length ?? 0) < 20;
      return invalid ? (urls?.default?.http?.[0] as string) : alchemy;
    }

    Object.values(SUPPORTED_CHAINS).forEach((chainConfig) => {
      const rpcHttp = pickRpcUrl((chainConfig as any).rpcUrls);
      const client = createPublicClient({
        chain: chainConfig as any,
        transport: http(rpcHttp),
      });
      this.clients.set(chainConfig.id as Chain, client);
    });
  }

  private getClient(chain: Chain): any {
    const client = this.clients.get(chain);
    if (!client) {
      throw new Error(`No client configured for chain ${chain}`);
    }
    return client;
  }

  private getAssetAddress(chain: Chain, asset: StablecoinAsset): `0x${string}` {
    const address = STABLECOIN_METADATA[asset].addresses[chain as SupportedChainId];
    if (!address) {
      throw new Error(`No address configured for ${asset} on chain ${chain}`);
    }
    return address;
  }

  async fetchData(chains: Chain[], assets: StablecoinAsset[]): Promise<StablecoinYield[]> {
    const results: StablecoinYield[] = [];

    for (const chain of chains) {
      if (!this.isSupported(chain)) {
        continue;
      }

      try {
        for (const asset of assets) {
          const yieldData = await this.getReserveData(chain, asset);
          results.push(yieldData);
        }
      } catch (error) {
        console.error(`Failed to fetch Aave data for chain ${chain}:`, error);
        // Continue with other chains instead of failing completely
      }
    }

    return results;
  }

  async getReserveData(chain: Chain, asset: StablecoinAsset): Promise<StablecoinYield> {
    const client = this.getClient(chain);
    const contractAddresses = getContractAddresses(chain);
    const assetAddress = this.getAssetAddress(chain, asset);

    if (!contractAddresses) {
      throw new Error(`No contract addresses configured for chain ${chain}`);
    }

    try {
      // Get comprehensive reserve data from UiPoolDataProvider
      type Reserve = {
        underlyingAsset: string;
        name: string;
        symbol: string;
        decimals: number;
        baseLTVasCollateral: bigint | number;
        reserveLiquidationThreshold: bigint | number;
        reserveLiquidationBonus: bigint | number;
        reserveFactor: bigint | number;
        usageAsCollateralEnabled: boolean;
        borrowingEnabled: boolean;
        stableBorrowRateEnabled: boolean;
        isActive: boolean;
        isFrozen: boolean;
        liquidityIndex: bigint;
        variableBorrowIndex: bigint;
        liquidityRate: bigint;
        variableBorrowRate: bigint;
        stableBorrowRate: bigint;
        lastUpdateTimestamp: number | bigint;
        aTokenAddress: `0x${string}`;
        stableDebtTokenAddress: `0x${string}`;
        variableDebtTokenAddress: `0x${string}`;
        interestRateStrategyAddress: `0x${string}`;
        availableLiquidity: bigint;
        totalPrincipalStableDebt: bigint;
        averageStableRate: bigint;
        stableDebtLastUpdateTimestamp: bigint;
        totalScaledVariableDebt: bigint;
        priceInMarketReferenceCurrency: bigint;
        priceOracle: `0x${string}`;
        eModeCategoryId: number;
        borrowCap: bigint;
        supplyCap: bigint;
      };

      const readResult = (await client.readContract({
        address: contractAddresses.aaveUiPoolDataProvider,
        abi: UiPoolDataProviderV3ABI,
        functionName: 'getReservesData',
        args: [POOL_ADDRESSES_PROVIDER[chain as keyof typeof POOL_ADDRESSES_PROVIDER]],
      })) as unknown as [Reserve[], unknown];

      const reservesData = readResult[0] as Reserve[];

      // Find the specific asset data
      const reserveData = reservesData.find(
        (reserve: Reserve) =>
          reserve.underlyingAsset.toLowerCase() === assetAddress.toLowerCase()
      );

      if (!reserveData) {
        throw new Error(`Reserve data not found for ${asset} on chain ${chain}`);
      }

      // Calculate APYs from ray values
      const supplyAPY = rayToDecimal(reserveData.liquidityRate);
      const borrowAPY = rayToDecimal(reserveData.variableBorrowRate);

      // Calculate utilization
      const totalSupply = reserveData.availableLiquidity + reserveData.totalScaledVariableDebt + reserveData.totalPrincipalStableDebt;
      const totalBorrow = reserveData.totalScaledVariableDebt + reserveData.totalPrincipalStableDebt;
      const utilization = totalSupply > 0n ? Number(totalBorrow * 10000n / totalSupply) / 100 : 0;

      // Convert caps from the reserve data
      const supplyCap = reserveData.supplyCap * (10n ** BigInt(reserveData.decimals));
      const borrowCap = reserveData.borrowCap * (10n ** BigInt(reserveData.decimals));

      // Convert LTV and liquidation threshold from basis points
      const ltv = Number(reserveData.baseLTVasCollateral) / 100;
      const liquidationThreshold = Number(reserveData.reserveLiquidationThreshold) / 100;
      const reserveFactor = Number(reserveData.reserveFactor) / 100;

      return {
        protocol: 'aave',
        chain,
        asset,
        supplyAPY,
        borrowAPY,
        utilization,
        totalSupply,
        totalBorrow,
        supplyCap,
        borrowCap,
        ltv,
        liquidationThreshold,
        reserveFactor,
        eModeCategory: reserveData.eModeCategoryId > 0 ? reserveData.eModeCategoryId : undefined,
        lastUpdated: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to fetch reserve data for ${asset} on chain ${chain}: ${error}`);
    }
  }

  async getEModeCategories(chain: Chain): Promise<EModeCategory[]> {
    // suppress unused parameter in current stub
    void chain;
    // For now, return hardcoded E-Mode categories for stablecoins
    // In a full implementation, this would read from the PoolDataProvider
    const stablecoinEMode: EModeCategory = {
      id: 1,
      ltv: 93, // 93%
      liquidationThreshold: 95, // 95%
      liquidationBonus: 1, // 1%
      priceSource: '0x0000000000000000000000000000000000000000',
      label: 'Stablecoins',
    };

    return [stablecoinEMode];
  }

  async getReservesList(chain: Chain): Promise<`0x${string}`[]> {
    const client = this.getClient(chain);
    const contractAddresses = getContractAddresses(chain);

    if (!contractAddresses) {
      throw new Error(`No contract addresses configured for chain ${chain}`);
    }

    try {
      const reservesList = await client.readContract({
        address: contractAddresses.aaveUiPoolDataProvider,
        abi: UiPoolDataProviderV3ABI,
        functionName: 'getReservesList',
        args: [POOL_ADDRESSES_PROVIDER[chain as keyof typeof POOL_ADDRESSES_PROVIDER]],
      });

      // Cast to a mutable array type for our interface
      return [...reservesList] as `0x${string}`[];
    } catch (error) {
      throw new Error(`Failed to fetch reserves list for chain ${chain}: ${error}`);
    }
  }

  isSupported(chain: Chain): boolean {
    return this.clients.has(chain) && chain in POOL_ADDRESSES_PROVIDER;
  }

  getUpdateInterval(): number {
    return this.config.updateInterval;
  }
}

// Export a default instance
export const aaveDataProvider = new AaveV3DataProvider();