/**
 * PuckSwap v5 DeFi - Using Deployed Contracts Example
 * 
 * This example demonstrates how to use the deployed contract addresses
 * in your off-chain Lucid Evolution code.
 */

import { Lucid, Blockfrost, SpendingValidator, MintingPolicy } from '@lucid-evolution/lucid';
import { 
  loadContractAddresses, 
  getContractAddress, 
  getPolicyId,
  validateDeployment 
} from '../lucid/utils/contractAddresses';
import { getEnvironmentConfig } from '../config/env';

// =============================================================================
// EXAMPLE: BASIC CONTRACT LOADING
// =============================================================================

export async function exampleBasicContractLoading() {
  console.log('📋 Example: Basic Contract Loading');
  console.log('='.repeat(40));
  
  try {
    // Load all deployment information
    const deployment = loadContractAddresses();
    
    console.log(`Network: ${deployment.network}`);
    console.log(`Deployed: ${deployment.deployedAt}`);
    console.log('');
    
    // Get specific contract addresses
    const swapAddress = getContractAddress('puckswap_swap_validator');
    const liquidityAddress = getContractAddress('puckswap_liquidity_provision_validator');
    const governanceAddress = getContractAddress('puckswap_governance_validator');
    
    console.log('Contract Addresses:');
    console.log(`  Swap Validator: ${swapAddress}`);
    console.log(`  Liquidity Validator: ${liquidityAddress}`);
    console.log(`  Governance Validator: ${governanceAddress}`);
    console.log('');
    
    // Get policy IDs
    const lpPolicyId = getPolicyId('lp_minting_policy');
    const pAdaPolicyId = getPolicyId('pADA_minting_policy');
    
    console.log('Policy IDs:');
    console.log(`  LP Token Policy: ${lpPolicyId}`);
    console.log(`  pADA Policy: ${pAdaPolicyId}`);
    console.log('');
    
  } catch (error) {
    console.error('Error loading contracts:', error);
  }
}

// =============================================================================
// EXAMPLE: LUCID INTEGRATION
// =============================================================================

export async function exampleLucidIntegration() {
  console.log('🔧 Example: Lucid Evolution Integration');
  console.log('='.repeat(40));
  
  try {
    // Validate deployment first
    validateDeployment();
    console.log('✅ Deployment validated');
    
    // Initialize Lucid
    const config = getEnvironmentConfig();
    const blockfrost = new Blockfrost(config.blockfrostEndpoint, config.blockfrostApiKey);
    const lucid = await Lucid.new(blockfrost, config.lucidNetwork);
    
    // Load contract addresses
    const swapAddress = getContractAddress('puckswap_swap_validator');
    const lpPolicyId = getPolicyId('lp_minting_policy');
    
    console.log('Lucid initialized with deployed contracts:');
    console.log(`  Swap Address: ${swapAddress}`);
    console.log(`  LP Policy ID: ${lpPolicyId}`);
    console.log('');
    
    // Example: Query UTxOs at swap validator
    const swapUtxos = await lucid.utxosAt(swapAddress);
    console.log(`Found ${swapUtxos.length} UTxOs at swap validator`);
    
    // Example: Create asset name for LP tokens
    const lpAssetName = lpPolicyId + '4c50546f6b656e'; // "LPToken" in hex
    console.log(`LP Asset Name: ${lpAssetName}`);
    
  } catch (error) {
    console.error('Error with Lucid integration:', error);
  }
}

// =============================================================================
// EXAMPLE: TRANSACTION BUILDING
// =============================================================================

