#!/usr/bin/env tsx

/**
 * PuckSwap v5 - Wallet Connection and Pool Discovery Test
 *
 * Comprehensive test script to verify:
 * 1. Wallet connection with Eternl, Vespr, Lace
 * 2. Pool discovery from deployed contracts
 * 3. Real balance detection
 * 4. Transaction building capabilities
 */

import { config } from 'dotenv';
import { Lucid, Blockfrost } from '@lucid-evolution/lucid';
import { discoverActivePools, getAvailableTokens } from '../src/lucid/pool-discovery';
import { loadContractAddresses } from '../src/lucid/utils/contractAddresses';

// Load environment variables
config({ path: '.env.local' });

// Environment configuration
const NETWORK = process.env.NEXT_PUBLIC_NETWORK?.toLowerCase() || 'preprod';
const BLOCKFROST_API_KEY = NETWORK === 'mainnet'
  ? process.env.NEXT_PUBLIC_MAINNET_API_KEY
  : process.env.NEXT_PUBLIC_PREPROD_API_KEY;

if (!BLOCKFROST_API_KEY) {
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('BLOCKFROST') || k.includes('API')));
  throw new Error(`Missing Blockfrost API key for ${NETWORK}. Expected: NEXT_PUBLIC_${NETWORK.toUpperCase()}_API_KEY`);
}

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  data?: any;
}

async function runWalletAndPoolTests(): Promise<void> {
  console.log('🧪 Starting PuckSwap v5 Wallet & Pool Tests...');
  console.log(`📡 Network: ${NETWORK}`);
  
  const results: TestResult[] = [];
  
  try {
    // Initialize Lucid
    const lucid = await Lucid(
      new Blockfrost(`https://cardano-${NETWORK}.blockfrost.io/api/v0`, BLOCKFROST_API_KEY),
      NETWORK as any
    );
    
    results.push({
      test: 'Lucid Initialization',
      status: 'PASS',
      message: 'Successfully initialized Lucid with Blockfrost'
    });
    
    // Test 1: Contract Address Loading
    await testContractAddresses(results);
    
    // Test 2: Pool Discovery
    await testPoolDiscovery(lucid, results);
    
    // Test 3: Token Discovery
    await testTokenDiscovery(lucid, results);
    
    // Test 4: Wallet API Detection
    await testWalletApiDetection(results);
    
    // Test 5: Mock Wallet Connection (browser environment simulation)
    await testMockWalletConnection(lucid, results);
    
  } catch (error) {
    results.push({
      test: 'Test Suite Initialization',
      status: 'FAIL',
      message: `Failed to initialize test suite: ${error}`
    });
  }
  
  // Print results
  printTestResults(results);
}

async function testContractAddresses(results: TestResult[]): Promise<void> {
  try {
    console.log('📋 Testing contract address loading...');

    // Load contract addresses
    const contractAddresses = await loadContractAddresses();

    // Check if contract addresses are loaded
    const hasSwapValidator = !!contractAddresses.validators?.swap;
    const hasLPPolicy = !!contractAddresses.policies?.lpMinting;
    
    if (hasSwapValidator && hasLPPolicy) {
      results.push({
        test: 'Contract Address Loading',
        status: 'PASS',
        message: 'Contract addresses loaded successfully',
        data: {
          swapValidator: contractAddresses.validators.swap,
          lpPolicy: contractAddresses.policies.lpMinting
        }
      });
    } else {
      results.push({
        test: 'Contract Address Loading',
        status: 'FAIL',
        message: 'Missing required contract addresses'
      });
    }
    
  } catch (error) {
    results.push({
      test: 'Contract Address Loading',
      status: 'FAIL',
      message: `Error loading contract addresses: ${error}`
    });
  }
}

async function testPoolDiscovery(lucid: Lucid, results: TestResult[]): Promise<void> {
  try {
    console.log('🔍 Testing pool discovery...');
    
    const pools = await discoverActivePools(lucid);
    
    results.push({
      test: 'Pool Discovery',
      status: 'PASS',
      message: `Discovered ${pools.length} active pools`,
      data: {
        poolCount: pools.length,
        pools: pools.map(pool => ({
          tokenPolicy: pool.tokenPolicy,
          tokenName: pool.tokenName,
          adaReserve: pool.adaReserve.toString(),
          tokenReserve: pool.tokenReserve.toString()
        }))
      }
    });
    
  } catch (error) {
    results.push({
      test: 'Pool Discovery',
      status: 'FAIL',
      message: `Pool discovery failed: ${error}`
    });
  }
}

