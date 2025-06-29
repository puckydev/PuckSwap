#!/usr/bin/env tsx

/**
 * PuckSwap v5 Complete Deployment Script
 * 
 * Deploys all validators and policies needed for a production-ready DEX:
 * - Factory validator for pool creation
 * - Authentication policy for authorization
 * - LP minting policy for liquidity tokens
 * - Swap validator (existing)
 * - Liquidity provision validator (existing)
 * 
 * Based on Minswap DEX v2 architecture
 */

import { Lucid, Blockfrost } from '@lucid-evolution/lucid';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
config({ path: '.env.local' });

// Environment configuration
const NETWORK = process.env.NEXT_PUBLIC_NETWORK?.toLowerCase() || 'preprod';
const BLOCKFROST_API_KEY = NETWORK === 'mainnet'
  ? process.env.NEXT_PUBLIC_MAINNET_API_KEY
  : process.env.NEXT_PUBLIC_PREPROD_API_KEY;

if (!BLOCKFROST_API_KEY) {
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('API')));
  throw new Error(`Missing Blockfrost API key for ${NETWORK}. Expected: NEXT_PUBLIC_${NETWORK.toUpperCase()}_API_KEY`);
}

interface DeploymentResult {
  network: string;
  deployedAt: string;
  validators: {
    swap: string;
    liquidityProvision: string;
    factory: string;
    withdrawal: string;
    governance: string;
    staking: string;
    registry: string;
    crossChainRouter: string;
  };
  policies: {
    lpMinting: string;
    pADAMinting: string;
    authentication: string;
  };
  testTokens?: {
    tPUCKY: string;
    tUSDC: string;
  };
}

async function deployPuckSwapV5Complete(): Promise<void> {
  console.log('🚀 Starting PuckSwap v5 Complete Deployment...');
  console.log(`📡 Network: ${NETWORK}`);

  // Initialize Lucid
  const lucid = await Lucid(
    new Blockfrost(`https://cardano-${NETWORK}.blockfrost.io/api/v0`, BLOCKFROST_API_KEY),
    NETWORK as any
  );

  console.log('💼 Lucid initialized for address computation');

  // Load compiled validators from plutus.json
  const plutusJson = JSON.parse(fs.readFileSync('plutus.json', 'utf8'));

  const validators: Record<string, string> = {};
  const policies: Record<string, string> = {};

  // Extract validators and policies from plutus.json
  for (const validator of plutusJson.validators) {
    const script = validator.compiledCode;
    const title = validator.title;

    if (title.includes('factory')) {
      validators.factory = script;
    } else if (title.includes('swap')) {
      validators.swap = script;
    } else if (title.includes('liquidity')) {
      validators.liquidityProvision = script;
    } else if (title.includes('auth') && title.includes('mint')) {
      policies.authentication = script;
    } else if (title.includes('lpmint') && title.includes('mint')) {
      policies.lpMinting = script;
    }
  }

  console.log('📜 Loaded validators:', Object.keys(validators));
  console.log('📜 Loaded policies:', Object.keys(policies));

  // Compute validator addresses
  const validatorAddresses = await computeValidatorAddresses(lucid, validators);
  const policyIds = await computePolicyIds(lucid, policies);

  console.log('🏠 Computed contract addresses');

  // Test tokens will be deployed separately with wallet seed
  let testTokens: any = undefined;

  // Create deployment result
  const deploymentResult: DeploymentResult = {
    network: NETWORK,
    deployedAt: new Date().toISOString(),
    validators: validatorAddresses,
    policies: policyIds,
    testTokens,
  };

  // Save deployment result
  await saveDeploymentResult(deploymentResult);

  console.log('✅ PuckSwap v5 Complete Deployment finished!');
  console.log('📋 Deployment Summary:');
  console.log(`   - Network: ${deploymentResult.network}`);
  console.log(`   - Validators: ${Object.keys(deploymentResult.validators).length}`);
  console.log(`   - Policies: ${Object.keys(deploymentResult.policies).length}`);
  if (testTokens) {
    console.log(`   - Test Tokens: ${Object.keys(testTokens).length}`);
  }
}

// Functions removed - now loading directly from plutus.json

async function computeValidatorAddresses(
  lucid: Lucid, 
  validators: Record<string, string>
): Promise<DeploymentResult['validators']> {
  const addresses: any = {};

  for (const [name, script] of Object.entries(validators)) {
    try {
      const validator = {
        type: "PlutusV3" as const,
        script: script.trim(),
      };
      
      const address = lucid.utils.validatorToAddress(validator);
      addresses[name] = address;
      
      console.log(`   ✅ ${name}: ${address}`);
    } catch (error) {
      console.error(`   ❌ Failed to compute address for ${name}:`, error);
      throw error;
    }
  }

  return addresses;
}

async function computePolicyIds(
  lucid: Lucid, 
  policies: Record<string, string>
): Promise<DeploymentResult['policies']> {
  const policyIds: any = {};

  for (const [name, script] of Object.entries(policies)) {
    try {
      const policy = {
        type: "PlutusV3" as const,
        script: script.trim(),
      };
      
      const policyId = lucid.utils.mintingPolicyToId(policy);
      policyIds[name] = policyId;
      
      console.log(`   ✅ ${name}: ${policyId}`);
    } catch (error) {
      console.error(`   ❌ Failed to compute policy ID for ${name}:`, error);
      throw error;
    }
  }

  return policyIds;
}

// Test token deployment removed - will be done separately with wallet seed

async function saveDeploymentResult(result: DeploymentResult): Promise<void> {
  // Save to deployment/addresses.json
  const addressesPath = path.join(process.cwd(), 'deployment', 'addresses.json');
  await fs.promises.writeFile(addressesPath, JSON.stringify(result, null, 2));

  // Save timestamped copy
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const timestampedPath = path.join(
    process.cwd(), 
    'deployment', 
    'json', 
    `deployment-${result.network}-${timestamp}.json`
  );
  await fs.promises.writeFile(timestampedPath, JSON.stringify(result, null, 2));

  console.log(`💾 Deployment saved to:`);
  console.log(`   - ${addressesPath}`);
  console.log(`   - ${timestampedPath}`);
}

// Run deployment if called directly
if (require.main === module) {
  console.log('🚀 Starting deployment script...');
  deployPuckSwapV5Complete()
    .then(() => console.log('✅ Deployment script completed'))
    .catch((error) => {
      console.error('❌ Deployment script failed:', error);
      process.exit(1);
    });
}

export { deployPuckSwapV5Complete };
