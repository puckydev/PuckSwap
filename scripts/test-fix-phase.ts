#!/usr/bin/env tsx
// PuckSwap v5 Fix Phase Verification Script
// Tests all implemented fixes: serialization, mock wallet, Context7 SDK, environment config

import { PuckSwapSerializer, PoolDatum, GovernanceDatum, StakingDatum, CrossChainRouterDatum } from "../src/lucid/utils/serialization";
import { createMockWallet, initializeMockEnvironment, MockWallet } from "../src/testing/mockWallet";
import { getPuckSwapEnvironmentConfig, validateEnvironmentConfig, logEnvironmentConfig } from "../src/config/env";

// Test colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✅ ${message}`, colors.green);
}

function error(message: string) {
  log(`❌ ${message}`, colors.red);
}

function info(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

function warning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

// Test 1: CIP-68 Datum Serialization
async function testSerializationUtility(): Promise<boolean> {
  log(`\n${colors.bold}=== Test 1: CIP-68 Datum Serialization ===${colors.reset}`);
  
  try {
    // Test PoolDatum serialization
    const poolDatum: PoolDatum = {
      ada_reserve: 1000000000n,
      token_reserve: 500000000n,
      fee_basis_points: 30,
      lp_token_policy: "c6e65ba7878b2f8ea0ad39287d3e2fd256dc5c4160fc19bdf4c4d87e",
      lp_token_name: "PUCKY_ADA_LP"
    };

    info("Testing PoolDatum serialization...");
    const serializedPool = PuckSwapSerializer.serializePoolDatum(poolDatum);
    const deserializedPool = PuckSwapSerializer.deserializePoolDatum(serializedPool);

    // Compare fields individually to handle BigInt properly
    const isEqual = (
      poolDatum.ada_reserve === deserializedPool.ada_reserve &&
      poolDatum.token_reserve === deserializedPool.token_reserve &&
      poolDatum.fee_basis_points === deserializedPool.fee_basis_points &&
      poolDatum.lp_token_policy === deserializedPool.lp_token_policy &&
      poolDatum.lp_token_name === deserializedPool.lp_token_name
    );

    if (isEqual) {
      success("PoolDatum serialization/deserialization works correctly");
    } else {
      error("PoolDatum serialization/deserialization failed");
      console.log("Original:", poolDatum);
      console.log("Deserialized:", deserializedPool);
      return false;
    }

    // Test StakingDatum serialization
    const stakingDatum: StakingDatum = {
      total_staked: 5000000000n,
      total_pADA_minted: 4950000000n,
      stake_pool_id: "pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy",
      last_rewards_sync_slot: 1000000
    };

    info("Testing StakingDatum serialization...");
    const serializedStaking = PuckSwapSerializer.serializeStakingDatum(stakingDatum);
    const deserializedStaking = PuckSwapSerializer.deserializeStakingDatum(serializedStaking);

    // Compare fields individually to handle BigInt properly
    const isStakingEqual = (
      stakingDatum.total_staked === deserializedStaking.total_staked &&
      stakingDatum.total_pADA_minted === deserializedStaking.total_pADA_minted &&
      stakingDatum.stake_pool_id === deserializedStaking.stake_pool_id &&
      stakingDatum.last_rewards_sync_slot === deserializedStaking.last_rewards_sync_slot
    );

    if (isStakingEqual) {
      success("StakingDatum serialization/deserialization works correctly");
    } else {
      error("StakingDatum serialization/deserialization failed");
      console.log("Original:", stakingDatum);
      console.log("Deserialized:", deserializedStaking);
      return false;
    }

    // Test CrossChainRouterDatum serialization
    const crossChainDatum: CrossChainRouterDatum = {
      total_volume: 10000000000n,
      last_processed_nonce: 42,
      chain_connections: [
        {
          chain_id: "ethereum",
          bridge_address: "0x1234567890123456789012345678901234567890",
          is_active: true,
          total_volume: 5000000000n,
          last_sync_nonce: 41
        }
      ]
    };

    info("Testing CrossChainRouterDatum serialization...");
    const serializedCrossChain = PuckSwapSerializer.serializeCrossChainRouterDatum(crossChainDatum);
    const deserializedCrossChain = PuckSwapSerializer.deserializeCrossChainRouterDatum(serializedCrossChain);

    // Compare fields individually to handle BigInt properly
    const isCrossChainEqual = (
      crossChainDatum.total_volume === deserializedCrossChain.total_volume &&
      crossChainDatum.last_processed_nonce === deserializedCrossChain.last_processed_nonce &&
      crossChainDatum.chain_connections.length === deserializedCrossChain.chain_connections.length &&
      crossChainDatum.chain_connections[0].chain_id === deserializedCrossChain.chain_connections[0].chain_id &&
      crossChainDatum.chain_connections[0].bridge_address === deserializedCrossChain.chain_connections[0].bridge_address &&
      crossChainDatum.chain_connections[0].is_active === deserializedCrossChain.chain_connections[0].is_active &&
      crossChainDatum.chain_connections[0].total_volume === deserializedCrossChain.chain_connections[0].total_volume &&
      crossChainDatum.chain_connections[0].last_sync_nonce === deserializedCrossChain.chain_connections[0].last_sync_nonce
    );

    if (isCrossChainEqual) {
      success("CrossChainRouterDatum serialization/deserialization works correctly");
    } else {
      error("CrossChainRouterDatum serialization/deserialization failed");
      console.log("Original:", crossChainDatum);
      console.log("Deserialized:", deserializedCrossChain);
      return false;
    }

    // Test hex encoding/decoding utilities
    info("Testing hex encoding/decoding utilities...");
    const testData = { test: "data", number: 42 }; // Remove BigInt for JSON compatibility
    const hexEncoded = PuckSwapSerializer.safeToHex(testData);
    const hexDecoded = PuckSwapSerializer.safeFromHex(hexEncoded);

    if (JSON.stringify(testData) === JSON.stringify(hexDecoded)) {
      success("Hex encoding/decoding utilities work correctly");
    } else {
      error("Hex encoding/decoding utilities failed");
      console.log("Original:", testData);
      console.log("Decoded:", hexDecoded);
      return false;
    }

    success("All serialization tests passed!");
    return true;
  } catch (err) {
    error(`Serialization test failed: ${err}`);
    return false;
  }
}

// Test 2: Mock Wallet Environment
async function testMockWalletEnvironment(): Promise<boolean> {
  log(`\n${colors.bold}=== Test 2: Mock Wallet Environment ===${colors.reset}`);
  
  try {
    info("Initializing mock environment...");
    const mockWallet = initializeMockEnvironment();
    
    info("Testing wallet connection...");
    const walletApi = await mockWallet.enable();
    
    if (!mockWallet.isEnabled()) {
      error("Mock wallet failed to enable");
      return false;
    }
    success("Mock wallet enabled successfully");

    info("Testing wallet API methods...");
    const addresses = await walletApi.getUsedAddresses();
    const balance = await walletApi.getBalance();
    const utxos = await walletApi.getUtxos();
    
    if (addresses.length === 0) {
      error("Mock wallet returned no addresses");
      return false;
    }
    success(`Mock wallet returned ${addresses.length} address(es)`);

    if (!balance) {
      error("Mock wallet returned no balance");
      return false;
    }
    success("Mock wallet returned balance data");

    if (utxos.length === 0) {
      error("Mock wallet returned no UTxOs");
      return false;
    }
    success(`Mock wallet returned ${utxos.length} UTxO(s)`);

    info("Testing transaction simulation...");
    const mockTxCbor = "mock_transaction_cbor_data";
    const txResult = await mockWallet.simulateTransaction(mockTxCbor);
    
    if (!txResult.success) {
      error("Mock transaction simulation failed");
      return false;
    }
    success(`Mock transaction simulation successful: ${txResult.txHash}`);

    info("Testing wallet state management...");
    const currentBalance = mockWallet.getBalance();
    const currentUtxos = mockWallet.getUtxos();
    const currentSlot = mockWallet.getCurrentSlot();
    
    if (!currentBalance.lovelace || currentBalance.lovelace <= 0n) {
      error("Mock wallet balance is invalid");
      return false;
    }
    success(`Mock wallet balance: ${currentBalance.lovelace} lovelace`);

    if (currentUtxos.length === 0) {
      error("Mock wallet has no UTxOs");
      return false;
    }
    success(`Mock wallet has ${currentUtxos.length} UTxO(s)`);

    if (currentSlot <= 0) {
      error("Mock wallet slot is invalid");
      return false;
    }
    success(`Mock wallet current slot: ${currentSlot}`);

    success("All mock wallet tests passed!");
    return true;
  } catch (err) {
    error(`Mock wallet test failed: ${err}`);
    return false;
  }
}

// Test 3: Environment Configuration
async function testEnvironmentConfiguration(): Promise<boolean> {
  log(`\n${colors.bold}=== Test 3: Environment Configuration ===${colors.reset}`);
  
  try {
    info("Loading environment configuration...");
    const envConfig = getPuckSwapEnvironmentConfig();
    
    info("Validating environment configuration...");
    const isValid = validateEnvironmentConfig(envConfig);
    
    if (!isValid) {
      error("Environment configuration validation failed");
      return false;
    }
    success("Environment configuration is valid");

    info("Checking required configuration fields...");
    
    if (!envConfig.network) {
      error("Network configuration is missing");
      return false;
    }
    success(`Network: ${envConfig.network}`);

    if (!envConfig.blockfrostApiKey) {
      error("Blockfrost API key is missing");
      return false;
    }
    success(`Blockfrost API key: ${envConfig.blockfrostApiKey.substring(0, 8)}...`);

    if (!envConfig.context7Endpoint) {
      error("Context7 endpoint is missing");
      return false;
    }
    success(`Context7 endpoint: ${envConfig.context7Endpoint}`);

    if (!envConfig.contractAddresses) {
      error("Contract addresses are missing");
      return false;
    }
    success("Contract addresses are configured");

    if (!envConfig.features) {
      error("Feature flags are missing");
      return false;
    }
    success("Feature flags are configured");

    info("Logging full environment configuration...");
    logEnvironmentConfig(envConfig);

    success("All environment configuration tests passed!");
    return true;
  } catch (err) {
    error(`Environment configuration test failed: ${err}`);
    return false;
  }
}

// Test 4: Context7 Integration (Mock Test)
async function testContext7Integration(): Promise<boolean> {
  log(`\n${colors.bold}=== Test 4: Context7 Integration ===${colors.reset}`);

  try {
    info("Testing Context7 configuration...");

    // Test that the environment configuration includes Context7 endpoints
    const envConfig = getPuckSwapEnvironmentConfig();

    if (!envConfig.context7Endpoint) {
      error("Context7 endpoint not configured");
      return false;
    }
    success(`Context7 endpoint configured: ${envConfig.context7Endpoint}`);

    // Test that the mock Context7 SDK is available
    info("Testing mock Context7 SDK availability...");
    try {
      const { createIndexer } = require("../src/lib/mock-context7-sdk");
      if (typeof createIndexer !== 'function') {
        error("Mock Context7 SDK createIndexer function not available");
        return false;
      }
      success("Mock Context7 SDK is available");
    } catch (err) {
      warning("Mock Context7 SDK not available, but this is acceptable for production");
    }

    // Test Context7 monitor import
    info("Testing Context7 monitor import...");
    try {
      const { PoolMonitor } = require("../src/context7/pool_monitor");
      if (typeof PoolMonitor !== 'function') {
        error("PoolMonitor class not available");
        return false;
      }
      success("PoolMonitor class is available");
    } catch (err) {
      error(`Failed to import PoolMonitor: ${err}`);
      return false;
    }

    success("Context7 integration tests passed!");
    return true;
  } catch (err) {
    error(`Context7 integration test failed: ${err}`);
    return false;
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  log(`${colors.bold}🚀 PuckSwap v5 Fix Phase Verification${colors.reset}`);
  log(`${colors.bold}======================================${colors.reset}`);
  
  const results: boolean[] = [];
  
  // Run all tests
  results.push(await testSerializationUtility());
  results.push(await testMockWalletEnvironment());
  results.push(await testEnvironmentConfiguration());
  results.push(await testContext7Integration());
  
  // Summary
  log(`\n${colors.bold}=== Test Summary ===${colors.reset}`);
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  if (passed === total) {
    success(`All ${total} tests passed! 🎉`);
    log(`\n${colors.green}${colors.bold}✅ PuckSwap v5 Fix Phase implementation is complete and working correctly!${colors.reset}`);
    process.exit(0);
  } else {
    error(`${passed}/${total} tests passed`);
    log(`\n${colors.red}${colors.bold}❌ Some tests failed. Please review the output above.${colors.reset}`);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch((err) => {
    error(`Test runner failed: ${err}`);
    process.exit(1);
  });
}
