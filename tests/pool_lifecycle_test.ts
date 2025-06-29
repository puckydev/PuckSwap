// PuckSwap v5 - Pool Lifecycle Tests
// Standalone deployment simulation tests for AMM pool operations
// Tests pool creation, liquidity provision, swaps, and withdrawals

import { Lucid, UTxO, Assets, TxHash, Data } from "@lucid-evolution/lucid";
import { PuckSwapSwapBuilder, SwapParams, PoolDatum } from "../src/lucid/swap";
import { PuckSwapLiquidityBuilder, AddLiquidityParams, RemoveLiquidityParams } from "../src/lucid/liquidity";
import { PuckSwapSerializer } from "../src/lucid/utils/serialization";
import { loadContractAddresses, ContractAddresses } from "../src/lucid/utils/contractAddresses";
import { getEnvironmentConfig } from "../src/config/env";
import { setupMockWalletWithLucid, MockWallet } from "../src/testing/mockWallet";

// =============================================================================
// POOL LIFECYCLE TESTS
// =============================================================================

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  txHash?: string;
  error?: string;
  details?: any;
}

interface PoolState {
  poolUtxo?: UTxO;
  poolDatum?: PoolDatum;
  adaReserve: bigint;
  tokenReserve: bigint;
  lpSupply: bigint;
}

export class PoolLifecycleTests {
  private lucid: Lucid;
  private contractAddresses: ContractAddresses;
  private swapBuilder: PuckSwapSwapBuilder;
  private liquidityBuilder: PuckSwapLiquidityBuilder;
  private mockWallet: MockWallet;
  private poolState: PoolState;
  private testResults: TestResult[] = [];

  constructor() {
    this.poolState = {
      adaReserve: 0n,
      tokenReserve: 0n,
      lpSupply: 0n
    };
  }

