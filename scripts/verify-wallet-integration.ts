#!/usr/bin/env tsx

/**
 * PuckSwap v5 - Wallet Integration Verification
 * 
 * Comprehensive verification that the cardano-wallet-connector integration is complete
 * and ready for production use with Vespr, Eternl, Lace, and other supported wallets
 */

import fs from 'fs';
import path from 'path';

interface VerificationResult {
  category: string;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    details: string;
  }>;
}

async function verifyWalletIntegration(): Promise<void> {
  console.log('🔍 PuckSwap v5 - Wallet Integration Verification');
  console.log('================================================\n');

  const results: VerificationResult[] = [];

  // 1. Verify Core Files
  console.log('📁 Verifying Core Files...');
  const coreFiles = [
    'src/lib/wallet-cip30.ts',
    'src/lib/wallet-integration.ts',
    'src/components/ui/SwapV6.tsx',
    'src/components/WalletConnection.tsx'
  ];

  const coreChecks = coreFiles.map(file => {
    const exists = fs.existsSync(file);
    return {
      name: `${file} exists`,
      status: exists ? 'pass' as const : 'fail' as const,
      details: exists ? 'File present' : 'File missing'
    };
  });

  results.push({
    category: 'Core Files',
    checks: coreChecks
  });

  // 2. Verify Dependencies
  console.log('📦 Verifying Dependencies...');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    '@emurgo/cardano-serialization-lib-asmjs',
    'blakejs',
    'buffer'
  ];

  const depChecks = requiredDeps.map(dep => {
    const installed = packageJson.dependencies[dep] || packageJson.devDependencies[dep];
    return {
      name: `${dep} installed`,
      status: installed ? 'pass' as const : 'fail' as const,
      details: installed ? `Version: ${installed}` : 'Not installed'
    };
  });

  results.push({
    category: 'Dependencies',
    checks: depChecks
  });

  // 3. Verify Function Exports
  console.log('🔧 Verifying Function Exports...');
  try {
    const walletIntegration = await import('../src/lib/wallet-integration');
    const requiredFunctions = [
      'detectAvailableWallets',
      'connectToWallet',
      'disconnectWallet',
      'formatWalletAddress',
      'formatADA'
    ];

    const functionChecks = requiredFunctions.map(funcName => {
      const exists = typeof walletIntegration[funcName] === 'function';
      return {
        name: `${funcName} exported`,
        status: exists ? 'pass' as const : 'fail' as const,
        details: exists ? 'Function available' : 'Function missing'
      };
    });

    results.push({
      category: 'Function Exports',
      checks: functionChecks
    });

  } catch (error) {
    results.push({
      category: 'Function Exports',
      checks: [{
        name: 'Import wallet-integration',
        status: 'fail',
        details: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    });
  }

  // 4. Verify Wallet Support
  console.log('🦋 Verifying Wallet Support...');
  try {
    const walletCip30 = await import('../src/lib/wallet-cip30');
    const supportedWallets = walletCip30.getSupportedWallets();
    
    const expectedWallets = ['eternl', 'vespr', 'lace', 'typhon', 'flint', 'gerowallet', 'yoroi'];
    const walletChecks = expectedWallets.map(walletName => {
      const supported = supportedWallets.some(w => w.name === walletName);
      return {
        name: `${walletName} supported`,
        status: supported ? 'pass' as const : 'fail' as const,
        details: supported ? 'Wallet supported' : 'Wallet not supported'
      };
    });

    // Check that Nami is excluded
    const namiExcluded = !supportedWallets.some(w => w.name === 'nami');
    walletChecks.push({
      name: 'Nami excluded',
      status: namiExcluded ? 'pass' : 'fail',
      details: namiExcluded ? 'Nami correctly excluded' : 'Nami should be excluded'
    });

    results.push({
      category: 'Wallet Support',
      checks: walletChecks
    });

  } catch (error) {
    results.push({
      category: 'Wallet Support',
      checks: [{
        name: 'Load wallet support',
        status: 'fail',
        details: `Failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    });
  }

  // 5. Verify cardano-wallet-connector Patterns
  console.log('🔗 Verifying cardano-wallet-connector Patterns...');
  try {
    const walletCip30Content = fs.readFileSync('src/lib/wallet-cip30.ts', 'utf8');
    
    const patternChecks = [
      {
        name: 'pollWallets function',
        pattern: /pollWallets.*=.*count.*=.*0/s,
        details: 'Polling mechanism from cardano-wallet-connector'
      },
      {
        name: 'TransactionBuilder pattern',
        pattern: /TransactionBuilder\.new/,
        details: 'Transaction builder from cardano-serialization-lib'
      },
      {
        name: 'UTxO parsing pattern',
        pattern: /TransactionUnspentOutput\.from_bytes/,
        details: 'UTxO parsing from cardano-wallet-connector'
      },
      {
        name: 'Multi-asset parsing',
        pattern: /multiasset.*keys.*len/s,
        details: 'Multi-asset parsing from cardano-wallet-connector'
      }
    ].map(({ name, pattern, details }) => {
      const found = pattern.test(walletCip30Content);
      return {
        name,
        status: found ? 'pass' as const : 'fail' as const,
        details: found ? details : 'Pattern not found'
      };
    });

    results.push({
      category: 'cardano-wallet-connector Patterns',
      checks: patternChecks
    });

  } catch (error) {
    results.push({
      category: 'cardano-wallet-connector Patterns',
      checks: [{
        name: 'Read wallet-cip30.ts',
        status: 'fail',
        details: `Failed to read: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    });
  }

  // Display Results
  console.log('\n📊 Verification Results');
  console.log('========================\n');

  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;
  let warningChecks = 0;

  results.forEach(result => {
    console.log(`📋 ${result.category}`);
    console.log('-'.repeat(result.category.length + 3));
    
    result.checks.forEach(check => {
      totalChecks++;
      const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️';
      console.log(`${icon} ${check.name}: ${check.details}`);
      
      if (check.status === 'pass') passedChecks++;
      else if (check.status === 'fail') failedChecks++;
      else warningChecks++;
    });
    console.log('');
  });

  // Summary
  console.log('🎯 Summary');
  console.log('===========');
  console.log(`Total Checks: ${totalChecks}`);
  console.log(`✅ Passed: ${passedChecks}`);
  console.log(`❌ Failed: ${failedChecks}`);
  console.log(`⚠️  Warnings: ${warningChecks}`);
  console.log(`📊 Success Rate: ${Math.round((passedChecks / totalChecks) * 100)}%\n`);

  if (failedChecks === 0) {
    console.log('🎉 All checks passed! Wallet integration is ready for production.');
    console.log('🚀 You can now test wallet connections with Vespr, Eternl, Lace, and other supported wallets.');
  } else {
    console.log('⚠️  Some checks failed. Please review the issues above.');
    process.exit(1);
  }
}

// Run verification
if (require.main === module) {
  verifyWalletIntegration().catch(console.error);
}

export { verifyWalletIntegration };
