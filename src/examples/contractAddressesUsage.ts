/**
 * PuckSwap v5 DeFi - Contract Addresses Usage Examples
 * 
 * This file demonstrates how to use the new contractAddresses utility
 * in various scenarios across PuckSwap v5 off-chain builders.
 */

import { 
  contractAddresses,
  loadContractAddresses,
  loadContractAddressesAsync,
  areContractsDeployed,
  validateDeployment,
  getAMMAddresses,
  getGovernanceAddresses,
  getAdvancedDeFiAddresses,
  ContractAddresses
} from '../lucid/utils/contractAddresses';

// =============================================================================
// EXAMPLE 1: BASIC USAGE - STRONGLY TYPED CONTRACT ADDRESSES
// =============================================================================

/**
 * Example: Using the main contractAddresses export
 * This is the recommended approach for most use cases
 */
export function exampleBasicUsage() {
  console.log('🔷 Example 1: Basic Usage');
  console.log('='.repeat(40));
  
  try {
    // Direct access to strongly typed addresses
    console.log('Swap Validator:', contractAddresses.validators.swap);
    console.log('Liquidity Validator:', contractAddresses.validators.liquidityProvision);
    console.log('LP Minting Policy:', contractAddresses.policies.lpMinting);
    console.log('pADA Minting Policy:', contractAddresses.policies.pADAMinting);
    
    // Type safety - TypeScript will catch errors
    const swapAddress: string = contractAddresses.validators.swap;
    const lpPolicy: string = contractAddresses.policies.lpMinting;
    
    console.log('✅ Contract addresses loaded successfully');
    
  } catch (error) {
    console.error('❌ Failed to load contract addresses:', error);
    console.log('   Make sure to run deployment first: npm run deploy-v5-preprod');
  }
  
  console.log('');
}

// =============================================================================
// EXAMPLE 2: NETWORK-SPECIFIC LOADING
// =============================================================================

/**
 * Example: Loading addresses for specific networks
 */
