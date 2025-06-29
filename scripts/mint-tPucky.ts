#!/usr/bin/env tsx

/**
 * PuckSwap tPUCKY Test Token Minting Script
 * 
 * Production-ready script for minting 1 billion tPUCKY test tokens on Cardano Preprod testnet
 * Uses Lucid Evolution with time-locked native script policy for security
 * 
 * Features:
 * - Lucid Evolution integration with Blockfrost API
 * - Time-locked native script (1 hour expiry) for security
 * - Support for both seed phrase and CIP-30 wallet connection
 * - Comprehensive error handling and transaction confirmation
 * - Balance checking before and after minting
 * - Automatic policy ID storage in deployment/addresses.json
 * 
 * Usage:
 *   # With seed phrase file
 *   npx tsx scripts/mint-tPucky.ts --seed-file ./wallet.seed
 * 
 *   # With CIP-30 wallet (requires browser environment)
 *   npx tsx scripts/mint-tPucky.ts --wallet eternl
 * 
 *   # Check existing balance only
 *   npx tsx scripts/mint-tPucky.ts --check-balance --seed-file ./wallet.seed
 * 
 * Security:
 * - Never commit wallet seeds to version control
 * - Time-locked policy prevents unauthorized future minting
 * - Testnet-only usage with clear warnings
 * 
 * @author PuckSwap Development Team
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Lucid Evolution imports
import {
  Lucid,
  Blockfrost,
  Data,
  UTxO,
  TxHash,
  Address,
  Assets,
  PolicyId,
  Unit,
  TxComplete,
  NativeScript,
  fromText,
  toHex,
  fromHex,
  toUnit,
  applyParamsToScript,
  SpendingValidator,
  MintingPolicy
} from "@lucid-evolution/lucid";

// PuckSwap imports
import { getEnvironmentConfig, ENV_CONFIG } from "../src/lib/environment-config";
import { createLucidInstance, connectWallet } from "../src/lib/lucid-config";

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

const MINT_AMOUNT = 1_000_000_000n; // 1 billion tPUCKY tokens
const ASSET_NAME = "tPUCKY"; // Test PUCKY for Preprod
const ASSET_NAME_HEX = toHex(new TextEncoder().encode(ASSET_NAME));
const POLICY_EXPIRY_HOURS = 1; // 1 hour time lock for security
const MIN_ADA_FOR_MINTING = 5_000_000n; // 5 ADA minimum for transaction fees

// Network validation
const REQUIRED_NETWORK = "Preprod";
const BLOCKFROST_API_KEY = "preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL";

// File paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEPLOYMENT_ADDRESSES_PATH = path.join(PROJECT_ROOT, 'deployment', 'addresses.json');

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

interface MintingResult {
  success: boolean;
  txHash?: string;
  policyId?: string;
  assetUnit?: string;
  mintedAmount?: bigint;
  error?: string;
}

interface WalletBalance {
  ada: bigint;
  tPucky: bigint;
  totalAssets: number;
}

interface DeploymentAddresses {
  network: string;
  deployedAt: string;
  validators: Record<string, string>;
  policies: Record<string, string>;
  addresses: Record<string, string>;
  policyIds: Record<string, string>;
  contracts: Record<string, any>;
  testTokens?: {
    tPucky: {
      policyId: string;
      assetName: string;
      assetNameHex: string;
      assetUnit: string;
      totalSupply: string;
      mintedAt: string;
      expiresAt: string;
    };
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Display script header with warnings
 */
function displayHeader(): void {
  console.log('\n' + '='.repeat(80));
  console.log('🪙  PuckSwap tPUCKY Test Token Minting Script');
  console.log('='.repeat(80));
  console.log('⚠️  TESTNET ONLY - DO NOT USE ON MAINNET');
  console.log('🔒 Time-locked native script policy (1 hour expiry)');
  console.log('💰 Minting 1,000,000,000 tPUCKY tokens');
  console.log('🌐 Network: Cardano Preprod Testnet');
  console.log('='.repeat(80) + '\n');
}

/**
 * Validate environment and network configuration
 */
