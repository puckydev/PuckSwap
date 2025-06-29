/**
 * PuckSwap v5 Environment Configuration Module
 *
 * Centralized environment configuration for all off-chain builders, monitors, and frontend.
 * Supports mainnet and preprod testnet environments with strict type safety.
 */

import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables from .env file at project root
dotenv.config({ path: join(process.cwd(), '.env') });

/**
 * Supported network types
 */
export type Network = 'mainnet' | 'preprod';
export type NetworkEnvironment = 'mainnet' | 'preprod' | 'preview';
export type LucidNetwork = 'Mainnet' | 'Preprod' | 'Preview';

/**
 * Environment validation errors
 */
export class EnvironmentError extends Error {
  constructor(message: string) {
    super(`PuckSwap Environment Error: ${message}`);
    this.name = 'EnvironmentError';
  }
}

/**
 * Environment configuration interface
 */
interface EnvironmentConfig {
  NETWORK: Network;
  BLOCKFROST_API_KEY_MAINNET: string;
  BLOCKFROST_API_KEY_PREPROD: string;
  CONTEXT7_ENDPOINT?: string;
}

/**
 * Validates and parses environment variables
 */
function validateEnvironment(): EnvironmentConfig {
  const network = process.env.NETWORK?.toLowerCase();

  // Validate network
  if (!network || (network !== 'mainnet' && network !== 'preprod')) {
    throw new EnvironmentError(
      `Invalid or missing NETWORK environment variable. Expected 'mainnet' or 'preprod', got: ${network}`
    );
  }

  // Validate Blockfrost API keys
  const mainnetKey = process.env.BLOCKFROST_API_KEY_MAINNET;
  const preprodKey = process.env.BLOCKFROST_API_KEY_PREPROD;

  if (!mainnetKey) {
    throw new EnvironmentError(
      'Missing BLOCKFROST_API_KEY_MAINNET environment variable'
    );
  }

  if (!preprodKey) {
    throw new EnvironmentError(
      'Missing BLOCKFROST_API_KEY_PREPROD environment variable'
    );
  }

  // Validate API key format (should start with network prefix)
  if (!mainnetKey.startsWith('mainnet')) {
    throw new EnvironmentError(
      'BLOCKFROST_API_KEY_MAINNET should start with "mainnet" prefix'
    );
  }

  if (!preprodKey.startsWith('preprod')) {
    throw new EnvironmentError(
      'BLOCKFROST_API_KEY_PREPROD should start with "preprod" prefix'
    );
  }

  return {
    NETWORK: network as Network,
    BLOCKFROST_API_KEY_MAINNET: mainnetKey,
    BLOCKFROST_API_KEY_PREPROD: preprodKey,
    CONTEXT7_ENDPOINT: process.env.CONTEXT7_ENDPOINT,
  };
}

// Validate environment on module load
const config = validateEnvironment();

/**
 * Get the current network environment
 * @returns The current network ('mainnet' or 'preprod')
 */
export function getNetwork(): Network {
  return config.NETWORK;
}

/**
 * Get the Blockfrost API key for the current network
 * @returns The appropriate Blockfrost API key
 */
export function getBlockfrostApiKey(): string {
  switch (config.NETWORK) {
    case 'mainnet':
      return config.BLOCKFROST_API_KEY_MAINNET;
    case 'preprod':
      return config.BLOCKFROST_API_KEY_PREPROD;
    default:
      throw new EnvironmentError(`Unsupported network: ${config.NETWORK}`);
  }
}

/**
 * Get the Context7 endpoint if configured
 * @returns The Context7 endpoint URL or null if not configured
 */
export function getContext7Endpoint(): string | null {
  return config.CONTEXT7_ENDPOINT || null;
}

/**
 * Get the Blockfrost API URL for the current network
 * @returns The Blockfrost API base URL
 */
export function getBlockfrostApiUrl(): string {
  switch (config.NETWORK) {
    case 'mainnet':
      return 'https://cardano-mainnet.blockfrost.io/api/v0';
    case 'preprod':
      return 'https://cardano-preprod.blockfrost.io/api/v0';
    default:
      throw new EnvironmentError(`Unsupported network: ${config.NETWORK}`);
  }
}

/**
 * Check if running in mainnet environment
 * @returns True if running on mainnet
 */
export function isMainnet(): boolean {
  return config.NETWORK === 'mainnet';
}