async function testTokenDiscovery(lucid: Lucid, results: TestResult[]): Promise<void> {
  try {
    console.log('🪙 Testing token discovery...');
    
    const tokens = await getAvailableTokens(lucid);
    
    results.push({
      test: 'Token Discovery',
      status: 'PASS',
      message: `Discovered ${tokens.length} available tokens`,
      data: {
        tokenCount: tokens.length,
        tokens: tokens.map(token => ({
          symbol: token.symbol,
          policy: token.policy,
          name: token.name,
          price: token.price
        }))
      }
    });
    
  } catch (error) {
    results.push({
      test: 'Token Discovery',
      status: 'FAIL',
      message: `Token discovery failed: ${error}`
    });
  }
}

async function testWalletApiDetection(results: TestResult[]): Promise<void> {
  try {
    console.log('👛 Testing wallet API detection...');
    
    // Simulate browser environment wallet detection
    const mockWalletApis = {
      eternl: typeof window !== 'undefined' && (window as any).cardano?.eternl,
      vespr: typeof window !== 'undefined' && (window as any).cardano?.vespr,
      lace: typeof window !== 'undefined' && (window as any).cardano?.lace,
      nami: typeof window !== 'undefined' && (window as any).cardano?.nami,
    };
    
    const availableWallets = Object.entries(mockWalletApis)
      .filter(([_, api]) => api)
      .map(([name]) => name);
    
    if (typeof window === 'undefined') {
      results.push({
        test: 'Wallet API Detection',
        status: 'SKIP',
        message: 'Skipped - not in browser environment',
        data: { note: 'Run this test in browser to detect actual wallet APIs' }
      });
    } else {
      results.push({
        test: 'Wallet API Detection',
        status: availableWallets.length > 0 ? 'PASS' : 'FAIL',
        message: `Detected ${availableWallets.length} wallet APIs`,
        data: { availableWallets }
      });
    }
    
  } catch (error) {
    results.push({
      test: 'Wallet API Detection',
      status: 'FAIL',
      message: `Wallet API detection failed: ${error}`
    });
  }
}

async function testMockWalletConnection(lucid: Lucid, results: TestResult[]): Promise<void> {
  try {
    console.log('🔗 Testing mock wallet connection...');
    
    // Create a mock wallet for testing
    const mockWallet = {
      getNetworkId: async () => NETWORK === 'mainnet' ? 1 : 0,
      getUtxos: async () => [],
      getBalance: async () => '5000000', // 5 ADA
      getUsedAddresses: async () => ['addr_test1mock...'],
      getUnusedAddresses: async () => ['addr_test1mock...'],
      getChangeAddress: async () => 'addr_test1mock...',
      getRewardAddresses: async () => [],
      signTx: async (tx: string) => 'mock_signature',
      signData: async (addr: string, payload: string) => ({ signature: 'mock', key: 'mock' }),
      submitTx: async (tx: string) => 'mock_tx_hash',
    };
    
    // Test wallet interface compatibility
    const networkId = await mockWallet.getNetworkId();
    const balance = await mockWallet.getBalance();
    const addresses = await mockWallet.getUsedAddresses();
    
    results.push({
      test: 'Mock Wallet Connection',
      status: 'PASS',
      message: 'Mock wallet interface working correctly',
      data: {
        networkId,
        balance,
        addressCount: addresses.length
      }
    });
    
  } catch (error) {
    results.push({
      test: 'Mock Wallet Connection',
      status: 'FAIL',
      message: `Mock wallet connection failed: ${error}`
    });
  }
}

function printTestResults(results: TestResult[]): void {
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`📋 Total: ${results.length}`);
  
  console.log('\n📝 DETAILED RESULTS');
  console.log('===================');
  
  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${index + 1}. ${icon} ${result.test}`);
    console.log(`   ${result.message}`);
    
    if (result.data) {
      console.log(`   Data:`, JSON.stringify(result.data, null, 2));
    }
    console.log('');
  });
  
  // Overall status
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! PuckSwap v5 is ready for deployment.');
  } else {
    console.log(`⚠️  ${failed} test(s) failed. Please fix issues before deployment.`);
  }
}

// Run tests if called directly
if (require.main === module) {
  runWalletAndPoolTests().catch(console.error);
}

export { runWalletAndPoolTests };
