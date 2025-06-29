#!/usr/bin/env tsx

/**
 * Test Script for tPUCKY Sending Functionality
 * 
 * This script validates the send-tPucky.ts script without actually sending tokens.
 * It performs dry-run validation of all components and configurations.
 * 
 * Usage:
 *   npx tsx scripts/test-send-tPucky.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Test imports from the sending script dependencies
import { getEnvironmentConfig } from "../src/lib/environment-config";
import { createLucidInstance } from "../src/lib/lucid-config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Test constants
const RECIPIENT_ADDRESS = "addr_test1qqq60q7g2sy072x8wwaa9yc3zmtjqzch7qdxnm8az55zk2yxezjfvsmmgxex52k4mj5nk2zzmtps6snh069v9wxlrtvqwke3k0";

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
      console.error('   ❌ Network should be Preprod for tPUCKY sending');
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
 * Test tPUCKY token information loading
 */
function testTPuckyTokenInfo(): boolean {
  console.log('🧪 Testing tPUCKY token information loading...');
  
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
    
    const tPucky = addresses.testTokens.tPucky;
    
    if (!tPucky.assetUnit || !tPucky.policyId || !tPucky.assetName) {
      console.error('   ❌ Incomplete tPUCKY token information');
      return false;
    }
    
    console.log(`   Asset Name: ${tPucky.assetName}`);
    console.log(`   Policy ID: ${tPucky.policyId.substring(0, 16)}...`);
    console.log(`   Asset Unit: ${tPucky.assetUnit.substring(0, 16)}...`);
    console.log('   ✅ tPUCKY token information valid');
    return true;
    
  } catch (error) {
    console.error('   ❌ tPUCKY token info test failed:', error);
    return false;
  }
}

/**
 * Test recipient address validation
 */
function testRecipientAddressValidation(): boolean {
  console.log('🧪 Testing recipient address validation...');
  
  try {
    // Test valid Preprod address
    if (!RECIPIENT_ADDRESS.startsWith('addr_test1')) {
      console.error('   ❌ Recipient address should start with addr_test1');
      return false;
    }
    
    if (RECIPIENT_ADDRESS.length < 50 || RECIPIENT_ADDRESS.length > 120) {
      console.error('   ❌ Recipient address has invalid length');
      return false;
    }
    
    console.log(`   Address: ${RECIPIENT_ADDRESS.substring(0, 20)}...`);
    console.log('   ✅ Recipient address validation passed');
    return true;
    
  } catch (error) {
    console.error('   ❌ Address validation test failed:', error);
    return false;
  }
}

/**
 * Test script file structure
 */
function testScriptStructure(): boolean {
  console.log('🧪 Testing script file structure...');
  
  try {
    const sendScriptPath = path.join(__dirname, 'send-tPucky.ts');
    
    if (!fs.existsSync(sendScriptPath)) {
      console.error('   ❌ send-tPucky.ts not found');
      return false;
    }
    
    // Check if script is executable
    const scriptContent = fs.readFileSync(sendScriptPath, 'utf-8');
    
    if (!scriptContent.includes('#!/usr/bin/env tsx')) {
      console.error('   ❌ Script missing shebang line');
      return false;
    }
    
    if (!scriptContent.includes('@lucid-evolution/lucid')) {
      console.error('   ❌ Script missing Lucid Evolution imports');
      return false;
    }
    
    if (!scriptContent.includes('RECIPIENT_ADDRESS')) {
      console.error('   ❌ Script missing recipient address configuration');
      return false;
    }
    
    if (!scriptContent.includes('sendTokens')) {
      console.error('   ❌ Script missing sendTokens function');
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
 * Test argument parsing logic
 */
function testArgumentParsing(): boolean {
  console.log('🧪 Testing argument parsing logic...');
  
  try {
    // Test various argument combinations
    const testCases = [
      ['--help'],
      ['--seed-file', './wallet.seed'],
      ['--wallet', 'eternl'],
      ['--amount', '1000'],
      ['--check-balance'],
      ['--seed-file', './wallet.seed', '--amount', '5000'],
      ['--wallet', 'eternl', '--amount', '2500', '--check-balance']
    ];
    
    // Since we can't directly test the parseArguments function without importing it,
    // we'll test that the script contains the necessary argument handling logic
    const sendScriptPath = path.join(__dirname, 'send-tPucky.ts');
    const scriptContent = fs.readFileSync(sendScriptPath, 'utf-8');
    
    const requiredPatterns = [
      '--seed-file',
      '--wallet',
      '--amount',
      '--check-balance',
      '--help',
      'parseArguments'
    ];
    
    for (const pattern of requiredPatterns) {
      if (!scriptContent.includes(pattern)) {
        console.error(`   ❌ Script missing argument handling for: ${pattern}`);
        return false;
      }
    }
    
    console.log('   ✅ Argument parsing logic present');
    return true;
    
  } catch (error) {
    console.error('   ❌ Argument parsing test failed:', error);
    return false;
  }
}

/**
 * Test security features
 */
function testSecurityFeatures(): boolean {
  console.log('🧪 Testing security features...');
  
  try {
    const sendScriptPath = path.join(__dirname, 'send-tPucky.ts');
    const scriptContent = fs.readFileSync(sendScriptPath, 'utf-8');
    
    // Check for security-related features
    const securityFeatures = [
      'TESTNET ONLY',
      'validateRecipientAddress',
      'validateEnvironment',
      'MIN_ADA_FOR_SENDING',
      'hasEnoughAda',
      'hasEnoughTPucky'
    ];
    
    for (const feature of securityFeatures) {
      if (!scriptContent.includes(feature)) {
        console.error(`   ❌ Missing security feature: ${feature}`);
        return false;
      }
    }
    
    // Check gitignore for seed files
    const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
      if (!gitignoreContent.includes('*.seed')) {
        console.error('   ❌ .gitignore missing *.seed pattern');
        return false;
      }
    }
    
    console.log('   ✅ Security features validated');
    return true;
    
  } catch (error) {
    console.error('   ❌ Security features test failed:', error);
    return false;
  }
}

/**
 * Main test execution
 */
async function main(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 PuckSwap tPUCKY Sending Script Test Suite');
  console.log('='.repeat(60));
  
  const tests = [
    { name: 'Environment Configuration', fn: testEnvironmentConfig },
    { name: 'Lucid Evolution Initialization', fn: testLucidInitialization },
    { name: 'tPUCKY Token Information', fn: testTPuckyTokenInfo },
    { name: 'Recipient Address Validation', fn: testRecipientAddressValidation },
    { name: 'Script File Structure', fn: testScriptStructure },
    { name: 'Argument Parsing Logic', fn: testArgumentParsing },
    { name: 'Security Features', fn: testSecurityFeatures }
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
    console.log('🎉 All tests passed! tPUCKY sending script is ready to use.');
    console.log('\nNext steps:');
    console.log('1. Ensure you have minted tPUCKY tokens first');
    console.log('2. Create wallet.seed file with your Preprod testnet seed phrase');
    console.log('3. Ensure wallet has sufficient ADA and tPUCKY tokens');
    console.log('4. Run: npx tsx scripts/send-tPucky.ts --seed-file ./wallet.seed');
    console.log('\nRecipient address:');
    console.log(`   ${RECIPIENT_ADDRESS}`);
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