/**
 * Check if running in preprod testnet environment
 * @returns True if running on preprod testnet
 */
export function isPreprod(): boolean {
  return config.NETWORK === 'preprod';
}

/**
 * Validate that the environment is properly configured
 * Throws EnvironmentError if configuration is invalid
 */
export function validateEnvironmentConfig(): void {
  try {
    getNetwork();
    getBlockfrostApiKey();
    getBlockfrostApiUrl();
  } catch (error) {
    if (error instanceof EnvironmentError) {
      throw error;
    }
    throw new EnvironmentError(`Environment validation failed: ${error}`);
  }
}

/**
 * Complete environment configuration interface
 */
export interface PuckSwapEnvironmentConfig {
  // Network Configuration
  network: NetworkEnvironment;
  lucidNetwork: LucidNetwork;
  isMainnet: boolean;
  isTestnet: boolean;
  
  // API Configuration
  blockfrostApiKey: string;
  blockfrostEndpoint: string;
  
  // Context7 Configuration
  context7Endpoint: string;
  context7ApiKey?: string;
  
  // Application Configuration
  isDemoMode: boolean;
  isDebugMode: boolean;
  isMockMode: boolean;
  
  // Contract Addresses (network-specific)
  contractAddresses: ContractAddresses;
  
  // Feature Flags
  features: FeatureFlags;
}

/**
 * Network-specific contract addresses
 */
export interface ContractAddresses {
  swapValidator: string;
  liquidityValidator: string;
  withdrawalValidator: string;
  governanceValidator: string;
  stakingValidator: string;
  crossChainValidator: string;
  poolRegistryValidator: string;
  treasuryValidator: string;
  lpMintingPolicy: string;
  pAdaMintingPolicy: string;
}

/**
 * Feature flags for enabling/disabling functionality
 * MVP Release: Only core AMM features enabled
 */
export interface FeatureFlags {
  enableGovernance: boolean;        // Disabled in MVP
  enableLiquidStaking: boolean;     // Disabled in MVP
  enableCrossChain: boolean;        // Disabled in MVP
  enableTreasury: boolean;          // Disabled in MVP
  enableBondingCurve: boolean;      // Disabled in MVP
  enableAdvancedTrading: boolean;   // Disabled in MVP
}

/**
 * Network-specific configuration constants
 */
