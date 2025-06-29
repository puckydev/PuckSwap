// PuckSwap v5 - Universal Context7 Indexer Client
// Reusable Context7 client factory for all monitor modules
// Environment-based configuration with comprehensive error handling

import { getPuckSwapEnvironmentConfig, NetworkEnvironment } from '../config/env';

/**
 * Context7 Indexer Configuration Interface
 */
export interface Context7IndexerConfig {
  network: NetworkEnvironment;
  endpoint: string;
  apiKey?: string;
  projectId: string;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Context7 UTxO Interface
 */
export interface Context7UTxO {
  txHash: string;
  outputIndex: number;
  address: string;
  assets: Record<string, bigint>;
  datum?: string;
  datumHash?: string;
  scriptRef?: string;
  slot: number;
}

/**
 * Context7 Indexer Client Interface
 */
export interface Context7IndexerClient {
  // Core functionality
  initialize(): Promise<void>;
  isActive(): boolean;
  shutdown(): Promise<void>;
  
  // Address monitoring
  subscribeToAddress(address: string, callback: (utxo: Context7UTxO) => void): Promise<void>;
  unsubscribeFromAddress(address: string): Promise<void>;
  getUtxosAtAddress(address: string): Promise<Context7UTxO[]>;
  
  // Policy monitoring
  subscribeToPolicy(policyId: string, callback: (utxo: Context7UTxO) => void): Promise<void>;
  unsubscribeFromPolicy(policyId: string): Promise<void>;
  getUtxosByPolicy(policyId: string): Promise<Context7UTxO[]>;
  
  // Transaction monitoring
  subscribeToTransaction(txHash: string, callback: (utxo: Context7UTxO) => void): Promise<void>;
  getTransaction(txHash: string): Promise<any>;
  
  // Configuration
  getConfig(): Context7IndexerConfig;
  updateConfig(config: Partial<Context7IndexerConfig>): void;
}

/**
 * Context7 Indexer Client Implementation
 * 
 * This is a scaffold implementation that provides the interface structure.
 * When the real @context7/sdk becomes available, this implementation should
 * be replaced with the actual SDK integration.
 */
class Context7IndexerClientImpl implements Context7IndexerClient {
  private config: Context7IndexerConfig;
  private isInitialized: boolean = false;
  private subscriptions: Map<string, Set<(utxo: Context7UTxO) => void>> = new Map();
  
  constructor(config: Context7IndexerConfig) {
    this.config = config;
    this.validateConfig();
  }
  
  /**
   * Validate the configuration
   */
  private validateConfig(): void {
    if (!this.config.network) {
      throw new Error('Context7IndexerClient: network is required');
    }
    
    if (!this.config.endpoint) {
      throw new Error('Context7IndexerClient: endpoint is required');
    }
    
    if (!this.config.projectId) {
      throw new Error('Context7IndexerClient: projectId is required');
    }
    
    // Validate network
    if (!['mainnet', 'preprod', 'preview'].includes(this.config.network)) {
      throw new Error(`Context7IndexerClient: invalid network "${this.config.network}"`);
    }
  }
  
  /**
   * Initialize the indexer client
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Context7IndexerClient: already initialized');
      return;
    }
    
    try {
      console.log(`🔄 Initializing Context7 Indexer Client...`);
      console.log(`📍 Network: ${this.config.network}`);
      console.log(`🌐 Endpoint: ${this.config.endpoint}`);
      console.log(`🔑 Project ID: ${this.config.projectId.substring(0, 8)}...`);
      
      // TODO: Replace with actual Context7 SDK initialization when available
      // For now, this is a mock implementation
      await this.mockInitialization();
      
      this.isInitialized = true;
      console.log('✅ Context7 Indexer Client initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Context7 Indexer Client:', error);
      throw new Error(`Context7IndexerClient initialization failed: ${error}`);
    }
  }
  
  /**
   * Mock initialization for development/testing
   */
  private async mockInitialization(): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Validate endpoint connectivity (mock)
    if (!this.config.endpoint.startsWith('http')) {
      throw new Error('Invalid endpoint URL');
    }
  }
  
