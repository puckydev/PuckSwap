#!/usr/bin/env tsx

/**
 * PuckSwap tPUCKY Test Token Sending Script
 * 
 * Production-ready script for sending tPUCKY test tokens to specified addresses on Cardano Preprod testnet
 * Uses Lucid Evolution with comprehensive validation and error handling
 * 
 * Features:
 * - Lucid Evolution integration with Blockfrost API
 * - Support for both seed phrase and CIP-30 wallet connection
 * - Automatic tPUCKY token detection from deployment/addresses.json
 * - Comprehensive error handling and transaction confirmation
 * - Balance checking before and after sending
 * - Address validation for Preprod testnet compatibility
 * - Configurable send amounts with reasonable defaults
 * 
 * Usage:
 *   # Send default amount (1000 tPUCKY) with seed phrase
 *   npx tsx scripts/send-tPucky.ts --seed-file ./wallet.seed
 * 
 *   # Send custom amount with seed phrase
 *   npx tsx scripts/send-tPucky.ts --seed-file ./wallet.seed --amount 5000
 * 
 *   # Send with CIP-30 wallet
 *   npx tsx scripts/send-tPucky.ts --wallet eternl --amount 2500
 * 
 *   # Check balance only
 *   npx tsx scripts/send-tPucky.ts --check-balance --seed-file ./wallet.seed
 * 
 * Security:
 * - Never commit wallet seeds to version control
 * - Validates recipient address format and network compatibility
 * - Testnet-only usage with clear warnings
 * - Proper UTxO selection and change handling
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
  UTxO,
  TxHash,
  Address,
  Assets,
  Unit,
  TxComplete,
  fromText,
  toHex,
  toUnit
} from "@lucid-evolution/lucid";

// PuckSwap imports
import { getEnvironmentConfig } from "../src/lib/environment-config";
import { createLucidInstance, connectWallet } from "../src/lib/lucid-config";

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

const DEFAULT_SEND_AMOUNT = 1000n; // Default 1000 tPUCKY tokens
const RECIPIENT_ADDRESS = "addr_test1qqq60q7g2sy072x8wwaa9yc3zmtjqzch7qdxnm8az55zk2yxezjfvsmmgxex52k4mj5nk2zzmtps6snh069v9wxlrtvqwke3k0";
const MIN_ADA_FOR_SENDING = 3_000_000n; // 3 ADA minimum for transaction fees
const MIN_ADA_WITH_TOKEN = 2_000_000n; // 2 ADA minimum to send with token

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

interface SendingResult {
  success: boolean;
  txHash?: string;
  sentAmount?: bigint;
  recipientAddress?: string;
  error?: string;
}

interface WalletBalance {
  ada: bigint;
  tPucky: bigint;
  totalAssets: number;
  hasEnoughAda: boolean;
  hasEnoughTPucky: boolean;
}

interface TPuckyTokenInfo {
  policyId: string;
  assetUnit: string;
  assetName: string;
  totalSupply: string;
  mintedAt: string;
}

interface DeploymentAddresses {
  network: string;
  testTokens?: {
    tPucky: TPuckyTokenInfo;
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
  console.log('📤 PuckSwap tPUCKY Test Token Sending Script');
  console.log('='.repeat(80));
  console.log('⚠️  TESTNET ONLY - DO NOT USE ON MAINNET');
  console.log('🎯 Sending tPUCKY tokens to test address');
  console.log(`📍 Recipient: ${RECIPIENT_ADDRESS.substring(0, 20)}...`);
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
 * Load tPUCKY token information from deployment addresses
 */
function loadTPuckyTokenInfo(): TPuckyTokenInfo {
  if (!fs.existsSync(DEPLOYMENT_ADDRESSES_PATH)) {
    throw new Error(`❌ Deployment addresses file not found: ${DEPLOYMENT_ADDRESSES_PATH}`);
  }
  
  const content = fs.readFileSync(DEPLOYMENT_ADDRESSES_PATH, 'utf-8');
  const addresses: DeploymentAddresses = JSON.parse(content);
  
  if (!addresses.testTokens?.tPucky?.assetUnit) {
    throw new Error('❌ tPUCKY token not found in deployment addresses. Run mint-tPucky.ts first.');
  }
  
  const tPucky = addresses.testTokens.tPucky;
  
  console.log('✅ tPUCKY token information loaded:');
  console.log(`   Asset Name: ${tPucky.assetName}`);
  console.log(`   Policy ID: ${tPucky.policyId}`);
  console.log(`   Asset Unit: ${tPucky.assetUnit}`);
  console.log(`   Total Supply: ${Number(tPucky.totalSupply).toLocaleString()}`);
  
  return tPucky;
}

/**
 * Validate recipient address for Preprod testnet
 */