const NETWORK_CONFIGS = {
  mainnet: {
    blockfrostEndpoint: 'https://cardano-mainnet.blockfrost.io/api/v0',
    context7Endpoint: 'https://api.context7.io/mainnet',
    contractAddresses: {
      swapValidator: 'addr1w8qmxkacjdffxah0l3qg8hq2pmvs58q8lcy42zy9kda2ylc6dy5r4',
      liquidityValidator: 'addr1w9ar2rv0xyy8xr4tx3wd4auw6cqm0d24qjk0yx5v8d9qgpqfuak',
      withdrawalValidator: 'addr1wxag4mcur2as4z8xn27yzqvnxrck0lw8sf9q6fvzm8m4u5c6d2zdx',
      governanceValidator: 'addr1w8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gtcyjy7wx',
      stakingValidator: 'addr1w9ry9dnwb9ky8xn27yzqvnxrck0lw8sf9q6fvzm8m4u5c6d2zdx',
      crossChainValidator: 'addr1wxag4mcur2as4z8xn27yzqvnxrck0lw8sf9q6fvzm8m4u5c6d2zdx',
      poolRegistryValidator: 'addr1w8qmxkacjdffxah0l3qg8hq2pmvs58q8lcy42zy9kda2ylc6dy5r4',
      treasuryValidator: 'addr1w9ar2rv0xyy8xr4tx3wd4auw6cqm0d24qjk0yx5v8d9qgpqfuak',
      lpMintingPolicy: 'c6e65ba7878b2f8ea0ad39287d3e2fd256dc5c4160fc19bdf4c4d87e',
      pAdaMintingPolicy: 'd5e6056f4e28a9e7d927ae6b4c9c2d9f3e4f5a6b7c8d9e0f1a2b3c4d'
    }
  },
  preprod: {
    blockfrostEndpoint: 'https://cardano-preprod.blockfrost.io/api/v0',
    context7Endpoint: 'https://api.context7.io/preprod',
    contractAddresses: {
      swapValidator: 'addr_test1wq2h74nkmwd0pu5e0xytu6695p62xf8xagq6zc6rpy6ftgqy93gtr',
      liquidityValidator: 'addr_test1wquuqqd9dlsy5l6dxhq8f3urrng0pea37c9ws8fxlzvegqs8p87l4',
      withdrawalValidator: 'addr_test1wz40wpmp2f6s92dpk80rmceryal2stws5em76k7fgxvm43qtdgz00',
      governanceValidator: 'addr_test1wqqymmd8h2sshq42npx62579slyaglmrtw20mex86a559jc2xghhv',
      stakingValidator: 'addr_test1wpjtepk6gptg6a7w8qpq89dp2rvmjjqv52ezxmnv2wr9nagan5xqk',
      crossChainValidator: 'addr_test1wqrmczgy3s4eztn3s5k6lr7wzx6q2xrr8ufft5h594xrkesdrt4ay',
      poolRegistryValidator: 'addr_test1wqaunl2zy0luwtq0w3gvj4zw6sv86j36fnufvl09rxexasqdraqns',
      treasuryValidator: 'addr_test1w9ar2rv0xyy8xr4tx3wd4auw6cqm0d24qjk0yx5v8d9qgpqfuak',
      lpMintingPolicy: 'ad524e5497fdf1f924de936f9f7ec31d460c02267e8acce544a5a09e',
      pAdaMintingPolicy: 'eb031002fa1dbc400bbb5314a63741c8bf8524106fe7b50cafbcc113'
    }
  },
  preview: {
    blockfrostEndpoint: 'https://cardano-preview.blockfrost.io/api/v0',
    context7Endpoint: 'https://api.context7.io/preview',
    contractAddresses: {
      swapValidator: 'addr_test1wqag4mcur2as4z8xn27yzqvnxrck0lw8sf9q6fvzm8m4u5c6d2zdx',
      liquidityValidator: 'addr_test1w9ar2rv0xyy8xr4tx3wd4auw6cqm0d24qjk0yx5v8d9qgpqfuak',
      withdrawalValidator: 'addr_test1wxag4mcur2as4z8xn27yzqvnxrck0lw8sf9q6fvzm8m4u5c6d2zdx',
      governanceValidator: 'addr_test1w8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gtcyjy7wx',
      stakingValidator: 'addr_test1w9ry9dnwb9ky8xn27yzqvnxrck0lw8sf9q6fvzm8m4u5c6d2zdx',
      crossChainValidator: 'addr_test1wxag4mcur2as4z8xn27yzqvnxrck0lw8sf9q6fvzm8m4u5c6d2zdx',
      poolRegistryValidator: 'addr_test1wqmxkacjdffxah0l3qg8hq2pmvs58q8lcy42zy9kda2ylc6dy5r4',
      treasuryValidator: 'addr_test1w9ar2rv0xyy8xr4tx3wd4auw6cqm0d24qjk0yx5v8d9qgpqfuak',
      lpMintingPolicy: 'c6e65ba7878b2f8ea0ad39287d3e2fd256dc5c4160fc19bdf4c4d87e',
      pAdaMintingPolicy: 'd5e6056f4e28a9e7d927ae6b4c9c2d9f3e4f5a6b7c8d9e0f1a2b3c4d'
    }
  }
} as const;

/**
 * Get the current network environment from environment variables
 * @deprecated Use getNetwork() instead for strict type safety
 */
export const getNetworkEnvironment = (): NetworkEnvironment => {
  try {
    const coreNetwork = getNetwork();
    return coreNetwork as NetworkEnvironment;
  } catch (error) {
    // Fallback to legacy behavior for backward compatibility
    const network = (
      process.env.NETWORK ||
      process.env.NEXT_PUBLIC_NETWORK ||
      process.env.PUCKSWAP_NETWORK ||
      'preprod'
    ).toLowerCase() as NetworkEnvironment;

    // Validate network value
    if (['mainnet', 'preprod', 'preview'].includes(network)) {
      return network;
    }

    console.warn(`Invalid network "${network}", falling back to preprod`);
    return 'preprod';
  }
};

/**
 * Convert network environment to Lucid network format
 */
export const toLucidNetwork = (network: NetworkEnvironment): LucidNetwork => {
  switch (network) {
    case 'mainnet': return 'Mainnet';
    case 'preprod': return 'Preprod';
    case 'preview': return 'Preview';
    default: return 'Preprod';
  }
};

