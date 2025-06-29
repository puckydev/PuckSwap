#!/usr/bin/env node

/**
 * PuckSwap v5 Environment Configuration Test
 * 
 * This script verifies that all environment variables are properly configured
 * for local development and testing.
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 PuckSwap v5 Environment Configuration Test');
console.log('='.repeat(60));
console.log('');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

console.log('📁 Environment File Check:');
console.log(`   .env.local exists: ${envExists ? '✅ YES' : '❌ NO'}`);

if (!envExists) {
  console.log('');
  console.log('❌ ERROR: .env.local file not found!');
  console.log('');
  console.log('Please create .env.local with the following content:');
  console.log('');
  console.log('# Network Configuration');
  console.log('NETWORK=preprod');
  console.log('NEXT_PUBLIC_NETWORK=Preprod');
  console.log('');
  console.log('# Demo Mode');
  console.log('NEXT_PUBLIC_DEMO_MODE=true');
  console.log('');
  console.log('# Blockfrost API Keys');
  console.log('NEXT_PUBLIC_BLOCKFROST_API_KEY=preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL');
  console.log('');
  process.exit(1);
}

// Load environment variables
require('dotenv').config({ path: envPath });

console.log('');
console.log('🔧 Environment Variables Check:');

const requiredVars = [
  'NEXT_PUBLIC_DEMO_MODE',
  'NEXT_PUBLIC_NETWORK',
  'NEXT_PUBLIC_BLOCKFROST_API_KEY'
];

const optionalVars = [
  'NEXT_PUBLIC_SWAP_VALIDATOR_ADDRESS',
  'NEXT_PUBLIC_LIQUIDITY_VALIDATOR_ADDRESS',
  'NEXT_PUBLIC_LP_POLICY_ID',
  'NEXT_PUBLIC_PADA_POLICY_ID'
];

let allRequired = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const exists = !!value;
  console.log(`   ${varName}: ${exists ? '✅ SET' : '❌ MISSING'}`);
  if (exists && varName === 'NEXT_PUBLIC_DEMO_MODE') {
    console.log(`      Value: ${value} ${value === 'true' ? '(Demo mode enabled)' : '(Live mode)'}`);
  } else if (exists && varName === 'NEXT_PUBLIC_NETWORK') {
    console.log(`      Value: ${value}`);
  } else if (exists && varName === 'NEXT_PUBLIC_BLOCKFROST_API_KEY') {
    console.log(`      Value: ${value.substring(0, 8)}... (${value.length} chars)`);
  }
  if (!exists) allRequired = false;
});

console.log('');
console.log('🔧 Optional Variables Check:');

optionalVars.forEach(varName => {
  const value = process.env[varName];
  const exists = !!value;
  console.log(`   ${varName}: ${exists ? '✅ SET' : '⚠️  NOT SET'}`);
  if (exists) {
    console.log(`      Value: ${value.substring(0, 20)}...`);
  }
});

console.log('');
console.log('📊 Configuration Summary:');
console.log(`   Demo Mode: ${process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? '✅ ENABLED (Safe for testing)' : '⚠️  DISABLED (Live mode)'}`);
console.log(`   Network: ${process.env.NEXT_PUBLIC_NETWORK || 'NOT SET'}`);
console.log(`   API Key: ${process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY ? '✅ CONFIGURED' : '❌ MISSING'}`);

console.log('');
console.log('🎯 Recommendations:');

if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
  console.log('   ⚠️  Consider enabling demo mode for safe local testing');
  console.log('      Set NEXT_PUBLIC_DEMO_MODE=true in .env.local');
}

if (!process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY) {
  console.log('   ❌ Blockfrost API key is required for blockchain connectivity');
  console.log('      Add NEXT_PUBLIC_BLOCKFROST_API_KEY to .env.local');
}

if (process.env.NEXT_PUBLIC_NETWORK !== 'Preprod') {
  console.log('   ⚠️  Consider using Preprod network for development');
  console.log('      Set NEXT_PUBLIC_NETWORK=Preprod in .env.local');
}

console.log('');

if (allRequired) {
  console.log('✅ Environment configuration is valid!');
  console.log('🚀 You can now run: npm run dev');
  console.log('🌐 Then visit: http://localhost:3000/v5');
} else {
  console.log('❌ Environment configuration has issues!');
  console.log('📝 Please fix the missing variables and run this test again.');
  process.exit(1);
}

console.log('');
console.log('📚 Next Steps:');
console.log('   1. Run: npm run dev');
console.log('   2. Open: http://localhost:3000/v5');
console.log('   3. Verify demo mode banner is visible');
console.log('   4. Test all v5 components');
console.log('');
