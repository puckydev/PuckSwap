#!/usr/bin/env tsx

/**
 * Test Script for tPUCKY Minting Functionality
 * 
 * This script validates the mint-tPucky.ts script without actually minting tokens.
 * It performs dry-run validation of all components and configurations.
 * 
 * Usage:
 *   npx tsx scripts/test-mint-tPucky.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Test imports from the minting script dependencies
import { getEnvironmentConfig } from "../src/lib/environment-config";
import { createLucidInstance } from "../src/lib/lucid-config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Test environment configuration
 */
function testEnvironmentConfig(): boolean {
  console.log('🧪 Testing environment configuration...');
  
  try {
    const envConfig = getEnvironmentConfig();
    
    console.log(`   Network: ${envConfig.network}`);
    console.log(`   Lucid Network: ${envConfig.lucidNetwork}`);
    console.log(`   API Key: ${envConfig.blockfrostApiKey.substring(0, 8)}...`);
    console.log(`   Is Testnet: ${envConfig.isTestnet}`);
    
    if (envConfig.lucidNetwork !== "Preprod") {
      console.error('   ❌ Network should be Preprod for tPUCKY minting');
      return false;
    }
    
    if (!envConfig.blockfrostApiKey.startsWith('preprod')) {
      console.error('   ❌ API key should be for Preprod network');
      return false;
    }
    
    console.log('   ✅ Environment configuration valid');
    return true;
    
  } catch (error) {
    console.error('   ❌ Environment configuration failed:', error);
    return false;
  }
}

/**
 * Test Lucid Evolution initialization
 */
async function testLucidInitialization(): Promise<boolean> {
  console.log('🧪 Testing Lucid Evolution initialization...');
  
  try {
    const lucid = await createLucidInstance({
      network: "Preprod"
    });
    
    if (!lucid) {
      console.error('   ❌ Failed to create Lucid instance');
      return false;
    }
    
    console.log('   ✅ Lucid Evolution initialized successfully');
    return true;
    
  } catch (error) {
    console.error('   ❌ Lucid initialization failed:', error);
    return false;
  }
}

/**
 * Test deployment addresses file structure
 */
function testDeploymentAddresses(): boolean {
  console.log('🧪 Testing deployment addresses configuration...');
  
  try {
    const addressesPath = path.join(PROJECT_ROOT, 'deployment', 'addresses.json');
    
    if (!fs.existsSync(addressesPath)) {
      console.error('   ❌ deployment/addresses.json not found');
      return false;
    }
    
    const content = fs.readFileSync(addressesPath, 'utf-8');
    const addresses = JSON.parse(content);
    
    if (!addresses.testTokens) {
      console.error('   ❌ testTokens section missing from addresses.json');
      return false;
    }
    
    if (!addresses.testTokens.tPucky) {
      console.error('   ❌ tPucky configuration missing from testTokens');
      return false;
    }
    
    console.log('   ✅ Deployment addresses structure valid');
    return true;
    
  } catch (error) {
    console.error('   ❌ Deployment addresses test failed:', error);
    return false;
  }
}

/**
 * Test seed file template
 */
function testSeedTemplate(): boolean {
  console.log('🧪 Testing seed file template...');
  
  try {
    const templatePath = path.join(__dirname, 'wallet.seed.template');
    
    if (!fs.existsSync(templatePath)) {
      console.error('   ❌ wallet.seed.template not found');
      return false;
    }
    
    const content = fs.readFileSync(templatePath, 'utf-8');
    
    if (!content.includes('abandon abandon abandon')) {
      console.error('   ❌ Template should contain example seed phrase');
      return false;
    }
    
    console.log('   ✅ Seed file template valid');
    return true;
    
  } catch (error) {
    console.error('   ❌ Seed template test failed:', error);
    return false;
  }
}

/**
 * Test script file structure
 */
function testScriptStructure(): boolean {
  console.log('🧪 Testing script file structure...');
  
  try {
    const mintScriptPath = path.join(__dirname, 'mint-tPucky.ts');
    const readmePath = path.join(__dirname, 'README-mint-tPucky.md');
    
    if (!fs.existsSync(mintScriptPath)) {
      console.error('   ❌ mint-tPucky.ts not found');
      return false;
    }
    
    if (!fs.existsSync(readmePath)) {
      console.error('   ❌ README-mint-tPucky.md not found');
      return false;
    }
    
    // Check if script is executable
    const scriptContent = fs.readFileSync(mintScriptPath, 'utf-8');
    
    if (!scriptContent.includes('#!/usr/bin/env tsx')) {
      console.error('   ❌ Script missing shebang line');
      return false;
    }
    
    if (!scriptContent.includes('@lucid-evolution/lucid')) {
      console.error('   ❌ Script missing Lucid Evolution imports');
      return false;
    }
    
    console.log('   ✅ Script file structure valid');
    return true;
    
  } catch (error) {
    console.error('   ❌ Script structure test failed:', error);
    return false;
  }
}

/**
 * Test gitignore configuration
 */
function testGitignore(): boolean {
  console.log('🧪 Testing .gitignore configuration...');
  
  try {
    const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
    
    if (!fs.existsSync(gitignorePath)) {
      console.error('   ❌ .gitignore not found');
      return false;
    }
    
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    
    if (!content.includes('*.seed')) {
      console.error('   ❌ .gitignore missing *.seed pattern');
      return false;
    }
    
    console.log('   ✅ .gitignore configuration valid');
    return true;
    
  } catch (error) {
    console.error('   ❌ .gitignore test failed:', error);
    return false;
  }
}

/**
 * Main test execution
 */
async function main(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 PuckSwap tPUCKY Minting Script Test Suite');
  console.log('='.repeat(60));
  
  const tests = [
    { name: 'Environment Configuration', fn: testEnvironmentConfig },
    { name: 'Lucid Evolution Initialization', fn: testLucidInitialization },
    { name: 'Deployment Addresses', fn: testDeploymentAddresses },
    { name: 'Seed File Template', fn: testSeedTemplate },
    { name: 'Script File Structure', fn: testScriptStructure },
    { name: 'Gitignore Configuration', fn: testGitignore }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = typeof test.fn === 'function' 
        ? await test.fn() 
        : test.fn();
        
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Test "${test.name}" threw an error:`, error);
      failed++;
    }
    
    console.log(''); // Add spacing between tests
  }
  
  console.log('='.repeat(60));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! tPUCKY minting script is ready to use.');
    console.log('\nNext steps:');
    console.log('1. Create wallet.seed file with your Preprod testnet seed phrase');
    console.log('2. Ensure wallet has at least 5 ADA on Preprod testnet');
    console.log('3. Run: npx tsx scripts/mint-tPucky.ts --seed-file ./wallet.seed');
  } else {
    console.log('❌ Some tests failed. Please fix the issues before using the script.');
    process.exit(1);
  }
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
}
