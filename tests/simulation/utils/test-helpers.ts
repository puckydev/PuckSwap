/**
 * PuckSwap v5 Simulation Test Helpers
 * Utility functions for test execution and validation
 */

import { Lucid, UTxO, Assets, Address, TxHash, Data } from "@lucid-evolution/lucid";
import { createLucidInstance } from "../../../src/lib/lucid-config";
import { SimulationTestConfig, TestWallet } from "../config/test-config";

export interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  txHash?: string;
  error?: string;
  details?: any;
}

export interface TestReport {
  timestamp: Date;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  results: TestResult[];
  summary: string;
}

/**
 * Initialize Lucid instance for testing
 */
export async function initializeLucidForTesting(
  wallet: TestWallet,
  config: SimulationTestConfig
): Promise<Lucid> {
  try {
    console.log(`🔧 Initializing Lucid for wallet: ${wallet.name}`);
    
    const lucid = await createLucidInstance({
      network: config.network === "preprod" ? "Preprod" : "Mainnet"
    });
    
    // Select wallet from mnemonic
    await lucid.selectWallet.fromSeed(wallet.mnemonic);

    // Store wallet address for reference
    wallet.address = await lucid.wallet.address();
    
    console.log(`✅ Lucid initialized for ${wallet.name}: ${wallet.address.slice(0, 20)}...`);
    return lucid;
    
  } catch (error) {
    console.error(`❌ Failed to initialize Lucid for ${wallet.name}:`, error);
    throw error;
  }
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTxConfirmation(
  lucid: Lucid,
  txHash: TxHash,
  timeoutMs: number = 120000
): Promise<boolean> {
  console.log(`⏳ Waiting for transaction confirmation: ${txHash.slice(0, 16)}...`);
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const utxos = await lucid.utxosByOutRef([{ txHash, outputIndex: 0 }]);
      if (utxos.length > 0) {
        console.log(`✅ Transaction confirmed: ${txHash.slice(0, 16)}...`);
        return true;
      }
    } catch (error) {
      // Transaction not yet confirmed, continue waiting
    }
    
    // Wait 5 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.log(`❌ Transaction confirmation timeout: ${txHash.slice(0, 16)}...`);
  return false;
}

/**
 * Get wallet UTxOs with minimum ADA
 */
export async function getWalletUtxos(
  lucid: Lucid,
  minAda: bigint = 5_000_000n
): Promise<UTxO[]> {
  const utxos = await lucid.wallet().getUtxos();
  return utxos.filter(utxo => utxo.assets.lovelace >= minAda);
}

/**
 * Fund wallet with test ADA (for Preprod testnet)
 */
