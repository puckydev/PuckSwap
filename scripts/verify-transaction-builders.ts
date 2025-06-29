#!/usr/bin/env tsx

/**
 * PuckSwap v5 Transaction Builders Verification Script
 * 
 * This script verifies that all transaction builders are properly implemented
 * and ready for deployment by checking for "Not implemented" placeholders.
 */

import fs from 'fs';
import path from 'path';

interface BuilderCheck {
  file: string;
  methods: string[];
  status: 'complete' | 'incomplete' | 'error';
  missingMethods: string[];
  errors: string[];
}

const TRANSACTION_BUILDER_FILES = [
  'src/lucid/governance-v4.ts',
  'src/lucid/pool-v4.ts', 
  'src/lucid/treasury-v4.ts',
  'src/lucid/crosschain.ts',
  'src/lucid/swap.ts',
  'src/lucid/liquidity.ts',
  'src/lucid/staking.ts'
];

const CRITICAL_METHODS = {
  'governance-v4.ts': [
    'buildProposalCreationTx',
    'buildVotingTx',
    'buildExecutionTx',
    'buildCancellationTx'
  ],
  'pool-v4.ts': [
    'buildPoolCreationTx',
    'buildAddLiquidityTx',
    'buildRemoveLiquidityTx',
    'buildSwapTx'
  ],
  'treasury-v4.ts': [
    'buildRevenueCollectionTx',
    'buildDistributionTx',
    'buildAutoDistributionTx',
    'buildConfigUpdateTx'
  ],
  'crosschain.ts': [
    'buildCancelTransferTransaction'
  ]
};

function checkTransactionBuilder(filePath: string): BuilderCheck {
  const fileName = path.basename(filePath);
  const result: BuilderCheck = {
    file: fileName,
    methods: CRITICAL_METHODS[fileName] || [],
    status: 'complete',
    missingMethods: [],
    errors: []
  };

  try {
    if (!fs.existsSync(filePath)) {
      result.status = 'error';
      result.errors.push('File not found');
      return result;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for "Not implemented" placeholders
    const notImplementedMatches = content.match(/throw new Error\(["']Not implemented["']\)/g);
    if (notImplementedMatches && notImplementedMatches.length > 0) {
      result.status = 'incomplete';
      result.errors.push(`Found ${notImplementedMatches.length} "Not implemented" placeholders`);
    }

    // Check for specific critical methods
    for (const method of result.methods) {
      const methodRegex = new RegExp(`${method}\\s*\\([^)]*\\)\\s*:\\s*Promise<[^>]+>\\s*{`, 'g');
      const methodMatch = content.match(methodRegex);
      
      if (!methodMatch) {
        result.missingMethods.push(method);
        result.status = 'incomplete';
      } else {
        // Check if the method implementation contains "Not implemented"
        const methodStartIndex = content.indexOf(methodMatch[0]);
        const methodEndIndex = findMethodEnd(content, methodStartIndex);
        const methodBody = content.substring(methodStartIndex, methodEndIndex);
        
        if (methodBody.includes('throw new Error("Not implemented")')) {
          result.missingMethods.push(method);
          result.status = 'incomplete';
        }
      }
    }

  } catch (error) {
    result.status = 'error';
    result.errors.push(`Error reading file: ${error.message}`);
  }

  return result;
}

function findMethodEnd(content: string, startIndex: number): number {
  let braceCount = 0;
  let inMethod = false;
  
  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];
    
    if (char === '{') {
      braceCount++;
      inMethod = true;
    } else if (char === '}') {
      braceCount--;
      if (inMethod && braceCount === 0) {
        return i + 1;
      }
    }
  }
  
  return content.length;
}

function generateReport(checks: BuilderCheck[]): void {
  console.log('🚀 PuckSwap v5 Transaction Builders Verification Report');
  console.log('='.repeat(60));
  console.log('');

  let totalFiles = checks.length;
  let completeFiles = 0;
  let incompleteFiles = 0;
  let errorFiles = 0;

  for (const check of checks) {
    const statusIcon = check.status === 'complete' ? '✅' : 
                      check.status === 'incomplete' ? '⚠️' : '❌';
    
    console.log(`${statusIcon} ${check.file}`);
    
    if (check.status === 'complete') {
      completeFiles++;
      console.log('   Status: All transaction builders implemented');
    } else if (check.status === 'incomplete') {
      incompleteFiles++;
      console.log('   Status: Missing implementations');
      if (check.missingMethods.length > 0) {
        console.log(`   Missing methods: ${check.missingMethods.join(', ')}`);
      }
      if (check.errors.length > 0) {
        console.log(`   Issues: ${check.errors.join(', ')}`);
      }
    } else {
      errorFiles++;
      console.log('   Status: Error');
      console.log(`   Errors: ${check.errors.join(', ')}`);
    }
    console.log('');
  }

  console.log('📊 Summary');
  console.log('-'.repeat(30));
  console.log(`Total Files: ${totalFiles}`);
  console.log(`✅ Complete: ${completeFiles}`);
  console.log(`⚠️  Incomplete: ${incompleteFiles}`);
  console.log(`❌ Errors: ${errorFiles}`);
  console.log('');

  const completionPercentage = Math.round((completeFiles / totalFiles) * 100);
  console.log(`🎯 Completion Rate: ${completionPercentage}%`);
  
  if (completionPercentage === 100) {
    console.log('🎉 All transaction builders are ready for deployment!');
  } else if (completionPercentage >= 85) {
    console.log('🚀 Transaction builders are mostly ready. Minor fixes needed.');
  } else {
    console.log('⚠️  Significant work needed before deployment readiness.');
  }
}

async function main() {
  console.log('🔍 Checking transaction builder implementations...\n');

  const checks: BuilderCheck[] = [];

  for (const filePath of TRANSACTION_BUILDER_FILES) {
    const fullPath = path.resolve(process.cwd(), filePath);
    const check = checkTransactionBuilder(fullPath);
    checks.push(check);
  }

  generateReport(checks);

  // Exit with appropriate code
  const hasErrors = checks.some(check => check.status === 'error' || check.status === 'incomplete');
  process.exit(hasErrors ? 1 : 0);
}

if (require.main === module) {
  main().catch(console.error);
}
