#!/usr/bin/env tsx
// PuckSwap v5 - Context7 Client Test Script
// Test the universal Context7 indexer client implementation

import { 
  createContext7IndexerClient,
  getContext7IndexerClient,
  initializeContext7IndexerClient,
  shutdownContext7IndexerClient,
  Context7IndexerClient 
} from '../src/context7/indexerClient';

import { runExamplePoolMonitor } from '../src/context7/example-pool-monitor-integration';
import { getPuckSwapEnvironmentConfig, logEnvironmentConfig } from '../src/config/env';

/**
 * Test the Context7 client creation and basic functionality
 */
async function testClientCreation(): Promise<void> {
  console.log('\n🧪 Testing Context7 Client Creation...');
  
  try {
    // Test client creation with default configuration
    const client1 = createContext7IndexerClient();
    console.log('✅ Default client created successfully');
    
    // Test client creation with custom configuration
    const client2 = createContext7IndexerClient({
      network: 'preprod',
      retryAttempts: 5,
      timeout: 60000
    });
    console.log('✅ Custom client created successfully');
    
    // Test singleton client
    const singletonClient = getContext7IndexerClient();
    console.log('✅ Singleton client retrieved successfully');
    
    // Test client configuration
    const config = singletonClient.getConfig();
    console.log('🔧 Client Configuration:', {
      network: config.network,
      endpoint: config.endpoint,
      hasApiKey: !!config.apiKey,
      retryAttempts: config.retryAttempts,
      timeout: config.timeout
    });
    
  } catch (error) {
    console.error('❌ Client creation test failed:', error);
    throw error;
  }
}

/**
 * Test client initialization and basic operations
 */
async function testClientOperations(): Promise<void> {
  console.log('\n🧪 Testing Context7 Client Operations...');
  
  try {
    // Initialize the singleton client
    const client = await initializeContext7IndexerClient();
    console.log('✅ Client initialized successfully');
    
    // Test client status
    const isActive = client.isActive();
    console.log(`📊 Client is active: ${isActive}`);
    
    if (!isActive) {
      throw new Error('Client should be active after initialization');
    }
    
    // Test address subscription (mock)
    const testAddress = 'addr_test1wqag4mcur2as4z8xn27yzqvnxrck0lw8sf9q6fvzm8m4u5c6d2zdx';
    
    await client.subscribeToAddress(testAddress, (utxo) => {
      console.log(`📡 Received UTxO update:`, {
        txHash: utxo.txHash.substring(0, 20) + '...',
        outputIndex: utxo.outputIndex,
        address: utxo.address.substring(0, 20) + '...',
        assetCount: Object.keys(utxo.assets).length,
        slot: utxo.slot
      });
    });
    console.log('✅ Address subscription successful');
    
    // Test UTxO retrieval (mock)
    const utxos = await client.getUtxosAtAddress(testAddress);
    console.log(`📊 Retrieved ${utxos.length} UTxOs for address`);
    
    // Test policy subscription (mock)
    const testPolicyId = 'c6e65ba7878b2f8ea0ad39287d3e2fd256dc5c4160fc19bdf4c4d87e';
    
    await client.subscribeToPolicy(testPolicyId, (utxo) => {
      console.log(`🪙 Received policy UTxO update:`, {
        txHash: utxo.txHash.substring(0, 20) + '...',
        policyAssets: Object.keys(utxo.assets).filter(asset => asset.startsWith(testPolicyId))
      });
    });
    console.log('✅ Policy subscription successful');
    
    // Test policy UTxO retrieval (mock)
    const policyUtxos = await client.getUtxosByPolicy(testPolicyId);
    console.log(`🪙 Retrieved ${policyUtxos.length} UTxOs for policy`);
    
    // Test transaction subscription (mock)
    const testTxHash = 'mock_tx_hash_' + Math.random().toString(36).substr(2, 9);
    
    await client.subscribeToTransaction(testTxHash, (utxo) => {
      console.log(`📝 Received transaction UTxO update:`, {
        txHash: utxo.txHash.substring(0, 20) + '...'
      });
    });
    console.log('✅ Transaction subscription successful');
    
    // Test transaction retrieval (mock)
    const transaction = await client.getTransaction(testTxHash);
    console.log(`📝 Retrieved transaction:`, {
      hash: transaction.hash.substring(0, 20) + '...',
      slot: transaction.slot,
      fee: transaction.fee.toString()
    });
    
    // Test unsubscription
    await client.unsubscribeFromAddress(testAddress);
    await client.unsubscribeFromPolicy(testPolicyId);
    console.log('✅ Unsubscription successful');
    
  } catch (error) {
    console.error('❌ Client operations test failed:', error);
    throw error;
  }
}