export function exampleNetworkSpecificLoading() {
  console.log('🌐 Example 2: Network-Specific Loading');
  console.log('='.repeat(40));
  
  const networks = ['preprod', 'mainnet'];
  
  for (const network of networks) {
    try {
      const deployment = loadContractAddresses(network);
      
      console.log(`${network.toUpperCase()}:`);
      console.log(`  Network: ${deployment.network}`);
      console.log(`  Deployed: ${deployment.deployedAt}`);
      console.log(`  Swap Address: ${deployment.addresses.validators.swap}`);
      console.log(`  LP Policy: ${deployment.addresses.policies.lpMinting}`);
      console.log('');
      
    } catch (error) {
      console.log(`${network.toUpperCase()}: Not deployed or error occurred`);
      console.log(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log('');
    }
  }
}

// =============================================================================
// EXAMPLE 3: ASYNC LOADING FOR BACKEND SERVICES
// =============================================================================

/**
 * Example: Async loading for backend services and APIs
 */
export async function exampleAsyncLoading() {
  console.log('⚡ Example 3: Async Loading');
  console.log('='.repeat(40));
  
  try {
    // Async loading using fs/promises
    const deployment = await loadContractAddressesAsync();
    
    console.log('Async loading completed:');
    console.log(`  Network: ${deployment.network}`);
    console.log(`  Deployed: ${deployment.deployedAt}`);
    console.log(`  Total validators: ${Object.keys(deployment.addresses.validators).length}`);
    console.log(`  Total policies: ${Object.keys(deployment.addresses.policies).length}`);
    console.log('✅ Async contract addresses loaded successfully');
    
  } catch (error) {
    console.error('❌ Async loading failed:', error);
  }
  
  console.log('');
}

// =============================================================================
// EXAMPLE 4: DEPLOYMENT VALIDATION
// =============================================================================

/**
 * Example: Validating deployment before using contracts
 */
export function exampleDeploymentValidation() {
  console.log('🔍 Example 4: Deployment Validation');
  console.log('='.repeat(40));
  
  // Check if contracts are deployed
  const isDeployed = areContractsDeployed();
  console.log(`Contracts deployed: ${isDeployed}`);
  
  if (isDeployed) {
    try {
      // Validate all required contracts are present
      validateDeployment();
      console.log('✅ All contracts validated successfully');
      
    } catch (error) {
      console.error('❌ Deployment validation failed:', error);
    }
  } else {
    console.log('⚠️  Contracts not deployed. Run deployment first.');
  }
  
  console.log('');
}

// =============================================================================
// EXAMPLE 5: SPECIALIZED ADDRESS GETTERS
// =============================================================================

/**
 * Example: Using specialized address getters for different modules
 */
export function exampleSpecializedGetters() {
  console.log('🎯 Example 5: Specialized Address Getters');
  console.log('='.repeat(40));
  
  try {
    // AMM addresses for swap/liquidity operations
    const ammAddresses = getAMMAddresses();
    console.log('AMM Addresses:');
    console.log(`  Swap Validator: ${ammAddresses.swapValidator}`);
    console.log(`  Liquidity Validator: ${ammAddresses.liquidityValidator}`);
    console.log(`  Withdrawal Validator: ${ammAddresses.withdrawalValidator}`);
    console.log(`  LP Minting Policy: ${ammAddresses.lpMintingPolicy}`);
    console.log('');
    
    // Governance addresses
    const govAddresses = getGovernanceAddresses();
    console.log('Governance Addresses:');
    console.log(`  Governance Validator: ${govAddresses.governanceValidator}`);
    console.log(`  Pool Registry Validator: ${govAddresses.poolRegistryValidator}`);
    console.log('');
    
    // Advanced DeFi addresses
    const advancedAddresses = getAdvancedDeFiAddresses();
    console.log('Advanced DeFi Addresses:');
    console.log(`  Liquid Staking Validator: ${advancedAddresses.liquidStakingValidator}`);
    console.log(`  Cross-Chain Router: ${advancedAddresses.crossChainRouterValidator}`);
    console.log(`  pADA Minting Policy: ${advancedAddresses.pADAMintingPolicy}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Failed to get specialized addresses:', error);
  }
}

// =============================================================================
// EXAMPLE 6: INTEGRATION WITH LUCID EVOLUTION
// =============================================================================

/**
 * Example: Integration with Lucid Evolution transaction builders
 */
export function exampleLucidIntegration() {
  console.log('🔗 Example 6: Lucid Evolution Integration');
  console.log('='.repeat(40));
  
  try {
    // Example: Building a swap transaction
    const swapValidatorAddress = contractAddresses.validators.swap;
    const lpMintingPolicy = contractAddresses.policies.lpMinting;
    
    console.log('Building swap transaction with:');
    console.log(`  Swap Validator: ${swapValidatorAddress}`);
    console.log(`  LP Policy: ${lpMintingPolicy}`);
    
    // In actual implementation, you would use these addresses with Lucid:
    // const tx = lucid
    //   .newTx()
    //   .collectFrom([poolUtxo], swapRedeemer)
    //   .payToContract(swapValidatorAddress, { inline: newPoolDatum }, poolValue)
    //   .mintAssets({ [lpMintingPolicy + lpTokenName]: lpAmount }, lpRedeemer)
    //   .complete();
    
    console.log('✅ Addresses ready for Lucid Evolution integration');
    
  } catch (error) {
    console.error('❌ Lucid integration example failed:', error);
  }
  
  console.log('');
}

// =============================================================================
// EXAMPLE 7: TYPE SAFETY DEMONSTRATION
// =============================================================================

/**
 * Example: Demonstrating TypeScript type safety
 */
export function exampleTypeSafety() {
  console.log('🛡️  Example 7: Type Safety');
  console.log('='.repeat(40));
  
  try {
    // Strongly typed interface ensures all required addresses are present
    const addresses: ContractAddresses = contractAddresses;
    
    // TypeScript will enforce that all required properties exist
    const requiredValidators = [
      addresses.validators.swap,
      addresses.validators.liquidityProvision,
      addresses.validators.withdrawal,
      addresses.validators.governance,
      addresses.validators.staking,
      addresses.validators.registry,
      addresses.validators.crossChainRouter,
    ];
    
    const requiredPolicies = [
      addresses.policies.lpMinting,
      addresses.policies.pADAMinting,
    ];
    
    console.log(`✅ All ${requiredValidators.length} validators present`);
    console.log(`✅ All ${requiredPolicies.length} policies present`);
    console.log('✅ Type safety validated');
    
  } catch (error) {
    console.error('❌ Type safety validation failed:', error);
  }
  
  console.log('');
}

// =============================================================================
// MAIN DEMO FUNCTION
// =============================================================================

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 PuckSwap v5 Contract Addresses Usage Examples');
  console.log('='.repeat(60));
  console.log('');
  
  exampleBasicUsage();
  exampleNetworkSpecificLoading();
  await exampleAsyncLoading();
  exampleDeploymentValidation();
  exampleSpecializedGetters();
  exampleLucidIntegration();
  exampleTypeSafety();
  
  console.log('🎉 All examples completed!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Run deployment: npm run deploy-v5-preprod');
  console.log('2. Import contractAddresses in your off-chain builders');
  console.log('3. Use strongly typed addresses for Lucid Evolution transactions');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
