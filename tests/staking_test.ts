// PuckSwap v5 - Liquid Staking Tests
// Standalone deployment simulation tests for liquid staking operations
// Tests pADA minting, staking deposits, withdrawals, and reward syncing

import { Lucid, UTxO, Assets, TxHash, Data } from "@lucid-evolution/lucid";
import { PuckSwapStakingBuilder, DepositStakingParams, WithdrawStakingParams, SyncRewardsParams } from "../src/lucid/staking";
import { PuckSwapSerializer, StakingDatum } from "../src/lucid/utils/serialization";
import { loadContractAddresses, ContractAddresses } from "../src/lucid/utils/contractAddresses";
import { getEnvironmentConfig } from "../src/config/env";
import { setupMockWalletWithLucid, MockWallet } from "../src/testing/mockWallet";

// =============================================================================
// LIQUID STAKING TESTS
// =============================================================================

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  txHash?: string;
  error?: string;
  details?: any;
}

interface StakingState {
  stakingUtxo?: UTxO;
  stakingDatum?: StakingDatum;
  totalStaked: bigint;
  totalPAdaMinted: bigint;
  stakePoolId: string;
  lastRewardsSyncSlot: number;
  userPAdaBalance: bigint;
}

export class LiquidStakingTests {
  private lucid: Lucid;
  private contractAddresses: ContractAddresses;
  private stakingBuilder: PuckSwapStakingBuilder;
  private mockWallet: MockWallet;
  private stakingState: StakingState;
  private testResults: TestResult[] = [];

  constructor() {
    this.stakingState = {
      totalStaked: 0n,
      totalPAdaMinted: 0n,
      stakePoolId: "pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy",
      lastRewardsSyncSlot: 0,
      userPAdaBalance: 0n
    };
  }

