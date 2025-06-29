#!/usr/bin/env node

/**
 * PuckSwap v5 Environment Configuration Test Script
 * 
 * This script tests the centralized environment configuration system
 * to ensure it works correctly across different network environments.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configurations
const TEST_CONFIGS = [
  {
    name: 'Preprod Testnet',
    env: {
      NETWORK: 'preprod',
      BLOCKFROST_API_KEY: 'preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL'
    },
    expected: {
      network: 'preprod',
      lucidNetwork: 'Preprod',
      apiKey: 'preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL',
      isMainnet: false,
      isTestnet: true
    }
  },
  {
    name: 'Mainnet Production',
    env: {
      NETWORK: 'mainnet',
      BLOCKFROST_API_KEY: 'mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7'
    },
    expected: {
      network: 'mainnet',
      lucidNetwork: 'Mainnet',
      apiKey: 'mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7',
      isMainnet: true,
      isTestnet: false
    }
  },
  {
    name: 'Preview Testnet',
    env: {
      NETWORK: 'preview',
      BLOCKFROST_API_KEY: 'preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL'
    },
    expected: {
      network: 'preview',
      lucidNetwork: 'Preview',
      apiKey: 'preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL',
      isMainnet: false,
      isTestnet: true
    }
  }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createTestFile(config) {
  const testCode = `
// Test environment configuration using tsx for TypeScript support
import { getEnvironmentConfig, validateEnvironmentConfig } from '../src/lib/environment-config.ts';

try {
  // Set environment variables
  process.env.NETWORK = '${config.env.NETWORK}';
  process.env.BLOCKFROST_API_KEY = '${config.env.BLOCKFROST_API_KEY}';

  // Get configuration
  const envConfig = getEnvironmentConfig();

  // Validate configuration
  const isValid = validateEnvironmentConfig();

  // Output results
  console.log(JSON.stringify({
    network: envConfig.network,
    lucidNetwork: envConfig.lucidNetwork,
    apiKey: envConfig.blockfrostApiKey,
    isMainnet: envConfig.isMainnet,
    isTestnet: envConfig.isTestnet,
    isDemoMode: envConfig.isDemoMode,
    isValid: isValid
  }));

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
`;

  const testFilePath = path.join(__dirname, 'temp-test.mjs');
  fs.writeFileSync(testFilePath, testCode);
  return testFilePath;
}

function runTest(config) {
  log(`\n🧪 Testing: ${config.name}`, 'cyan');
  log(`   Network: ${config.env.NETWORK}`, 'blue');
  log(`   API Key: ${config.env.BLOCKFROST_API_KEY.substring(0, 8)}...`, 'blue');
  
  try {
    // Create temporary test file
    const testFilePath = createTestFile(config);
    
    // Run test using tsx for TypeScript support
    const result = execSync(`npx tsx ${testFilePath}`, {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..')
    });
    
    // Parse result
    const actual = JSON.parse(result.trim());
    
    // Verify results
    let passed = true;
    const checks = [
      { name: 'Network', expected: config.expected.network, actual: actual.network },
      { name: 'Lucid Network', expected: config.expected.lucidNetwork, actual: actual.lucidNetwork },
      { name: 'API Key', expected: config.expected.apiKey, actual: actual.apiKey },
      { name: 'Is Mainnet', expected: config.expected.isMainnet, actual: actual.isMainnet },
      { name: 'Is Testnet', expected: config.expected.isTestnet, actual: actual.isTestnet },
      { name: 'Is Valid', expected: true, actual: actual.isValid }
    ];
    
    for (const check of checks) {
      if (check.expected === check.actual) {
        log(`   ✅ ${check.name}: ${check.actual}`, 'green');
      } else {
        log(`   ❌ ${check.name}: Expected ${check.expected}, got ${check.actual}`, 'red');
        passed = false;
      }
    }
    
    // Clean up
    fs.unlinkSync(testFilePath);
    
    if (passed) {
      log(`   🎉 ${config.name} test PASSED`, 'green');
    } else {
      log(`   💥 ${config.name} test FAILED`, 'red');
    }
    
    return passed;
    
  } catch (error) {
    log(`   💥 ${config.name} test ERROR: ${error.message}`, 'red');
    return false;
  }
}

function testEnvironmentSwitching() {
  log('\n🔄 Testing Environment Switching', 'magenta');

  try {
    // Create a test file for environment switching
    const switchTestCode = `
import { getNetworkEnvironment, getBlockfrostApiKey } from '../src/lib/environment-config.ts';

// Test preprod
process.env.NETWORK = 'preprod';
const preprodNetwork = getNetworkEnvironment();
const preprodApiKey = getBlockfrostApiKey(preprodNetwork);

// Test mainnet
process.env.NETWORK = 'mainnet';
const mainnetNetwork = getNetworkEnvironment();
const mainnetApiKey = getBlockfrostApiKey(mainnetNetwork);

console.log(JSON.stringify({
  preprod: { network: preprodNetwork, apiKey: preprodApiKey },
  mainnet: { network: mainnetNetwork, apiKey: mainnetApiKey }
}));
`;

    const switchTestPath = path.join(__dirname, 'temp-switch-test.mjs');
    fs.writeFileSync(switchTestPath, switchTestCode);

    const result = execSync(`npx tsx ${switchTestPath}`, {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..')
    });

    const results = JSON.parse(result.trim());

    // Validate results
    const preprodValid = results.preprod.network === 'preprod' &&
                        results.preprod.apiKey === 'preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL';
    const mainnetValid = results.mainnet.network === 'mainnet' &&
                        results.mainnet.apiKey === 'mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7';

    if (preprodValid) {
      log('   ✅ Preprod switching works', 'green');
    } else {
      log('   ❌ Preprod switching failed', 'red');
    }

    if (mainnetValid) {
      log('   ✅ Mainnet switching works', 'green');
    } else {
      log('   ❌ Mainnet switching failed', 'red');
    }

    // Clean up
    fs.unlinkSync(switchTestPath);

    if (preprodValid && mainnetValid) {
      log('   🎉 Environment switching test PASSED', 'green');
      return true;
    } else {
      return false;
    }

  } catch (error) {
    log(`   💥 Environment switching test ERROR: ${error.message}`, 'red');
    return false;
  }
}

function main() {
  log('🚀 PuckSwap v5 Environment Configuration Test Suite', 'bright');
  log('=' .repeat(60), 'bright');
  
  let allPassed = true;
  
  // Run configuration tests
  for (const config of TEST_CONFIGS) {
    const passed = runTest(config);
    if (!passed) {
      allPassed = false;
    }
  }
  
  // Test environment switching
  const switchingPassed = testEnvironmentSwitching();
  if (!switchingPassed) {
    allPassed = false;
  }
  
  // Final results
  log('\n' + '=' .repeat(60), 'bright');
  if (allPassed) {
    log('🎉 ALL TESTS PASSED! Environment configuration is working correctly.', 'green');
    log('\n✅ PuckSwap v5 is ready for deployment with proper environment configuration.', 'green');
  } else {
    log('💥 SOME TESTS FAILED! Please check the environment configuration.', 'red');
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  main();
}

module.exports = {
  runTest,
  testEnvironmentSwitching,
  TEST_CONFIGS
};
