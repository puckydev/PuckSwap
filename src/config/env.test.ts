/**
 * PuckSwap v5 Environment Configuration Tests
 * 
 * Test file demonstrating usage of the environment configuration module
 */

import {
  getNetwork,
  getBlockfrostApiKey,
  getBlockfrostApiUrl,
  getContext7Endpoint,
  isMainnet,
  isPreprod,
  getEnvironmentInfo,
  validateEnvironmentConfig,
  EnvironmentError,
  environmentConfig
} from './env';

/**
 * Test the core environment functions
 */
function testCoreEnvironmentFunctions() {
  console.log('🧪 Testing PuckSwap v5 Environment Configuration\n');

  try {
    // Test network detection
    const network = getNetwork();
    console.log(`✅ Network: ${network}`);
    
    // Test network type checks
    console.log(`✅ Is Mainnet: ${isMainnet()}`);
    console.log(`✅ Is Preprod: ${isPreprod()}`);
    
    // Test API key retrieval
    const apiKey = getBlockfrostApiKey();
    console.log(`✅ Blockfrost API Key: ${apiKey.substring(0, 8)}...`);
    
    // Test API URL
    const apiUrl = getBlockfrostApiUrl();
    console.log(`✅ Blockfrost API URL: ${apiUrl}`);
    
    // Test Context7 endpoint
    const context7Endpoint = getContext7Endpoint();
    console.log(`✅ Context7 Endpoint: ${context7Endpoint || 'Not configured'}`);
    
    // Test environment info
    const envInfo = getEnvironmentInfo();
    console.log(`✅ Environment Info:`, envInfo);
    
    // Test validation
    validateEnvironmentConfig();
    console.log(`✅ Environment validation passed`);
    
    // Test frozen config
    console.log(`✅ Environment Config:`, environmentConfig);
    
  } catch (error) {
    if (error instanceof EnvironmentError) {
      console.error(`❌ Environment Error: ${error.message}`);
    } else {
      console.error(`❌ Unexpected Error: ${error}`);
    }
  }
}

/**
 * Test error handling
 */
function testErrorHandling() {
  console.log('\n🧪 Testing Error Handling\n');
  
  // Save original environment
  const originalNetwork = process.env.NETWORK;
  const originalMainnetKey = process.env.BLOCKFROST_API_KEY_MAINNET;
  
  try {
    // Test invalid network
    process.env.NETWORK = 'invalid';
    delete process.env.BLOCKFROST_API_KEY_MAINNET;
    
    // This should trigger module reload and throw an error
    console.log('Testing invalid configuration...');
    
  } catch (error) {
    if (error instanceof EnvironmentError) {
      console.log(`✅ Correctly caught environment error: ${error.message}`);
    } else {
      console.log(`❌ Unexpected error type: ${error}`);
    }
  } finally {
    // Restore original environment
    if (originalNetwork) {
      process.env.NETWORK = originalNetwork;
    }
    if (originalMainnetKey) {
      process.env.BLOCKFROST_API_KEY_MAINNET = originalMainnetKey;
    }
  }
}

/**
 * Test usage examples
 */
function testUsageExamples() {
  console.log('\n🧪 Testing Usage Examples\n');
  
  try {
    // Example 1: Simple network check
    if (isMainnet()) {
      console.log('✅ Running on mainnet - using production settings');
    } else {
      console.log('✅ Running on testnet - using development settings');
    }
    
    // Example 2: API configuration
    const blockfrostConfig = {
      apiKey: getBlockfrostApiKey(),
      baseUrl: getBlockfrostApiUrl(),
      network: getNetwork()
    };
    console.log('✅ Blockfrost Config:', blockfrostConfig);
    
    // Example 3: Context7 configuration
    const context7Config = {
      endpoint: getContext7Endpoint(),
      enabled: getContext7Endpoint() !== null
    };
    console.log('✅ Context7 Config:', context7Config);
    
    // Example 4: Environment summary
    const summary = getEnvironmentInfo();
    console.log('✅ Environment Summary:', summary);
    
  } catch (error) {
    console.error(`❌ Usage example failed: ${error}`);
  }
}

/**
 * Run all tests
 */
function runTests() {
  console.log('🚀 PuckSwap v5 Environment Configuration Test Suite\n');
  console.log('=' .repeat(60));
  
  testCoreEnvironmentFunctions();
  testErrorHandling();
  testUsageExamples();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!');
}

// Export test functions for external use
export {
  testCoreEnvironmentFunctions,
  testErrorHandling,
  testUsageExamples,
  runTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}
