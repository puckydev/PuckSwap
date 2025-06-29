#!/usr/bin/env ts-node

/**
 * PuckSwap v5 - Deployment Readiness Verification Script
 * 
 * Comprehensive verification tool to ensure all contracts are properly deployed
 * and addresses match expected script hashes before mainnet activation.
 * 
 * Usage:
 *   npx ts-node tests/deployment_verification.ts
 *   npm run verify-deployment
 */

import fs from 'fs/promises';
import path from 'path';
import { Lucid, SpendingValidator, MintingPolicy, validatorToScriptHash, validatorToAddress, mintingPolicyToId } from '@lucid-evolution/lucid';
import { 
  getEnvironmentConfig, 
  getNetwork, 
  getBlockfrostApiKey, 
  getBlockfrostApiUrl,
  toLucidNetwork,
  validateEnvironmentConfig 
} from '../src/config/env';
import { 
  loadContractAddressesAsync, 
  DeploymentInfo, 
  ContractAddresses 
} from '../src/lib/contractAddresses';
import { createLucidInstance } from '../src/lib/lucid-config';

// ========== VERIFICATION TYPES ==========

interface VerificationResult {
  contractName: string;
  type: 'validator' | 'policy';
  status: 'PASS' | 'FAIL';
  expectedHash?: string;
  actualHash?: string;
  expectedAddress?: string;
  actualAddress?: string;
  error?: string;
}

interface DeploymentVerificationReport {
  network: string;
  timestamp: string;
  totalContracts: number;
  passedVerifications: number;
  failedVerifications: number;
  results: VerificationResult[];
  overallStatus: 'PASS' | 'FAIL';
}

// ========== EXPECTED CONTRACTS ==========

const EXPECTED_VALIDATORS = [
  'swap_validator',
  'liquidity_provision_validator', 
  'withdrawal_validator',
  'governance_validator',
  'pool_registry_validator',
  'liquid_staking_validator',
  'cross_chain_router_validator'
] as const;

const EXPECTED_POLICIES = [
  'lp_minting_policy',
  'pADA_minting_policy'
] as const;

// ========== DEPLOYMENT VERIFICATION CLASS ==========

class DeploymentVerifier {
  private lucid!: Lucid;
  private network: string;
  private deploymentInfo!: DeploymentInfo;
  private verificationResults: VerificationResult[] = [];

  constructor() {
    this.network = getNetwork();
  }

