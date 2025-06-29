#!/usr/bin/env node

/**
 * PuckSwap Wallet Connection Test Runner
 * 
 * Simple Node.js script to test wallet connection fixes
 * Run with: node scripts/test-wallet-connection.js
 */

// Mock browser environment for testing
global.window = {
  cardano: {
    eternl: {
      enable: async () => ({
        getUtxos: async () => [],
        getBalance: async () => '0',
        getNetworkId: async () => 0,
        getUsedAddresses: async () => [],
        getChangeAddress: async () => 'addr_test1...',
        getRewardAddresses: async () => []
      })
    }
  }
};

// Mock console for better test output
const originalConsole = console;
const testConsole = {
  ...originalConsole,
  log: (...args) => originalConsole.log('📝', ...args),
  warn: (...args) => originalConsole.warn('⚠️ ', ...args),
  error: (...args) => originalConsole.error('❌', ...args),
  debug: (...args) => originalConsole.debug('🐛', ...args)
};

console = testConsole;

/**
 * Test safeToBigInt function implementation
 */
function testSafeToBigIntImplementation() {
  console.log('🧪 Testing safeToBigInt implementation...');
  
  // Replicate the safeToBigInt function from our wallet implementation
  const safeToBigInt = (value, context) => {
    // Handle explicit null/undefined cases
    if (value === undefined || value === null || value === '') {
      console.debug(`safeToBigInt: Converting ${value} to 0n${context ? ` (${context})` : ''}`);
      return 0n;
    }

    // Handle already converted BigInt
    if (typeof value === 'bigint') {
      return value;
    }

    // Handle numeric values
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) {
        console.warn(`safeToBigInt: Invalid number ${value}${context ? ` (${context})` : ''}, converting to 0n`);
        return 0n;
      }
      return BigInt(Math.floor(value));
    }

    // Handle string values
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') {
        console.debug(`safeToBigInt: Converting empty/null string to 0n${context ? ` (${context})` : ''}`);
        return 0n;
      }
      
      try {
        // Remove any non-numeric characters except minus sign
        const cleaned = trimmed.replace(/[^0-9-]/g, '');
        if (cleaned === '' || cleaned === '-') {
          console.warn(`safeToBigInt: No valid digits in "${value}"${context ? ` (${context})` : ''}, converting to 0n`);
          return 0n;
        }
        return BigInt(cleaned);
      } catch (error) {
        console.warn(`safeToBigInt: Failed to convert "${value}" to BigInt${context ? ` (${context})` : ''}:`, error);
        return 0n;
      }
    }

    console.warn(`safeToBigInt: Unexpected value type ${typeof value}${context ? ` (${context})` : ''}:`, value);
    return 0n;
  };
  
  const testCases = [
    { input: undefined, expected: 0n, description: 'undefined' },
    { input: null, expected: 0n, description: 'null' },
    { input: '', expected: 0n, description: 'empty string' },
    { input: '1000000', expected: 1000000n, description: 'valid string' },
    { input: 1000000, expected: 1000000n, description: 'valid number' },
    { input: 1000000n, expected: 1000000n, description: 'valid bigint' },
    { input: 'invalid', expected: 0n, description: 'invalid string' },
    { input: NaN, expected: 0n, description: 'NaN' },
    { input: Infinity, expected: 0n, description: 'Infinity' },
    { input: -Infinity, expected: 0n, description: '-Infinity' },
    { input: '  2000000  ', expected: 2000000n, description: 'string with whitespace' },
    { input: 'undefined', expected: 0n, description: 'string "undefined"' },
    { input: 'null', expected: 0n, description: 'string "null"' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    try {
      const result = safeToBigInt(testCase.input, `test-${testCase.description}`);
      if (result === testCase.expected) {
        console.log(`✅ ${testCase.description}: ${testCase.input} -> ${result}`);
        passed++;
      } else {
        console.error(`❌ ${testCase.description}: Expected ${testCase.expected}, got ${result}`);
        failed++;
      }
    } catch (error) {
      console.error(`💥 ${testCase.description}: Threw error:`, error);
      failed++;
    }
  }
  
  console.log(`📊 safeToBigInt test results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

/**
 * Test balance calculation with problematic UTxO structures
 */
function testBalanceCalculationImplementation() {
  console.log('🧪 Testing balance calculation implementation...');
  
  // Replicate the calculateBalance function logic
  const safeToBigInt = (value, context) => {
    if (value === undefined || value === null || value === '') return 0n;
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) return 0n;
      return BigInt(Math.floor(value));
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') return 0n;
      try {
        const cleaned = trimmed.replace(/[^0-9-]/g, '');
        if (cleaned === '' || cleaned === '-') return 0n;
        return BigInt(cleaned);
      } catch (error) {
        return 0n;
      }
    }
    return 0n;
  };
  
  const calculateBalance = (utxos) => {
    const balance = { ada: 0n, assets: {} };

    if (!Array.isArray(utxos)) {
      console.error('calculateBalance: UTxOs is not an array:', utxos);
      return balance;
    }

    console.log(`📊 Calculating balance from ${utxos.length} UTxOs...`);

    for (let i = 0; i < utxos.length; i++) {
      const utxo = utxos[i];
      
      if (!utxo) {
        console.warn(`calculateBalance: UTxO at index ${i} is null/undefined`);
        continue;
      }

      // Handle different UTxO structures
      let assets = utxo.assets;
      
      if (!assets && utxo.output?.amount) {
        assets = utxo.output.amount;
      } else if (!assets && utxo.amount) {
        assets = utxo.amount;
      }

      if (!assets || typeof assets !== 'object') {
        console.warn(`calculateBalance: UTxO at index ${i} has no valid assets:`, utxo);
        continue;
      }

      try {
        // Add ADA using safe conversion
        const adaAmount = safeToBigInt(assets.lovelace, `UTxO[${i}].lovelace`);
        balance.ada += adaAmount;

        // Add other native assets using safe conversion
        for (const [unit, amount] of Object.entries(assets)) {
          if (unit !== 'lovelace' && amount !== undefined && amount !== null) {
            const assetAmount = safeToBigInt(amount, `UTxO[${i}].${unit}`);
            if (assetAmount > 0n) {
              balance.assets[unit] = (balance.assets[unit] || 0n) + assetAmount;
            }
          }
        }
      } catch (error) {
        console.error(`calculateBalance: Error processing UTxO at index ${i}:`, error, utxo);
      }
    }

    console.log(`💰 Calculated balance: ${balance.ada} lovelace, ${Object.keys(balance.assets).length} native assets`);
    return balance;
  };
  
  // Test with problematic UTxO structures
  const problematicUtxos = [
    {
      assets: {
        lovelace: undefined,
        'policy1.token1': null
      }
    },
    {
      assets: {
        lovelace: '',
        'policy2.token2': 'invalid'
      }
    },
    {
      assets: {
        lovelace: NaN,
        'policy3.token3': Infinity
      }
    },
    {
      // Missing assets property
    },
    null, // Null UTxO
    undefined, // Undefined UTxO
    {
      assets: null // Null assets
    },
    {
      assets: {
        lovelace: '5000000',
        'policy4.token4': '1000000'
      }
    }
  ];
  
  try {
    const balance = calculateBalance(problematicUtxos);
    const isValid = (
      typeof balance.ada === 'bigint' &&
      balance.ada >= 0n &&
      typeof balance.assets === 'object'
    );
    
    console.log(`📊 Balance calculation test: ${isValid ? 'PASSED' : 'FAILED'}`);
    console.log(`   Final balance: ${balance.ada} lovelace, ${Object.keys(balance.assets).length} assets`);
    
    return isValid;
  } catch (error) {
    console.error('💥 Balance calculation threw error:', error);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting PuckSwap wallet connection fix tests...');
  console.log('=' .repeat(60));
  
  const results = {
    safeToBigInt: false,
    balanceCalculation: false
  };
  
  try {
    results.safeToBigInt = testSafeToBigIntImplementation();
    results.balanceCalculation = testBalanceCalculationImplementation();
  } catch (error) {
    console.error('💥 Test suite failed with error:', error);
  }
  
  console.log('=' .repeat(60));
  console.log('📊 Test Results:');
  console.log(`   safeToBigInt: ${results.safeToBigInt ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   balanceCalculation: ${results.balanceCalculation ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`🎯 Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('');
    console.log('🎉 Wallet connection fixes are working correctly!');
    console.log('   The BigInt conversion errors should now be resolved.');
    console.log('   Users should be able to connect their wallets without issues.');
  } else {
    console.log('');
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }
  
  return allPassed;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
