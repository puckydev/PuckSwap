#!/usr/bin/env tsx

/**
 * PuckSwap v5 - Contract Address Verification Script
 * 
 * Verifies that deployed contract addresses are correctly loaded
 * in the environment configuration and accessible to frontend components.
 */

import { getPuckSwapEnvironmentConfig, getNetwork } from '../src/config/env';
import { loadContractAddresses } from '../src/lucid/utils/contractAddresses';

async function verifyContractAddresses() {
  console.log('🔍 Verifying Contract Address Configuration...\n');

  try {
    // Get environment configuration
    const envConfig = getPuckSwapEnvironmentConfig();
    const network = getNetwork();

    console.log(`📡 Network: ${network}`);
    console.log(`🌍 Environment: ${envConfig.network}`);
    console.log(`🔗 Blockfrost: ${envConfig.blockfrostEndpoint}\n`);

    // Load contract addresses from deployment
    const deploymentInfo = loadContractAddresses();
    const deployedAddresses = deploymentInfo.addresses;

    console.log('📋 Environment Configuration Addresses:');
    console.log('   Validators:');
    console.log(`     Swap: ${envConfig.contractAddresses.swapValidator}`);
    console.log(`     Liquidity: ${envConfig.contractAddresses.liquidityValidator}`);
    console.log(`     Withdrawal: ${envConfig.contractAddresses.withdrawalValidator}`);
    console.log(`     Governance: ${envConfig.contractAddresses.governanceValidator}`);
    console.log(`     Staking: ${envConfig.contractAddresses.stakingValidator}`);
    console.log(`     Cross-Chain: ${envConfig.contractAddresses.crossChainValidator}`);
    console.log(`     Registry: ${envConfig.contractAddresses.poolRegistryValidator}`);
    console.log(`     Treasury: ${envConfig.contractAddresses.treasuryValidator}`);

    console.log('   Policies:');
    console.log(`     LP Minting: ${envConfig.contractAddresses.lpMintingPolicy}`);
    console.log(`     pADA Minting: ${envConfig.contractAddresses.pAdaMintingPolicy}\n`);

    console.log('📋 Deployed Contract Addresses:');
    console.log('   Validators:');
    console.log(`     Swap: ${deployedAddresses.validators.swap}`);
    console.log(`     Liquidity: ${deployedAddresses.validators.liquidityProvision}`);
    console.log(`     Withdrawal: ${deployedAddresses.validators.withdrawal}`);
    console.log(`     Governance: ${deployedAddresses.validators.governance}`);
    console.log(`     Staking: ${deployedAddresses.validators.staking}`);
    console.log(`     Cross-Chain: ${deployedAddresses.validators.crossChainRouter}`);
    console.log(`     Registry: ${deployedAddresses.validators.registry}`);

    console.log('   Policies:');
    console.log(`     LP Minting: ${deployedAddresses.policies.lpMinting}`);
    console.log(`     pADA Minting: ${deployedAddresses.policies.pADAMinting}\n`);

    // Verify addresses match
    let allMatch = true;
    const mismatches: string[] = [];

    if (envConfig.contractAddresses.swapValidator !== deployedAddresses.validators.swap) {
      allMatch = false;
      mismatches.push('Swap Validator');
    }
    if (envConfig.contractAddresses.liquidityValidator !== deployedAddresses.validators.liquidityProvision) {
      allMatch = false;
      mismatches.push('Liquidity Validator');
    }
    if (envConfig.contractAddresses.withdrawalValidator !== deployedAddresses.validators.withdrawal) {
      allMatch = false;
      mismatches.push('Withdrawal Validator');
    }
    if (envConfig.contractAddresses.governanceValidator !== deployedAddresses.validators.governance) {
      allMatch = false;
      mismatches.push('Governance Validator');
    }
    if (envConfig.contractAddresses.stakingValidator !== deployedAddresses.validators.staking) {
      allMatch = false;
      mismatches.push('Staking Validator');
    }
    if (envConfig.contractAddresses.crossChainValidator !== deployedAddresses.validators.crossChainRouter) {
      allMatch = false;
      mismatches.push('Cross-Chain Validator');
    }
    if (envConfig.contractAddresses.poolRegistryValidator !== deployedAddresses.validators.registry) {
      allMatch = false;
      mismatches.push('Registry Validator');
    }
    if (envConfig.contractAddresses.lpMintingPolicy !== deployedAddresses.policies.lpMinting) {
      allMatch = false;
      mismatches.push('LP Minting Policy');
    }
    if (envConfig.contractAddresses.pAdaMintingPolicy !== deployedAddresses.policies.pADAMinting) {
      allMatch = false;
      mismatches.push('pADA Minting Policy');
    }

    if (allMatch) {
      console.log('✅ All contract addresses match between environment and deployment!');
      console.log('🎉 Contract address configuration is correct and ready for production.\n');
    } else {
      console.log('❌ Address mismatches found:');
      mismatches.forEach(contract => console.log(`   - ${contract}`));
      console.log('\n⚠️  Please update environment configuration to match deployed addresses.\n');
    }

    // Test address accessibility
    console.log('🧪 Testing Address Accessibility:');
    
    try {
      const swapAddress = envConfig.contractAddresses.swapValidator;
      if (swapAddress && swapAddress.startsWith('addr_test1')) {
        console.log('✅ Swap validator address is accessible and valid for testnet');
      } else {
        console.log('❌ Swap validator address is invalid or missing');
      }

      const lpPolicy = envConfig.contractAddresses.lpMintingPolicy;
      if (lpPolicy && lpPolicy.length === 56) {
        console.log('✅ LP minting policy ID is accessible and valid format');
      } else {
        console.log('❌ LP minting policy ID is invalid or missing');
      }

      console.log('✅ Address accessibility test completed\n');

    } catch (error) {
      console.error('❌ Address accessibility test failed:', error);
    }

    console.log('🎯 Contract Address Verification Summary:');
    console.log(`   Network: ${network}`);
    console.log(`   Deployed Contracts: ${Object.keys(deployedAddresses.validators).length + Object.keys(deployedAddresses.policies).length}`);
    console.log(`   Configuration Match: ${allMatch ? 'YES' : 'NO'}`);
    console.log(`   Ready for Testing: ${allMatch ? 'YES' : 'NO'}\n`);

    if (allMatch) {
      console.log('🚀 Ready to proceed with Context7 integration and end-to-end testing!');
    } else {
      console.log('⚠️  Please fix address mismatches before proceeding.');
    }

  } catch (error) {
    console.error('❌ Contract address verification failed:', error);
    process.exit(1);
  }
}

// Run verification
verifyContractAddresses().catch(console.error);