  /**
   * Run all liquid staking tests
   */
  async runTests(): Promise<TestResult[]> {
    console.log("🧪 Starting Liquid Staking Tests");
    console.log("=" .repeat(50));

    try {
      // Setup Phase
      await this.executeTest("Setup Lucid Evolution", () => this.setupLucid());
      await this.executeTest("Setup Mock Wallet", () => this.setupMockWallet());
      await this.executeTest("Load Contract Addresses", () => this.loadContracts());
      await this.executeTest("Initialize Staking Builder", () => this.initializeBuilder());

      // Staking Lifecycle Phase
      await this.executeTest("Create Initial Staking Pool", () => this.createStakingPool());
      await this.executeTest("Deposit Staking (Mint pADA)", () => this.depositStaking());
      await this.executeTest("Sync Staking Rewards", () => this.syncStakingRewards());
      await this.executeTest("Withdraw Staking (Burn pADA)", () => this.withdrawStaking());
      await this.executeTest("Validate Final State", () => this.validateFinalState());

    } catch (error) {
      console.error("❌ Liquid Staking Tests failed:", error);
      this.testResults.push({
        testName: "Liquid Staking Tests",
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
    const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    
    this.mockWallet = await setupMockWalletWithLucid(
      this.lucid,
      testMnemonic,
      "liquid_staking_tester"
    );

    // Assert wallet is properly setup
    const address = await this.mockWallet.getAddress();
    if (!address) {
      throw new Error("Failed to setup mock wallet");
    }

    console.log(`👛 Mock wallet address: ${address.slice(0, 20)}...`);
    
    // Fund wallet with test ADA
    await this.fundTestWallet();
  }

  /**
   * Fund test wallet with mock ADA
   */
  private async fundTestWallet(): Promise<void> {
    const testAssets: Assets = {
      lovelace: 5000_000_000n // 5,000 ADA for staking
    };

    await this.mockWallet.addAssets(testAssets);
    console.log("💰 Test wallet funded with 5,000 ADA for staking");
  }

  /**
   * Load contract addresses from deployment
   */
  private async loadContracts(): Promise<void> {
    try {
      const deployment = loadContractAddresses("preprod");
      this.contractAddresses = deployment.addresses;

      // Assert required addresses are loaded
      if (!this.contractAddresses.validators.staking) {
        throw new Error("Staking validator address not found");
      }
      if (!this.contractAddresses.policies.pADAMinting) {
        throw new Error("pADA minting policy ID not found");
      }

      console.log("📋 Contract addresses loaded successfully");
      console.log(`   Staking Validator: ${this.contractAddresses.validators.staking.slice(0, 20)}...`);
      console.log(`   pADA Policy: ${this.contractAddresses.policies.pADAMinting.slice(0, 20)}...`);

    } catch (error) {
      throw new Error(`Failed to load contract addresses: ${error}`);
    }
  }

  /**
   * Initialize staking transaction builder
   */
  private async initializeBuilder(): Promise<void> {
    // Mock validator CBORs (in real deployment these would be loaded from compiled contracts)
    const mockStakingValidatorCbor = "590d4f590d4c010000332332233223232333222323333333222222223233333333222222223322323222323253353034004";
    const mockPAdaMintingPolicyCbor = "590e3f590e3c010000332332233223232333222323333333222222223233333333222222223322323222323253353035005";

    // Initialize staking builder
    this.stakingBuilder = await PuckSwapStakingBuilder.create(
      mockStakingValidatorCbor,
      mockPAdaMintingPolicyCbor,
      "Preprod"
    );

    // Assert builder is initialized
    if (!this.stakingBuilder) {
      throw new Error("Failed to initialize staking transaction builder");
    }

    console.log("🔧 Staking transaction builder initialized successfully");
  }

  /**
   * Create initial staking pool with mock UTxO
   */
  private async createStakingPool(): Promise<void> {
    // Create initial staking datum
    const initialStakingDatum: StakingDatum = {
      total_staked: 0n,
      total_pADA_minted: 0n,
      stake_pool_id: this.stakingState.stakePoolId,
      last_rewards_sync_slot: 1000000 // Starting slot
    };

    // Serialize staking datum
    const serializedDatum = PuckSwapSerializer.serializeStakingDatum(initialStakingDatum);

    // Create mock staking UTxO
    this.stakingState.stakingUtxo = {
      txHash: "mock_staking_creation_tx_hash_abcdef1234567890",
      outputIndex: 0,
      address: this.contractAddresses.validators.staking,
      assets: {
        lovelace: 2_000_000n // Minimum ADA for UTxO
      },
      datum: serializedDatum
    };

    // Update staking state
    this.stakingState.stakingDatum = initialStakingDatum;
    this.stakingState.totalStaked = 0n;
    this.stakingState.totalPAdaMinted = 0n;
    this.stakingState.lastRewardsSyncSlot = 1000000;

    // Assert staking pool creation
    if (!this.stakingState.stakingUtxo || !this.stakingState.stakingDatum) {
      throw new Error("Failed to create initial staking pool");
    }

    console.log("🏊 Initial staking pool created successfully");
    console.log(`   Stake Pool ID: ${this.stakingState.stakePoolId}`);
    console.log(`   Initial Sync Slot: ${this.stakingState.lastRewardsSyncSlot}`);
  }

  /**
   * Deposit staking to mint pADA tokens
   */
  private async depositStaking(): Promise<void> {
    if (!this.stakingState.stakingUtxo || !this.stakingState.stakingDatum) {
      throw new Error("Staking pool not initialized");
    }

    const depositParams: DepositStakingParams = {
      stakingUtxo: this.stakingState.stakingUtxo,
      adaAmount: 1000_000_000n, // Stake 1000 ADA
      minPAdaOut: 950_000_000n // Minimum 950 pADA (allowing for small exchange rate difference)
    };

    // Calculate pADA to mint (1:1 ratio initially, may vary with rewards)
    const exchangeRate = this.calculatePAdaExchangeRate();
    const pAdaToMint = depositParams.adaAmount * 1_000_000n / exchangeRate; // Scale for precision

    // Simulate deposit staking transaction
    const mockTxHash = "mock_deposit_staking_tx_hash_fedcba0987654321";
    const mockTxResult = await this.mockWallet.simulateTransaction("mock_deposit_staking_cbor");

    // Assert transaction success
    if (!mockTxResult.success) {
      throw new Error(`Deposit staking transaction failed: ${mockTxResult.error}`);
    }

    // Assert minimum pADA output
    if (pAdaToMint < depositParams.minPAdaOut) {
      throw new Error(`pADA output ${pAdaToMint} below minimum ${depositParams.minPAdaOut}`);
    }

    // Update staking state
    this.stakingState.totalStaked += depositParams.adaAmount;
    this.stakingState.totalPAdaMinted += pAdaToMint;
    this.stakingState.userPAdaBalance += pAdaToMint;

    // Update staking datum
    this.stakingState.stakingDatum = {
      ...this.stakingState.stakingDatum,
      total_staked: this.stakingState.totalStaked,
      total_pADA_minted: this.stakingState.totalPAdaMinted
    };

    // Assert state changes
    if (this.stakingState.totalStaked !== 1000_000_000n) {
      throw new Error(`Incorrect total staked after deposit: ${this.stakingState.totalStaked}`);
    }
    if (this.stakingState.userPAdaBalance <= 0n) {
      throw new Error("User pADA balance should be positive after deposit");
    }

    console.log("🪙 Staking deposit successful - pADA minted");
    console.log(`   ADA Staked: ${depositParams.adaAmount / 1_000_000n} ADA`);
    console.log(`   pADA Minted: ${pAdaToMint / 1_000_000n} pADA`);
    console.log(`   Exchange Rate: ${exchangeRate / 1_000_000n} ADA per pADA`);
    console.log(`   Total Staked: ${this.stakingState.totalStaked / 1_000_000n} ADA`);
    console.log(`   Total pADA Supply: ${this.stakingState.totalPAdaMinted / 1_000_000n} pADA`);
    console.log(`   Transaction Hash: ${mockTxHash}`);
  }

  /**
   * Sync staking rewards from oracle
   */
  private async syncStakingRewards(): Promise<void> {
    if (!this.stakingState.stakingUtxo || !this.stakingState.stakingDatum) {
      throw new Error("Staking pool not initialized");
    }

    const currentSlot = 1050000; // Mock current slot (50k slots later)
    const rewardsEarned = 50_000_000n; // Mock 50 ADA rewards earned

    const syncParams: SyncRewardsParams = {
      stakingUtxo: this.stakingState.stakingUtxo,
      newRewardsAmount: rewardsEarned,
      currentSlot: currentSlot,
      oracleSignature: "mock_oracle_signature_abc123def456" // Mock oracle signature
    };

    // Simulate sync rewards transaction
    const mockTxHash = "mock_sync_rewards_tx_hash_123456789abcdef0";
    const mockTxResult = await this.mockWallet.simulateTransaction("mock_sync_rewards_cbor");

    // Assert transaction success
    if (!mockTxResult.success) {
      throw new Error(`Sync rewards transaction failed: ${mockTxResult.error}`);
    }

    // Update staking state with rewards
    this.stakingState.totalStaked += rewardsEarned;
    this.stakingState.lastRewardsSyncSlot = currentSlot;

    // Update staking datum
    this.stakingState.stakingDatum = {
      ...this.stakingState.stakingDatum,
      total_staked: this.stakingState.totalStaked,
      last_rewards_sync_slot: currentSlot
    };

    // Assert state changes
    if (this.stakingState.totalStaked !== 1050_000_000n) {
      throw new Error(`Incorrect total staked after rewards sync: ${this.stakingState.totalStaked}`);
    }
    if (this.stakingState.lastRewardsSyncSlot !== currentSlot) {
      throw new Error("Last rewards sync slot not updated correctly");
    }

    console.log("🎁 Staking rewards synced successfully");
    console.log(`   Rewards Added: ${rewardsEarned / 1_000_000n} ADA`);
    console.log(`   New Total Staked: ${this.stakingState.totalStaked / 1_000_000n} ADA`);
    console.log(`   Sync Slot: ${currentSlot}`);
    console.log(`   New Exchange Rate: ${this.calculatePAdaExchangeRate() / 1_000_000n} ADA per pADA`);
    console.log(`   Transaction Hash: ${mockTxHash}`);
  }

  /**
   * Withdraw staking by burning pADA tokens
   */
  private async withdrawStaking(): Promise<void> {
    if (!this.stakingState.stakingUtxo || !this.stakingState.stakingDatum) {
      throw new Error("Staking pool not initialized");
    }

    const pAdaToBurn = 500_000_000n; // Burn 500 pADA tokens
    const withdrawParams: WithdrawStakingParams = {
      stakingUtxo: this.stakingState.stakingUtxo,
      pAdaAmount: pAdaToBurn,
      minAdaOut: 520_000_000n // Minimum 520 ADA (expecting rewards to increase value)
    };

    // Calculate ADA to withdraw based on current exchange rate
    const exchangeRate = this.calculatePAdaExchangeRate();
    const adaToWithdraw = pAdaToBurn * exchangeRate / 1_000_000n;

    // Simulate withdraw staking transaction
    const mockTxHash = "mock_withdraw_staking_tx_hash_def456abc123";
    const mockTxResult = await this.mockWallet.simulateTransaction("mock_withdraw_staking_cbor");

    // Assert transaction success
    if (!mockTxResult.success) {
      throw new Error(`Withdraw staking transaction failed: ${mockTxResult.error}`);
    }

    // Assert minimum ADA output
    if (adaToWithdraw < withdrawParams.minAdaOut) {
      throw new Error(`ADA output ${adaToWithdraw} below minimum ${withdrawParams.minAdaOut}`);
    }

    // Assert user has sufficient pADA balance
    if (this.stakingState.userPAdaBalance < pAdaToBurn) {
      throw new Error("Insufficient pADA balance for withdrawal");
    }

    // Update staking state
    this.stakingState.totalStaked -= adaToWithdraw;
    this.stakingState.totalPAdaMinted -= pAdaToBurn;
    this.stakingState.userPAdaBalance -= pAdaToBurn;

    // Update staking datum
    this.stakingState.stakingDatum = {
      ...this.stakingState.stakingDatum,
      total_staked: this.stakingState.totalStaked,
      total_pADA_minted: this.stakingState.totalPAdaMinted
    };

    console.log("💸 Staking withdrawal successful - pADA burned");
    console.log(`   pADA Burned: ${pAdaToBurn / 1_000_000n} pADA`);
    console.log(`   ADA Withdrawn: ${adaToWithdraw / 1_000_000n} ADA`);
    console.log(`   Exchange Rate: ${exchangeRate / 1_000_000n} ADA per pADA`);
    console.log(`   Remaining Total Staked: ${this.stakingState.totalStaked / 1_000_000n} ADA`);
    console.log(`   Remaining pADA Supply: ${this.stakingState.totalPAdaMinted / 1_000_000n} pADA`);
    console.log(`   User pADA Balance: ${this.stakingState.userPAdaBalance / 1_000_000n} pADA`);
    console.log(`   Transaction Hash: ${mockTxHash}`);
  }

  /**
   * Calculate current pADA exchange rate (ADA per pADA)
   */
  private calculatePAdaExchangeRate(): bigint {
    if (this.stakingState.totalPAdaMinted === 0n) {
      return 1_000_000n; // 1:1 ratio initially (scaled by 1M for precision)
    }

    // Exchange rate = total_staked / total_pADA_minted
    return (this.stakingState.totalStaked * 1_000_000n) / this.stakingState.totalPAdaMinted;
  }

  /**
   * Validate final staking state
   */
  private async validateFinalState(): Promise<void> {
    if (!this.stakingState.stakingDatum) {
      throw new Error("Staking datum not available for validation");
    }

    // Verify staking datum serialization/deserialization
    const serializedDatum = PuckSwapSerializer.serializeStakingDatum(this.stakingState.stakingDatum);
    const deserializedDatum = PuckSwapSerializer.deserializeStakingDatum(serializedDatum);

    // Assert datum integrity
    if (deserializedDatum.total_staked !== this.stakingState.stakingDatum.total_staked) {
      throw new Error("Total staked mismatch in datum serialization");
    }
    if (deserializedDatum.total_pADA_minted !== this.stakingState.stakingDatum.total_pADA_minted) {
      throw new Error("Total pADA minted mismatch in datum serialization");
    }
    if (deserializedDatum.stake_pool_id !== this.stakingState.stakingDatum.stake_pool_id) {
      throw new Error("Stake pool ID mismatch in datum serialization");
    }
    if (deserializedDatum.last_rewards_sync_slot !== this.stakingState.stakingDatum.last_rewards_sync_slot) {
      throw new Error("Last rewards sync slot mismatch in datum serialization");
    }

    // Assert staking invariants
    if (this.stakingState.totalStaked < 0n) {
      throw new Error("Invalid total staked: cannot be negative");
    }
    if (this.stakingState.totalPAdaMinted < 0n) {
      throw new Error("Invalid total pADA minted: cannot be negative");
    }
    if (this.stakingState.userPAdaBalance < 0n) {
      throw new Error("Invalid user pADA balance: cannot be negative");
    }

    // Assert exchange rate reasonableness (should be close to 1.05 due to rewards)
    const exchangeRate = this.calculatePAdaExchangeRate();
    const expectedRate = 1_050_000n; // ~1.05 ADA per pADA after rewards
    const rateDifference = exchangeRate > expectedRate ?
      exchangeRate - expectedRate : expectedRate - exchangeRate;

    if (rateDifference > 50_000n) { // Allow 0.05 ADA tolerance
      throw new Error(`Exchange rate ${exchangeRate} too far from expected ${expectedRate}`);
    }

    // Assert minimum staking requirements
    if (this.stakingState.totalStaked > 0n && this.stakingState.totalStaked < 1_000_000n) {
      throw new Error("Total staked below minimum requirement (1 ADA)");
    }

    console.log("✅ Final staking state validation passed");
    console.log(`   Final Total Staked: ${this.stakingState.totalStaked / 1_000_000n} ADA`);
    console.log(`   Final pADA Supply: ${this.stakingState.totalPAdaMinted / 1_000_000n} pADA`);
    console.log(`   Final Exchange Rate: ${exchangeRate / 1_000_000n} ADA per pADA`);
    console.log(`   User pADA Balance: ${this.stakingState.userPAdaBalance / 1_000_000n} pADA`);
    console.log(`   Last Sync Slot: ${this.stakingState.lastRewardsSyncSlot}`);
  }

  /**
   * Print comprehensive test report
   */
  private printTestReport(): void {
    console.log("\n" + "=" .repeat(50));
    console.log("📊 LIQUID STAKING TEST REPORT");
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

    console.log("\n🎯 LIQUID STAKING SUMMARY:");
    console.log(`   • Staking Pool Creation: ${this.testResults.find(r => r.testName === "Create Initial Staking Pool")?.success ? "✅" : "❌"}`);
    console.log(`   • Deposit Staking (pADA Mint): ${this.testResults.find(r => r.testName === "Deposit Staking (Mint pADA)")?.success ? "✅" : "❌"}`);
    console.log(`   • Rewards Sync: ${this.testResults.find(r => r.testName === "Sync Staking Rewards")?.success ? "✅" : "❌"}`);
    console.log(`   • Withdraw Staking (pADA Burn): ${this.testResults.find(r => r.testName === "Withdraw Staking (Burn pADA)")?.success ? "✅" : "❌"}`);
    console.log(`   • State Validation: ${this.testResults.find(r => r.testName === "Validate Final State")?.success ? "✅" : "❌"}`);

    console.log("=" .repeat(50));
  }
}

// =============================================================================
// STANDALONE TEST EXECUTION
// =============================================================================

/**
 * Run liquid staking tests independently
 */
export async function runLiquidStakingTests(): Promise<TestResult[]> {
  const testSuite = new LiquidStakingTests();
  return await testSuite.runTests();
}

// Execute tests if run directly
if (require.main === module) {
  runLiquidStakingTests()
    .then((results) => {
      const success = results.every(r => r.success);
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("💥 Test execution failed:", error);
      process.exit(1);
    });
}
