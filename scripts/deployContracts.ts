#!/usr/bin/env tsx

/**
 * PuckSwap v5 DeFi - Automated Contract Deployment Script
 *
 * This script handles the automated deployment of PuckSwap v5 contracts to Cardano
 * using Lucid Evolution and Blockfrost API integration.
 *
 * Features:
 * - Environment-based network detection (mainnet/preprod)
 * - Loads compiled Aiken contracts from /deployment/scripts/
 * - Computes on-chain addresses using Lucid Evolution
 * - Stores computed addresses in /deployment/addresses.json
 * - Supports both mainnet and preprod environments
 *
 * Usage:
 *   NETWORK=preprod tsx scripts/deployContracts.ts
 *   NETWORK=mainnet tsx scripts/deployContracts.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { Lucid, Blockfrost, SpendingValidator, MintingPolicy, validatorToAddress, validatorToScriptHash, mintingPolicyToId } from '@lucid-evolution/lucid';
import { createLucidInstance } from '../src/lib/lucid-config';
import {
  getNetwork,
  getBlockfrostApiKey,
  getBlockfrostApiUrl,
  toLucidNetwork,
  validateEnvironmentConfig
} from '../src/config/env';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

interface ContractArtifact {
  name: string;
  type: 'validator' | 'policy';
  description: string;
  compiledCode: string;
}

interface ComputedAddress {
  contractName: string;
  type: 'validator' | 'policy';
  scriptHash: string;
  address?: string;
  policyId?: string;
  computedAt: string;
}

interface DeploymentAddresses {
  network: string;
  deployedAt: string;
  validators: {
    swap: string;
    liquidityProvision: string;
    withdrawal: string;
    governance: string;
    staking: string;
    registry: string;
    crossChainRouter: string;
  };
  policies: {
    lpMinting: string;
    pADAMinting: string;
  };
  // Legacy format for backward compatibility
  addresses: Record<string, string>;
  policyIds: Record<string, string>;
  contracts: Record<string, ComputedAddress>;
}

// =============================================================================
// DEPLOYMENT CONFIGURATION
// =============================================================================

// PuckSwap v5 Contract Deployment Configuration
const CONTRACTS_TO_DEPLOY = [
  // Core AMM validators (compiled and ready)
  { name: 'swap_validator', type: 'validator', description: 'Core AMM swap validator with constant product formula' },
  { name: 'liquidity_provision_validator', type: 'validator', description: 'Liquidity provision and withdrawal validator' },
  { name: 'simple_validator', type: 'validator', description: 'Simple test validator for development' },

  // Note: Additional validators are placeholder stubs and will be added when properly compiled
  // { name: 'governance_validator', type: 'validator', description: 'DAO governance proposals, voting, and execution' },
  // { name: 'pool_registry_validator', type: 'validator', description: 'Global pool registration and discovery' },
  // { name: 'liquid_staking_validator', type: 'validator', description: 'ADA deposits, pADA minting, and reward syncing' },
  // { name: 'cross_chain_router_validator', type: 'validator', description: 'Cross-chain bridge transfers and message passing' },
  // { name: 'withdrawal_validator', type: 'validator', description: 'Withdrawal validator for liquidity removal' },
  // { name: 'lp_minting_policy', type: 'policy', description: 'LP token minting/burning for AMM pools' },
  // { name: 'pADA_minting_policy', type: 'policy', description: 'pADA liquid staking token minting/burning' },
] as const;

// =============================================================================
// MAIN DEPLOYMENT FUNCTION
// =============================================================================

async function main() {
  console.log('🚀 PuckSwap v5 DeFi - Automated Contract Deployment');
  console.log('='.repeat(60));

  try {
    // 1. Validate environment configuration
    console.log('🔧 Validating environment configuration...');
    validateEnvironmentConfig();

    const network = getNetwork();
    const blockfrostApiKey = getBlockfrostApiKey();
    const blockfrostEndpoint = getBlockfrostApiUrl();
    const lucidNetwork = toLucidNetwork(network);

    console.log(`📡 Network: ${network}`);
    console.log(`🔗 Blockfrost: ${blockfrostEndpoint}`);
    console.log('');

    // 2. Initialize Lucid Evolution
    console.log('⚡ Initializing Lucid Evolution...');
    const lucid = await createLucidInstance({ network: lucidNetwork });
    console.log('✅ Lucid Evolution initialized');
    console.log('');

    // 3. Load compiled contract artifacts
    console.log('📦 Loading compiled contract artifacts...');
    const artifacts = await loadContractArtifacts();
    console.log(`✅ Loaded ${artifacts.length} contract artifacts`);
    console.log('');

    // 4. Compute contract addresses
    console.log('🧮 Computing contract addresses...');
    const computedAddresses = await computeContractAddresses(lucid, artifacts);
    console.log(`✅ Computed ${computedAddresses.length} contract addresses`);
    console.log('');

    // 5. Aggregate and save deployment addresses
    console.log('💾 Saving deployment addresses...');
    const deploymentData = aggregateDeploymentData(network, computedAddresses);
    await saveDeploymentAddresses(deploymentData);
    console.log('✅ Deployment addresses saved');
    console.log('');

    // 6. Display deployment summary
    displayDeploymentSummary(deploymentData);

    console.log('🎉 Deployment completed successfully!');

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// =============================================================================
// CONTRACT ARTIFACT LOADING
// =============================================================================

async function loadContractArtifacts(): Promise<ContractArtifact[]> {
  const scriptsPath = path.join(process.cwd(), 'deployment', 'scripts');

  // Check if deployment/scripts directory exists
  try {
    await fs.access(scriptsPath);
  } catch (error) {
    throw new Error(
      `Contract artifacts directory not found: ${scriptsPath}. ` +
      'Please run "aiken build && aiken export --output deployment/scripts" first.'
    );
  }

  const artifacts: ContractArtifact[] = [];

  // Load each contract artifact
  for (const contract of CONTRACTS_TO_DEPLOY) {
    const artifactPath = path.join(scriptsPath, `${contract.name}.plutus`);

    try {
      const compiledCode = await fs.readFile(artifactPath, 'utf8');

      artifacts.push({
        name: contract.name,
        type: contract.type,
        description: contract.description,
        compiledCode: compiledCode.trim()
      });

      console.log(`   📄 Loaded ${contract.name}.plutus`);

    } catch (error) {
      throw new Error(`Failed to load contract artifact: ${artifactPath}. Error: ${error}`);
    }
  }

  return artifacts;
}

// =============================================================================
// CONTRACT ADDRESS COMPUTATION
// =============================================================================

async function computeContractAddresses(lucid: Lucid, artifacts: ContractArtifact[]): Promise<ComputedAddress[]> {
  const computedAddresses: ComputedAddress[] = [];

  for (const artifact of artifacts) {
    console.log(`   🧮 Computing address for ${artifact.name}...`);

    try {
      let computed: ComputedAddress;

      if (artifact.type === 'validator') {
        computed = await computeValidatorAddress(lucid, artifact);
      } else if (artifact.type === 'policy') {
        computed = await computeMintingPolicyId(lucid, artifact);
      } else {
        throw new Error(`Unknown contract type: ${artifact.type}`);
      }

      computedAddresses.push(computed);

      // Log computed address
      console.log(`      ✅ ${artifact.name}`);
      console.log(`         Script Hash: ${computed.scriptHash}`);
      if (computed.address) {
        console.log(`         Address: ${computed.address}`);
      }
      if (computed.policyId) {
        console.log(`         Policy ID: ${computed.policyId}`);
      }
      console.log('');

    } catch (error) {
      throw new Error(`Failed to compute address for ${artifact.name}: ${error}`);
    }
  }

  return computedAddresses;
}

async function computeValidatorAddress(lucid: Lucid, artifact: ContractArtifact): Promise<ComputedAddress> {
  // Create spending validator from compiled code
  const validator: SpendingValidator = {
    type: "PlutusV2",
    script: artifact.compiledCode
  };

  // Compute script hash and address using Lucid Evolution utilities
  const scriptHash = validatorToScriptHash(validator);
  const address = validatorToAddress(lucid.config().network, validator);

  return {
    contractName: artifact.name,
    type: 'validator',
    scriptHash,
    address,
    computedAt: new Date().toISOString()
  };
}

async function computeMintingPolicyId(lucid: Lucid, artifact: ContractArtifact): Promise<ComputedAddress> {
  // Create minting policy from compiled code
  const policy: MintingPolicy = {
    type: "PlutusV2",
    script: artifact.compiledCode
  };

  // Compute policy ID using imported utilities
  const policyId = mintingPolicyToId(policy);
  const scriptHash = policyId; // Policy ID is the same as script hash for minting policies

  return {
    contractName: artifact.name,
    type: 'policy',
    scriptHash,
    policyId,
    computedAt: new Date().toISOString()
  };
}

// =============================================================================
// DEPLOYMENT DATA AGGREGATION
// =============================================================================

function aggregateDeploymentData(network: string, computedAddresses: ComputedAddress[]): DeploymentAddresses {
  const addresses: Record<string, string> = {};
  const policyIds: Record<string, string> = {};
  const contracts: Record<string, ComputedAddress> = {};

  // Initialize structured addresses
  const validators = {
    swap: '',
    liquidityProvision: '',
    withdrawal: '',
    governance: '',
    staking: '',
    registry: '',
    crossChainRouter: ''
  };

  const policies = {
    lpMinting: '',
    pADAMinting: ''
  };

  for (const computed of computedAddresses) {
    contracts[computed.contractName] = computed;

    if (computed.address) {
      addresses[computed.contractName] = computed.address;

      // Map to structured format
      switch (computed.contractName) {
        case 'swap_validator':
          validators.swap = computed.address;
          break;
        case 'liquidity_provision_validator':
          validators.liquidityProvision = computed.address;
          break;
        case 'withdrawal_validator':
          validators.withdrawal = computed.address;
          break;
        case 'governance_validator':
          validators.governance = computed.address;
          break;
        case 'liquid_staking_validator':
          validators.staking = computed.address;
          break;
        case 'pool_registry_validator':
          validators.registry = computed.address;
          break;
        case 'cross_chain_router_validator':
          validators.crossChainRouter = computed.address;
          break;
      }
    }

    if (computed.policyId) {
      policyIds[computed.contractName] = computed.policyId;

      // Map to structured format
      switch (computed.contractName) {
        case 'lp_minting_policy':
          policies.lpMinting = computed.policyId;
          break;
        case 'pADA_minting_policy':
          policies.pADAMinting = computed.policyId;
          break;
      }
    }
  }

  return {
    network,
    deployedAt: new Date().toISOString(),
    validators,
    policies,
    addresses,
    policyIds,
    contracts
  };
}

// =============================================================================
// DEPLOYMENT PERSISTENCE
// =============================================================================

async function saveDeploymentAddresses(deploymentData: DeploymentAddresses): Promise<void> {
  // Save to deployment/addresses.json
  const addressesPath = path.join(process.cwd(), 'deployment', 'addresses.json');
  await fs.writeFile(addressesPath, JSON.stringify(deploymentData, null, 2));

  // Also save timestamped version for history
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const historyPath = path.join(
    process.cwd(),
    'deployment',
    'json',
    `deployment-${deploymentData.network}-${timestamp}.json`
  );

  // Ensure json directory exists
  const jsonDir = path.dirname(historyPath);
  try {
    await fs.access(jsonDir);
  } catch (error) {
    await fs.mkdir(jsonDir, { recursive: true });
  }

  await fs.writeFile(historyPath, JSON.stringify(deploymentData, null, 2));

  console.log(`   💾 Current: ${addressesPath}`);
  console.log(`   📚 History: ${historyPath}`);
}

// =============================================================================
// DEPLOYMENT SUMMARY
// =============================================================================

function displayDeploymentSummary(deploymentData: DeploymentAddresses): void {
  console.log('🎉 Deployment Summary');
  console.log('='.repeat(60));
  console.log(`📡 Network: ${deploymentData.network}`);
  console.log(`⏰ Deployed: ${deploymentData.deployedAt}`);
  console.log(`📦 Contracts: ${Object.keys(deploymentData.contracts).length}`);
  console.log(`🏠 Addresses: ${Object.keys(deploymentData.addresses).length}`);
  console.log(`🔑 Policy IDs: ${Object.keys(deploymentData.policyIds).length}`);
  console.log('');

  // Display structured validators
  console.log('🏛️ Validator Addresses:');
  for (const [name, address] of Object.entries(deploymentData.validators)) {
    if (address) {
      console.log(`   ${name}: ${address}`);
    }
  }
  console.log('');

  // Display structured policies
  console.log('🔑 Minting Policy IDs:');
  for (const [name, policyId] of Object.entries(deploymentData.policies)) {
    if (policyId) {
      console.log(`   ${name}: ${policyId}`);
    }
  }
  console.log('');

  // Legacy format for backward compatibility
  if (Object.keys(deploymentData.addresses).length > 0) {
    console.log('📋 Legacy Contract Addresses:');
    for (const [name, address] of Object.entries(deploymentData.addresses)) {
      console.log(`   ${name}: ${address}`);
    }
    console.log('');
  }
}

// =============================================================================
// SCRIPT EXECUTION
// =============================================================================

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
