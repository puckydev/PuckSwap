#!/usr/bin/env tsx

/**
 * PuckSwap tPUCKY Integration Example
 * 
 * This example demonstrates how to use the minted tPUCKY tokens
 * with PuckSwap's AMM functionality for testing and development.
 * 
 * Prerequisites:
 * 1. Run mint-tPucky.ts to mint test tokens
 * 2. Ensure wallet has both ADA and tPUCKY tokens
 * 3. PuckSwap contracts deployed on Preprod
 * 
 * Usage:
 *   npx tsx scripts/example-tPucky-integration.ts --seed-file ./wallet.seed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Lucid Evolution imports
import {
  Lucid,
  UTxO,
  Assets,
  fromText,
  toHex
} from "@lucid-evolution/lucid";

// PuckSwap imports
import { createLucidInstance } from "../src/lib/lucid-config";
import { getEnvironmentConfig } from "../src/lib/environment-config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEPLOYMENT_ADDRESSES_PATH = path.join(PROJECT_ROOT, 'deployment', 'addresses.json');

// Standard test amounts for PuckSwap
const TEST_AMOUNTS = {
  ADA_FOR_LIQUIDITY: 100_000_000n,      // 100 ADA
  TPUCKY_FOR_LIQUIDITY: 2_301_952n,     // tPUCKY equivalent (100 ADA worth)
  ADA_FOR_SWAP: 10_000_000n,            // 10 ADA
  TPUCKY_FOR_SWAP: 230_195n             // tPUCKY equivalent (10 ADA worth)
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Load tPUCKY token information from deployment addresses
 */
function loadTPuckyInfo(): {
  policyId: string;
  assetUnit: string;
  assetName: string;
} {
  if (!fs.existsSync(DEPLOYMENT_ADDRESSES_PATH)) {
    throw new Error('❌ Deployment addresses file not found. Run mint-tPucky.ts first.');
  }
  
  const content = fs.readFileSync(DEPLOYMENT_ADDRESSES_PATH, 'utf-8');
  const addresses = JSON.parse(content);
  
  if (!addresses.testTokens?.tPucky?.assetUnit) {
    throw new Error('❌ tPUCKY token not found. Run mint-tPucky.ts first.');
  }
  
  const tPucky = addresses.testTokens.tPucky;
  
  return {
    policyId: tPucky.policyId,
    assetUnit: tPucky.assetUnit,
    assetName: tPucky.assetName
  };
}

/**
 * Get wallet balance including tPUCKY tokens
 */
async function getWalletBalance(lucid: Lucid, tPuckyUnit: string): Promise<{
  ada: bigint;
  tPucky: bigint;
  hasEnoughForLiquidity: boolean;
  hasEnoughForSwap: boolean;
}> {
  const utxos = await lucid.wallet.getUtxos();
  let ada = 0n;
  let tPucky = 0n;
  
  for (const utxo of utxos) {
    ada += utxo.assets.lovelace || 0n;
    if (utxo.assets[tPuckyUnit]) {
      tPucky += utxo.assets[tPuckyUnit];
    }
  }
  
  return {
    ada,
    tPucky,
    hasEnoughForLiquidity: ada >= TEST_AMOUNTS.ADA_FOR_LIQUIDITY && tPucky >= TEST_AMOUNTS.TPUCKY_FOR_LIQUIDITY,
    hasEnoughForSwap: ada >= TEST_AMOUNTS.ADA_FOR_SWAP || tPucky >= TEST_AMOUNTS.TPUCKY_FOR_SWAP
  };
}

/**
 * Display integration examples
 */
function displayIntegrationExamples(tPuckyInfo: any): void {
  console.log('\n📋 PuckSwap Integration Examples');
  console.log('='.repeat(50));
  
  console.log('\n🏊 Liquidity Pool Creation:');
  console.log('```typescript');
  console.log('const addLiquidityParams = {');
  console.log(`  adaAmount: ${TEST_AMOUNTS.ADA_FOR_LIQUIDITY}n, // 100 ADA`);
  console.log(`  tokenAmount: ${TEST_AMOUNTS.TPUCKY_FOR_LIQUIDITY}n, // tPUCKY tokens`);
  console.log(`  tokenUnit: "${tPuckyInfo.assetUnit}",`);
  console.log('  slippageTolerance: 0.5 // 0.5%');
  console.log('};');
  console.log('```');
  
  console.log('\n🔄 ADA → tPUCKY Swap:');
  console.log('```typescript');
  console.log('const swapParams = {');
  console.log('  fromAsset: "lovelace",');
  console.log(`  toAsset: "${tPuckyInfo.assetUnit}",`);
  console.log(`  amount: ${TEST_AMOUNTS.ADA_FOR_SWAP}n, // 10 ADA`);
  console.log('  slippageTolerance: 1.0 // 1%');
  console.log('};');
  console.log('```');
  
  console.log('\n🔄 tPUCKY → ADA Swap:');
  console.log('```typescript');
  console.log('const swapParams = {');
  console.log(`  fromAsset: "${tPuckyInfo.assetUnit}",`);
  console.log('  toAsset: "lovelace",');
  console.log(`  amount: ${TEST_AMOUNTS.TPUCKY_FOR_SWAP}n, // tPUCKY tokens`);
  console.log('  slippageTolerance: 1.0 // 1%');
  console.log('};');
  console.log('```');
  
  console.log('\n🎯 Token Selection in Frontend:');
  console.log('```typescript');
  console.log('const tokenList = [');
  console.log('  {');
  console.log('    symbol: "ADA",');
  console.log('    name: "Cardano",');
  console.log('    unit: "lovelace",');
  console.log('    decimals: 6');
  console.log('  },');
  console.log('  {');
  console.log(`    symbol: "${tPuckyInfo.assetName}",`);
  console.log('    name: "Test PUCKY Token",');
  console.log(`    unit: "${tPuckyInfo.assetUnit}",`);
  console.log('    decimals: 0');
  console.log('  }');
  console.log('];');
  console.log('```');
}