/**
 * Get the appropriate Blockfrost API key based on network
 * @deprecated Use getBlockfrostApiKey() without parameters for current network
 */
export const getBlockfrostApiKeyLegacy = (network: NetworkEnvironment): string => {
  // Try to use the new core function for supported networks
  if (network === 'mainnet' || network === 'preprod') {
    try {
      const currentNetwork = getNetwork();
      if (currentNetwork === network) {
        return getBlockfrostApiKey();
      }
    } catch (error) {
      // Fall through to legacy behavior
    }
  }

  // Try environment-specific keys first
  const envKey = process.env[`BLOCKFROST_API_KEY_${network.toUpperCase()}`] ||
                 process.env[`NEXT_PUBLIC_BLOCKFROST_API_KEY_${network.toUpperCase()}`];

  if (envKey) {
    return envKey;
  }

  // Fallback to hardcoded keys (for development)
  switch (network) {
    case 'mainnet':
      return process.env.BLOCKFROST_API_KEY_MAINNET || 'mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7';
    case 'preprod':
      return process.env.BLOCKFROST_API_KEY_PREPROD || 'preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL';
    case 'preview':
      return process.env.BLOCKFROST_API_KEY_PREVIEW || 'preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL';
    default:
      return 'preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL';
  }
};

/**
 * Get Context7 endpoint for the network
 * @deprecated Use getContext7Endpoint() without parameters for current network
 */
export const getContext7EndpointLegacy = (network: NetworkEnvironment): string => {
  // Try to use the new core function for supported networks
  if (network === 'mainnet' || network === 'preprod') {
    try {
      const currentNetwork = getNetwork();
      if (currentNetwork === network) {
        const endpoint = getContext7Endpoint();
        if (endpoint) return endpoint;
      }
    } catch (error) {
      // Fall through to legacy behavior
    }
  }

  const envEndpoint = process.env[`CONTEXT7_ENDPOINT_${network.toUpperCase()}`] ||
                     process.env[`NEXT_PUBLIC_CONTEXT7_ENDPOINT_${network.toUpperCase()}`];

  if (envEndpoint) {
    return envEndpoint;
  }

  return NETWORK_CONFIGS[network].context7Endpoint;
};

/**
 * Get feature flags from environment variables
 * MVP Release: Advanced features disabled by default
 */
export const getFeatureFlags = (): FeatureFlags => {
  return {
    enableGovernance: false,        // Disabled in MVP
    enableLiquidStaking: false,     // Disabled in MVP
    enableCrossChain: false,        // Disabled in MVP
    enableTreasury: false,          // Disabled in MVP
    enableBondingCurve: false,      // Disabled in MVP
    enableAdvancedTrading: false    // Disabled in MVP
  };
};

/**
 * Get complete environment configuration
 */
export const getPuckSwapEnvironmentConfig = (): PuckSwapEnvironmentConfig => {
  try {
    // Try to use new core functions first
    const coreNetwork = getNetwork();
    const networkConfig = NETWORK_CONFIGS[coreNetwork];

    return {
      network: coreNetwork,
      lucidNetwork: toLucidNetwork(coreNetwork),
      isMainnet: isMainnet(),
      isTestnet: isPreprod(),

      blockfrostApiKey: getBlockfrostApiKey(),
      blockfrostEndpoint: getBlockfrostApiUrl(),

      context7Endpoint: getContext7Endpoint() || networkConfig.context7Endpoint,
      context7ApiKey: process.env.CONTEXT7_API_KEY || process.env.NEXT_PUBLIC_CONTEXT7_API_KEY,

      isDemoMode: false,
      isDebugMode: false,
      isMockMode: false,

      contractAddresses: networkConfig.contractAddresses,
      features: getFeatureFlags()
    };
  } catch (error) {
    // Fallback to legacy behavior
    const network = getNetworkEnvironment();
    const networkConfig = NETWORK_CONFIGS[network];

    return {
      network,
      lucidNetwork: toLucidNetwork(network),
      isMainnet: network === 'mainnet',
      isTestnet: network === 'preprod' || network === 'preview',

      blockfrostApiKey: getBlockfrostApiKeyLegacy(network),
      blockfrostEndpoint: networkConfig.blockfrostEndpoint,

      context7Endpoint: getContext7EndpointLegacy(network),
      context7ApiKey: process.env.CONTEXT7_API_KEY || process.env.NEXT_PUBLIC_CONTEXT7_API_KEY,

      isDemoMode: false,
      isDebugMode: false,
      isMockMode: false,

      contractAddresses: networkConfig.contractAddresses,
      features: getFeatureFlags()
    };
  }
};

