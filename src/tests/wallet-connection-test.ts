/**
 * PuckSwap Wallet Connection Test
 * 
 * Comprehensive test suite for wallet connection functionality
 * Tests the enhanced error handling and BigInt conversion fixes
 */

import { createLucidInstance, connectWallet } from '../lib/lucid-config';
import { WalletManager } from '../lib/wallet';

// Mock wallet data structures for testing
const mockUtxos = [
  {
    assets: {
      lovelace: 5000000n,
      'policy1.token1': 1000000n
    }
  },
  {
    assets: {
      lovelace: 3000000n,
      'policy2.token2': 500000n
    }
  },
  {
    assets: {
      lovelace: undefined, // Test undefined handling
      'policy3.token3': null // Test null handling
    }
  },
  {
    assets: {
      lovelace: '2000000', // Test string conversion
      'policy4.token4': '750000'
    }
  }
];

// Mock problematic UTxO structures that might cause BigInt errors
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
  }
];

/**
 * Test safeToBigInt function with various input types
 */
function testSafeToBigInt() {
  console.log('🧪 Testing safeToBigInt function...');
  
  const walletManager = new WalletManager();
  
  // Access private method for testing (TypeScript hack)
  const safeToBigInt = (walletManager as any).safeToBigInt.bind(walletManager);
  
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
 * Test balance calculation with various UTxO structures
 */
function testBalanceCalculation() {
  console.log('🧪 Testing balance calculation...');
  
  const walletManager = new WalletManager();
  
  // Access private method for testing
  const calculateBalance = (walletManager as any).calculateBalance.bind(walletManager);
  
  // Test with normal UTxOs
  console.log('Testing normal UTxOs...');
  const normalBalance = calculateBalance(mockUtxos);
  console.log('Normal balance:', normalBalance);
  
  // Test with problematic UTxOs
  console.log('Testing problematic UTxOs...');
  const problematicBalance = calculateBalance(problematicUtxos);
  console.log('Problematic balance:', problematicBalance);
  
  // Test with mixed UTxOs
  console.log('Testing mixed UTxOs...');
  const mixedBalance = calculateBalance([...mockUtxos, ...problematicUtxos]);
  console.log('Mixed balance:', mixedBalance);
  
  // Validate results
  const isValid = (
    typeof normalBalance.ada === 'bigint' &&
    typeof problematicBalance.ada === 'bigint' &&
    typeof mixedBalance.ada === 'bigint' &&
    normalBalance.ada >= 0n &&
    problematicBalance.ada >= 0n &&
    mixedBalance.ada >= 0n
  );
  
  console.log(`📊 Balance calculation test: ${isValid ? 'PASSED' : 'FAILED'}`);
  return isValid;
}

/**
 * Test wallet connection error handling
 */
async function testWalletConnectionErrorHandling() {
  console.log('🧪 Testing wallet connection error handling...');
  
  // Test with non-existent wallet
  try {
    const lucid = await createLucidInstance();
    await connectWallet(lucid, 'nonexistent' as any);
    console.error('❌ Should have thrown error for non-existent wallet');
    return false;
  } catch (error) {
    console.log('✅ Correctly threw error for non-existent wallet:', error.message);
  }
  
  // Test with invalid Lucid instance
  try {
    await connectWallet(null as any, 'eternl');
    console.error('❌ Should have thrown error for null Lucid instance');
    return false;
  } catch (error) {
    console.log('✅ Correctly threw error for null Lucid instance:', error.message);
  }
  
  console.log('📊 Wallet connection error handling test: PASSED');
  return true;
}

/**
 * Run all wallet connection tests
 */
export async function runWalletConnectionTests() {
  console.log('🚀 Starting PuckSwap wallet connection tests...');
  console.log('=' .repeat(60));
  
  const results = {
    safeToBigInt: false,
    balanceCalculation: false,
    errorHandling: false
  };
  
  try {
    results.safeToBigInt = testSafeToBigInt();
    results.balanceCalculation = testBalanceCalculation();
    results.errorHandling = await testWalletConnectionErrorHandling();
  } catch (error) {
    console.error('💥 Test suite failed with error:', error);
  }
  
  console.log('=' .repeat(60));
  console.log('📊 Test Results:');
  console.log(`   safeToBigInt: ${results.safeToBigInt ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   balanceCalculation: ${results.balanceCalculation ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   errorHandling: ${results.errorHandling ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`🎯 Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  return allPassed;
}

// Export for use in other test files
export {
  testSafeToBigInt,
  testBalanceCalculation,
  testWalletConnectionErrorHandling,
  mockUtxos,
  problematicUtxos
};