/**
 * Parse command line arguments
 */
function parseArguments(): { seedFile?: string; help: boolean } {
  const args = process.argv.slice(2);
  const result = { seedFile: undefined as string | undefined, help: false };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--seed-file':
        result.seedFile = args[++i];
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
    }
  }
  
  return result;
}

/**
 * Display help information
 */
function displayHelp(): void {
  console.log(`
Usage: npx tsx scripts/example-tPucky-integration.ts [OPTIONS]

Options:
  --seed-file <path>    Path to wallet seed phrase file
  --help, -h           Show this help message

Examples:
  # Show integration examples with wallet balance
  npx tsx scripts/example-tPucky-integration.ts --seed-file ./wallet.seed

  # Show integration examples only
  npx tsx scripts/example-tPucky-integration.ts

Prerequisites:
  1. Run mint-tPucky.ts to mint test tokens first
  2. Ensure wallet has both ADA and tPUCKY tokens
  3. PuckSwap contracts deployed on Preprod testnet
`);
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🪙 PuckSwap tPUCKY Integration Example');
    console.log('='.repeat(60));
    
    const args = parseArguments();
    
    if (args.help) {
      displayHelp();
      return;
    }
    
    // Load tPUCKY token information
    console.log('📋 Loading tPUCKY token information...');
    const tPuckyInfo = loadTPuckyInfo();
    
    console.log(`✅ tPUCKY Token Found:`);
    console.log(`   Asset Name: ${tPuckyInfo.assetName}`);
    console.log(`   Policy ID: ${tPuckyInfo.policyId}`);
    console.log(`   Asset Unit: ${tPuckyInfo.assetUnit}`);
    
    // If seed file provided, check wallet balance
    if (args.seedFile) {
      console.log('\n🔍 Checking wallet balance...');
      
      // Load seed phrase
      if (!fs.existsSync(args.seedFile)) {
        throw new Error(`❌ Seed file not found: ${args.seedFile}`);
      }
      
      const seedPhrase = fs.readFileSync(args.seedFile, 'utf-8').trim();
      
      // Initialize Lucid and wallet
      const lucid = await createLucidInstance({ network: "Preprod" });
      lucid.selectWallet.fromSeed(seedPhrase);
      
      const walletAddress = await lucid.wallet().address();
      console.log(`📍 Wallet Address: ${walletAddress}`);
      
      // Get balance
      const balance = await getWalletBalance(lucid, tPuckyInfo.assetUnit);
      
      console.log(`\n💰 Current Balance:`);
      console.log(`   ADA: ${Number(balance.ada) / 1_000_000} ADA`);
      console.log(`   tPUCKY: ${balance.tPucky.toLocaleString()} tokens`);
      
      // Check readiness for different operations
      console.log(`\n🎯 Readiness Check:`);
      console.log(`   Liquidity Provision: ${balance.hasEnoughForLiquidity ? '✅ Ready' : '❌ Need more tokens'}`);
      console.log(`   Token Swaps: ${balance.hasEnoughForSwap ? '✅ Ready' : '❌ Need more tokens'}`);
      
      if (!balance.hasEnoughForLiquidity && !balance.hasEnoughForSwap) {
        console.log(`\n⚠️  Insufficient tokens for testing. Consider:`);
        console.log(`   - Getting more testnet ADA from faucet`);
        console.log(`   - Running mint-tPucky.ts again if policy expired`);
      }
    }
    
    // Display integration examples
    displayIntegrationExamples(tPuckyInfo);
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Use the code examples above in your PuckSwap integration');
    console.log('2. Test liquidity provision with the provided amounts');
    console.log('3. Test bidirectional swaps (ADA ↔ tPUCKY)');
    console.log('4. Verify transactions on Cardano Preprod explorer');
    console.log('5. Monitor pool state changes in PuckSwap interface');
    
    console.log('\n📚 Documentation:');
    console.log('- PuckSwap AMM Guide: /docs/amm-guide.md');
    console.log('- Liquidity Provision: /docs/liquidity-provision.md');
    console.log('- Token Swaps: /docs/token-swaps.md');
    console.log('- Testing Guide: /docs/testing-guide.md');
    
  } catch (error) {
    console.error('\n❌ Integration example failed:', error);
    
    if (error instanceof Error && error.message.includes('tPUCKY token not found')) {
      console.log('\n💡 Solution: Run the minting script first:');
      console.log('   npx tsx scripts/mint-tPucky.ts --seed-file ./wallet.seed');
    }
    
    process.exit(1);
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}
