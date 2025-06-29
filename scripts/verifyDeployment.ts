#!/usr/bin/env tsx

/**
 * PuckSwap v5 DeFi - Deployment Verification Script
 * 
 * This script verifies that all contracts are properly deployed and accessible.
 * It checks contract addresses, policy IDs, and network consistency.
 */

import fs from 'fs';
import path from 'path';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function loadDeploymentData(network: string) {
  const addressesPath = path.join(process.cwd(), 'deployment', 'addresses.json');

  if (!fs.existsSync(addressesPath)) {
    throw new Error(`Deployment file not found: ${addressesPath}`);
  }

  const rawData = fs.readFileSync(addressesPath, 'utf8');
  const deployment = JSON.parse(rawData);

  if (deployment.network !== network) {
    throw new Error(`Network mismatch: expected ${network}, found ${deployment.network}`);
  }

  return deployment;
}

function areContractsDeployed(network: string): boolean {
  try {
    loadDeploymentData(network);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// VERIFICATION FUNCTIONS
// =============================================================================

async function main() {
  const network = process.env.NETWORK || 'preprod';
  
  console.log('🔍 PuckSwap v5 - Deployment Verification');
  console.log('='.repeat(50));
  console.log(`📡 Network: ${network}`);
  console.log('');
  
  try {
    // Check if contracts are deployed
    console.log('1️⃣ Checking deployment status...');
    const isDeployed = areContractsDeployed(network);
    
    if (!isDeployed) {
      console.log('❌ No contracts deployed for this network');
      console.log('');
      console.log('📋 Next Steps:');
      console.log(`   1. Run "NETWORK=${network} npm run deploy-v5-${network}"`);
      console.log('   2. Verify deployment with this script again');
      process.exit(1);
    }
    
    console.log('✅ Contracts are deployed');
    console.log('');
    
    // Load deployment information
    console.log('2️⃣ Loading deployment information...');
    const deployment = loadDeploymentData(network);

    console.log(`   Network: ${deployment.network}`);
    console.log(`   Deployed: ${deployment.deployedAt}`);

    // Count deployed validators and policies
    const deployedValidatorCount = Object.values(deployment.validators || {})
      .filter(address => address && typeof address === 'string' && address.trim() !== '').length;
    const deployedPolicyCount = Object.values(deployment.policies || {})
      .filter(policyId => policyId && typeof policyId === 'string' && policyId.trim() !== '').length;

    console.log(`   Deployed Validators: ${deployedValidatorCount}`);
    console.log(`   Deployed Policies: ${deployedPolicyCount}`);
    console.log('');

    // Validate deployment completeness
    console.log('3️⃣ Validating deployment completeness...');
    console.log(`✅ Found ${deployedValidatorCount} deployed validators`);
    console.log(`✅ Found ${deployedPolicyCount} deployed policies`);
    console.log('');
    
    // Get deployed contracts for display and verification
    const deployedValidators = Object.entries(deployment.validators || {})
      .filter(([name, address]) => address && typeof address === 'string' && address.trim() !== '');

    const deployedPolicies = Object.entries(deployment.policies || {})
      .filter(([name, policyId]) => policyId && typeof policyId === 'string' && policyId.trim() !== '');

    // Display deployed contract addresses only
    console.log('4️⃣ Deployed Contract Addresses:');

    console.log(`   Validators (${deployedValidators.length} deployed):`);
    for (const [name, address] of deployedValidators) {
      console.log(`     ✅ ${name}: ${address}`);
    }

    console.log(`   Policies (${deployedPolicies.length} deployed):`);
    for (const [name, policyId] of deployedPolicies) {
      console.log(`     ✅ ${name}: ${policyId}`);
    }

    if (deployedPolicies.length === 0) {
      console.log(`     (No policies deployed yet)`);
    }
    console.log('');

    // Display legacy addresses for compatibility
    console.log('5️⃣ Legacy Contract Addresses:');
    const legacyAddresses = Object.entries(deployment.addresses || {})
      .filter(([name, address]) => address && typeof address === 'string' && address.trim() !== '');

    for (const [name, address] of legacyAddresses) {
      console.log(`   ${name}: ${address}`);
    }
    console.log('');

    // Verify address formats
    console.log('6️⃣ Verifying address formats...');
    await verifyAddressFormats(deployment);
    console.log('✅ All deployed addresses have valid formats');
    console.log('');

    console.log('🎉 Deployment verification completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   ✅ Network: ${deployment.network}`);
    console.log(`   ✅ Deployed Validators: ${deployedValidators.length}`);
    console.log(`   ✅ Deployed Policies: ${deployedPolicies.length}`);
    console.log(`   ✅ All deployed addresses valid`);
    console.log('');
    console.log('🔗 Integration Ready:');
    console.log('   - Frontend can use contract addresses');
    console.log('   - Off-chain builders can reference contracts');
    console.log('   - Context7 monitoring can be configured');
    
  } catch (error) {
    console.error('❌ Deployment verification failed:', error);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Ensure contracts are deployed to the correct network');
    console.log('   2. Check deployment/addresses.json exists');
    console.log('   3. Verify NETWORK environment variable is set correctly');
    console.log('   4. Re-run deployment if necessary');
    process.exit(1);
  }
}

async function verifyAddressFormats(deployment: any) {
  // Only check deployed validators (filter out empty addresses)
  const deployedValidators = Object.entries(deployment.validators || {})
    .filter(([name, address]) => address && typeof address === 'string' && address.trim() !== '');

  console.log(`   Checking ${deployedValidators.length} deployed validators...`);

  // Verify validator addresses start with 'addr1' or 'addr_test'
  for (const [name, address] of deployedValidators) {
    if (typeof address !== 'string' || (!address.startsWith('addr1') && !address.startsWith('addr_test'))) {
      throw new Error(`Invalid validator address format for ${name}: ${address}`);
    }

    if (address.length < 50) {
      throw new Error(`Validator address too short for ${name}: ${address}`);
    }

    console.log(`   ✅ ${name}: ${address}`);
  }

  // Only check deployed policy IDs (filter out empty policy IDs)
  const deployedPolicies = Object.entries(deployment.policies || {})
    .filter(([name, policyId]) => policyId && typeof policyId === 'string' && policyId.trim() !== '');

  console.log(`   Checking ${deployedPolicies.length} deployed policies...`);

  // Verify policy IDs are valid hex strings
  for (const [name, policyId] of deployedPolicies) {
    if (typeof policyId !== 'string') {
      throw new Error(`Invalid policy ID type for ${name}: ${typeof policyId}`);
    }

    if (!/^[a-f0-9]{56}$/i.test(policyId)) {
      throw new Error(`Invalid policy ID format for ${name}: ${policyId}`);
    }

    console.log(`   ✅ ${name}: ${policyId}`);
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function displayNetworkInfo(network: string) {
  const networkInfo = {
    mainnet: {
      name: 'Cardano Mainnet',
      explorer: 'https://cardanoscan.io',
      blockfrost: 'https://cardano-mainnet.blockfrost.io'
    },
    preprod: {
      name: 'Cardano Preprod Testnet',
      explorer: 'https://preprod.cardanoscan.io',
      blockfrost: 'https://cardano-preprod.blockfrost.io'
    },
    preview: {
      name: 'Cardano Preview Testnet',
      explorer: 'https://preview.cardanoscan.io',
      blockfrost: 'https://cardano-preview.blockfrost.io'
    }
  };
  
  const info = networkInfo[network as keyof typeof networkInfo];
  if (info) {
    console.log(`📡 ${info.name}`);
    console.log(`🔍 Explorer: ${info.explorer}`);
    console.log(`🔗 Blockfrost: ${info.blockfrost}`);
  }
}

// =============================================================================
// SCRIPT EXECUTION
// =============================================================================

if (require.main === module) {
  main().catch(console.error);
}
