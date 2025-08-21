// Aave v3 Data Provider Implementation

import { createPublicClient, http, getAddress } from 'viem';
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
  AaveProtocolDataProviderABI,
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

// Normalize various inputs to bigint safely (treat undefined/null as 0n)
function toBI(x: unknown): bigint {
  if (typeof x === 'bigint') return x;
  if (typeof x === 'number') return BigInt(Math.trunc(x));
  if (typeof x === 'string') return BigInt(x);
  return 0n;
}

export class AaveV3DataProvider implements AaveDataProvider {
  // Use a permissive type to avoid viem generic incompatibilities across chain configs
  private clients: Map<Chain, any> = new Map();
  private rpcUrls: Map<Chain, string> = new Map();
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
      this.rpcUrls.set(chainConfig.id as Chain, rpcHttp as string);
      try {
        console.debug('[Aave] client init', {
          chainId: chainConfig.id,
          rpcHttp,
        });
      } catch {}
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
    // Normalize to EIP-55 checksum to satisfy viem address validation
    return getAddress(address) as `0x${string}`;
  }

  async fetchData(chains: Chain[], assets: StablecoinAsset[]): Promise<StablecoinYield[]> {
    const results: StablecoinYield[] = [];

    for (const chain of chains) {
      if (!this.isSupported(chain)) {
        continue;
      }

      for (const asset of assets) {
        try {
          const yieldData = await this.getReserveData(chain, asset);
          results.push(yieldData);
        } catch (error) {
          // Skip unsupported assets or transient failures without aborting the rest
          console.warn(
            `Aave fetch skipped for asset ${asset} on chain ${chain}:`,
            error instanceof Error ? error.message : String(error)
          );
          continue;
        }
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
// Direct path via ProtocolDataProvider for stability across chains (forced)
    try {
      console.warn('[Aave] Entering direct ProtocolDataProvider path (forced)', {
        chain,
        asset,
        provider: POOL_ADDRESSES_PROVIDER[chain as keyof typeof POOL_ADDRESSES_PROVIDER],
        rpc: this.rpcUrls.get(chain),
      });
    } catch {}
    return await this.fetchViaProtocolDataProvider(chain, asset, assetAddress);
 
    // Direct path via ProtocolDataProvider for stability across chains
    try {
      console.warn('[Aave] Entering direct ProtocolDataProvider path', {
        chain,
        asset,
        provider: POOL_ADDRESSES_PROVIDER[chain as keyof typeof POOL_ADDRESSES_PROVIDER],
        rpc: this.rpcUrls.get(chain),
      });
    } catch {}
    return await this.fetchViaProtocolDataProvider(chain, asset, assetAddress);
 
    // 1) Try UiPoolDataProviderV3 first (fast path with aggregated fields)
    try {
      try {
        console.debug('[Aave] UiPool.getReservesData', {
          chain,
          asset,
          uiPool: contractAddresses.aaveUiPoolDataProvider,
          provider: POOL_ADDRESSES_PROVIDER[chain as keyof typeof POOL_ADDRESSES_PROVIDER],
          rpc: this.rpcUrls.get(chain),
        });
      } catch {}
      // Temporarily bypass UiPool on all chains; use ProtocolDataProvider path for stability
      throw new Error('SKIP_UIPOOL');
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
      const reserveData = reservesData.find(
        (reserve: Reserve) =>
          reserve.underlyingAsset.toLowerCase() === assetAddress.toLowerCase()
      );

      if (!reserveData) {
        // Asset not listed on this Aave market – don't attempt protocol data provider fallback.
        throw new Error(`ASSET_NOT_LISTED: ${asset} on chain ${chain}`);
      }

      const supplyAPY = rayToDecimal(toBI(reserveData!.liquidityRate));
      const borrowAPY = rayToDecimal(toBI(reserveData!.variableBorrowRate));
 
      const avail = toBI(reserveData!.availableLiquidity);
      const varDebt = toBI(reserveData!.totalScaledVariableDebt);
      const stableDebt = toBI(reserveData!.totalPrincipalStableDebt);
 
      const totalSupply = avail + varDebt + stableDebt;
      const totalBorrow = varDebt + stableDebt;
 
      const utilization =
        totalSupply > 0n ? Number((totalBorrow * 10000n) / totalSupply) / 100 : 0;
 
 
      // If the UiPoolDataProvider returns an all-zero snapshot (observed on some chains
      // when the addresses provider or UI pool address is mismatched), trigger a fallback
      // to AaveProtocolDataProvider by throwing a sentinel error handled below.
      const zeroLike =
        supplyAPY === 0 &&
        borrowAPY === 0 &&
        totalSupply === 0n &&
        totalBorrow === 0n;
      if (zeroLike) {
        try {
          console.warn('[Aave] UiPool returned zero-like data; falling back to ProtocolDataProvider', {
            chain,
            asset,
            uiPool: contractAddresses.aaveUiPoolDataProvider,
            provider: POOL_ADDRESSES_PROVIDER[chain as keyof typeof POOL_ADDRESSES_PROVIDER],
            rpc: this.rpcUrls.get(chain),
          });
        } catch {}
        throw new Error('UI_POOL_ZERO_DATA');
      } else {
        try {
          console.debug('[Aave] UiPool result', {
            chain,
            asset,
            supplyAPY,
            borrowAPY,
            utilization,
            totalSupply: totalSupply.toString(),
            totalBorrow: totalBorrow.toString(),
          });
        } catch {}
      }
 
      // decimals may come back as bigint or be undefined; normalize with safe fallback
      const decimalsRaw = (reserveData as any).decimals;
      const decimalsNum =
        typeof decimalsRaw === 'bigint'
          ? Number(decimalsRaw)
          : typeof decimalsRaw === 'number'
          ? decimalsRaw
          : (STABLECOIN_METADATA[asset]?.decimals ?? 18);
      const supplyCap =
        toBI((reserveData as any).supplyCap) * 10n ** BigInt(decimalsNum);
      const borrowCap =
        toBI((reserveData as any).borrowCap) * 10n ** BigInt(decimalsNum);

      const ltv = Number(reserveData!.baseLTVasCollateral) / 100;
      const liquidationThreshold =
        Number(reserveData!.reserveLiquidationThreshold) / 100;
      const reserveFactor = Number(reserveData!.reserveFactor) / 100;

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
        eModeCategory:
          reserveData!.eModeCategoryId > 0 ? reserveData!.eModeCategoryId : undefined,
        lastUpdated: new Date(),
      };
    } catch (uiError: any) {
      const errMsg = uiError instanceof Error ? uiError.message : String(uiError);
      try {
        console.warn('[Aave] UiPool path failed', {
          chain,
          asset,
          error: errMsg,
          uiPool: contractAddresses.aaveUiPoolDataProvider,
          provider: POOL_ADDRESSES_PROVIDER[chain as keyof typeof POOL_ADDRESSES_PROVIDER],
          rpc: this.rpcUrls.get(chain),
        });
      } catch {}
      // Probe listing status to avoid fallback reverts on unsupported assets
      let listed = true;
      try {
        const list = (await client.readContract({
          address: contractAddresses.aaveUiPoolDataProvider,
          abi: UiPoolDataProviderV3ABI,
          functionName: 'getReservesList',
          args: [POOL_ADDRESSES_PROVIDER[chain as keyof typeof POOL_ADDRESSES_PROVIDER]],
        })) as unknown as string[];
        listed = (list ?? []).some(
          (addr) => addr.toLowerCase() === assetAddress.toLowerCase()
        );
      } catch {
        // Default to listed on probe failure to avoid false negatives
        listed = true;
      }

      if (!listed) {
        // Skip unsupported assets cleanly
        throw new Error(`ASSET_NOT_LISTED: ${asset} on chain ${chain}`);
      }

      // If asset not listed on UiPoolDataProvider or detected by probe, bubble up to skip this asset.
      if (errMsg.startsWith('ASSET_NOT_LISTED')) {
        throw new Error(errMsg);
      }

      // 2) Fallback: query AaveProtocolDataProvider directly per-asset
      try {
        try {
          console.warn('[Aave] Using ProtocolDataProvider fallback', {
            chain,
            asset,
            provider: POOL_ADDRESSES_PROVIDER[chain as keyof typeof POOL_ADDRESSES_PROVIDER],
            rpc: this.rpcUrls.get(chain),
          });
        } catch {}
        type PDReserveData = {
          unbacked: bigint;
          accruedToTreasuryScaled: bigint;
          totalAToken: bigint;
          totalStableDebt: bigint;
          totalVariableDebt: bigint;
          liquidityRate: bigint;
          variableBorrowRate: bigint;
          stableBorrowRate: bigint;
          averageStableBorrowRate: bigint;
          liquidityIndex: bigint;
          variableBorrowIndex: bigint;
          lastUpdateTimestamp: bigint;
        };

        type Caps = {
          borrowCap: bigint;
          supplyCap: bigint;
        };

        // Subset of configuration we need (bp values)
        type Config = {
          decimals: bigint;
          ltv: bigint;
          liquidationThreshold: bigint;
          liquidationBonus: bigint;
          reserveFactor: bigint;
          usageAsCollateralEnabled: boolean;
          borrowingEnabled: boolean;
          stableBorrowRateEnabled: boolean;
          isActive: boolean;
          isFrozen: boolean;
        };

        // Dynamically resolve the ProtocolDataProvider from the PoolAddressesProvider
        const poolDataProviderAddress = (await client.readContract({
          address: POOL_ADDRESSES_PROVIDER[chain as keyof typeof POOL_ADDRESSES_PROVIDER],
          abi: [
            {
              inputs: [],
              name: 'getPoolDataProvider',
              outputs: [{ internalType: 'address', name: '', type: 'address' }],
              stateMutability: 'view',
              type: 'function',
            },
          ] as const,
          functionName: 'getPoolDataProvider',
        })) as `0x${string}`;
 
        try {
          console.warn('[Aave] Resolved ProtocolDataProvider', {
            chain,
            asset,
            poolDataProviderAddress,
          });
        } catch {}
 
        let effectiveAssetAddress = assetAddress as `0x${string}`;
        const [rd, caps, config] = (await Promise.all([
          client.readContract({
            address: poolDataProviderAddress,
            abi: AaveProtocolDataProviderABI,
            functionName: 'getReserveData',
            args: [effectiveAssetAddress],
          }),
          client.readContract({
            address: poolDataProviderAddress,
            abi: AaveProtocolDataProviderABI,
            functionName: 'getReserveCaps',
            args: [effectiveAssetAddress],
          }),
          // getReserveConfigurationData is included in our ABI augmentation
          client.readContract({
            address: poolDataProviderAddress,
            abi: AaveProtocolDataProviderABI,
            functionName: 'getReserveConfigurationData',
            args: [effectiveAssetAddress],
          }),
        ])) as unknown as [PDReserveData, Caps, Config];

        const supplyAPY = rayToDecimal(toBI(rd.liquidityRate));
        const borrowAPY = rayToDecimal(toBI(rd.variableBorrowRate));

        const totalSupply = toBI(rd.totalAToken);
        const totalBorrow = toBI(rd.totalStableDebt) + toBI(rd.totalVariableDebt);

        const utilization =
          totalSupply > 0n ? Number((totalBorrow * 10000n) / totalSupply) / 100 : 0;

        const decimalsMeta = STABLECOIN_METADATA[asset]?.decimals ?? 18; // fallback to 18 if metadata missing
        const decimalsBI = BigInt(decimalsMeta);

        const supplyCap = toBI(caps.supplyCap) * 10n ** decimalsBI;
        const borrowCap = toBI(caps.borrowCap) * 10n ** decimalsBI;

        const ltv = Number(config.ltv) / 100;
        const liquidationThreshold = Number(config.liquidationThreshold) / 100;
        const reserveFactor = Number(config.reserveFactor) / 100;
 
        try {
          console.warn('[Aave] ProtocolDataProvider result', {
            chain,
            asset,
            supplyAPY,
            borrowAPY,
            utilization,
            totalSupply: totalSupply.toString(),
            totalBorrow: totalBorrow.toString(),
          });
        } catch {}
 
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
          eModeCategory: undefined,
          lastUpdated: new Date(),
        };
      } catch (pdError) {
        // If native USDC is not listed on Optimism Aave v3, retry using canonical USDC.e
        if (chain === 10 && asset === 'USDC') {
          let effectiveAssetAddress = assetAddress as `0x${string}`;
          const usdcE = '0x7F5c764cbc14f9669b88837ca1490cca17cf1a57' as `0x${string}`;
          if (effectiveAssetAddress.toLowerCase() !== usdcE.toLowerCase()) {
            try {
              effectiveAssetAddress = usdcE;
              const resolvedPDP = (await client.readContract({
                address: POOL_ADDRESSES_PROVIDER[chain as keyof typeof POOL_ADDRESSES_PROVIDER],
                abi: [
                  {
                    inputs: [],
                    name: 'getPoolDataProvider',
                    outputs: [{ internalType: 'address', name: '', type: 'address' }],
                    stateMutability: 'view',
                    type: 'function',
                  },
                ] as const,
                functionName: 'getPoolDataProvider',
              })) as `0x${string}`;
              const [rd2, caps2, config2] = (await Promise.all([
                client.readContract({
                  address: resolvedPDP,
                  abi: AaveProtocolDataProviderABI,
                  functionName: 'getReserveData',
                  args: [effectiveAssetAddress],
                }),
                client.readContract({
                  address: resolvedPDP,
                  abi: AaveProtocolDataProviderABI,
                  functionName: 'getReserveCaps',
                  args: [effectiveAssetAddress],
                }),
                client.readContract({
                  address: resolvedPDP,
                  abi: AaveProtocolDataProviderABI,
                  functionName: 'getReserveConfigurationData',
                  args: [effectiveAssetAddress],
                }),
              ])) as unknown as [any, any, any];
 
              const supplyAPY = rayToDecimal(toBI(rd2.liquidityRate));
              const borrowAPY = rayToDecimal(toBI(rd2.variableBorrowRate));
 
              const totalSupply = toBI(rd2.totalAToken);
              const totalBorrow = toBI(rd2.totalStableDebt) + toBI(rd2.totalVariableDebt);
 
              const utilization =
                totalSupply > 0n ? Number((totalBorrow * 10000n) / totalSupply) / 100 : 0;
 
              const decimalsMeta = STABLECOIN_METADATA[asset]?.decimals ?? 18;
              const decimalsBI = BigInt(decimalsMeta);
              const supplyCap = toBI(caps2.supplyCap) * 10n ** decimalsBI;
              const borrowCap = toBI(caps2.borrowCap) * 10n ** decimalsBI;
 
              const ltv = Number(config2.ltv) / 100;
              const liquidationThreshold = Number(config2.liquidationThreshold) / 100;
              const reserveFactor = Number(config2.reserveFactor) / 100;
 
              try {
                console.warn('[Aave] ProtocolDataProvider result (USDC.e fallback on OP)', {
                  chain,
                  asset,
                  effectiveAssetAddress,
                  supplyAPY,
                  borrowAPY,
                  utilization,
                  totalSupply: totalSupply.toString(),
                  totalBorrow: totalBorrow.toString(),
                });
              } catch {}
 
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
                eModeCategory: undefined,
                lastUpdated: new Date(),
              };
            } catch (retryError) {
              // fall through to throw below
            }
          }
        }
        throw new Error(
          `Failed to fetch reserve data for ${asset} on chain ${chain}: ${pdError}`
        );
      }
    }
  }

  private async fetchViaProtocolDataProvider(
    chain: Chain,
    asset: StablecoinAsset,
    assetAddress: `0x${string}`,
  ): Promise<StablecoinYield> {
    const client = this.getClient(chain);
 
    // Resolve ProtocolDataProvider from PoolAddressesProvider (avoids stale hardcoded addresses)
    const poolDataProviderAddress = (await client.readContract({
      address: POOL_ADDRESSES_PROVIDER[chain as keyof typeof POOL_ADDRESSES_PROVIDER],
      abi: [
        {
          inputs: [],
          name: 'getPoolDataProvider',
          outputs: [{ internalType: 'address', name: '', type: 'address' }],
          stateMutability: 'view',
          type: 'function',
        },
      ] as const,
      functionName: 'getPoolDataProvider',
    })) as `0x${string}`;
 
    try {
      console.warn('[Aave] Resolved ProtocolDataProvider (direct path)', {
        chain,
        asset,
        poolDataProviderAddress,
      });
    } catch {}
 
    // Helper to read and build result for a specific asset address
    const readAndBuild = async (effAddr: `0x${string}`): Promise<StablecoinYield> => {
      const [rd, caps, config] = (await Promise.all([
        client.readContract({
          address: poolDataProviderAddress,
          abi: AaveProtocolDataProviderABI,
          functionName: 'getReserveData',
          args: [effAddr],
        }),
        client.readContract({
          address: poolDataProviderAddress,
          abi: AaveProtocolDataProviderABI,
          functionName: 'getReserveCaps',
          args: [effAddr],
        }),
        client.readContract({
          address: poolDataProviderAddress,
          abi: AaveProtocolDataProviderABI,
          functionName: 'getReserveConfigurationData',
          args: [effAddr],
        }),
      ])) as unknown as [any, any, any];

      console.log("rd", rd)
      console.log("caps", caps)
      console.log("config", config)
 
      // viem can decode tuples as arrays; prefer named key then fallback to index.
      const pick = (obj: any, key: string, index: number) =>
        obj != null && (obj[key] ?? obj[index]);
 
      const liquidityRate = toBI(pick(rd, 'liquidityRate', 5));
      const variableBorrowRate = toBI(pick(rd, 'variableBorrowRate', 6));
      const totalAToken = toBI(pick(rd, 'totalAToken', 2));
      const totalStableDebt = toBI(pick(rd, 'totalStableDebt', 3));
      const totalVariableDebt = toBI(pick(rd, 'totalVariableDebt', 4));
 
      const supplyAPY = rayToDecimal(liquidityRate);
      const borrowAPY = rayToDecimal(variableBorrowRate);
      const totalSupply = totalAToken;
      const totalBorrow = totalStableDebt + totalVariableDebt;
      const utilization =
        totalSupply > 0n ? Number((totalBorrow * 10000n) / totalSupply) / 100 : 0;
 
      const decimalsMeta = STABLECOIN_METADATA[asset]?.decimals ?? 18;
      const decimalsBI = BigInt(decimalsMeta);
      // Aave caps are in whole token units; convert to base units by 10^decimals.
      const supplyCapUnits = toBI(pick(caps, 'supplyCap', 1));
      const borrowCapUnits = toBI(pick(caps, 'borrowCap', 0));
      const supplyCap = supplyCapUnits * 10n ** decimalsBI;
      const borrowCap = borrowCapUnits * 10n ** decimalsBI;
 
      const ltv = Number(pick(config, 'ltv', 1)) / 100;
      const liquidationThreshold = Number(pick(config, 'liquidationThreshold', 2)) / 100;
      const reserveFactor = Number(pick(config, 'reserveFactor', 4)) / 100;
 
      try {
        console.warn('[Aave] ProtocolDataProvider result (direct path)', {
          chain,
          asset,
          effAddr,
          supplyAPY,
          borrowAPY,
          utilization,
          totalSupply: totalSupply.toString(),
          totalBorrow: totalBorrow.toString(),
        });
      } catch {}
 
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
        eModeCategory: undefined,
        lastUpdated: new Date(),
      };
    };
 
    // Primary attempt with configured asset address
    try {
      return await readAndBuild(assetAddress);
    } catch (pdError) {
      // Optimism: many integrations still use USDC.e on Aave. Retry with canonical USDC.e if native USDC fails.
      if (chain === 10 && asset === 'USDC') {
        const usdcE = '0x7F5c764cbc14f9669b88837ca1490cca17cf1a57' as `0x${string}`;
        if (assetAddress.toLowerCase() !== usdcE.toLowerCase()) {
          try {
            console.warn('[Aave] Retrying with USDC.e on Optimism', { chain, asset, usdcE });
            return await readAndBuild(usdcE);
          } catch {
            // fallthrough to throw below
          }
        }
      }
      throw new Error(`Failed to fetch reserve data for ${asset} on chain ${chain}: ${pdError}`);
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