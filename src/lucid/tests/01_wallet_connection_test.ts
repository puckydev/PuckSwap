/**
 * PuckSwap v5 - Lucid Evolution Test Suite
 * TEST 01: Wallet Connection Test
 * 
 * This test verifies:
 * ✅ Lucid Evolution initialization
 * ✅ Wallet connection via CIP-30
 * ✅ Address retrieval
 * ✅ Network configuration
 */

import { Lucid, Blockfrost } from "@lucid-evolution/lucid";
import { createLucidInstance, connectWallet, getLucidConfig } from "../../lib/lucid-config";

// Test configuration
const TEST_CONFIG = {
  network: "Preprod" as const,
  timeout: 30000, // 30 seconds
  retries: 3
};

async function testLucidInitialization() {
  console.log("🔧 Testing Lucid Evolution Initialization...");
  
  try {
    const config = getLucidConfig();
    console.log(`📡 Network: ${config.network}`);
    console.log(`🔌 Provider: ${config.provider}`);
    console.log(`🔑 API Key: ${config.apiKey ? '***' + config.apiKey.slice(-4) : 'Not set'}`);
    
    const lucid = await createLucidInstance({ network: TEST_CONFIG.network });
    
    console.log("✅ Lucid Evolution initialized successfully");
    console.log(`📍 Network: ${lucid.network}`);
    
    return lucid;
  } catch (error) {
    console.error("❌ Failed to initialize Lucid Evolution:", error);
    throw error;
  }
}

async function testWalletDetection() {
  console.log("\n🔍 Testing Wallet Detection...");
  
  const supportedWallets = ['eternl', 'lace', 'vespr', 'nami', 'flint'];
  const availableWallets: string[] = [];
  
  if (typeof window !== 'undefined' && (window as any).cardano) {
    for (const walletName of supportedWallets) {
      if ((window as any).cardano[walletName]) {
        availableWallets.push(walletName);
        console.log(`✅ ${walletName} wallet detected`);
      } else {
        console.log(`⚠️  ${walletName} wallet not found`);
      }
    }
  } else {
    console.log("⚠️  Running in Node.js environment - wallet detection skipped");
    console.log("💡 This test should be run in a browser environment with CIP-30 wallets");
    return [];
  }
  
  if (availableWallets.length === 0) {
    console.log("❌ No CIP-30 wallets detected");
    console.log("💡 Please install Eternl, Lace, or Vespr wallet to continue");
  }
  
  return availableWallets;
}

async function testWalletConnection(lucid: Lucid) {
  console.log("\n🔗 Testing Wallet Connection...");
  
  if (typeof window === 'undefined') {
    console.log("⚠️  Skipping wallet connection test in Node.js environment");
    console.log("💡 Run this test in a browser with a CIP-30 wallet installed");
    return null;
  }
  
  try {
    // Try to connect to the first available wallet
    const availableWallets = await testWalletDetection();
    
    if (availableWallets.length === 0) {
      throw new Error("No wallets available for testing");
    }
    
    const walletName = availableWallets[0];
    console.log(`🔌 Attempting to connect to ${walletName}...`);
    
    // Enable wallet
    const walletApi = (window as any).cardano[walletName];
    const api = await walletApi.enable();
    
    // Connect to Lucid
    lucid.selectWallet.fromAPI(api);

    // Get wallet address using correct Lucid Evolution API
    const address = await lucid.wallet().address();
    console.log(`✅ Connected to ${walletName} wallet`);
    console.log(`📍 Address: ${address}`);
    
    // Validate address format
    if (address.startsWith('addr_test') || address.startsWith('addr1')) {
      console.log("✅ Address format is valid");
    } else {
      console.log("⚠️  Unexpected address format");
    }
    
    return { walletName, address, api };
  } catch (error) {
    console.error("❌ Wallet connection failed:", error);
    console.log("💡 Make sure you have a CIP-30 wallet installed and unlocked");
    throw error;
  }
}

async function testWalletInfo(lucid: Lucid) {
  console.log("\n📊 Testing Wallet Information Retrieval...");
  
  try {
    // Get UTxOs using correct Lucid Evolution API
    const utxos = await lucid.wallet().getUtxos();
    console.log(`💰 UTxOs found: ${utxos.length}`);

    // Calculate total ADA
    let totalAda = 0n;
    let totalAssets = 0;

    for (const utxo of utxos) {
      totalAda += utxo.assets.lovelace || 0n;
      totalAssets += Object.keys(utxo.assets).length - 1; // Exclude lovelace
    }

    console.log(`💎 Total ADA: ${Number(totalAda) / 1_000_000} ADA`);
    console.log(`🎯 Total Native Assets: ${totalAssets}`);

    // Get change address using correct Lucid Evolution API
    const changeAddress = await lucid.wallet().address();
    console.log(`🔄 Change Address: ${changeAddress}`);
    
    // Get reward address (if available)
    try {
      const rewardAddress = await lucid.wallet().rewardAddress();
      if (rewardAddress) {
        console.log(`🏆 Reward Address: ${rewardAddress}`);
      }
    } catch (error) {
      console.log("⚠️  Reward address not available");
    }
    
    console.log("✅ Wallet information retrieved successfully");
    
    return {
      utxoCount: utxos.length,
      totalAda: Number(totalAda) / 1_000_000,
      totalAssets,
      address: changeAddress
    };
  } catch (error) {
    console.error("❌ Failed to retrieve wallet information:", error);
    throw error;
  }
}

async function runWalletConnectionTest() {
  console.log("🚀 PuckSwap v5 - Wallet Connection Test\n");
  console.log("=" .repeat(50));
  
  try {
    // Step 1: Initialize Lucid
    const lucid = await testLucidInitialization();
    
    // Step 2: Detect available wallets
    const availableWallets = await testWalletDetection();
    
    // Step 3: Connect to wallet (browser only)
    const connectionResult = await testWalletConnection(lucid);
    
    // Step 4: Get wallet information (if connected)
    if (connectionResult) {
      const walletInfo = await testWalletInfo(lucid);
      
      console.log("\n🎉 Test Summary:");
      console.log("=" .repeat(30));
      console.log(`✅ Lucid Evolution: Initialized`);
      console.log(`✅ Wallet: ${connectionResult.walletName}`);
      console.log(`✅ Address: ${connectionResult.address.slice(0, 20)}...`);
      console.log(`✅ UTxOs: ${walletInfo.utxoCount}`);
      console.log(`✅ Balance: ${walletInfo.totalAda} ADA`);
      console.log(`✅ Assets: ${walletInfo.totalAssets}`);
    } else {
      console.log("\n🎉 Test Summary:");
      console.log("=" .repeat(30));
      console.log(`✅ Lucid Evolution: Initialized`);
      console.log(`⚠️  Wallet Connection: Skipped (Node.js environment)`);
    }
    
    console.log("\n✅ Wallet connection test completed successfully!");
    
  } catch (error) {
    console.error("\n❌ Wallet connection test failed:", error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runWalletConnectionTest();
}

export { runWalletConnectionTest, testLucidInitialization, testWalletConnection };