function validateEnvironment(): void {
  const envConfig = getEnvironmentConfig();
  
  console.log('🔍 Validating environment configuration...');
  console.log(`   Network: ${envConfig.network}`);
  console.log(`   Lucid Network: ${envConfig.lucidNetwork}`);
  console.log(`   API Key: ${envConfig.blockfrostApiKey.substring(0, 8)}...`);
  
  if (envConfig.lucidNetwork !== REQUIRED_NETWORK) {
    throw new Error(`❌ Invalid network: ${envConfig.lucidNetwork}. Required: ${REQUIRED_NETWORK}`);
  }
  
  if (!envConfig.blockfrostApiKey.startsWith('preprod')) {
    throw new Error('❌ Invalid Blockfrost API key for Preprod network');
  }
  
  console.log('✅ Environment validation passed\n');
}

/**
 * Parse command line arguments
 */
function parseArguments(): {
  seedFile?: string;
  walletName?: string;
  checkBalanceOnly: boolean;
  help: boolean;
} {
  const args = process.argv.slice(2);
  const result = {
    seedFile: undefined as string | undefined,
    walletName: undefined as string | undefined,
    checkBalanceOnly: false,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--seed-file':
        result.seedFile = args[++i];
        break;
      case '--wallet':
        result.walletName = args[++i];
        break;
      case '--check-balance':
        result.checkBalanceOnly = true;
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
Usage: npx tsx scripts/mint-tPucky.ts [OPTIONS]

Options:
  --seed-file <path>    Path to wallet seed phrase file
  --wallet <name>       CIP-30 wallet name (eternl, nami, vespr, lace)
  --check-balance       Only check current balance, don't mint
  --help, -h           Show this help message

Examples:
  # Mint with seed phrase file
  npx tsx scripts/mint-tPucky.ts --seed-file ./wallet.seed

  # Mint with CIP-30 wallet
  npx tsx scripts/mint-tPucky.ts --wallet eternl

  # Check balance only
  npx tsx scripts/mint-tPucky.ts --check-balance --seed-file ./wallet.seed

Security Notes:
  - Never commit wallet seed files to version control
  - Use .gitignore to exclude *.seed files
  - This script is for TESTNET ONLY
  - Minting policy expires after 1 hour for security
`);
}

/**
 * Load wallet seed phrase from file
 */
function loadSeedPhrase(seedFile: string): string {
  if (!fs.existsSync(seedFile)) {
    throw new Error(`❌ Seed file not found: ${seedFile}`);
  }

  const seed = fs.readFileSync(seedFile, 'utf-8').trim();

  if (!seed || seed.split(' ').length < 12) {
    throw new Error('❌ Invalid seed phrase format. Expected 12+ words.');
  }

  console.log(`✅ Loaded seed phrase from: ${seedFile}`);
  return seed;
}

/**
 * Create time-locked native script policy
 */
function createTimeLockPolicy(lucid: Lucid, expirySlot: number): { policy: NativeScript; policyId: string } {
  const paymentKeyHash = lucid.utils.getAddressDetails(
    lucid.wallet.address()
  ).paymentCredential?.hash;

  if (!paymentKeyHash) {
    throw new Error('❌ Could not derive payment key hash from wallet');
  }

  // Create time-locked native script
  const policy: NativeScript = {
    type: "all",
    scripts: [
      {
        type: "sig",
        keyHash: paymentKeyHash
      },
      {
        type: "before",
        slot: expirySlot
      }
    ]
  };

  const policyId = lucid.utils.mintingPolicyToId(policy);

  console.log(`🔒 Created time-locked policy: ${policyId}`);
  console.log(`⏰ Expires at slot: ${expirySlot}`);

  return { policy, policyId };
}

/**
 * Get current wallet balance including tPUCKY tokens
 */
async function getWalletBalance(lucid: Lucid, tPuckyUnit?: string): Promise<WalletBalance> {
  const utxos = await lucid.wallet.getUtxos();
  let ada = 0n;
  let tPucky = 0n;
  let totalAssets = 0;

  for (const utxo of utxos) {
    ada += utxo.assets.lovelace || 0n;

    if (tPuckyUnit && utxo.assets[tPuckyUnit]) {
      tPucky += utxo.assets[tPuckyUnit];
    }

    totalAssets += Object.keys(utxo.assets).length - 1; // Exclude ADA
  }

  return { ada, tPucky, totalAssets };
}

/**
 * Display wallet balance in a formatted way
 */
function displayBalance(balance: WalletBalance, label: string): void {
  console.log(`\n💰 ${label}:`);
  console.log(`   ADA: ${Number(balance.ada) / 1_000_000} ADA`);
  console.log(`   tPUCKY: ${balance.tPucky.toLocaleString()} tokens`);
  console.log(`   Other Assets: ${balance.totalAssets}`);
}

/**
 * Load or create deployment addresses configuration
 */
function loadDeploymentAddresses(): DeploymentAddresses {
  if (!fs.existsSync(DEPLOYMENT_ADDRESSES_PATH)) {
    throw new Error(`❌ Deployment addresses file not found: ${DEPLOYMENT_ADDRESSES_PATH}`);
  }

  const content = fs.readFileSync(DEPLOYMENT_ADDRESSES_PATH, 'utf-8');
  return JSON.parse(content);
}

/**
 * Save updated deployment addresses with test token information
 */
function saveTestTokenInfo(
  policyId: string,
  assetUnit: string,
  txHash: string,
  expirySlot: number
): void {
  const addresses = loadDeploymentAddresses();

  // Add test tokens section if it doesn't exist
  if (!addresses.testTokens) {
    addresses.testTokens = {} as any;
  }

  addresses.testTokens.tPucky = {
    policyId,
    assetName: ASSET_NAME,
    assetNameHex: ASSET_NAME_HEX,
    assetUnit,
    totalSupply: MINT_AMOUNT.toString(),
    mintedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + POLICY_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
  };

  // Save updated configuration
  fs.writeFileSync(
    DEPLOYMENT_ADDRESSES_PATH,
    JSON.stringify(addresses, null, 2),
    'utf-8'
  );

  console.log(`✅ Updated deployment addresses with tPUCKY token info`);
  console.log(`   Policy ID: ${policyId}`);
  console.log(`   Asset Unit: ${assetUnit}`);
  console.log(`   Transaction: ${txHash}`);
}

/**
 * Wait for transaction confirmation
 */
async function waitForConfirmation(lucid: Lucid, txHash: string): Promise<boolean> {
  console.log(`⏳ Waiting for transaction confirmation: ${txHash}`);

  const maxAttempts = 30; // 5 minutes with 10-second intervals
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const utxos = await lucid.utxosAt(await lucid.wallet.address());

      // Check if any UTxO contains our transaction
      const confirmed = utxos.some(utxo => utxo.txHash === txHash);

      if (confirmed) {
        console.log(`✅ Transaction confirmed: ${txHash}`);
        return true;
      }

      attempts++;
      console.log(`   Attempt ${attempts}/${maxAttempts} - waiting...`);
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

    } catch (error) {
      console.log(`   Confirmation check failed: ${error}`);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  console.log(`⚠️  Transaction confirmation timeout. Check manually: ${txHash}`);
  return false;
}

/**
 * Perform the actual token minting
 */
async function mintTokens(lucid: Lucid): Promise<MintingResult> {
  try {
    console.log('\n🔨 Starting token minting process...');

    // Get current slot for time lock calculation
    const currentSlot = lucid.currentSlot();
    const expirySlot = currentSlot + (POLICY_EXPIRY_HOURS * 3600); // 1 hour = 3600 slots

    // Create time-locked policy
    const { policy, policyId } = createTimeLockPolicy(lucid, expirySlot);
    const assetUnit = toUnit(policyId, ASSET_NAME_HEX);

    console.log(`🪙 Asset Unit: ${assetUnit}`);

    // Check wallet balance before minting
    const balanceBefore = await getWalletBalance(lucid);
    displayBalance(balanceBefore, 'Balance Before Minting');

    // Validate sufficient ADA for transaction
    if (balanceBefore.ada < MIN_ADA_FOR_MINTING) {
      throw new Error(`❌ Insufficient ADA. Required: ${Number(MIN_ADA_FOR_MINTING) / 1_000_000} ADA`);
    }

    // Build minting transaction
    console.log('\n🔨 Building minting transaction...');
    const tx = await lucid
      .newTx()
      .mintAssets({ [assetUnit]: MINT_AMOUNT })
      .attachMintingPolicy(policy)
      .validTo(Date.now() + (POLICY_EXPIRY_HOURS * 60 * 60 * 1000)) // 1 hour validity
      .complete();

    console.log(`💰 Transaction fee: ${Number(tx.fee) / 1_000_000} ADA`);

    // Sign and submit transaction
    console.log('✍️  Signing transaction...');
    const signedTx = await tx.sign().complete();

    console.log('📡 Submitting transaction...');
    const txHash = await signedTx.submit();

    console.log(`🎉 Transaction submitted successfully!`);
    console.log(`   Transaction Hash: ${txHash}`);
    console.log(`   Explorer: https://preprod.cardanoscan.io/transaction/${txHash}`);

    // Wait for confirmation
    const confirmed = await waitForConfirmation(lucid, txHash);

    if (confirmed) {
      // Check balance after minting
      const balanceAfter = await getWalletBalance(lucid, assetUnit);
      displayBalance(balanceAfter, 'Balance After Minting');

      // Save token information to deployment addresses
      saveTestTokenInfo(policyId, assetUnit, txHash, expirySlot);
    }

    return {
      success: true,
      txHash,
      policyId,
      assetUnit,
      mintedAmount: MINT_AMOUNT
    };

  } catch (error) {
    console.error('❌ Minting failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Main script execution function
 */
async function main(): Promise<void> {
  try {
    displayHeader();

    // Parse command line arguments
    const args = parseArguments();

    if (args.help) {
      displayHelp();
      return;
    }

    // Validate environment
    validateEnvironment();

    // Validate arguments
    if (!args.seedFile && !args.walletName) {
      console.error('❌ Either --seed-file or --wallet must be specified');
      displayHelp();
      process.exit(1);
    }

    if (args.seedFile && args.walletName) {
      console.error('❌ Cannot use both --seed-file and --wallet options');
      process.exit(1);
    }

    // Initialize Lucid Evolution
    console.log('🚀 Initializing Lucid Evolution...');
    const lucid = await createLucidInstance({
      network: "Preprod"
    });

    // Connect wallet
    if (args.seedFile) {
      console.log('🔑 Loading wallet from seed phrase...');
      const seedPhrase = loadSeedPhrase(args.seedFile);
      lucid.selectWallet.fromSeed(seedPhrase);
    } else if (args.walletName) {
      console.log(`🔗 Connecting to ${args.walletName} wallet...`);
      await connectWallet(lucid, args.walletName as any);
    }

    // Get wallet address
    const walletAddress = await lucid.wallet.address();
    console.log(`📍 Wallet Address: ${walletAddress}`);

    // Check if we're only checking balance
    if (args.checkBalanceOnly) {
      console.log('\n🔍 Checking wallet balance...');

      // Try to load existing tPUCKY asset unit
      let tPuckyUnit: string | undefined;
      try {
        const addresses = loadDeploymentAddresses();
        if (addresses.testTokens?.tPucky?.assetUnit) {
          tPuckyUnit = addresses.testTokens.tPucky.assetUnit;
          console.log(`   Found existing tPUCKY asset: ${tPuckyUnit}`);
        }
      } catch (error) {
        console.log('   No existing tPUCKY token configuration found');
      }

      const balance = await getWalletBalance(lucid, tPuckyUnit);
      displayBalance(balance, 'Current Wallet Balance');

      if (balance.tPucky > 0n) {
        console.log('\n✅ tPUCKY tokens found in wallet');
        console.log(`   Ready for PuckSwap DEX testing!`);
      } else {
        console.log('\n⚠️  No tPUCKY tokens found');
        console.log('   Run without --check-balance to mint tokens');
      }

      return;
    }

    // Perform token minting
    console.log('\n🎯 Starting tPUCKY token minting...');
    const result = await mintTokens(lucid);

    if (result.success) {
      console.log('\n🎉 SUCCESS! tPUCKY tokens minted successfully');
      console.log('='.repeat(80));
      console.log(`💰 Minted: ${result.mintedAmount?.toLocaleString()} tPUCKY tokens`);
      console.log(`🆔 Policy ID: ${result.policyId}`);
      console.log(`🪙 Asset Unit: ${result.assetUnit}`);
      console.log(`📋 Transaction: ${result.txHash}`);
      console.log(`🔗 Explorer: https://preprod.cardanoscan.io/transaction/${result.txHash}`);
      console.log('='.repeat(80));
      console.log('\n📋 Next Steps:');
      console.log('1. Verify transaction on Cardano Preprod explorer');
      console.log('2. Use asset unit in PuckSwap liquidity pool testing');
      console.log('3. Test token swaps in PuckSwap DEX interface');
      console.log('4. Asset unit is saved in deployment/addresses.json');
      console.log('\n⚠️  Remember: Minting policy expires in 1 hour for security');
    } else {
      console.error('\n❌ FAILED! Token minting unsuccessful');
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Script execution failed:', error);

    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }

    process.exit(1);
  }
}

// =============================================================================
// SCRIPT EXECUTION
// =============================================================================

// Run the script if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}
