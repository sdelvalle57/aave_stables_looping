// Data provider interfaces and types

import type {
    StablecoinYield,
    CurvePoolData,
    EModeCategory,
    Chain,
    StablecoinAsset
} from './domain';

// Base data provider interface
export interface DataProvider<T> {
    fetchData(chains: Chain[], assets: StablecoinAsset[]): Promise<T[]>;
    isSupported(chain: Chain): boolean;
    getUpdateInterval(): number;
}

// Aave-specific data provider interface
export interface AaveDataProvider extends DataProvider<StablecoinYield> {
    getReserveData(chain: Chain, asset: StablecoinAsset): Promise<StablecoinYield>;
    getEModeCategories(chain: Chain): Promise<EModeCategory[]>;
    getReservesList(chain: Chain): Promise<`0x${string}`[]>;
}

// Curve-specific data provider interface
export interface CurveDataProvider extends DataProvider<CurvePoolData> {
    getPoolData(chain: Chain, poolAddress: `0x${string}`): Promise<CurvePoolData>;
    getTopStablePools(chain: Chain): Promise<CurvePoolData[]>;
    getPoolsByAssets(chain: Chain, assets: StablecoinAsset[]): Promise<CurvePoolData[]>;
}

// MakerDAO DSR provider interface
export interface DSRDataProvider {
    getCurrentDSR(): Promise<number>;
    getDSRHistory(days: number): Promise<DSRHistoryPoint[]>;
}

export interface DSRHistoryPoint {
    timestamp: Date;
    rate: number;
}

// Pendle provider interface (optional)
export interface PendleDataProvider {
    getPTYields(chain: Chain, assets: StablecoinAsset[]): Promise<PendleYield[]>;
    isSupported(chain: Chain): boolean;
}

export interface PendleYield {
    ptAddress: `0x${string}`;
    asset: StablecoinAsset;
    chain: Chain;
    apy: number;
    maturity: Date;
    impliedAPY: number;
    lastUpdated: Date;
}

// Provider error types
export class ProviderError extends Error {
    public provider: string;
    public chain?: Chain;
    public originalError?: Error;

    constructor(
        message: string,
        provider: string,
        chain?: Chain,
        originalError?: Error
    ) {
        super(message);
        this.name = 'ProviderError';
        this.provider = provider;
        this.chain = chain;
        this.originalError = originalError;
    }
}

export class NetworkError extends ProviderError {
    constructor(provider: string, chain: Chain, originalError?: Error) {
        super(`Network error for ${provider} on chain ${chain}`, provider, chain, originalError);
        this.name = 'NetworkError';
    }
}

export class ContractError extends ProviderError {
    constructor(
        provider: string,
        chain: Chain,
        contractAddress: string,
        originalError?: Error
    ) {
        super(
            `Contract error for ${provider} on chain ${chain} at ${contractAddress}`,
            provider,
            chain,
            originalError
        );
        this.name = 'ContractError';
    }
}

// Provider configuration
export interface ProviderConfig {
    updateInterval: number;
    retryAttempts: number;
    retryDelay: number;
    timeout: number;
}

// Data provider factory type
export type DataProviderFactory<T> = (config: ProviderConfig) => DataProvider<T>;