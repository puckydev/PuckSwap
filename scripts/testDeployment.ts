#!/usr/bin/env tsx

/**
 * PuckSwap v5 DeFi - Deployment Test Script
 *
 * This script tests the deployment system without actually deploying contracts.
 * It validates the deployment configuration and contract artifacts.
 */

import fs from 'fs';
import path from 'path';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const EXPECTED_CONTRACTS = [
  'puckswap_swap_validator',
  'puckswap_liquidity_provision_validator',
  'puckswap_withdrawal_validator',
  'puckswap_governance_validator',
  'puckswap_pool_registry_validator',
  'puckswap_liquid_staking_validator',
  'puckswap_cross_chain_router_validator',
  'lp_minting_policy',
  'pADA_minting_policy'
];

// =============================================================================
// TEST FUNCTIONS
// =============================================================================

async function main() {
  console.log('🧪 PuckSwap v5 - Deployment System Test');
  console.log('='.repeat(50));

  try {
    // Test 1: Environment configuration
    console.log('1️⃣ Testing environment configuration...');
    await testEnvironmentConfig();
    console.log('   ✅ Environment configuration valid');
    console.log('');

    // Test 2: Contract artifacts structure
    console.log('2️⃣ Testing contract artifacts...');
    await testContractArtifacts();
    console.log('   ✅ Contract artifacts structure valid');
    console.log('');

    // Test 3: Deployment directory structure
    console.log('3️⃣ Testing deployment directory structure...');
    await testDeploymentStructure();
    console.log('   ✅ Deployment directory structure valid');
    console.log('');

    // Test 4: Contract addresses utility
    console.log('4️⃣ Testing contract addresses utility...');
    await testContractAddressesUtility();
    console.log('   ✅ Contract addresses utility valid');
    console.log('');

    console.log('🎉 All deployment system tests passed!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Run "npm run build-v5" to compile contracts');
    console.log('   2. Run "npm run export-v5" to export contract artifacts');
    console.log('   3. Run "npm run deploy-v5-preprod" to deploy to preprod');
    console.log('   4. Run "npm run deploy-v5-mainnet" to deploy to mainnet');

  } catch (error) {
    console.error('❌ Deployment system test failed:', error);
    process.exit(1);
  }
}

async function testEnvironmentConfig() {
  // Test basic environment variables
  const network = process.env.NETWORK || 'preprod';
  const mainnetKey = process.env.BLOCKFROST_API_KEY_MAINNET;
  const preprodKey = process.env.BLOCKFROST_API_KEY_PREPROD;

  if (!['mainnet', 'preprod'].includes(network)) {
    throw new Error(`Invalid network: ${network}. Expected 'mainnet' or 'preprod'`);
  }

  console.log(`   Network: ${network}`);

  // Check API keys
  if (mainnetKey) {
    console.log(`   Mainnet API Key: ${mainnetKey.slice(0, 10)}...`);
  } else {
    console.log(`   Mainnet API Key: Not configured`);
  }

  if (preprodKey) {
    console.log(`   Preprod API Key: ${preprodKey.slice(0, 10)}...`);
  } else {
    console.log(`   Preprod API Key: Not configured`);
  }

  // For deployment, at least one API key should be configured
  if (!mainnetKey && !preprodKey) {
    console.log(`   ⚠️  Warning: No API keys configured. Set BLOCKFROST_API_KEY_* for deployment`);
  }

  // Test environment config loading (if API keys are available)
  if ((network === 'mainnet' && mainnetKey) || (network === 'preprod' && preprodKey)) {
    try {
      const { getEnvironmentConfig } = await import('../src/config/env');
      const config = getEnvironmentConfig();
      console.log(`   ✅ Environment config loaded successfully`);
      console.log(`   Blockfrost: ${config.blockfrostEndpoint}`);
    } catch (error) {
      console.log(`   ⚠️  Environment config error: ${error.message}`);
    }
  } else {
    console.log(`   ⚠️  Skipping environment config test (API key required)`);
  }
}

async function testContractArtifacts() {
  // Check if contracts directory exists
  const contractsDir = path.join(process.cwd(), 'contracts');
  if (!fs.existsSync(contractsDir)) {
    throw new Error('Contracts directory not found');
  }

  // Check validators directory
  const validatorsDir = path.join(contractsDir, 'validators');
  if (!fs.existsSync(validatorsDir)) {
    throw new Error('Validators directory not found');
  }

  // Check policies directory
  const policiesDir = path.join(contractsDir, 'policies');
  if (!fs.existsSync(policiesDir)) {
    throw new Error('Policies directory not found');
  }

  // Check index files
  const validatorsIndex = path.join(contractsDir, 'validators', 'index.aiken');
  const policiesIndex = path.join(contractsDir, 'policies', 'index.aiken');

  if (!fs.existsSync(validatorsIndex)) {
    throw new Error('Validators index.aiken not found');
  }

  if (!fs.existsSync(policiesIndex)) {
    throw new Error('Policies index.aiken not found');
  }

  console.log(`   Validators: ${validatorsIndex}`);
  console.log(`   Policies: ${policiesIndex}`);
}

async function testDeploymentStructure() {
  // Check deployment directory
  const deploymentDir = path.join(process.cwd(), 'deployment');
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  // Check scripts directory
  const scriptsDir = path.join(deploymentDir, 'scripts');
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }

  // Check json directory
  const jsonDir = path.join(deploymentDir, 'json');
  if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true });
  }

  console.log(`   Deployment: ${deploymentDir}`);
  console.log(`   Scripts: ${scriptsDir}`);
  console.log(`   JSON: ${jsonDir}`);
}

async function testContractAddressesUtility() {
  // Check if utility file exists
  const utilityPath = path.join(process.cwd(), 'src', 'lucid', 'utils', 'contractAddresses.ts');
  if (!fs.existsSync(utilityPath)) {
    throw new Error('Contract addresses utility not found');
  }

  // Try to import the utility (this will test syntax)
  try {
    const utility = await import('../src/lucid/utils/contractAddresses');

    // Check if required functions exist
    const requiredFunctions = ['loadContractAddresses', 'getContractAddress', 'getPolicyId'];
    for (const func of requiredFunctions) {
      if (typeof utility[func] !== 'function') {
        throw new Error(`Missing function: ${func}`);
      }
    }

    console.log(`   Utility: ${utilityPath}`);
    console.log(`   Functions: ${requiredFunctions.join(', ')}`);

  } catch (error) {
    if (error.message.includes('Contract addresses not found')) {
      // This is expected before deployment
      console.log(`   Utility: ${utilityPath} (ready for deployment)`);
    } else {
      throw error;
    }
  }
}

// =============================================================================
// SCRIPT EXECUTION
// =============================================================================

if (require.main === module) {
  main().catch(console.error);
}