  /**
   * Check if the client is active
   */
  isActive(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Shutdown the client
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    
    console.log('🔄 Shutting down Context7 Indexer Client...');
    
    // Clear all subscriptions
    this.subscriptions.clear();
    
    // TODO: Replace with actual Context7 SDK shutdown when available
    this.isInitialized = false;
    
    console.log('✅ Context7 Indexer Client shutdown complete');
  }
  
  /**
   * Subscribe to address changes
   */
  async subscribeToAddress(address: string, callback: (utxo: Context7UTxO) => void): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Context7IndexerClient: not initialized');
    }
    
    if (!this.subscriptions.has(address)) {
      this.subscriptions.set(address, new Set());
    }
    
    this.subscriptions.get(address)!.add(callback);
    
    console.log(`📡 Subscribed to address: ${address.substring(0, 20)}...`);
    
    // TODO: Replace with actual Context7 SDK subscription when available
  }
  
  /**
   * Unsubscribe from address changes
   */
  async unsubscribeFromAddress(address: string): Promise<void> {
    if (this.subscriptions.has(address)) {
      this.subscriptions.delete(address);
      console.log(`📡 Unsubscribed from address: ${address.substring(0, 20)}...`);
    }
    
    // TODO: Replace with actual Context7 SDK unsubscription when available
  }
  
  /**
   * Get UTxOs at address
   */
  async getUtxosAtAddress(address: string): Promise<Context7UTxO[]> {
    if (!this.isInitialized) {
      throw new Error('Context7IndexerClient: not initialized');
    }
    
    console.log(`🔍 Fetching UTxOs for address: ${address.substring(0, 20)}...`);
    
    // TODO: Replace with actual Context7 SDK query when available
    // For now, return mock data
    return this.generateMockUtxos(address);
  }
  
  /**
   * Subscribe to policy changes
   */
  async subscribeToPolicy(policyId: string, callback: (utxo: Context7UTxO) => void): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Context7IndexerClient: not initialized');
    }
    
    const key = `policy:${policyId}`;
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    
    this.subscriptions.get(key)!.add(callback);
    
    console.log(`📡 Subscribed to policy: ${policyId.substring(0, 20)}...`);
    
    // TODO: Replace with actual Context7 SDK subscription when available
  }
  
  /**
   * Unsubscribe from policy changes
   */
  async unsubscribeFromPolicy(policyId: string): Promise<void> {
    const key = `policy:${policyId}`;
    if (this.subscriptions.has(key)) {
      this.subscriptions.delete(key);
      console.log(`📡 Unsubscribed from policy: ${policyId.substring(0, 20)}...`);
    }
    
    // TODO: Replace with actual Context7 SDK unsubscription when available
  }
  
  /**
   * Get UTxOs by policy
   */
  async getUtxosByPolicy(policyId: string): Promise<Context7UTxO[]> {
    if (!this.isInitialized) {
      throw new Error('Context7IndexerClient: not initialized');
    }
    
    console.log(`🔍 Fetching UTxOs for policy: ${policyId.substring(0, 20)}...`);
    
    // TODO: Replace with actual Context7 SDK query when available
    return this.generateMockUtxos(`policy_${policyId}`);
  }
  
  /**
   * Subscribe to transaction
   */
  async subscribeToTransaction(txHash: string, callback: (utxo: Context7UTxO) => void): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Context7IndexerClient: not initialized');
    }
    
    const key = `tx:${txHash}`;
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    
    this.subscriptions.get(key)!.add(callback);
    
    console.log(`📡 Subscribed to transaction: ${txHash.substring(0, 20)}...`);
    
    // TODO: Replace with actual Context7 SDK subscription when available
  }
  
  /**
   * Get transaction details
   */
  async getTransaction(txHash: string): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Context7IndexerClient: not initialized');
    }
    
    console.log(`🔍 Fetching transaction: ${txHash.substring(0, 20)}...`);
    
    // TODO: Replace with actual Context7 SDK query when available
    return {
      hash: txHash,
      slot: Date.now(),
      inputs: [],
      outputs: [],
      fee: 200000n,
      metadata: null
    };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): Context7IndexerConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<Context7IndexerConfig>): void {
    this.config = { ...this.config, ...config };
    this.validateConfig();
    console.log('🔄 Context7IndexerClient configuration updated');
  }
  
  /**
   * Generate mock UTxOs for development/testing
   */
  private generateMockUtxos(identifier: string): Context7UTxO[] {
    const mockUtxos: Context7UTxO[] = [];
    const count = Math.floor(Math.random() * 3) + 1; // 1-3 UTxOs
    
    for (let i = 0; i < count; i++) {
      mockUtxos.push({
        txHash: `mock_tx_${identifier}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        outputIndex: i,
        address: `addr_test1${Math.random().toString(36).substr(2, 50)}`,
        assets: {
          lovelace: BigInt(Math.floor(Math.random() * 10000000) + 2000000), // 2-12 ADA
          [`${identifier.substring(0, 20)}.token`]: BigInt(Math.floor(Math.random() * 1000000))
        },
        datum: Math.random() > 0.5 ? "d87980" : undefined,
        slot: Date.now() + i
      });
    }
    
    return mockUtxos;
  }
}

/**
 * Create Context7 Indexer Client with environment-based configuration
 */
export function createContext7IndexerClient(
  overrideConfig?: Partial<Context7IndexerConfig>
): Context7IndexerClient {
  // Get environment configuration
  const envConfig = getPuckSwapEnvironmentConfig();
  
  // Build client configuration
  const clientConfig: Context7IndexerConfig = {
    network: envConfig.network,
    endpoint: envConfig.context7Endpoint,
    apiKey: envConfig.context7ApiKey,
    projectId: envConfig.blockfrostApiKey, // Using Blockfrost API key as project ID
    retryAttempts: 3,
    retryDelay: 1000,
    timeout: 30000,
    ...overrideConfig
  };
  
  // Validate required environment variables
  if (!clientConfig.endpoint) {
    throw new Error(
      'Context7 endpoint not configured. Please set CONTEXT7_ENDPOINT or NEXT_PUBLIC_CONTEXT7_ENDPOINT environment variable.'
    );
  }
  
  if (!clientConfig.projectId) {
    throw new Error(
      'Project ID not configured. Please set BLOCKFROST_API_KEY or provide projectId in configuration.'
    );
  }
  
  console.log('🏗️ Creating Context7 Indexer Client...');
  console.log(`📍 Network: ${clientConfig.network}`);
  console.log(`🌐 Endpoint: ${clientConfig.endpoint}`);
  
  return new Context7IndexerClientImpl(clientConfig);
}

/**
 * Singleton Context7 Indexer Client instance
 * 
 * This provides a ready-to-use client instance that can be imported
 * by all monitor modules. It uses the centralized environment configuration.
 */
let _singletonClient: Context7IndexerClient | null = null;

/**
 * Get the singleton Context7 Indexer Client instance
 */
export function getContext7IndexerClient(): Context7IndexerClient {
  if (!_singletonClient) {
    _singletonClient = createContext7IndexerClient();
  }
  
  return _singletonClient;
}

/**
 * Initialize the singleton Context7 Indexer Client
 */
export async function initializeContext7IndexerClient(): Promise<Context7IndexerClient> {
  const client = getContext7IndexerClient();
  
  if (!client.isActive()) {
    await client.initialize();
  }
  
  return client;
}

/**
 * Shutdown the singleton Context7 Indexer Client
 */
export async function shutdownContext7IndexerClient(): Promise<void> {
  if (_singletonClient && _singletonClient.isActive()) {
    await _singletonClient.shutdown();
    _singletonClient = null;
  }
}

// Export types for use in other modules
export type { Context7IndexerConfig, Context7UTxO, Context7IndexerClient };

// Export default client factory
export default createContext7IndexerClient;