/**
 * Test environment configuration integration
 */
async function testEnvironmentIntegration(): Promise<void> {
  console.log('\n🧪 Testing Environment Integration...');
  
  try {
    // Log current environment configuration
    logEnvironmentConfig();
    
    // Get environment configuration
    const envConfig = getPuckSwapEnvironmentConfig();
    
    // Verify Context7 configuration
    if (!envConfig.context7Endpoint) {
      console.warn('⚠️ Context7 endpoint not configured in environment');
    } else {
      console.log(`✅ Context7 endpoint configured: ${envConfig.context7Endpoint}`);
    }
    
    if (!envConfig.context7ApiKey) {
      console.warn('⚠️ Context7 API key not configured in environment');
    } else {
      console.log(`✅ Context7 API key configured: ${envConfig.context7ApiKey.substring(0, 8)}...`);
    }
    
    // Test client creation with environment configuration
    const client = createContext7IndexerClient();
    const clientConfig = client.getConfig();
    
    // Verify configuration matches environment
    if (clientConfig.network !== envConfig.network) {
      throw new Error(`Network mismatch: client=${clientConfig.network}, env=${envConfig.network}`);
    }
    
    if (clientConfig.endpoint !== envConfig.context7Endpoint) {
      throw new Error(`Endpoint mismatch: client=${clientConfig.endpoint}, env=${envConfig.context7Endpoint}`);
    }
    
    console.log('✅ Environment integration verified');
    
  } catch (error) {
    console.error('❌ Environment integration test failed:', error);
    throw error;
  }
}

/**
 * Test the example pool monitor integration
 */
async function testPoolMonitorIntegration(): Promise<void> {
  console.log('\n🧪 Testing Pool Monitor Integration...');
  
  try {
    // Run the example pool monitor (this will run for 30 seconds)
    await runExamplePoolMonitor();
    console.log('✅ Pool monitor integration test completed');
    
  } catch (error) {
    console.error('❌ Pool monitor integration test failed:', error);
    throw error;
  }
}

/**
 * Main test function
 */
async function runTests(): Promise<void> {
  console.log('🚀 Starting Context7 Client Tests...\n');
  
  try {
    // Test 1: Client creation
    await testClientCreation();
    
    // Test 2: Client operations
    await testClientOperations();
    
    // Test 3: Environment integration
    await testEnvironmentIntegration();
    
    // Test 4: Pool monitor integration (optional - takes 30 seconds)
    const runPoolMonitorTest = process.argv.includes('--full');
    if (runPoolMonitorTest) {
      await testPoolMonitorIntegration();
    } else {
      console.log('\n⏭️ Skipping pool monitor integration test (use --full flag to include)');
    }
    
    console.log('\n✅ All Context7 Client tests passed successfully!');
    
  } catch (error) {
    console.error('\n❌ Context7 Client tests failed:', error);
    process.exit(1);
  } finally {
    // Clean up
    try {
      await shutdownContext7IndexerClient();
      console.log('🧹 Client shutdown completed');
    } catch (error) {
      console.error('⚠️ Error during client shutdown:', error);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch((error) => {
    console.error('💥 Unhandled error in tests:', error);
    process.exit(1);
  });
}

export { runTests };