/**
 * Environment configuration singleton
 */
export const ENV_CONFIG = getPuckSwapEnvironmentConfig();

/**
 * Validate environment configuration (extended version)
 */
export const validateEnvironmentConfigExtended = (config?: PuckSwapEnvironmentConfig): boolean => {
  const envConfig = config || ENV_CONFIG;

  const errors: string[] = [];

  if (!envConfig.blockfrostApiKey) {
    errors.push('Missing Blockfrost API key');
  }
  
  if (!envConfig.context7Endpoint) {
    errors.push('Missing Context7 endpoint');
  }
  
  if (!['mainnet', 'preprod', 'preview'].includes(envConfig.network)) {
    errors.push('Invalid network configuration');
  }
  
  if (errors.length > 0) {
    console.error('❌ Environment configuration errors:', errors);
    return false;
  }
  
  console.log('✅ Environment configuration is valid');
  return true;
};

/**
 * Log current environment configuration
 */
export const logEnvironmentConfig = (config?: PuckSwapEnvironmentConfig): void => {
  const envConfig = config || ENV_CONFIG;
  
  console.log('🌍 PuckSwap v5 Environment Configuration:');
  console.log(`  Network: ${envConfig.network}`);
  console.log(`  Lucid Network: ${envConfig.lucidNetwork}`);
  console.log(`  Is Mainnet: ${envConfig.isMainnet}`);
  console.log(`  Is Testnet: ${envConfig.isTestnet}`);
  console.log(`  Demo Mode: ${envConfig.isDemoMode}`);
  console.log(`  Debug Mode: ${envConfig.isDebugMode}`);
  console.log(`  Mock Mode: ${envConfig.isMockMode}`);
  console.log(`  Blockfrost API Key: ${envConfig.blockfrostApiKey.substring(0, 8)}...`);
  console.log(`  Context7 Endpoint: ${envConfig.context7Endpoint}`);
  console.log(`  Features:`, envConfig.features);
};

/**
 * Switch network environment (for testing)
 */
export const switchNetwork = (network: NetworkEnvironment): PuckSwapEnvironmentConfig => {
  process.env.NETWORK = network;
  const newConfig = getPuckSwapEnvironmentConfig();
  console.log(`🔄 Switched to ${network} network`);
  return newConfig;
};

/**
 * Get all environment configuration (for debugging)
 * @returns Sanitized environment configuration
 */
export function getEnvironmentInfo(): {
  network: Network;
  blockfrostApiUrl: string;
  context7Endpoint: string | null;
  hasMainnetKey: boolean;
  hasPreprodKey: boolean;
} {
  return {
    network: getNetwork(),
    blockfrostApiUrl: getBlockfrostApiUrl(),
    context7Endpoint: getContext7Endpoint(),
    hasMainnetKey: !!process.env.BLOCKFROST_API_KEY_MAINNET,
    hasPreprodKey: !!process.env.BLOCKFROST_API_KEY_PREPROD,
  };
}

// Export the raw config for advanced use cases (read-only)
export const environmentConfig = Object.freeze({
  get network() { return getNetwork(); },
  get blockfrostApiUrl() { return getBlockfrostApiUrl(); },
  get context7Endpoint() { return getContext7Endpoint(); },
}) as const;

/**
 * Default export with all environment functions
 */
export default {
  // New core functions (recommended)
  getNetwork,
  getBlockfrostApiKey,
  getBlockfrostApiUrl,
  getContext7Endpoint,
  isMainnet,
  isPreprod,
  getEnvironmentInfo,
  validateEnvironmentConfig,
  validateEnvironmentConfigExtended,
  environmentConfig,

  // Legacy functions (backward compatibility)
  getNetworkEnvironment,
  toLucidNetwork,
  getBlockfrostApiKeyLegacy,
  getContext7EndpointLegacy,
  getFeatureFlags,
  getPuckSwapEnvironmentConfig,
  logEnvironmentConfig,
  switchNetwork,
  ENV_CONFIG
};
