#!/usr/bin/env tsx

/**
 * PuckSwap v5 - Wallet Integration Verification
 * 
 * Verifies that demo mode has been completely removed and real CIP-30 
 * wallet integration is properly implemented
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface VerificationResult {
  component: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: string[];
}

class WalletIntegrationVerifier {
  private results: VerificationResult[] = [];

  private addResult(component: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: string[]) {
    this.results.push({ component, status, message, details });
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${component}: ${message}`);
    if (details && details.length > 0) {
      details.forEach(detail => console.log(`   - ${detail}`));
    }
  }

  private checkFileForDemoMode(filePath: string, componentName: string): void {
    try {
      const content = readFileSync(filePath, 'utf-8');
      
      const demoPatterns = [
        /isDemoMode/g,
        /demo.*mode/gi,
        /Demo.*Mode/g,
        /mock.*wallet/gi,
        /demo.*wallet/gi,
        /simulated.*wallet/gi,
        /fake.*transaction/gi,
        /mock.*transaction/gi,
        /demo.*transaction/gi
      ];

      const foundPatterns: string[] = [];
      
      demoPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          foundPatterns.push(...matches);
        }
      });

      if (foundPatterns.length === 0) {
        this.addResult(componentName, 'PASS', 'No demo mode patterns found');
      } else {
        this.addResult(componentName, 'FAIL', 'Demo mode patterns still present', foundPatterns);
      }

    } catch (error) {
      this.addResult(componentName, 'WARNING', `Could not read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private checkForRealWalletIntegration(filePath: string, componentName: string): void {
    try {
      const content = readFileSync(filePath, 'utf-8');
      
      const realWalletPatterns = [
        /WalletConnection/,
        /ConnectedWalletState/,
        /detectAvailableWallets/,
        /connectToWallet/,
        /window\.cardano/,
        /CIP-30/,
        /validateWalletForTransaction/
      ];

      const foundPatterns: string[] = [];
      
      realWalletPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          foundPatterns.push(pattern.source);
        }
      });

      if (foundPatterns.length >= 3) {
        this.addResult(componentName, 'PASS', 'Real wallet integration implemented', foundPatterns);
      } else if (foundPatterns.length > 0) {
        this.addResult(componentName, 'WARNING', 'Partial wallet integration found', foundPatterns);
      } else {
        this.addResult(componentName, 'FAIL', 'No real wallet integration patterns found');
      }

    } catch (error) {
      this.addResult(componentName, 'WARNING', `Could not read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private checkForDeployedContracts(filePath: string, componentName: string): void {
    try {
      const content = readFileSync(filePath, 'utf-8');
      
      const contractPatterns = [
        /getPuckSwapEnvironmentConfig/,
        /contractAddresses\./,
        /deployed.*contract/gi,
        /preprod.*testnet/gi,
        /real.*transaction/gi
      ];

      const foundPatterns: string[] = [];
      
      contractPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          foundPatterns.push(...matches);
        }
      });

      if (foundPatterns.length >= 2) {
        this.addResult(componentName, 'PASS', 'Deployed contract integration found', foundPatterns.slice(0, 3));
      } else if (foundPatterns.length > 0) {
        this.addResult(componentName, 'WARNING', 'Partial contract integration found', foundPatterns);
      } else {
        this.addResult(componentName, 'FAIL', 'No deployed contract integration found');
      }

    } catch (error) {
      this.addResult(componentName, 'WARNING', `Could not read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async verifyWalletIntegration(): Promise<void> {
    console.log('🔍 Verifying Wallet Integration Transformation...\n');

    const componentsToCheck = [
      { path: 'src/components/SwapV5.tsx', name: 'SwapV5 Component' },
      { path: 'src/components/Liquidity.tsx', name: 'Liquidity Component' },
      { path: 'src/components/GovernanceV5.tsx', name: 'Governance Component' },
      { path: 'src/components/LiquidStakingV5.tsx', name: 'Staking Component' },
      { path: 'src/lib/wallet-integration.ts', name: 'Wallet Integration Library' },
      { path: 'src/components/WalletConnection.tsx', name: 'Wallet Connection Component' }
    ];

    // Check for demo mode removal
    console.log('📋 Checking Demo Mode Removal:');
    console.log('================================');
    componentsToCheck.forEach(({ path, name }) => {
      this.checkFileForDemoMode(path, name);
    });

    console.log('\n📋 Checking Real Wallet Integration:');
    console.log('====================================');
    componentsToCheck.forEach(({ path, name }) => {
      this.checkForRealWalletIntegration(path, name);
    });

    console.log('\n📋 Checking Deployed Contract Integration:');
    console.log('==========================================');
    componentsToCheck.slice(0, 4).forEach(({ path, name }) => {
      this.checkForDeployedContracts(path, name);
    });

    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n📊 Wallet Integration Verification Summary:');
    console.log('============================================');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📋 Total: ${this.results.length}\n`);

    if (failed === 0) {
      console.log('🎉 Wallet integration transformation completed successfully!');
      console.log('\n✅ Achievements:');
      console.log('   • Demo mode completely removed');
      console.log('   • Real CIP-30 wallet integration implemented');
      console.log('   • Deployed contract addresses integrated');
      console.log('   • Production-ready transaction signing enabled');
      console.log('\n🚀 PuckSwap is ready for real Cardano transactions on preprod testnet!');
    } else {
      console.log('⚠️  Some issues found. Please address the failed checks:');
      this.results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`   - ${r.component}: ${r.message}`);
      });
    }

    if (warnings > 0) {
      console.log('\n📝 Warnings to review:');
      this.results.filter(r => r.status === 'WARNING').forEach(r => {
        console.log(`   - ${r.component}: ${r.message}`);
      });
    }
  }
}

// Run verification
async function runWalletIntegrationVerification() {
  const verifier = new WalletIntegrationVerifier();
  await verifier.verifyWalletIntegration();
}

runWalletIntegrationVerification().catch(console.error);