function validateRecipientAddress(address: string): void {
  console.log('🔍 Validating recipient address...');
  
  // Check if address starts with addr_test (Preprod testnet prefix)
  if (!address.startsWith('addr_test1')) {
    throw new Error('❌ Invalid recipient address. Must be a Preprod testnet address (addr_test1...)');
  }
  
  // Check address length (typical Cardano address length)
  if (address.length < 50 || address.length > 120) {
    throw new Error('❌ Invalid recipient address length');
  }
  
  console.log(`✅ Recipient address validated: ${address.substring(0, 20)}...`);
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
 * Get current wallet balance including tPUCKY tokens
 */
async function getWalletBalance(lucid: Lucid, tPuckyUnit: string, requiredAmount: bigint): Promise<WalletBalance> {
  const utxos = await lucid.wallet.getUtxos();
  let ada = 0n;
  let tPucky = 0n;
  let totalAssets = 0;
  
  for (const utxo of utxos) {
    ada += utxo.assets.lovelace || 0n;
    
    if (utxo.assets[tPuckyUnit]) {
      tPucky += utxo.assets[tPuckyUnit];
    }
    
    totalAssets += Object.keys(utxo.assets).length - 1; // Exclude ADA
  }
  
  return {
    ada,
    tPucky,
    totalAssets,
    hasEnoughAda: ada >= MIN_ADA_FOR_SENDING,
    hasEnoughTPucky: tPucky >= requiredAmount
  };
}

/**
 * Display wallet balance in a formatted way
 */
function displayBalance(balance: WalletBalance, label: string): void {
  console.log(`\n💰 ${label}:`);
  console.log(`   ADA: ${Number(balance.ada) / 1_000_000} ADA`);
  console.log(`   tPUCKY: ${balance.tPucky.toLocaleString()} tokens`);
  console.log(`   Other Assets: ${balance.totalAssets}`);
  console.log(`   Ready to Send: ${balance.hasEnoughAda && balance.hasEnoughTPucky ? '✅ Yes' : '❌ No'}`);
}

/**
 * Parse command line arguments
 */
function parseArguments(): {
  seedFile?: string;
  walletName?: string;
  amount?: bigint;
  checkBalanceOnly: boolean;
  help: boolean;
} {
  const args = process.argv.slice(2);
  const result = {
    seedFile: undefined as string | undefined,
    walletName: undefined as string | undefined,
    amount: undefined as bigint | undefined,
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
      case '--amount':
        const amountStr = args[++i];
        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount <= 0) {
          throw new Error(`❌ Invalid amount: ${amountStr}. Must be a positive integer.`);
        }
        result.amount = BigInt(amount);
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
Usage: npx tsx scripts/send-tPucky.ts [OPTIONS]

Options:
  --seed-file <path>    Path to wallet seed phrase file
  --wallet <name>       CIP-30 wallet name (eternl, nami, vespr, lace)
  --amount <number>     Amount of tPUCKY tokens to send (default: 1000)
  --check-balance       Only check current balance, don't send
  --help, -h           Show this help message

Examples:
  # Send default amount (1000 tPUCKY) with seed phrase
  npx tsx scripts/send-tPucky.ts --seed-file ./wallet.seed

  # Send custom amount with seed phrase
  npx tsx scripts/send-tPucky.ts --seed-file ./wallet.seed --amount 5000

  # Send with CIP-30 wallet
  npx tsx scripts/send-tPucky.ts --wallet eternl --amount 2500

  # Check balance only
  npx tsx scripts/send-tPucky.ts --check-balance --seed-file ./wallet.seed

Recipient Address:
  ${RECIPIENT_ADDRESS}

Security Notes:
  - Never commit wallet seed files to version control
  - Use .gitignore to exclude *.seed files
  - This script is for TESTNET ONLY
  - Validates recipient address for Preprod network compatibility
`);
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
 * Perform the actual token sending
 */
async function sendTokens(
  lucid: Lucid,
  tPuckyInfo: TPuckyTokenInfo,
  amount: bigint
): Promise<SendingResult> {
  try {
    console.log('\n📤 Starting token sending process...');
    console.log(`   Amount: ${amount.toLocaleString()} tPUCKY`);
    console.log(`   Recipient: ${RECIPIENT_ADDRESS}`);

    // Check wallet balance before sending
    const balanceBefore = await getWalletBalance(lucid, tPuckyInfo.assetUnit, amount);
    displayBalance(balanceBefore, 'Balance Before Sending');

    // Validate sufficient balances
    if (!balanceBefore.hasEnoughAda) {
      throw new Error(`❌ Insufficient ADA. Required: ${Number(MIN_ADA_FOR_SENDING) / 1_000_000} ADA`);
    }

    if (!balanceBefore.hasEnoughTPucky) {
      throw new Error(`❌ Insufficient tPUCKY tokens. Required: ${amount.toLocaleString()}, Available: ${balanceBefore.tPucky.toLocaleString()}`);
    }

    // Build sending transaction
    console.log('\n🔨 Building sending transaction...');

    // Create assets to send (tPUCKY tokens + minimum ADA)
    const assetsToSend: Assets = {
      lovelace: MIN_ADA_WITH_TOKEN,
      [tPuckyInfo.assetUnit]: amount
    };

    const tx = await lucid
      .newTx()
      .payToAddress(RECIPIENT_ADDRESS, assetsToSend)
      .complete();

    console.log(`💰 Transaction fee: ${Number(tx.fee) / 1_000_000} ADA`);
    console.log(`📦 Sending: ${amount.toLocaleString()} tPUCKY + ${Number(MIN_ADA_WITH_TOKEN) / 1_000_000} ADA`);

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
      // Check balance after sending
      const balanceAfter = await getWalletBalance(lucid, tPuckyInfo.assetUnit, 0n);
      displayBalance(balanceAfter, 'Balance After Sending');

      console.log(`\n📊 Transaction Summary:`);
      console.log(`   Sent: ${amount.toLocaleString()} tPUCKY tokens`);
      console.log(`   Remaining: ${balanceAfter.tPucky.toLocaleString()} tPUCKY tokens`);
      console.log(`   Fee: ${Number(tx.fee) / 1_000_000} ADA`);
    }

    return {
      success: true,
      txHash,
      sentAmount: amount,
      recipientAddress: RECIPIENT_ADDRESS
    };

  } catch (error) {
    console.error('❌ Token sending failed:', error);
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

    // Validate recipient address
    validateRecipientAddress(RECIPIENT_ADDRESS);

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

    // Load tPUCKY token information
    console.log('📋 Loading tPUCKY token information...');
    const tPuckyInfo = loadTPuckyTokenInfo();

    // Determine send amount
    const sendAmount = args.amount || DEFAULT_SEND_AMOUNT;
    console.log(`💰 Send Amount: ${sendAmount.toLocaleString()} tPUCKY tokens`);

    // Initialize Lucid Evolution
    console.log('\n🚀 Initializing Lucid Evolution...');
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
      const balance = await getWalletBalance(lucid, tPuckyInfo.assetUnit, sendAmount);
      displayBalance(balance, 'Current Wallet Balance');

      if (balance.hasEnoughAda && balance.hasEnoughTPucky) {
        console.log('\n✅ Wallet ready for sending tokens');
        console.log(`   Can send: ${sendAmount.toLocaleString()} tPUCKY tokens`);
        console.log(`   Recipient: ${RECIPIENT_ADDRESS.substring(0, 20)}...`);
      } else {
        console.log('\n⚠️  Wallet not ready for sending');
        if (!balance.hasEnoughAda) {
          console.log(`   Need more ADA: ${Number(MIN_ADA_FOR_SENDING) / 1_000_000} ADA required`);
        }
        if (!balance.hasEnoughTPucky) {
          console.log(`   Need more tPUCKY: ${sendAmount.toLocaleString()} tokens required`);
        }
      }

      return;
    }

    // Perform token sending
    console.log('\n🎯 Starting tPUCKY token sending...');
    const result = await sendTokens(lucid, tPuckyInfo, sendAmount);

    if (result.success) {
      console.log('\n🎉 SUCCESS! tPUCKY tokens sent successfully');
      console.log('='.repeat(80));
      console.log(`📤 Sent: ${result.sentAmount?.toLocaleString()} tPUCKY tokens`);
      console.log(`📍 To: ${result.recipientAddress}`);
      console.log(`📋 Transaction: ${result.txHash}`);
      console.log(`🔗 Explorer: https://preprod.cardanoscan.io/transaction/${result.txHash}`);
      console.log('='.repeat(80));
      console.log('\n📋 Next Steps:');
      console.log('1. Verify transaction on Cardano Preprod explorer');
      console.log('2. Recipient can now use tPUCKY tokens for testing');
      console.log('3. Check recipient balance to confirm receipt');
      console.log('4. Use tokens for PuckSwap DEX testing scenarios');
    } else {
      console.error('\n❌ FAILED! Token sending unsuccessful');
      console.error(`Error: ${result.error}`);

      if (result.error?.includes('tPUCKY token not found')) {
        console.log('\n💡 Solution: Run the minting script first:');
        console.log('   npx tsx scripts/mint-tPucky.ts --seed-file ./wallet.seed');
      } else if (result.error?.includes('Insufficient')) {
        console.log('\n💡 Solutions:');
        console.log('   - Get more testnet ADA from Cardano faucet');
        console.log('   - Mint more tPUCKY tokens if needed');
        console.log('   - Reduce the send amount');
      }

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