export async function exampleTransactionBuilding() {
  console.log('🏗️ Example: Transaction Building with Deployed Contracts');
  console.log('='.repeat(40));
  
  try {
    // Initialize Lucid
    const config = getEnvironmentConfig();
    const blockfrost = new Blockfrost(config.blockfrostEndpoint, config.blockfrostApiKey);
    const lucid = await Lucid.new(blockfrost, config.lucidNetwork);
    
    // Load contract addresses
    const swapAddress = getContractAddress('puckswap_swap_validator');
    const lpPolicyId = getPolicyId('lp_minting_policy');
    
    // Example: Build a transaction that interacts with the swap validator
    // (This is just a structure example - actual implementation would need proper redeemers and datums)
    
    const tx = lucid
      .newTx()
      .collectFrom(
        await lucid.utxosAt(swapAddress), 
        // Redeemer would go here for actual swap
      )
      .payToContract(
        swapAddress,
        { inline: "your_datum_here" }, // Actual CIP-68 datum would go here
        { lovelace: 2000000n } // Min ADA + value
      )
      .mintAssets(
        { [lpPolicyId + "4c50546f6b656e"]: 1000n }, // Mint 1000 LP tokens
        // Redeemer would go here
      );
    
    console.log('Transaction structure created (not signed/submitted)');
    console.log('  - Collects from swap validator');
    console.log('  - Pays to swap validator with datum');
    console.log('  - Mints LP tokens');
    console.log('');
    console.log('⚠️  This is a structure example only');
    console.log('    Real transactions need proper redeemers and datums');
    
  } catch (error) {
    console.error('Error building transaction:', error);
  }
}

// =============================================================================
// EXAMPLE: MULTI-NETWORK SUPPORT
// =============================================================================

export async function exampleMultiNetworkSupport() {
  console.log('🌐 Example: Multi-Network Support');
  console.log('='.repeat(40));
  
  try {
    // Load addresses for different networks
    const networks = ['preprod', 'mainnet'];
    
    for (const network of networks) {
      try {
        const deployment = loadContractAddresses(network);
        console.log(`${network.toUpperCase()}:`);
        console.log(`  Deployed: ${deployment.deployedAt}`);
        console.log(`  Swap Address: ${deployment.addresses.puckswap_swap_validator}`);
        console.log(`  LP Policy: ${deployment.policyIds.lp_minting_policy}`);
        console.log('');
      } catch (error) {
        console.log(`${network.toUpperCase()}: Not deployed`);
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('Error with multi-network support:', error);
  }
}

// =============================================================================
// EXAMPLE: CONTRACT VALIDATION
// =============================================================================

export async function exampleContractValidation() {
  console.log('✅ Example: Contract Validation');
  console.log('='.repeat(40));
  
  try {
    // Validate current network deployment
    validateDeployment();
    console.log('✅ Current network deployment is complete');
    
    // Check specific networks
    const networks = ['preprod', 'mainnet'];
    
    for (const network of networks) {
      try {
        validateDeployment(network);
        console.log(`✅ ${network} deployment is complete`);
      } catch (error) {
        console.log(`❌ ${network} deployment incomplete: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Validation error:', error);
  }
}

// =============================================================================
// MAIN EXAMPLE RUNNER
// =============================================================================

export async function runAllExamples() {
  console.log('🚀 PuckSwap v5 - Deployed Contracts Usage Examples');
  console.log('='.repeat(60));
  console.log('');
  
  await exampleBasicContractLoading();
  console.log('');
  
  await exampleLucidIntegration();
  console.log('');
  
  await exampleTransactionBuilding();
  console.log('');
  
  await exampleMultiNetworkSupport();
  console.log('');
  
  await exampleContractValidation();
  console.log('');
  
  console.log('🎉 All examples completed!');
  console.log('');
  console.log('📚 Next Steps:');
  console.log('  1. Study the actual off-chain builders in src/lucid/');
  console.log('  2. Implement your own transaction builders');
  console.log('  3. Test on preprod before mainnet deployment');
  console.log('  4. Monitor contracts with Context7 integration');
}

// =============================================================================
// SCRIPT EXECUTION
// =============================================================================

if (require.main === module) {
  runAllExamples().catch(console.error);
}
