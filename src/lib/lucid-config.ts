// Dynamic imports to avoid WASM loading issues
let Lucid: any, Blockfrost: any, Kupmios: any, Maestro: any, Koios: any;

async function loadLucidEvolution() {
  if (!Lucid) {
    const lucidModule = await import("@lucid-evolution/lucid");
    Lucid = lucidModule.Lucid;
    Blockfrost = lucidModule.Blockfrost;
    Kupmios = lucidModule.Kupmios;
    Maestro = lucidModule.Maestro;
    Koios = lucidModule.Koios;
  }
}

import { getEnvironmentConfig, getBlockfrostApiKey, ENV_CONFIG } from "./environment-config";

// Network types supported by Lucid Evolution
export type NetworkType = "Mainnet" | "Preprod" | "Preview" | "Custom";

// Provider types
export type ProviderType = "blockfrost" | "kupmios" | "maestro" | "koios";

// Configuration interface
export interface LucidConfig {
  network: NetworkType;
  provider: ProviderType;
  apiKey?: string;
  apiUrl?: string;
  kupoEndpoint?: string;
  ogmiosEndpoint?: string;
}

// Environment-based configuration using centralized environment config
export const getLucidConfig = (): LucidConfig => {
  const envConfig = getEnvironmentConfig();
  const network = envConfig.lucidNetwork as NetworkType;
  const provider = (process.env.NEXT_PUBLIC_PROVIDER_TYPE as ProviderType) || "blockfrost";

  // Use centralized API key management
  const apiKey = envConfig.blockfrostApiKey;

  return {
    network,
    provider,
    apiKey,
    kupoEndpoint: process.env.NEXT_PUBLIC_KUPO_ENDPOINT,
    ogmiosEndpoint: process.env.NEXT_PUBLIC_OGMIOS_ENDPOINT,
  };
};

// Create Lucid instance with proper provider
export const createLucidInstance = async (config?: Partial<LucidConfig>): Promise<any> => {
  // Load Lucid Evolution dynamically
  await loadLucidEvolution();

  const finalConfig = { ...getLucidConfig(), ...config };

  let provider;
  
  switch (finalConfig.provider) {
    case "blockfrost":
      if (!finalConfig.apiKey) {
        throw new Error(`Blockfrost API key is required for ${finalConfig.network} network`);
      }
      
      // Use the provided API endpoints for Preprod and Mainnet
      let blockfrostUrl: string;
      if (finalConfig.network === "Mainnet") {
        blockfrostUrl = `https://cardano-mainnet.blockfrost.io/api/v0`;
      } else if (finalConfig.network === "Preprod") {
        blockfrostUrl = `https://cardano-preprod.blockfrost.io/api/v0`;
      } else {
        blockfrostUrl = `https://cardano-preview.blockfrost.io/api/v0`;
      }
      
      provider = new Blockfrost(blockfrostUrl, finalConfig.apiKey);
      break;
      
    case "kupmios":
      if (!finalConfig.kupoEndpoint || !finalConfig.ogmiosEndpoint) {
        throw new Error("Kupo and Ogmios endpoints are required for Kupmios provider");
      }
      provider = new Kupmios(finalConfig.kupoEndpoint, finalConfig.ogmiosEndpoint);
      break;
      
    case "maestro":
      if (!finalConfig.apiKey) {
        throw new Error("Maestro API key is required");
      }
      provider = new Maestro({
        network: finalConfig.network === "Mainnet" ? "Mainnet" : "Preprod",
        apiKey: finalConfig.apiKey,
        turboSubmit: false,
      });
      break;
      
    case "koios":
      const koiosUrl = finalConfig.apiUrl || 
        (finalConfig.network === "Mainnet" 
          ? "https://api.koios.rest/api/v1"
          : "https://preprod.koios.rest/api/v1");
      provider = new Koios(koiosUrl, finalConfig.apiKey);
      break;
      
    default:
      throw new Error(`Unsupported provider: ${finalConfig.provider}`);
  }

  console.log(`🔄 Initializing Lucid Evolution with ${finalConfig.provider} on ${finalConfig.network}...`);
  
  const lucid = await Lucid(provider, finalConfig.network);
  
  console.log(`✅ Lucid Evolution initialized successfully on ${finalConfig.network}`);
  
  return lucid;
};

// Wallet connection helper with enhanced error handling and validation
export const connectWallet = async (
  lucid: any,
  walletName: "eternl" | "nami" | "vespr" | "lace" | "typhon" | "flint"
): Promise<void> => {
  try {
    console.log(`🔗 Connecting to ${walletName} wallet...`);

    // Check if wallet is available
    if (typeof window === 'undefined' || !window.cardano || !window.cardano[walletName]) {
      throw new Error(`${walletName} wallet is not installed or available`);
    }

    const cardanoWallet = window.cardano[walletName];

    // Validate wallet object
    if (!cardanoWallet || typeof cardanoWallet.enable !== 'function') {
      throw new Error(`${walletName} wallet is not properly installed or corrupted`);
    }

    // Enable wallet with timeout
    const enablePromise = cardanoWallet.enable();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Wallet connection timeout')), 30000)
    );

    const walletApi = await Promise.race([enablePromise, timeoutPromise]);

    // Validate wallet API
    if (!walletApi || typeof walletApi.getUtxos !== 'function' || typeof walletApi.getBalance !== 'function') {
      throw new Error(`${walletName} wallet API is incomplete or invalid`);
    }

    // Test network compatibility
    try {
      const networkId = await walletApi.getNetworkId();
      console.log(`📡 ${walletName} wallet network ID: ${networkId}`);

      // Validate network (0 = testnet, 1 = mainnet)
      if (networkId !== 0 && networkId !== 1) {
        throw new Error(`Invalid network ID: ${networkId}`);
      }
    } catch (networkError) {
      console.warn(`⚠️ Could not verify network for ${walletName}:`, networkError);
    }

    // Connect to Lucid using the correct API
    lucid.selectWallet.fromAPI(walletApi);

    // Verify connection by testing basic wallet operations
    try {
      const address = await lucid.wallet().address();
      if (!address || typeof address !== 'string') {
        throw new Error('Failed to get wallet address');
      }
      console.log(`📍 ${walletName} wallet address: ${address.substring(0, 20)}...`);
    } catch (verifyError) {
      throw new Error(`Wallet connection verification failed: ${verifyError.message}`);
    }

    console.log(`✅ Successfully connected to ${walletName} wallet`);
  } catch (error) {
    console.error(`❌ Failed to connect to ${walletName} wallet:`, error);

    // Enhance error messages for common issues
    if (error.message.includes('User declined')) {
      throw new Error('Connection cancelled by user');
    } else if (error.message.includes('timeout')) {
      throw new Error(`${walletName} wallet connection timed out. Please try again.`);
    } else if (error.message.includes('not installed')) {
      throw new Error(`${walletName} wallet is not installed. Please install it and refresh the page.`);
    }

    throw error;
  }
};

// Utility to get current network info
export const getNetworkInfo = () => {
  const config = getLucidConfig();
  return {
    network: config.network,
    provider: config.provider,
    isMainnet: config.network === "Mainnet",
    isTestnet: config.network === "Preprod" || config.network === "Preview",
  };
};

// Demo mode configuration
export const isDemoMode = (): boolean => {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
};

// Export default configuration
export default {
  createLucidInstance,
  connectWallet,
  getLucidConfig,
  getNetworkInfo,
  isDemoMode,
};
