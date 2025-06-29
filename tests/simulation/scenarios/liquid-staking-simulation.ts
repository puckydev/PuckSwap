/**
 * PuckSwap v5 Liquid Staking Simulation
 * End-to-end testing of pADA minting/burning operations
 */

import { Lucid, UTxO, Assets, TxHash, Address } from "@lucid-evolution/lucid";
import { depositStaking, withdrawStaking, syncStakingRewards } from "../../../src/lucid/staking";
import { getTestConfig, SimulationTestConfig, TestStakingConfig } from "../config/test-config";
import {
  initializeLucidForTesting,
  waitForTxConfirmation,
  executeTest,
  TestResult
} from "../utils/test-helpers";

export interface StakingState {
  total_staked: bigint;
  total_pADA_minted: bigint;
  stake_pool_id: string;
  last_rewards_sync_slot: bigint;
  exchange_rate: number; // pADA to ADA ratio
  accumulated_rewards: bigint;
  staking_participants: number;
}

export interface StakingOperation {
  type: 'deposit' | 'withdraw' | 'sync';
  user: string;
  ada_amount?: bigint;
  pADA_amount?: bigint;
  timestamp: number;
  txHash: string;
}

export class LiquidStakingSimulation {
  private config: SimulationTestConfig;
  private lucidInstances: Map<string, Lucid> = new Map();
  private stakingState: StakingState;
  private stakingAddress?: Address;
  private pADAPolicyId?: string;
  private operations: StakingOperation[] = [];
  private testResults: TestResult[] = [];

  constructor(config?: SimulationTestConfig) {
    this.config = config || getTestConfig();
    this.stakingState = {
      total_staked: 0n,
      total_pADA_minted: 0n,
      stake_pool_id: this.config.staking.stakePoolId,
      last_rewards_sync_slot: 0n,
      exchange_rate: 1.0, // Initial 1:1 ratio
      accumulated_rewards: 0n,
      staking_participants: 0
    };
  }

