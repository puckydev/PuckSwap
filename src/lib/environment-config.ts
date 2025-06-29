/**
 * PuckSwap v5 Environment Configuration
 * Centralized configuration for all off-chain builders and Context7 connections
 * Supports both testnet (preprod) and mainnet environments
 */

export type NetworkEnvironment = 'mainnet' | 'preprod' | 'preview';
export type LucidNetwork = 'Mainnet' | 'Preprod' | 'Preview';

/**
 * Environment configuration interface
 */
export interface EnvironmentConfig {
  network: NetworkEnvironment;
  lucidNetwork: LucidNetwork;
  blockfrostApiKey: string;
  isMainnet: boolean;
  isTestnet: boolean;
  isDemoMode: boolean;
}

/**
 * Get the current network environment from process.env.NETWORK
 * Falls back to preprod if not specified
 */
export const getNetworkEnvironment = (): NetworkEnvironment => {
  const network = process.env.NETWORK?.toLowerCase() as NetworkEnvironment;
  
  // Validate network value
  if (network && ['mainnet', 'preprod', 'preview'].includes(network)) {
    return network;
  }
  
  // Fallback to preprod for development
  return 'preprod';
};

/**
 * Convert network environment to Lucid network format
 */
export const toLucidNetwork = (network: NetworkEnvironment): LucidNetwork => {
  switch (network) {
    case 'mainnet':
      return 'Mainnet';
    case 'preprod':
      return 'Preprod';
    case 'preview':
      return 'Preview';
    default:
      return 'Preprod';
  }
};

/**
 * Get the appropriate Blockfrost API key based on network
 */
export const getBlockfrostApiKey = (network: NetworkEnvironment): string => {
  switch (network) {
    case 'mainnet':
      return 'mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7';
    case 'preprod':
      return 'preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL';
    case 'preview':
      // Use preprod key for preview as fallback
      return 'preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL';
    default:
      return 'preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL';
  }
};

/**
 * Get complete environment configuration
 */
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const network = getNetworkEnvironment();
  const lucidNetwork = toLucidNetwork(network);
  const blockfrostApiKey = getBlockfrostApiKey(network);
  
  return {
    network,
    lucidNetwork,
    blockfrostApiKey,
    isMainnet: network === 'mainnet',
    isTestnet: network === 'preprod' || network === 'preview',
    isDemoMode: process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  };
};

/**
 * Environment configuration constants for easy access
 */
export const ENV_CONFIG = getEnvironmentConfig();

/**
 * Network-specific API endpoints
 */
export const API_ENDPOINTS = {
  mainnet: {
    blockfrost: 'https://cardano-mainnet.blockfrost.io/api/v0',
    apiKey: 'mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7'
  },
  preprod: {
    blockfrost: 'https://cardano-preprod.blockfrost.io/api/v0',
    apiKey: 'preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL'
  },
  preview: {
    blockfrost: 'https://cardano-preview.blockfrost.io/api/v0',
    apiKey: 'preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL'
  }
} as const;

/**
 * Get API endpoint configuration for current network
 */
export const getApiEndpoint = (network?: NetworkEnvironment) => {
  const targetNetwork = network || ENV_CONFIG.network;
  return API_ENDPOINTS[targetNetwork];
};

/**
 * Utility function to log current environment configuration
 */
export const logEnvironmentConfig = () => {
  console.log('🌍 PuckSwap v5 Environment Configuration:');
  console.log(`  Network: ${ENV_CONFIG.network}`);
  console.log(`  Lucid Network: ${ENV_CONFIG.lucidNetwork}`);
  console.log(`  Is Mainnet: ${ENV_CONFIG.isMainnet}`);
  console.log(`  Is Testnet: ${ENV_CONFIG.isTestnet}`);
  console.log(`  Demo Mode: ${ENV_CONFIG.isDemoMode}`);
  console.log(`  API Key: ${ENV_CONFIG.blockfrostApiKey.substring(0, 8)}...`);
};

/**
 * Validate environment configuration
 */
export const validateEnvironmentConfig = (): boolean => {
  const config = getEnvironmentConfig();
  
  if (!config.blockfrostApiKey) {
    console.error('❌ Missing Blockfrost API key');
    return false;
  }
  
  if (!['mainnet', 'preprod', 'preview'].includes(config.network)) {
    console.error('❌ Invalid network configuration');
    return false;
  }
  
  console.log('✅ Environment configuration is valid');
  return true;
};

// Export for backward compatibility
export default {
  getNetworkEnvironment,
  toLucidNetwork,
  getBlockfrostApiKey,
  getEnvironmentConfig,
  getApiEndpoint,
  logEnvironmentConfig,
  validateEnvironmentConfig,
  ENV_CONFIG,
  API_ENDPOINTS
};
