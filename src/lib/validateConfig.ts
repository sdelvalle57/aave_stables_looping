import { SUPPORTED_CHAINS, CONTRACT_ADDRESSES } from './chains';
import { POOL_ADDRESSES_PROVIDER } from './abis/aave';
import { STABLECOIN_METADATA } from '../types/chains';

const HEX40 = /^0x[a-fA-F0-9]{40}$/;

export interface ValidateConfigResult {
  errors: string[];
  warnings: string[];
}

/**
 * Validate required environment variables and on-chain address constants.
 * - In dev (strict=false): logs warnings and continues.
 * - In prod (strict=true): throws on errors.
 */
export function validateConfig(options: { strict?: boolean } = {}): ValidateConfigResult {
  const { strict } = options;
  const isProd = typeof import.meta !== 'undefined' ? (import.meta as any).env?.PROD === true : false;
  const modeStrict = strict ?? isProd;

  const errors: string[] = [];
  const warnings: string[] = [];

  const env = (import.meta as any)?.env ?? {};
  const ALCHEMY_API_KEY = env.VITE_ALCHEMY_API_KEY as string | undefined;
  const WALLETCONNECT_PROJECT_ID = env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;

  // Env checks
  if (!ALCHEMY_API_KEY) {
    (modeStrict ? errors : warnings).push('VITE_ALCHEMY_API_KEY is missing');
  }
  if (!WALLETCONNECT_PROJECT_ID) {
    (modeStrict ? errors : warnings).push('VITE_WALLETCONNECT_PROJECT_ID is missing');
  }

  // Chain IDs from configured chains
  const chainIds = Object.values(SUPPORTED_CHAINS).map((c) => c.id);

  // Aave contract constants checks per chain
  for (const chainId of chainIds) {
    const entry = (CONTRACT_ADDRESSES as any)[chainId];
    if (!entry) {
      errors.push(`Missing CONTRACT_ADDRESSES entry for chain ${chainId}`);
    } else {
      if (!HEX40.test(entry.aavePoolDataProvider)) {
        errors.push(`Invalid aavePoolDataProvider for chain ${chainId}: ${entry.aavePoolDataProvider}`);
      }
      if (!HEX40.test(entry.aaveUiPoolDataProvider)) {
        errors.push(`Invalid aaveUiPoolDataProvider for chain ${chainId}: ${entry.aaveUiPoolDataProvider}`);
      }
    }

    const poolProvider = (POOL_ADDRESSES_PROVIDER as any)[chainId];
    if (!poolProvider) {
      errors.push(`Missing POOL_ADDRESSES_PROVIDER for chain ${chainId}`);
    } else if (!HEX40.test(poolProvider)) {
      errors.push(`Invalid POOL_ADDRESSES_PROVIDER for chain ${chainId}: ${poolProvider}`);
    }
  }

  // Stablecoin address coverage checks
  for (const [asset, meta] of Object.entries(STABLECOIN_METADATA)) {
    for (const chainId of chainIds) {
      const addr = (meta.addresses as any)[chainId] as string | undefined;
      if (!addr) {
        errors.push(`Missing ${asset} address on chain ${chainId}`);
      } else if (!HEX40.test(addr)) {
        errors.push(`Invalid ${asset} address on chain ${chainId}: ${addr}`);
      }
    }
  }

  if (errors.length > 0) {
    const heading = 'Configuration validation failed:';
    const detail = errors.map((e) => ` - ${e}`).join('\n');
    const msg = `${heading}\n${detail}`;
    if (modeStrict) {
      // Fail-fast in production
      console.error(msg);
      throw new Error(msg);
    } else {
      // Surface as warnings in development
      warnings.push(...errors);
      console.warn(msg);
    }
  } else if (warnings.length > 0) {
    console.warn('Configuration warnings:\n' + warnings.map((w) => ` - ${w}`).join('\n'));
  }

  return { errors, warnings };
}