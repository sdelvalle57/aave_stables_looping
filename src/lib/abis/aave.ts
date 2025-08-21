// Aave v3 contract ABIs

// UiPoolDataProviderV3 ABI - key functions for getting reserve data
export const UiPoolDataProviderV3ABI = [
  {
    inputs: [
      {
        internalType: 'contract IPoolAddressesProvider',
        name: 'provider',
        type: 'address'
      }
    ],
    name: 'getReservesData',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'underlyingAsset',
            type: 'address'
          },
          {
            internalType: 'string',
            name: 'name',
            type: 'string'
          },
          {
            internalType: 'string',
            name: 'symbol',
            type: 'string'
          },
          {
            internalType: 'uint256',
            name: 'decimals',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'baseLTVasCollateral',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'reserveLiquidationThreshold',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'reserveLiquidationBonus',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'reserveFactor',
            type: 'uint256'
          },
          {
            internalType: 'bool',
            name: 'usageAsCollateralEnabled',
            type: 'bool'
          },
          {
            internalType: 'bool',
            name: 'borrowingEnabled',
            type: 'bool'
          },
          {
            internalType: 'bool',
            name: 'stableBorrowRateEnabled',
            type: 'bool'
          },
          {
            internalType: 'bool',
            name: 'isActive',
            type: 'bool'
          },
          {
            internalType: 'bool',
            name: 'isFrozen',
            type: 'bool'
          },
          {
            internalType: 'uint128',
            name: 'liquidityIndex',
            type: 'uint128'
          },
          {
            internalType: 'uint128',
            name: 'variableBorrowIndex',
            type: 'uint128'
          },
          {
            internalType: 'uint128',
            name: 'liquidityRate',
            type: 'uint128'
          },
          {
            internalType: 'uint128',
            name: 'variableBorrowRate',
            type: 'uint128'
          },
          {
            internalType: 'uint128',
            name: 'stableBorrowRate',
            type: 'uint128'
          },
          {
            internalType: 'uint40',
            name: 'lastUpdateTimestamp',
            type: 'uint40'
          },
          {
            internalType: 'address',
            name: 'aTokenAddress',
            type: 'address'
          },
          {
            internalType: 'address',
            name: 'stableDebtTokenAddress',
            type: 'address'
          },
          {
            internalType: 'address',
            name: 'variableDebtTokenAddress',
            type: 'address'
          },
          {
            internalType: 'address',
            name: 'interestRateStrategyAddress',
            type: 'address'
          },
          {
            internalType: 'uint256',
            name: 'availableLiquidity',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'totalPrincipalStableDebt',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'averageStableRate',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'stableDebtLastUpdateTimestamp',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'totalScaledVariableDebt',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'priceInMarketReferenceCurrency',
            type: 'uint256'
          },
          {
            internalType: 'address',
            name: 'priceOracle',
            type: 'address'
          },
          {
            internalType: 'uint256',
            name: 'variableRateSlope1',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'variableRateSlope2',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'stableRateSlope1',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'stableRateSlope2',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'baseStableBorrowRate',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'baseVariableBorrowRate',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'optimalUsageRatio',
            type: 'uint256'
          },
          {
            internalType: 'bool',
            name: 'isPaused',
            type: 'bool'
          },
          {
            internalType: 'bool',
            name: 'isSiloedBorrowing',
            type: 'bool'
          },
          {
            internalType: 'uint128',
            name: 'accruedToTreasury',
            type: 'uint128'
          },
          {
            internalType: 'uint128',
            name: 'unbacked',
            type: 'uint128'
          },
          {
            internalType: 'uint128',
            name: 'isolationModeTotalDebt',
            type: 'uint128'
          },
          {
            internalType: 'bool',
            name: 'flashLoanEnabled',
            type: 'bool'
          },
          {
            internalType: 'uint256',
            name: 'debtCeiling',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'debtCeilingDecimals',
            type: 'uint256'
          },
          {
            internalType: 'uint8',
            name: 'eModeCategoryId',
            type: 'uint8'
          },
          {
            internalType: 'uint256',
            name: 'borrowCap',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'supplyCap',
            type: 'uint256'
          },
          {
            internalType: 'uint16',
            name: 'eModeLtv',
            type: 'uint16'
          },
          {
            internalType: 'uint16',
            name: 'eModeLiquidationThreshold',
            type: 'uint16'
          },
          {
            internalType: 'uint16',
            name: 'eModeLiquidationBonus',
            type: 'uint16'
          },
          {
            internalType: 'address',
            name: 'eModePriceSource',
            type: 'address'
          },
          {
            internalType: 'string',
            name: 'eModeLabel',
            type: 'string'
          },
          {
            internalType: 'bool',
            name: 'borrowableInIsolation',
            type: 'bool'
          }
        ],
        internalType: 'struct IUiPoolDataProviderV3.AggregatedReserveData[]',
        name: '',
        type: 'tuple[]'
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'marketReferenceCurrencyUnit',
            type: 'uint256'
          },
          {
            internalType: 'int256',
            name: 'marketReferenceCurrencyPriceInUsd',
            type: 'int256'
          },
          {
            internalType: 'int256',
            name: 'networkBaseTokenPriceInUsd',
            type: 'int256'
          },
          {
            internalType: 'uint8',
            name: 'networkBaseTokenPriceDecimals',
            type: 'uint8'
          }
        ],
        internalType: 'struct IUiPoolDataProviderV3.BaseCurrencyInfo',
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'contract IPoolAddressesProvider',
        name: 'provider',
        type: 'address'
      }
    ],
    name: 'getReservesList',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// AaveProtocolDataProvider ABI - for getting caps and additional data
export const AaveProtocolDataProviderABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'asset',
        type: 'address'
      }
    ],
    name: 'getReserveCaps',
    outputs: [
      {
        internalType: 'uint256',
        name: 'borrowCap',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'supplyCap',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'asset',
        type: 'address'
      }
    ],
    name: 'getReserveData',
    outputs: [
      {
        internalType: 'uint256',
        name: 'unbacked',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'accruedToTreasuryScaled',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'totalAToken',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'totalStableDebt',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'totalVariableDebt',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'liquidityRate',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'variableBorrowRate',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'stableBorrowRate',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'averageStableBorrowRate',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'liquidityIndex',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'variableBorrowIndex',
        type: 'uint256'
      },
      {
        internalType: 'uint40',
        name: 'lastUpdateTimestamp',
        type: 'uint40'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getAllReservesTokens',
    outputs: [
      {
        components: [
          {
            internalType: 'string',
            name: 'symbol',
            type: 'string'
          },
          {
            internalType: 'address',
            name: 'tokenAddress',
            type: 'address'
          }
        ],
        internalType: 'struct IPoolDataProvider.TokenData[]',
        name: '',
        type: 'tuple[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'asset',
        type: 'address'
      }
    ],
    name: 'getReserveConfigurationData',
    outputs: [
      {
        internalType: 'uint256',
        name: 'decimals',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'ltv',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'liquidationThreshold',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'liquidationBonus',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'reserveFactor',
        type: 'uint256'
      },
      {
        internalType: 'bool',
        name: 'usageAsCollateralEnabled',
        type: 'bool'
      },
      {
        internalType: 'bool',
        name: 'borrowingEnabled',
        type: 'bool'
      },
      {
        internalType: 'bool',
        name: 'stableBorrowRateEnabled',
        type: 'bool'
      },
      {
        internalType: 'bool',
        name: 'isActive',
        type: 'bool'
      },
      {
        internalType: 'bool',
        name: 'isFrozen',
        type: 'bool'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Pool addresses provider addresses for each chain
export const POOL_ADDRESSES_PROVIDER = {
  1: '0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e', // Ethereum (Aave v3 mainnet)
  42161: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb', // Arbitrum
  10: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb', // Optimism
  137: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb', // Polygon
} as const;

// Ray unit for Aave calculations (10^27)
export const RAY = 10n ** 27n;

// Helper function to convert ray to percentage
export function rayToPercentage(ray: bigint): number {
  return Number(ray * 100n / RAY) / 100;
}

// Helper function to convert ray to decimal
export function rayToDecimal(ray: bigint): number {
  return Number(ray) / Number(RAY);
}