  /**
   * Run complete deployment verification
   */
  async verify(): Promise<DeploymentVerificationReport> {
    console.log('🔍 PuckSwap v5 Deployment Verification');
    console.log('=====================================');
    console.log(`Network: ${this.network.toUpperCase()}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    try {
      // Step 1: Validate environment configuration
      await this.validateEnvironment();

      // Step 2: Initialize Lucid instance
      await this.initializeLucid();

      // Step 3: Load deployment information
      await this.loadDeploymentInfo();

      // Step 4: Verify script files exist
      await this.verifyScriptFiles();

      // Step 5: Verify addresses.json structure
      await this.verifyAddressesFile();

      // Step 6: Verify validator script hashes
      await this.verifyValidators();

      // Step 7: Verify minting policy IDs
      await this.verifyMintingPolicies();

      // Generate final report
      return this.generateReport();

    } catch (error) {
      console.error('❌ Deployment verification failed:', error);
      throw error;
    }
  }

  /**
   * Validate environment configuration
   */
  private async validateEnvironment(): Promise<void> {
    console.log('🔧 Validating environment configuration...');

    try {
      validateEnvironmentConfig();
      
      const apiKey = getBlockfrostApiKey();
      const apiUrl = getBlockfrostApiUrl();
      
      if (!apiKey || !apiUrl) {
        throw new Error('Missing Blockfrost API configuration');
      }

      console.log('✅ Environment configuration valid');
    } catch (error) {
      console.error('❌ Environment validation failed:', error);
      throw error;
    }
  }

  /**
   * Initialize Lucid instance
   */
  private async initializeLucid(): Promise<void> {
    console.log('🚀 Initializing Lucid Evolution...');

    try {
      this.lucid = await createLucidInstance();
      console.log(`✅ Lucid initialized for ${this.network}`);
    } catch (error) {
      console.error('❌ Lucid initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load deployment information
   */
  private async loadDeploymentInfo(): Promise<void> {
    console.log('📋 Loading deployment information...');

    try {
      this.deploymentInfo = await loadContractAddressesAsync(this.network);
      console.log(`✅ Loaded deployment info for ${this.deploymentInfo.network}`);
      console.log(`   Deployed at: ${this.deploymentInfo.deployedAt}`);
    } catch (error) {
      console.error('❌ Failed to load deployment info:', error);
      throw error;
    }
  }

  /**
   * Verify all script files exist in deployment/scripts/
   */
  private async verifyScriptFiles(): Promise<void> {
    console.log('\n📁 Verifying script files...');

    const scriptsDir = path.resolve(process.cwd(), 'deployment', 'scripts');
    
    try {
      await fs.access(scriptsDir);
    } catch (error) {
      throw new Error(`Scripts directory not found: ${scriptsDir}`);
    }

    // Check validators
    for (const validator of EXPECTED_VALIDATORS) {
      const scriptPath = path.join(scriptsDir, `${validator}.plutus`);
      try {
        await fs.access(scriptPath);
        console.log(`✅ ${validator}.plutus`);
      } catch (error) {
        console.error(`❌ Missing: ${validator}.plutus`);
        this.verificationResults.push({
          contractName: validator,
          type: 'validator',
          status: 'FAIL',
          error: `Script file not found: ${scriptPath}`
        });
      }
    }

    // Check policies
    for (const policy of EXPECTED_POLICIES) {
      const scriptPath = path.join(scriptsDir, `${policy}.plutus`);
      try {
        await fs.access(scriptPath);
        console.log(`✅ ${policy}.plutus`);
      } catch (error) {
        console.error(`❌ Missing: ${policy}.plutus`);
        this.verificationResults.push({
          contractName: policy,
          type: 'policy',
          status: 'FAIL',
          error: `Script file not found: ${scriptPath}`
        });
      }
    }
  }

  /**
   * Verify addresses.json file structure
   */
  private async verifyAddressesFile(): Promise<void> {
    console.log('\n📄 Verifying addresses.json structure...');

    const addressesPath = path.resolve(process.cwd(), 'deployment', 'addresses.json');
    
    try {
      await fs.access(addressesPath);
      console.log('✅ addresses.json exists');
    } catch (error) {
      throw new Error(`addresses.json not found: ${addressesPath}`);
    }

    // Verify required fields exist
    const required = {
      validators: EXPECTED_VALIDATORS.length,
      policies: EXPECTED_POLICIES.length
    };

    const actual = {
      validators: Object.keys(this.deploymentInfo.addresses.validators).length,
      policies: Object.keys(this.deploymentInfo.addresses.policies).length
    };

    if (actual.validators !== required.validators) {
      throw new Error(`Expected ${required.validators} validators, found ${actual.validators}`);
    }

    if (actual.policies !== required.policies) {
      throw new Error(`Expected ${required.policies} policies, found ${actual.policies}`);
    }

    console.log(`✅ Found ${actual.validators} validators and ${actual.policies} policies`);
  }

  /**
   * Verify validator script hashes match computed values
   */
  private async verifyValidators(): Promise<void> {
    console.log('\n🔐 Verifying validator script hashes...');

    for (const validatorName of EXPECTED_VALIDATORS) {
      await this.verifyValidator(validatorName);
    }
  }

  /**
   * Verify single validator
   */
  private async verifyValidator(validatorName: string): Promise<void> {
    try {
      // Load compiled script
      const scriptPath = path.resolve(process.cwd(), 'deployment', 'scripts', `${validatorName}.plutus`);
      const compiledCode = await fs.readFile(scriptPath, 'utf-8');

      // Create validator
      const validator: SpendingValidator = {
        type: "PlutusV2",
        script: compiledCode.trim()
      };

      // Compute script hash and address
      const computedHash = validatorToScriptHash(validator);
      const computedAddress = validatorToAddress(toLucidNetwork(this.network), validator);

      // Get deployed address from deployment info
      const deployedAddress = this.getValidatorAddress(validatorName);
      const deployedHash = this.getValidatorHash(validatorName);

      // Verify match
      const hashMatch = computedHash === deployedHash;
      const addressMatch = computedAddress === deployedAddress;

      if (hashMatch && addressMatch) {
        console.log(`✅ ${validatorName}: Hash and address match`);
        this.verificationResults.push({
          contractName: validatorName,
          type: 'validator',
          status: 'PASS',
          expectedHash: computedHash,
          actualHash: deployedHash,
          expectedAddress: computedAddress,
          actualAddress: deployedAddress
        });
      } else {
        console.error(`❌ ${validatorName}: Mismatch detected`);
        console.error(`   Expected hash: ${computedHash}`);
        console.error(`   Deployed hash: ${deployedHash}`);
        console.error(`   Expected addr: ${computedAddress}`);
        console.error(`   Deployed addr: ${deployedAddress}`);
        
        this.verificationResults.push({
          contractName: validatorName,
          type: 'validator',
          status: 'FAIL',
          expectedHash: computedHash,
          actualHash: deployedHash,
          expectedAddress: computedAddress,
          actualAddress: deployedAddress,
          error: 'Script hash or address mismatch'
        });
      }

    } catch (error) {
      console.error(`❌ ${validatorName}: Verification failed -`, error);
      this.verificationResults.push({
        contractName: validatorName,
        type: 'validator',
        status: 'FAIL',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Verify minting policy IDs match computed values
   */
  private async verifyMintingPolicies(): Promise<void> {
    console.log('\n🏭 Verifying minting policy IDs...');

    for (const policyName of EXPECTED_POLICIES) {
      await this.verifyMintingPolicy(policyName);
    }
  }

  /**
   * Verify single minting policy
   */
  private async verifyMintingPolicy(policyName: string): Promise<void> {
    try {
      // Load compiled script
      const scriptPath = path.resolve(process.cwd(), 'deployment', 'scripts', `${policyName}.plutus`);
      const compiledCode = await fs.readFile(scriptPath, 'utf-8');

      // Create minting policy
      const policy: MintingPolicy = {
        type: "PlutusV2",
        script: compiledCode.trim()
      };

      // Compute policy ID
      const computedPolicyId = mintingPolicyToId(policy);

      // Get deployed policy ID
      const deployedPolicyId = this.getPolicyId(policyName);

      // Verify match
      if (computedPolicyId === deployedPolicyId) {
        console.log(`✅ ${policyName}: Policy ID matches`);
        this.verificationResults.push({
          contractName: policyName,
          type: 'policy',
          status: 'PASS',
          expectedHash: computedPolicyId,
          actualHash: deployedPolicyId
        });
      } else {
        console.error(`❌ ${policyName}: Policy ID mismatch`);
        console.error(`   Expected: ${computedPolicyId}`);
        console.error(`   Deployed: ${deployedPolicyId}`);
        
        this.verificationResults.push({
          contractName: policyName,
          type: 'policy',
          status: 'FAIL',
          expectedHash: computedPolicyId,
          actualHash: deployedPolicyId,
          error: 'Policy ID mismatch'
        });
      }

    } catch (error) {
      console.error(`❌ ${policyName}: Verification failed -`, error);
      this.verificationResults.push({
        contractName: policyName,
        type: 'policy',
        status: 'FAIL',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // ========== UTILITY METHODS ==========

  private getValidatorAddress(validatorName: string): string {
    const mapping: Record<string, keyof ContractAddresses['validators']> = {
      'swap_validator': 'swap',
      'liquidity_provision_validator': 'liquidityProvision',
      'withdrawal_validator': 'withdrawal',
      'governance_validator': 'governance',
      'pool_registry_validator': 'registry',
      'liquid_staking_validator': 'staking',
      'cross_chain_router_validator': 'crossChainRouter'
    };

    const key = mapping[validatorName];
    if (!key) {
      throw new Error(`Unknown validator: ${validatorName}`);
    }

    return this.deploymentInfo.addresses.validators[key];
  }

  private getValidatorHash(validatorName: string): string {
    const contract = this.deploymentInfo.contracts[validatorName];
    if (!contract || contract.type !== 'validator') {
      throw new Error(`Validator contract info not found: ${validatorName}`);
    }
    return contract.scriptHash;
  }

  private getPolicyId(policyName: string): string {
    const mapping: Record<string, keyof ContractAddresses['policies']> = {
      'lp_minting_policy': 'lpMinting',
      'pADA_minting_policy': 'pADAMinting'
    };

    const key = mapping[policyName];
    if (!key) {
      throw new Error(`Unknown policy: ${policyName}`);
    }

    return this.deploymentInfo.addresses.policies[key];
  }

  /**
   * Generate final verification report
   */
  private generateReport(): DeploymentVerificationReport {
    const passedCount = this.verificationResults.filter(r => r.status === 'PASS').length;
    const failedCount = this.verificationResults.filter(r => r.status === 'FAIL').length;
    const totalCount = this.verificationResults.length;

    const report: DeploymentVerificationReport = {
      network: this.network,
      timestamp: new Date().toISOString(),
      totalContracts: totalCount,
      passedVerifications: passedCount,
      failedVerifications: failedCount,
      results: this.verificationResults,
      overallStatus: failedCount === 0 ? 'PASS' : 'FAIL'
    };

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 DEPLOYMENT VERIFICATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Network: ${report.network.toUpperCase()}`);
    console.log(`Total Contracts: ${report.totalContracts}`);
    console.log(`✅ Passed: ${report.passedVerifications}`);
    console.log(`❌ Failed: ${report.failedVerifications}`);
    console.log(`Overall Status: ${report.overallStatus}`);

    if (report.failedVerifications > 0) {
      console.log('\nFailed Verifications:');
      report.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  - ${r.contractName} (${r.type}): ${r.error}`);
        });
    }

    console.log('='.repeat(50));

    return report;
  }
}

// ========== MAIN EXECUTION ==========

/**
 * Main verification function
 */
async function runDeploymentVerification(): Promise<void> {
  const verifier = new DeploymentVerifier();
  
  try {
    const report = await verifier.verify();
    
    if (report.overallStatus === 'PASS') {
      console.log('\n🎉 Deployment verification PASSED! Ready for mainnet activation.');
      process.exit(0);
    } else {
      console.log('\n💥 Deployment verification FAILED! Do not activate on mainnet.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Verification process failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runDeploymentVerification();
}

export { DeploymentVerifier, runDeploymentVerification };
export type { VerificationResult, DeploymentVerificationReport };
