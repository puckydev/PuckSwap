#!/usr/bin/env tsx

/**
 * PuckSwap v5 - Contract Address Computation
 * 
 * Computes contract addresses from compiled validators in plutus.json
 * Uses Lucid Evolution utilities to generate proper Cardano addresses
 */

import { Lucid, Blockfrost, validatorToAddress, mintingPolicyToId } from '@lucid-evolution/lucid';
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
  throw new Error(`Missing Blockfrost API key for ${NETWORK}`);
}

interface DeploymentResult {
  network: string;
  deployedAt: string;
  validators: Record<string, string>;
  policies: Record<string, string>;
}

async function computeContractAddresses(): Promise<void> {
  console.log('🏠 Computing PuckSwap v5 Contract Addresses...');
  console.log(`📡 Network: ${NETWORK}`);
  
  // Initialize Lucid
  const lucid = await Lucid(
    new Blockfrost(`https://cardano-${NETWORK}.blockfrost.io/api/v0`, BLOCKFROST_API_KEY),
    NETWORK as any
  );
  
  console.log('💼 Lucid initialized');
  
  // Load compiled validators from plutus.json
  const plutusJson = JSON.parse(fs.readFileSync('plutus.json', 'utf8'));
  
  const validators: Record<string, string> = {};
  const policies: Record<string, string> = {};
  
  // Extract validators and policies from plutus.json
  for (const validator of plutusJson.validators) {
    const script = validator.compiledCode;
    const title = validator.title;
    
    console.log(`📜 Processing: ${title}`);
    
    if (title.includes('factory') && title.includes('spend')) {
      validators.factory = script;
    } else if (title.includes('swap') && title.includes('spend')) {
      validators.swap = script;
    } else if (title.includes('liquidity') && title.includes('spend')) {
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
  const validatorAddresses: Record<string, string> = {};
  
  for (const [name, script] of Object.entries(validators)) {
    try {
      const validator = {
        type: "PlutusV3" as const,
        script: script.trim(),
      };
      
      const address = validatorToAddress('Preprod', validator);
      validatorAddresses[name] = address;
      
      console.log(`   ✅ ${name}: ${address}`);
    } catch (error) {
      console.error(`   ❌ Failed to compute address for ${name}:`, error);
    }
  }
  
  // Compute policy IDs
  const policyIds: Record<string, string> = {};
  
  for (const [name, script] of Object.entries(policies)) {
    try {
      const policy = {
        type: "PlutusV3" as const,
        script: script.trim(),
      };
      
      const policyId = mintingPolicyToId(policy);
      policyIds[name] = policyId;
      
      console.log(`   ✅ ${name}: ${policyId}`);
    } catch (error) {
      console.error(`   ❌ Failed to compute policy ID for ${name}:`, error);
    }
  }
  
  // Create deployment result
  const deploymentResult: DeploymentResult = {
    network: NETWORK,
    deployedAt: new Date().toISOString(),
    validators: validatorAddresses,
    policies: policyIds,
  };
  
  // Save deployment result
  const addressesPath = path.join(process.cwd(), 'deployment', 'addresses.json');
  fs.writeFileSync(addressesPath, JSON.stringify(deploymentResult, null, 2));
  
  // Save timestamped copy
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const timestampedPath = path.join(
    process.cwd(), 
    'deployment', 
    'json', 
    `deployment-${NETWORK}-${timestamp}.json`
  );
  fs.writeFileSync(timestampedPath, JSON.stringify(deploymentResult, null, 2));
  
  console.log('💾 Contract addresses saved to:');
  console.log(`   - ${addressesPath}`);
  console.log(`   - ${timestampedPath}`);
  
  console.log('🎉 Contract address computation completed!');
  console.log('📋 Summary:');
  console.log(`   - Network: ${deploymentResult.network}`);
  console.log(`   - Validators: ${Object.keys(deploymentResult.validators).length}`);
  console.log(`   - Policies: ${Object.keys(deploymentResult.policies).length}`);
}

// Run computation if called directly
if (require.main === module) {
  computeContractAddresses().catch(console.error);
}

export { computeContractAddresses };