export async function fundWalletFromFaucet(
  address: Address,
  amount: bigint = 1000_000_000n
): Promise<boolean> {
  try {
    console.log(`💰 Requesting ${Number(amount) / 1_000_000} ADA from faucet for ${address.slice(0, 20)}...`);
    
    // Note: In real implementation, this would call Preprod faucet API
    // For simulation, we'll assume the wallet is already funded
    console.log(`✅ Wallet funding simulated (in real test, would call faucet API)`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to fund wallet:`, error);
    return false;
  }
}

/**
 * Parse pool datum from UTxO
 */
export async function parsePoolDatum(utxo: UTxO): Promise<any> {
  if (!utxo.datum) {
    throw new Error("UTxO has no datum");
  }
  
  try {
    // Parse CIP-68 compliant PoolDatum
    const datum = Data.from(utxo.datum);
    return {
      ada_reserve: datum.fields[0],
      token_reserve: datum.fields[1], 
      fee_basis_points: datum.fields[2],
      lp_token_policy: datum.fields[3],
      lp_token_name: datum.fields[4]
    };
  } catch (error) {
    console.error("Failed to parse pool datum:", error);
    throw error;
  }
}

/**
 * Calculate AMM swap output
 */
export function calculateSwapOutput(
  adaReserve: bigint,
  tokenReserve: bigint,
  inputAmount: bigint,
  isAdaToToken: boolean,
  feeBasisPoints: number = 30
): { outputAmount: bigint; newAdaReserve: bigint; newTokenReserve: bigint } {
  const feeNumerator = 1000n - BigInt(feeBasisPoints);
  const feeDenominator = 1000n;
  
  const inputAmountAfterFee = (inputAmount * feeNumerator) / feeDenominator;
  
  if (isAdaToToken) {
    // ADA -> Token
    const outputAmount = (tokenReserve * inputAmountAfterFee) / (adaReserve + inputAmountAfterFee);
    return {
      outputAmount,
      newAdaReserve: adaReserve + inputAmount,
      newTokenReserve: tokenReserve - outputAmount
    };
  } else {
    // Token -> ADA
    const outputAmount = (adaReserve * inputAmountAfterFee) / (tokenReserve + inputAmountAfterFee);
    return {
      outputAmount,
      newAdaReserve: adaReserve - outputAmount,
      newTokenReserve: tokenReserve + inputAmount
    };
  }
}

/**
 * Validate transaction result
 */
export function validateTransactionResult(
  result: any,
  expectedFields: string[]
): boolean {
  for (const field of expectedFields) {
    if (!(field in result)) {
      console.error(`❌ Missing expected field: ${field}`);
      return false;
    }
  }
  return true;
}

/**
 * Create test result object
 */
export function createTestResult(
  testName: string,
  success: boolean,
  duration: number,
  txHash?: string,
  error?: string,
  details?: any
): TestResult {
  return {
    testName,
    success,
    duration,
    txHash,
    error,
    details
  };
}

/**
 * Execute test with timeout and error handling
 */
export async function executeTest<T>(
  testName: string,
  testFunction: () => Promise<T>,
  timeoutMs: number = 300000
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🧪 Starting test: ${testName}`);
    
    // Execute test with timeout
    const result = await Promise.race([
      testFunction(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Test timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Test passed: ${testName} (${duration}ms)`);
    
    return createTestResult(testName, true, duration, undefined, undefined, result);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`❌ Test failed: ${testName} (${duration}ms) - ${errorMessage}`);
    
    return createTestResult(testName, false, duration, undefined, errorMessage);
  }
}

/**
 * Generate test report
 */
export function generateTestReport(results: TestResult[]): TestReport {
  const passedTests = results.filter(r => r.success).length;
  const failedTests = results.length - passedTests;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  const summary = `
📊 Test Execution Summary:
  Total Tests: ${results.length}
  Passed: ${passedTests} ✅
  Failed: ${failedTests} ❌
  Success Rate: ${((passedTests / results.length) * 100).toFixed(1)}%
  Total Duration: ${(totalDuration / 1000).toFixed(2)}s
  `;
  
  return {
    timestamp: new Date(),
    totalTests: results.length,
    passedTests,
    failedTests,
    totalDuration,
    results,
    summary
  };
}

/**
 * Log test report to console
 */
export function logTestReport(report: TestReport): void {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 PUCKSWAP V5 SIMULATION TEST REPORT");
  console.log("=".repeat(60));
  console.log(report.summary);
  
  console.log("\n📋 Detailed Results:");
  report.results.forEach((result, index) => {
    const status = result.success ? "✅" : "❌";
    const duration = `${result.duration}ms`;
    console.log(`  ${index + 1}. ${status} ${result.testName} (${duration})`);
    
    if (result.txHash) {
      console.log(`     TX: ${result.txHash}`);
    }
    
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
}

/**
 * Save test report to file
 */
export async function saveTestReport(
  report: TestReport,
  filename?: string
): Promise<void> {
  const timestamp = report.timestamp.toISOString().replace(/[:.]/g, '-');
  const reportFilename = filename || `test-report-${timestamp}.json`;
  
  try {
    const fs = await import('fs/promises');
    await fs.writeFile(
      `tests/simulation/reports/${reportFilename}`,
      JSON.stringify(report, null, 2)
    );
    console.log(`📄 Test report saved: ${reportFilename}`);
  } catch (error) {
    console.error(`❌ Failed to save test report:`, error);
  }
}

export default {
  initializeLucidForTesting,
  waitForTxConfirmation,
  getWalletUtxos,
  fundWalletFromFaucet,
  parsePoolDatum,
  calculateSwapOutput,
  validateTransactionResult,
  createTestResult,
  executeTest,
  generateTestReport,
  logTestReport,
  saveTestReport
};