  /**
   * Run all pool lifecycle tests
   */
  async runTests(): Promise<TestResult[]> {
    console.log("🧪 Starting Pool Lifecycle Tests");
    console.log("=" .repeat(50));

    try {
      // Setup Phase
      await this.executeTest("Setup Lucid Evolution", () => this.setupLucid());
      await this.executeTest("Setup Mock Wallet", () => this.setupMockWallet());
      await this.executeTest("Load Contract Addresses", () => this.loadContracts());
      await this.executeTest("Initialize Builders", () => this.initializeBuilders());

      // Pool Lifecycle Phase
      await this.executeTest("Create Initial Pool", () => this.createPool());
      await this.executeTest("Add Initial Liquidity", () => this.addLiquidity());
      await this.executeTest("Execute Token Swap", () => this.executeSwap());
      await this.executeTest("Remove Liquidity", () => this.removeLiquidity());
      await this.executeTest("Validate Final State", () => this.validateFinalState());

    } catch (error) {
      console.error("❌ Pool Lifecycle Tests failed:", error);
      this.testResults.push({
        testName: "Pool Lifecycle Tests",
        success: false,
        duration: 0,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    this.printTestReport();
    return this.testResults;
  }

  /**
   * Execute individual test with error handling and timing
   */
  private async executeTest(testName: string, testFunction: () => Promise<void>): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`🔄 Running: ${testName}`);
      await testFunction();

      const duration = Date.now() - startTime;
      console.log(`✅ Passed: ${testName} (${duration}ms)`);

      this.testResults.push({
        testName,
        success: true,
        duration
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed: ${testName} - ${errorMessage}`);

      this.testResults.push({
        testName,
        success: false,
        duration,
        error: errorMessage
      });

      throw error;
    }
  }

  /**
   * Setup Lucid Evolution with environment configuration
   */
  private async setupLucid(): Promise<void> {
    const envConfig = getEnvironmentConfig();
    console.log(`📡 Network: ${envConfig.lucidNetwork}`);
    console.log(`🔑 API Key: ${envConfig.blockfrostApiKey.substring(0, 8)}...`);

    const { createLucidInstance } = await import("../src/lib/lucid-config");
    this.lucid = await createLucidInstance({
      network: envConfig.lucidNetwork
    });

    // Assert Lucid is properly initialized
    if (!this.lucid) {
      throw new Error("Failed to initialize Lucid instance");
    }

    console.log("✅ Lucid Evolution initialized successfully");
  }

  /**
   * Setup mock wallet for testing
   */
  private async setupMockWallet(): Promise<void> {
    const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";

    this.mockWallet = await setupMockWalletWithLucid(
      this.lucid,
      testMnemonic,
      "pool_lifecycle_tester"
    );

    // Assert wallet is properly setup
    const address = await this.mockWallet.getAddress();
    if (!address) {
      throw new Error("Failed to setup mock wallet");
    }

    console.log(`👛 Mock wallet address: ${address.slice(0, 20)}...`);

    // Fund wallet with test assets
    await this.fundTestWallet();
  }

  /**
   * Fund test wallet with mock assets
   */
  private async fundTestWallet(): Promise<void> {
    // Mock funding - in real test this would use faucet or pre-funded UTxOs
    const testAssets: Assets = {
      lovelace: 10000_000_000n, // 10,000 ADA
      "a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235505543": 50000_000_000n // 50,000 PUCKY tokens
    };

    await this.mockWallet.addAssets(testAssets);
    console.log("💰 Test wallet funded with mock assets");
  }

  /**
   * Load contract addresses from deployment
   */
  private async loadContracts(): Promise<void> {
    try {
      const deployment = loadContractAddresses("preprod");
      this.contractAddresses = deployment.addresses;

      // Assert all required addresses are loaded
      if (!this.contractAddresses.validators.swap) {
        throw new Error("Swap validator address not found");
      }
      if (!this.contractAddresses.validators.liquidityProvision) {
        throw new Error("Liquidity provision validator address not found");
      }
      if (!this.contractAddresses.policies.lpMinting) {
        throw new Error("LP minting policy ID not found");
      }

      console.log("📋 Contract addresses loaded successfully");
      console.log(`   Swap Validator: ${this.contractAddresses.validators.swap.slice(0, 20)}...`);
      console.log(`   LP Policy: ${this.contractAddresses.policies.lpMinting.slice(0, 20)}...`);

    } catch (error) {
      throw new Error(`Failed to load contract addresses: ${error}`);
    }
  }

  /**
   * Initialize transaction builders
   */
  private async initializeBuilders(): Promise<void> {
    // Mock validator CBORs (in real deployment these would be loaded from compiled contracts)
    const mockSwapValidatorCbor = "590a4f590a4c010000332332233223232333222323333333222222223233333333222222223322323222323253353031001";
    const mockLiquidityValidatorCbor = "590b2f590b2c010000332332233223232333222323333333222222223233333333222222223322323222323253353032002";
    const mockLpMintingPolicyCbor = "590c3f590c3c010000332332233223232333222323333333222222223233333333222222223322323222323253353033003";

    // Initialize swap builder
    this.swapBuilder = await PuckSwapSwapBuilder.create(
      mockSwapValidatorCbor,
      "Preprod"
    );

    // Initialize liquidity builder
    this.liquidityBuilder = await PuckSwapLiquidityBuilder.create(
      mockSwapValidatorCbor,
      mockLiquidityValidatorCbor,
      mockLpMintingPolicyCbor,
      "Preprod"
    );

    // Assert builders are initialized
    if (!this.swapBuilder || !this.liquidityBuilder) {
      throw new Error("Failed to initialize transaction builders");
    }

    console.log("🔧 Transaction builders initialized successfully");
  }

  /**
   * Create initial pool with mock UTxO
   */
  private async createPool(): Promise<void> {
    // Create mock pool UTxO with initial state
    const initialPoolDatum: PoolDatum = {
      ada_reserve: 1000_000_000n, // 1000 ADA
      token_reserve: 2500_000_000n, // 2500 PUCKY
      fee_basis_points: 30, // 0.3%
      lp_token_policy: this.contractAddresses.policies.lpMinting,
      lp_token_name: "PUCKY_ADA_LP"
    };

    // Serialize pool datum
    const serializedDatum = PuckSwapSerializer.serializePoolDatum(initialPoolDatum);

    // Create mock pool UTxO
    this.poolState.poolUtxo = {
      txHash: "mock_pool_creation_tx_hash_1234567890abcdef",
      outputIndex: 0,
      address: this.contractAddresses.validators.swap,
      assets: {
        lovelace: initialPoolDatum.ada_reserve,
        [`${initialPoolDatum.lp_token_policy}${initialPoolDatum.lp_token_name}`]: 1000_000_000n // Initial LP supply
      },
      datum: serializedDatum
    };

    // Update pool state
    this.poolState.poolDatum = initialPoolDatum;
    this.poolState.adaReserve = initialPoolDatum.ada_reserve;
    this.poolState.tokenReserve = initialPoolDatum.token_reserve;
    this.poolState.lpSupply = 1000_000_000n;

    // Assert pool creation
    if (!this.poolState.poolUtxo || !this.poolState.poolDatum) {
      throw new Error("Failed to create initial pool");
    }

    console.log("🏊 Initial pool created successfully");
    console.log(`   ADA Reserve: ${this.poolState.adaReserve / 1_000_000n} ADA`);
    console.log(`   Token Reserve: ${this.poolState.tokenReserve / 1_000_000n} PUCKY`);
    console.log(`   LP Supply: ${this.poolState.lpSupply / 1_000_000n} LP`);
  }

  /**
   * Add liquidity to the pool
   */
  private async addLiquidity(): Promise<void> {
    if (!this.poolState.poolUtxo || !this.poolState.poolDatum) {
      throw new Error("Pool not initialized");
    }

    const addLiquidityParams: AddLiquidityParams = {
      poolUtxo: this.poolState.poolUtxo,
      adaAmount: 500_000_000n, // 500 ADA
      tokenAmount: 1250_000_000n, // 1250 PUCKY (maintaining 1:2.5 ratio)
      minLpTokens: 400_000_000n, // Minimum 400 LP tokens
      autoOptimalRatio: true
    };

    // Simulate liquidity addition transaction
    const mockTxHash = "mock_add_liquidity_tx_hash_abcdef1234567890";
    const mockTxResult = await this.mockWallet.simulateTransaction("mock_add_liquidity_cbor");

    // Assert transaction success
    if (!mockTxResult.success) {
      throw new Error(`Add liquidity transaction failed: ${mockTxResult.error}`);
    }

    // Calculate new pool state after liquidity addition
    const newAdaReserve = this.poolState.adaReserve + addLiquidityParams.adaAmount;
    const newTokenReserve = this.poolState.tokenReserve + addLiquidityParams.tokenAmount;
    const lpTokensToMint = 500_000_000n; // Proportional to liquidity added

    // Update pool state
    this.poolState.adaReserve = newAdaReserve;
    this.poolState.tokenReserve = newTokenReserve;
    this.poolState.lpSupply += lpTokensToMint;

    // Update pool datum
    this.poolState.poolDatum = {
      ...this.poolState.poolDatum,
      ada_reserve: newAdaReserve,
      token_reserve: newTokenReserve
    };

    // Assert state changes
    if (this.poolState.adaReserve !== 1500_000_000n) {
      throw new Error(`Incorrect ADA reserve after liquidity addition: ${this.poolState.adaReserve}`);
    }
    if (this.poolState.tokenReserve !== 3750_000_000n) {
      throw new Error(`Incorrect token reserve after liquidity addition: ${this.poolState.tokenReserve}`);
    }

    console.log("💧 Liquidity added successfully");
    console.log(`   New ADA Reserve: ${this.poolState.adaReserve / 1_000_000n} ADA`);
    console.log(`   New Token Reserve: ${this.poolState.tokenReserve / 1_000_000n} PUCKY`);
    console.log(`   LP Tokens Minted: ${lpTokensToMint / 1_000_000n} LP`);
    console.log(`   Transaction Hash: ${mockTxHash}`);
  }

  /**
   * Execute a token swap
   */
  private async executeSwap(): Promise<void> {
    if (!this.poolState.poolUtxo || !this.poolState.poolDatum) {
      throw new Error("Pool not initialized");
    }

    const swapParams: SwapParams = {
      poolUtxo: this.poolState.poolUtxo,
      swapInToken: false, // ADA to Token swap
      amountIn: 100_000_000n, // 100 ADA
      minOut: 240_000_000n, // Minimum 240 PUCKY (with slippage)
      slippageTolerance: 0.05, // 5% slippage tolerance
      tokenPolicy: "a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235",
      tokenName: "PUCKY"
    };

    // Calculate expected swap output using constant product formula (x * y = k)
    const k = this.poolState.adaReserve * this.poolState.tokenReserve;
    const amountInWithFee = swapParams.amountIn * 997n / 1000n; // 0.3% fee
    const newAdaReserve = this.poolState.adaReserve + amountInWithFee;
    const newTokenReserve = k / newAdaReserve;
    const tokensOut = this.poolState.tokenReserve - newTokenReserve;

    // Simulate swap transaction
    const mockTxHash = "mock_swap_tx_hash_fedcba0987654321";
    const mockTxResult = await this.mockWallet.simulateTransaction("mock_swap_cbor");

    // Assert transaction success
    if (!mockTxResult.success) {
      throw new Error(`Swap transaction failed: ${mockTxResult.error}`);
    }

    // Assert minimum output requirement
    if (tokensOut < swapParams.minOut) {
      throw new Error(`Swap output ${tokensOut} below minimum ${swapParams.minOut}`);
    }

    // Update pool state
    this.poolState.adaReserve = newAdaReserve;
    this.poolState.tokenReserve = newTokenReserve;
    this.poolState.poolDatum = {
      ...this.poolState.poolDatum,
      ada_reserve: newAdaReserve,
      token_reserve: newTokenReserve
    };

    console.log("🔄 Swap executed successfully");
    console.log(`   Swapped: ${swapParams.amountIn / 1_000_000n} ADA → ${tokensOut / 1_000_000n} PUCKY`);
    console.log(`   New ADA Reserve: ${this.poolState.adaReserve / 1_000_000n} ADA`);
    console.log(`   New Token Reserve: ${this.poolState.tokenReserve / 1_000_000n} PUCKY`);
    console.log(`   Transaction Hash: ${mockTxHash}`);
  }

  /**
   * Remove liquidity from the pool
   */
  private async removeLiquidity(): Promise<void> {
    if (!this.poolState.poolUtxo || !this.poolState.poolDatum) {
      throw new Error("Pool not initialized");
    }

    const removeLiquidityParams: RemoveLiquidityParams = {
      poolUtxo: this.poolState.poolUtxo,
      lpTokenAmount: 300_000_000n, // Burn 300 LP tokens
      minAdaOut: 250_000_000n, // Minimum 250 ADA
      minTokenOut: 600_000_000n // Minimum 600 PUCKY
    };

    // Calculate proportional withdrawal amounts
    const lpPercentage = removeLiquidityParams.lpTokenAmount * 1000n / this.poolState.lpSupply;
    const adaOut = this.poolState.adaReserve * lpPercentage / 1000n;
    const tokenOut = this.poolState.tokenReserve * lpPercentage / 1000n;

    // Simulate liquidity removal transaction
    const mockTxHash = "mock_remove_liquidity_tx_hash_123abc456def";
    const mockTxResult = await this.mockWallet.simulateTransaction("mock_remove_liquidity_cbor");

    // Assert transaction success
    if (!mockTxResult.success) {
      throw new Error(`Remove liquidity transaction failed: ${mockTxResult.error}`);
    }

    // Assert minimum output requirements
    if (adaOut < removeLiquidityParams.minAdaOut) {
      throw new Error(`ADA output ${adaOut} below minimum ${removeLiquidityParams.minAdaOut}`);
    }
    if (tokenOut < removeLiquidityParams.minTokenOut) {
      throw new Error(`Token output ${tokenOut} below minimum ${removeLiquidityParams.minTokenOut}`);
    }

    // Update pool state
    this.poolState.adaReserve -= adaOut;
    this.poolState.tokenReserve -= tokenOut;
    this.poolState.lpSupply -= removeLiquidityParams.lpTokenAmount;
    this.poolState.poolDatum = {
      ...this.poolState.poolDatum,
      ada_reserve: this.poolState.adaReserve,
      token_reserve: this.poolState.tokenReserve
    };

    console.log("💧 Liquidity removed successfully");
    console.log(`   LP Tokens Burned: ${removeLiquidityParams.lpTokenAmount / 1_000_000n} LP`);
    console.log(`   ADA Withdrawn: ${adaOut / 1_000_000n} ADA`);
    console.log(`   Tokens Withdrawn: ${tokenOut / 1_000_000n} PUCKY`);
    console.log(`   Remaining ADA Reserve: ${this.poolState.adaReserve / 1_000_000n} ADA`);
    console.log(`   Remaining Token Reserve: ${this.poolState.tokenReserve / 1_000_000n} PUCKY`);
    console.log(`   Transaction Hash: ${mockTxHash}`);
  }

  /**
   * Validate final pool state
   */
  private async validateFinalState(): Promise<void> {
    if (!this.poolState.poolDatum) {
      throw new Error("Pool datum not available for validation");
    }

    // Verify pool datum serialization/deserialization
    const serializedDatum = PuckSwapSerializer.serializePoolDatum(this.poolState.poolDatum);
    const deserializedDatum = PuckSwapSerializer.deserializePoolDatum(serializedDatum);

    // Assert datum integrity
    if (deserializedDatum.ada_reserve !== this.poolState.poolDatum.ada_reserve) {
      throw new Error("ADA reserve mismatch in datum serialization");
    }
    if (deserializedDatum.token_reserve !== this.poolState.poolDatum.token_reserve) {
      throw new Error("Token reserve mismatch in datum serialization");
    }
    if (deserializedDatum.fee_basis_points !== this.poolState.poolDatum.fee_basis_points) {
      throw new Error("Fee basis points mismatch in datum serialization");
    }

    // Assert pool invariants
    if (this.poolState.adaReserve <= 0n) {
      throw new Error("Invalid ADA reserve: must be positive");
    }
    if (this.poolState.tokenReserve <= 0n) {
      throw new Error("Invalid token reserve: must be positive");
    }
    if (this.poolState.lpSupply <= 0n) {
      throw new Error("Invalid LP supply: must be positive");
    }

    // Assert minimum ADA requirement (2 ADA minimum)
    if (this.poolState.adaReserve < 2_000_000n) {
      throw new Error("Pool ADA reserve below minimum requirement");
    }

    console.log("✅ Final pool state validation passed");
    console.log(`   Final ADA Reserve: ${this.poolState.adaReserve / 1_000_000n} ADA`);
    console.log(`   Final Token Reserve: ${this.poolState.tokenReserve / 1_000_000n} PUCKY`);
    console.log(`   Final LP Supply: ${this.poolState.lpSupply / 1_000_000n} LP`);
    console.log(`   Pool Ratio: 1 ADA = ${(this.poolState.tokenReserve * 1000n / this.poolState.adaReserve) / 1000n} PUCKY`);
  }

  /**
   * Print comprehensive test report
   */
  private printTestReport(): void {
    console.log("\n" + "=" .repeat(50));
    console.log("📊 POOL LIFECYCLE TEST REPORT");
    console.log("=" .repeat(50));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);

    console.log(`📈 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`📊 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log("\n❌ FAILED TESTS:");
      this.testResults
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   • ${r.testName}: ${r.error}`);
        });
    }