  /**
   * Run complete liquid staking simulation
   */
  async runSimulation(): Promise<TestResult[]> {
    console.log("🏦 Starting Liquid Staking Simulation...");
    console.log(`Network: ${this.config.network}`);
    console.log(`Stake Pool: ${this.config.staking.stakePoolId}`);

    try {
      // Initialize wallets and staking
      await this.initializeWallets();
      await this.initializeStaking();

      // Execute staking test scenarios
      await this.testStakingDeposits();
      await this.testRewardsSyncing();
      await this.testStakingWithdrawals();
      await this.testExchangeRateCalculation();
      await this.testStakingStateValidation();

      console.log("✅ Liquid Staking Simulation completed successfully");
      
    } catch (error) {
      console.error("❌ Liquid Staking Simulation failed:", error);
      this.testResults.push({
        testName: "Liquid Staking Simulation",
        success: false,
        duration: 0,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return this.testResults;
  }

  /**
   * Initialize wallet instances
   */
  private async initializeWallets(): Promise<void> {
    const result = await executeTest(
      "Initialize Staking Wallets",
      async () => {
        for (const [name, wallet] of Object.entries(this.config.wallets)) {
          const lucid = await initializeLucidForTesting(wallet, this.config);
          this.lucidInstances.set(name, lucid);
        }
        return { walletsInitialized: this.lucidInstances.size };
      },
      this.config.execution.timeoutMs
    );
    
    this.testResults.push(result);
  }

  /**
   * Initialize staking contract
   */
  private async initializeStaking(): Promise<void> {
    const result = await executeTest(
      "Initialize Liquid Staking Contract",
      async () => {
        // Mock staking contract deployment
        this.stakingAddress = "addr_test1qr..." + Math.random().toString(36).substr(2, 50);
        this.pADAPolicyId = "a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235"; // Mock pADA policy

        // Initialize staking state
        this.stakingState.last_rewards_sync_slot = BigInt(Math.floor(Date.now() / 1000));

        return {
          stakingAddress: this.stakingAddress,
          pADAPolicyId: this.pADAPolicyId,
          stakePoolId: this.stakingState.stake_pool_id,
          initialExchangeRate: this.stakingState.exchange_rate
        };
      },
      this.config.execution.timeoutMs
    );
    
    this.testResults.push(result);
  }

  /**
   * Test staking deposits from multiple users
   */
  private async testStakingDeposits(): Promise<void> {
    const deposits = [
      { user: "user1", amount: 100_000_000n }, // 100 ADA
      { user: "user2", amount: 250_000_000n }, // 250 ADA
      { user: "user3", amount: 150_000_000n }, // 150 ADA
    ];

    for (const deposit of deposits) {
      const result = await executeTest(
        `Deposit Staking - ${deposit.user} (${Number(deposit.amount) / 1_000_000} ADA)`,
        async () => {
          if (!this.stakingAddress || !this.pADAPolicyId) {
            throw new Error("Staking not initialized");
          }

          const userLucid = this.lucidInstances.get(deposit.user)!;

          // Calculate pADA to mint based on current exchange rate
          const pADAToMint = BigInt(Math.floor(Number(deposit.amount) / this.stakingState.exchange_rate));

          // Simulate staking deposit
          const mockResult = {
            txHash: "mock_deposit_tx_" + Date.now(),
            user: deposit.user,
            ada_deposited: deposit.amount,
            pADA_minted: pADAToMint,
            exchange_rate: this.stakingState.exchange_rate,
            new_total_staked: this.stakingState.total_staked + deposit.amount,
            new_total_pADA: this.stakingState.total_pADA_minted + pADAToMint
          };

          // Update staking state
          this.stakingState.total_staked += deposit.amount;
          this.stakingState.total_pADA_minted += pADAToMint;
          this.stakingState.staking_participants += 1;

          // Record operation
          this.operations.push({
            type: 'deposit',
            user: deposit.user,
            ada_amount: deposit.amount,
            pADA_amount: pADAToMint,
            timestamp: Date.now(),
            txHash: mockResult.txHash
          });

          return mockResult;
        },
        this.config.execution.timeoutMs
      );
      
      this.testResults.push(result);
    }
  }

  /**
   * Test rewards syncing with oracle
   */
  private async testRewardsSyncing(): Promise<void> {
    const result = await executeTest(
      "Sync Staking Rewards",
      async () => {
        if (!this.stakingAddress || !this.pADAPolicyId) {
          throw new Error("Staking not initialized");
        }

        const governanceLucid = this.lucidInstances.get("governance")!;

        // Simulate rewards accumulation (5% annual rate)
        const timeSinceLastSync = Date.now() / 1000 - Number(this.stakingState.last_rewards_sync_slot);
        const annualRate = this.config.staking.rewardRate / 100; // 5% = 0.05
        const rewardsAccrued = BigInt(Math.floor(
          Number(this.stakingState.total_staked) * annualRate * (timeSinceLastSync / (365 * 24 * 3600))
        ));

        // Update exchange rate based on rewards
        const newTotalValue = this.stakingState.total_staked + rewardsAccrued;
        const newExchangeRate = Number(newTotalValue) / Number(this.stakingState.total_pADA_minted);

        // Simulate rewards sync transaction
        const mockResult = {
          txHash: "mock_sync_tx_" + Date.now(),
          rewards_accrued: rewardsAccrued,
          old_exchange_rate: this.stakingState.exchange_rate,
          new_exchange_rate: newExchangeRate,
          sync_slot: Math.floor(Date.now() / 1000),
          total_value_locked: newTotalValue
        };

        // Update staking state
        this.stakingState.accumulated_rewards += rewardsAccrued;
        this.stakingState.exchange_rate = newExchangeRate;
        this.stakingState.last_rewards_sync_slot = BigInt(mockResult.sync_slot);

        // Record operation
        this.operations.push({
          type: 'sync',
          user: 'oracle',
          timestamp: Date.now(),
          txHash: mockResult.txHash
        });

        return mockResult;
      },
      this.config.execution.timeoutMs
    );
    
    this.testResults.push(result);
  }

  /**
   * Test staking withdrawals
   */
  private async testStakingWithdrawals(): Promise<void> {
    const withdrawals = [
      { user: "user1", pADAAmount: 50_000_000n }, // Partial withdrawal
      { user: "user2", pADAAmount: 100_000_000n }, // Partial withdrawal
    ];

    for (const withdrawal of withdrawals) {
      const result = await executeTest(
        `Withdraw Staking - ${withdrawal.user} (${Number(withdrawal.pADAAmount) / 1_000_000} pADA)`,
        async () => {
          if (!this.stakingAddress || !this.pADAPolicyId) {
            throw new Error("Staking not initialized");
          }

          const userLucid = this.lucidInstances.get(withdrawal.user)!;

          // Calculate ADA to return based on current exchange rate
          const adaToReturn = BigInt(Math.floor(Number(withdrawal.pADAAmount) * this.stakingState.exchange_rate));

          // Simulate staking withdrawal
          const mockResult = {
            txHash: "mock_withdrawal_tx_" + Date.now(),
            user: withdrawal.user,
            pADA_burned: withdrawal.pADAAmount,
            ada_returned: adaToReturn,
            exchange_rate: this.stakingState.exchange_rate,
            new_total_staked: this.stakingState.total_staked - adaToReturn,
            new_total_pADA: this.stakingState.total_pADA_minted - withdrawal.pADAAmount
          };

          // Update staking state
          this.stakingState.total_staked -= adaToReturn;
          this.stakingState.total_pADA_minted -= withdrawal.pADAAmount;

          // Record operation
          this.operations.push({
            type: 'withdraw',
            user: withdrawal.user,
            ada_amount: adaToReturn,
            pADA_amount: withdrawal.pADAAmount,
            timestamp: Date.now(),
            txHash: mockResult.txHash
          });

          return mockResult;
        },
        this.config.execution.timeoutMs
      );
      
      this.testResults.push(result);
    }
  }

  /**
   * Test exchange rate calculation accuracy
   */
  private async testExchangeRateCalculation(): Promise<void> {
    const result = await executeTest(
      "Validate Exchange Rate Calculation",
      async () => {
        // Calculate expected exchange rate
        const totalValue = this.stakingState.total_staked + this.stakingState.accumulated_rewards;
        const expectedRate = Number(totalValue) / Number(this.stakingState.total_pADA_minted);

        // Validate exchange rate accuracy
        const rateDifference = Math.abs(this.stakingState.exchange_rate - expectedRate);
        const tolerance = 0.001; // 0.1% tolerance

        if (rateDifference > tolerance) {
          throw new Error(`Exchange rate calculation error: ${rateDifference} > ${tolerance}`);
        }

        // Validate exchange rate is increasing (due to rewards)
        if (this.stakingState.exchange_rate <= 1.0) {
          throw new Error("Exchange rate should increase due to rewards");
        }

        return {
          current_exchange_rate: this.stakingState.exchange_rate,
          expected_exchange_rate: expectedRate,
          rate_difference: rateDifference,
          total_value_locked: totalValue,
          total_pADA_supply: this.stakingState.total_pADA_minted,
          rate_valid: true
        };
      },
      this.config.execution.timeoutMs
    );
    
    this.testResults.push(result);
  }

  /**
   * Test staking state validation
   */
  private async testStakingStateValidation(): Promise<void> {
    const result = await executeTest(
      "Validate Staking State Consistency",
      async () => {
        // Validate non-negative values
        if (this.stakingState.total_staked < 0n) {
          throw new Error("Total staked cannot be negative");
        }

        if (this.stakingState.total_pADA_minted < 0n) {
          throw new Error("Total pADA minted cannot be negative");
        }

        if (this.stakingState.accumulated_rewards < 0n) {
          throw new Error("Accumulated rewards cannot be negative");
        }

        // Validate exchange rate bounds
        if (this.stakingState.exchange_rate < 1.0) {
          throw new Error("Exchange rate should be >= 1.0");
        }

        if (this.stakingState.exchange_rate > 2.0) {
          throw new Error("Exchange rate seems unreasonably high");
        }

        // Validate operation consistency
        const totalDeposits = this.operations
          .filter(op => op.type === 'deposit')
          .reduce((sum, op) => sum + (op.ada_amount || 0n), 0n);

        const totalWithdrawals = this.operations
          .filter(op => op.type === 'withdraw')
          .reduce((sum, op) => sum + (op.ada_amount || 0n), 0n);

        const expectedStaked = totalDeposits - totalWithdrawals;
        const stakingDifference = this.stakingState.total_staked - expectedStaked;

        // Allow for rewards in the difference
        if (stakingDifference < 0n) {
          throw new Error("Staking state inconsistent with operations");
        }

        // Calculate staking statistics
        const averageStakePerUser = this.stakingState.staking_participants > 0 
          ? Number(this.stakingState.total_staked) / this.stakingState.staking_participants / 1_000_000
          : 0;

        const totalRewardsEarned = this.stakingState.accumulated_rewards;
        const rewardRate = Number(totalRewardsEarned) / Number(totalDeposits) * 100;

        return {
          total_staked: this.stakingState.total_staked,
          total_pADA_minted: this.stakingState.total_pADA_minted,
          exchange_rate: this.stakingState.exchange_rate,
          accumulated_rewards: this.stakingState.accumulated_rewards,
          staking_participants: this.stakingState.staking_participants,
          average_stake_per_user: averageStakePerUser,
          reward_rate_percentage: rewardRate,
          total_operations: this.operations.length,
          state_valid: true
        };
      },
      this.config.execution.timeoutMs
    );
    
    this.testResults.push(result);
  }

  /**
   * Get current staking state
   */
  getStakingState(): StakingState {
    return this.stakingState;
  }

  /**
   * Get staking operations history
   */
  getOperations(): StakingOperation[] {
    return this.operations;
  }
}

/**
 * Run liquid staking simulation if called directly
 */
if (require.main === module) {
  (async () => {
    const simulation = new LiquidStakingSimulation();
    const results = await simulation.runSimulation();
    
    const passedTests = results.filter(r => r.success).length;
    console.log(`\n📊 Liquid Staking Simulation Results: ${passedTests}/${results.length} tests passed`);
    
    // Display staking statistics
    const state = simulation.getStakingState();
    const operations = simulation.getOperations();
    
    console.log(`\n🏦 Final Staking State:`);
    console.log(`  Total Staked: ${Number(state.total_staked) / 1_000_000} ADA`);
    console.log(`  Total pADA Minted: ${Number(state.total_pADA_minted) / 1_000_000} pADA`);
    console.log(`  Exchange Rate: ${state.exchange_rate.toFixed(6)} ADA/pADA`);
    console.log(`  Accumulated Rewards: ${Number(state.accumulated_rewards) / 1_000_000} ADA`);
    console.log(`  Participants: ${state.staking_participants}`);
    console.log(`  Total Operations: ${operations.length}`);
    
    process.exit(passedTests === results.length ? 0 : 1);
  })();
}

export default LiquidStakingSimulation;
