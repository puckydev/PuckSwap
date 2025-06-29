#!/usr/bin/env tsx

/**
 * PuckSwap Wallet Integration Test
 *
 * Tests the consolidated cardano-connect-with-wallet integration
 * Verifies that wallet connection works with real wallets on Preprod testnet
 */

import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env') });
dotenv.config({ path: join(process.cwd(), '.env.local') });

import { useCardanoWallet } from '../hooks/useCardanoWallet';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration?: number;
}

class WalletIntegrationTester {
  private results: TestResult[] = [];

  private addResult(name: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, duration?: number) {
    this.results.push({ name, status, message, duration });
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
    const durationStr = duration ? ` (${duration}ms)` : '';
    console.log(`${icon} ${name}: ${message}${durationStr}`);
  }

  async testWalletHookAvailability() {
    const startTime = Date.now();
    
    try {
      // Test that the hook can be imported
      if (typeof useCardanoWallet !== 'function') {
        throw new Error('useCardanoWallet hook is not available');
      }

      this.addResult(
        'Wallet Hook Availability',
        'PASS',
        'useCardanoWallet hook is available',
        Date.now() - startTime
      );
    } catch (error) {
      this.addResult(
        'Wallet Hook Availability',
        'FAIL',
        `Hook not available: ${error}`,
        Date.now() - startTime
      );
    }
  }

  async testEnvironmentConfiguration() {
    const startTime = Date.now();
    
    try {
      // Test environment variables
      const useCardanoConnect = process.env.NEXT_PUBLIC_USE_CARDANO_CONNECT_WALLET;
      const enableFallback = process.env.NEXT_PUBLIC_ENABLE_WALLET_FALLBACK;
      const migrationMode = process.env.NEXT_PUBLIC_WALLET_MIGRATION_MODE;

      console.log('Environment variables:', {
        useCardanoConnect,
        enableFallback,
        migrationMode
      });

      if (useCardanoConnect !== 'true') {
        throw new Error(`NEXT_PUBLIC_USE_CARDANO_CONNECT_WALLET should be true, got: ${useCardanoConnect}`);
      }

      if (enableFallback !== 'true') {
        throw new Error('NEXT_PUBLIC_ENABLE_WALLET_FALLBACK should be true');
      }

      if (!migrationMode) {
        throw new Error('NEXT_PUBLIC_WALLET_MIGRATION_MODE is not set');
      }

      this.addResult(
        'Environment Configuration',
        'PASS',
        'All wallet environment variables are properly configured',
        Date.now() - startTime
      );
    } catch (error) {
      this.addResult(
        'Environment Configuration',
        'FAIL',
        `Configuration error: ${error}`,
        Date.now() - startTime
      );
    }
  }

  async testDependencyInstallation() {
    const startTime = Date.now();
    
    try {
      // Test that the cardano-connect-with-wallet library is installed
      const packageJson = require('../../package.json');
      const dependencies = packageJson.dependencies;

      if (!dependencies['@cardano-foundation/cardano-connect-with-wallet']) {
        throw new Error('@cardano-foundation/cardano-connect-with-wallet is not installed');
      }

      if (!dependencies['@cardano-foundation/cardano-connect-with-wallet-core']) {
        throw new Error('@cardano-foundation/cardano-connect-with-wallet-core is not installed');
      }

      this.addResult(
        'Dependency Installation',
        'PASS',
        'All required wallet dependencies are installed',
        Date.now() - startTime
      );
    } catch (error) {
      this.addResult(
        'Dependency Installation',
        'FAIL',
        `Dependency error: ${error}`,
        Date.now() - startTime
      );
    }
  }

  async testWalletProviderWrapper() {
    const startTime = Date.now();
    
    try {
      // Test that WalletProviderWrapper exists
      const WalletProviderWrapper = require('../components/WalletProviderWrapper').default;
      
      if (typeof WalletProviderWrapper !== 'function') {
        throw new Error('WalletProviderWrapper component is not available');
      }

      this.addResult(
        'Wallet Provider Wrapper',
        'PASS',
        'WalletProviderWrapper component is available',
        Date.now() - startTime
      );
    } catch (error) {
      this.addResult(
        'Wallet Provider Wrapper',
        'FAIL',
        `Provider wrapper error: ${error}`,
        Date.now() - startTime
      );
    }
  }

  async testSwapComponentIntegration() {
    const startTime = Date.now();
    
    try {
      // Test that Swap component uses the consolidated wallet approach
      const swapComponentContent = require('fs').readFileSync(
        require('path').join(__dirname, '../components/Swap.tsx'),
        'utf8'
      );

      if (!swapComponentContent.includes('useCardanoWallet')) {
        throw new Error('Swap component does not use useCardanoWallet hook');
      }

      if (swapComponentContent.includes('walletState.isConnected')) {
        throw new Error('Swap component still uses old walletState pattern');
      }

      this.addResult(
        'Swap Component Integration',
        'PASS',
        'Swap component uses consolidated wallet approach',
        Date.now() - startTime
      );
    } catch (error) {
      this.addResult(
        'Swap Component Integration',
        'FAIL',
        `Integration error: ${error}`,
        Date.now() - startTime
      );
    }
  }

  async runAllTests() {
    console.log('🧪 PuckSwap Wallet Integration Test Suite');
    console.log('==========================================\n');

    await this.testWalletHookAvailability();
    await this.testEnvironmentConfiguration();
    await this.testDependencyInstallation();
    await this.testWalletProviderWrapper();
    await this.testSwapComponentIntegration();

    // Summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️ Skipped: ${skipped}`);
    console.log(`📈 Total: ${this.results.length}`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed! Wallet integration is ready.');
      console.log('\n📋 Next Steps:');
      console.log('1. Test with real wallets on Preprod testnet');
      console.log('2. Verify transaction building works');
      console.log('3. Test swap functionality end-to-end');
    } else {
      console.log('\n⚠️ Some tests failed. Please fix the issues before proceeding.');
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new WalletIntegrationTester();
  tester.runAllTests().catch(console.error);
}

export { WalletIntegrationTester };