    console.log("\n🎯 POOL LIFECYCLE SUMMARY:");
    console.log(`   • Pool Creation: ${this.testResults.find(r => r.testName === "Create Initial Pool")?.success ? "✅" : "❌"}`);
    console.log(`   • Liquidity Addition: ${this.testResults.find(r => r.testName === "Add Initial Liquidity")?.success ? "✅" : "❌"}`);
    console.log(`   • Token Swap: ${this.testResults.find(r => r.testName === "Execute Token Swap")?.success ? "✅" : "❌"}`);
    console.log(`   • Liquidity Removal: ${this.testResults.find(r => r.testName === "Remove Liquidity")?.success ? "✅" : "❌"}`);
    console.log(`   • State Validation: ${this.testResults.find(r => r.testName === "Validate Final State")?.success ? "✅" : "❌"}`);

    console.log("=" .repeat(50));
  }
}

// =============================================================================
// STANDALONE TEST EXECUTION
// =============================================================================

/**
 * Run pool lifecycle tests independently
 */
export async function runPoolLifecycleTests(): Promise<TestResult[]> {
  const testSuite = new PoolLifecycleTests();
  return await testSuite.runTests();
}

// Execute tests if run directly
if (require.main === module) {
  runPoolLifecycleTests()
    .then((results) => {
      const success = results.every(r => r.success);
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("💥 Test execution failed:", error);
      process.exit(1);
    });
}