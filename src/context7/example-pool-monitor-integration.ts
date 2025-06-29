// PuckSwap v5 - Example Pool Monitor Integration
// Demonstrates how to use the universal Context7 Indexer Client
// This shows the integration pattern for all monitor modules

import { 
  getContext7IndexerClient, 
  initializeContext7IndexerClient,
  Context7IndexerClient,
  Context7UTxO 
} from './indexerClient';
import { getPuckSwapEnvironmentConfig } from '../config/env';

/**
 * Example Pool Monitor using the universal Context7 client
 */
export class ExamplePoolMonitor {
  private client: Context7IndexerClient;
  private poolAddresses: string[] = [];
  private isMonitoring: boolean = false;
  
  constructor(poolAddresses: string[]) {
    this.poolAddresses = poolAddresses;
    // Get the singleton client instance
    this.client = getContext7IndexerClient();
  }
  
  /**
   * Initialize the monitor
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing Example Pool Monitor...');
      
      // Initialize the universal client (this handles all environment configuration)
      await initializeContext7IndexerClient();
      
      console.log('✅ Example Pool Monitor initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Example Pool Monitor:', error);
      throw error;
    }
  }
  
  /**
   * Start monitoring pools
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.warn('⚠️ Pool Monitor is already running');
      return;
    }
    
    try {
      console.log('🚀 Starting pool monitoring...');
      
      // Subscribe to each pool address using the universal client
      for (const poolAddress of this.poolAddresses) {
        await this.subscribeToPool(poolAddress);
      }
      
      this.isMonitoring = true;
      console.log(`✅ Pool monitoring started for ${this.poolAddresses.length} pools`);
      
    } catch (error) {
      console.error('❌ Failed to start pool monitoring:', error);
      throw error;
    }
  }
  
  /**
   * Stop monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }
    
    console.log('🛑 Stopping pool monitoring...');
    
    // Unsubscribe from all pool addresses
    for (const poolAddress of this.poolAddresses) {
      await this.client.unsubscribeFromAddress(poolAddress);
    }
    
    this.isMonitoring = false;
    console.log('✅ Pool monitoring stopped');
  }
  
  /**
   * Subscribe to a specific pool using the universal client
   */
  private async subscribeToPool(poolAddress: string): Promise<void> {
    try {
      console.log(`📡 Subscribing to pool: ${poolAddress.substring(0, 20)}...`);
      
      // Use the universal client to subscribe to address changes
      await this.client.subscribeToAddress(poolAddress, (utxo: Context7UTxO) => {
        this.handlePoolUpdate(poolAddress, utxo);
      });
      
      // Get initial UTxOs at the address
      const initialUtxos = await this.client.getUtxosAtAddress(poolAddress);
      console.log(`📊 Found ${initialUtxos.length} initial UTxOs for pool ${poolAddress.substring(0, 20)}...`);
      
      // Process initial UTxOs
      for (const utxo of initialUtxos) {
        this.handlePoolUpdate(poolAddress, utxo);
      }
      
    } catch (error) {
      console.error(`❌ Failed to subscribe to pool ${poolAddress}:`, error);
      throw error;
    }
  }
  
  /**
   * Handle pool UTxO updates
   */
  private handlePoolUpdate(poolAddress: string, utxo: Context7UTxO): void {
    try {
      console.log(`\n=== Pool Update Detected ===`);
      console.log(`Pool: ${poolAddress.substring(0, 20)}...`);
      console.log(`Transaction: ${utxo.txHash.substring(0, 20)}...`);
      console.log(`Output Index: ${utxo.outputIndex}`);
      console.log(`Slot: ${utxo.slot}`);
      console.log(`Assets:`, utxo.assets);
      
      if (utxo.datum) {
        console.log(`Datum: ${utxo.datum.substring(0, 50)}...`);
        
        // Here you would parse the datum to extract pool state
        // For example: const poolDatum = parsePoolDatum(utxo.datum);
        this.parseAndLogPoolState(utxo.datum);
      }
      
      console.log(`============================\n`);
      
    } catch (error) {
      console.error(`❌ Error handling pool update for ${poolAddress}:`, error);
    }
  }
  
  /**
   * Parse and log pool state from datum
   */
  private parseAndLogPoolState(datum: string): void {
    try {
      // This is a mock implementation
      // In a real implementation, you would use proper CBOR parsing
      console.log(`🔍 Parsing pool datum...`);
      console.log(`📊 Pool State (mock):`, {
        adaReserve: '5000000', // 5 ADA
        tokenReserve: '2000000', // 2M tokens
        feeBasisPoints: 30, // 0.3%
        lpTokenPolicy: 'mock_lp_policy',
        lpTokenName: 'PUCKY_ADA_LP'
      });
      
    } catch (error) {
      console.error('❌ Error parsing pool datum:', error);
    }
  }
  
  /**
   * Get current client configuration
   */
  getClientConfig() {
    return this.client.getConfig();
  }
  
  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring && this.client.isActive();
  }
}

/**
 * Factory function to create and initialize the example pool monitor
 */
export async function createExamplePoolMonitor(poolAddresses: string[]): Promise<ExamplePoolMonitor> {
  const monitor = new ExamplePoolMonitor(poolAddresses);
  await monitor.initialize();
  return monitor;
}

/**
 * Example usage function
 */
export async function runExamplePoolMonitor(): Promise<void> {
  try {
    console.log('🚀 Running Example Pool Monitor...');
    
    // Get environment configuration
    const envConfig = getPuckSwapEnvironmentConfig();
    console.log(`📍 Network: ${envConfig.network}`);
    console.log(`🌐 Context7 Endpoint: ${envConfig.context7Endpoint}`);
    
    // Example pool addresses (these would be real addresses in production)
    const poolAddresses = [
      'addr_test1wqag4mcur2as4z8xn27yzqvnxrck0lw8sf9q6fvzm8m4u5c6d2zdx', // PUCKY/ADA pool
      'addr_test1w9ar2rv0xyy8xr4tx3wd4auw6cqm0d24qjk0yx5v8d9qgpqfuak'  // wLTC/ADA pool
    ];
    
    // Create and start the monitor
    const monitor = await createExamplePoolMonitor(poolAddresses);
    
    // Start monitoring
    await monitor.startMonitoring();
    
    // Log client configuration
    const clientConfig = monitor.getClientConfig();
    console.log('🔧 Client Configuration:', {
      network: clientConfig.network,
      endpoint: clientConfig.endpoint,
      hasApiKey: !!clientConfig.apiKey,
      retryAttempts: clientConfig.retryAttempts,
      timeout: clientConfig.timeout
    });
    
    // Monitor for 30 seconds (in a real application, this would run indefinitely)
    console.log('⏱️ Monitoring for 30 seconds...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Stop monitoring
    await monitor.stopMonitoring();
    
    console.log('✅ Example completed successfully');
    
  } catch (error) {
    console.error('❌ Example failed:', error);
    throw error;
  }
}

// Export for use in other modules
export default ExamplePoolMonitor;
