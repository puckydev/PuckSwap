/**
 * PuckSwap v5 Deployment Simulation Test Configuration
 * Comprehensive test configuration for all simulation scenarios
 */

import { getEnvironmentConfig } from "../../../src/config/env";

export interface TestWallet {
  name: string;
  mnemonic: string;
  address?: string;
  privateKey?: string;
}

export interface TestPool {
  poolId: string;
  tokenPolicy: string;
  tokenName: string;
  initialAdaReserve: bigint;
  initialTokenReserve: bigint;
  feeBasisPoints: number;
  lpTokenPolicy: string;
  lpTokenName: string;
}

export interface TestGovernanceProposal {
  proposalId: string;
  action: 'UpdateFee' | 'TreasuryPayout';
  parameters: any;
  title: string;
  description: string;
  proposalDeposit: bigint;
}

export interface TestStakingConfig {
  stakePoolId: string;
  initialStakeAmount: bigint;
  rewardRate: number; // Annual percentage
  syncInterval: number; // Slots
}

export interface TestCrossChainConfig {
  supportedChains: Array<{
    chainId: number;
    bridgeAddress: string;
    name: string;
  }>;
  initialVolume: bigint;
  testTransferAmount: bigint;
}

export interface SimulationTestConfig {
  // Environment
  network: "preprod" | "preview" | "mainnet";
  blockfrostApiKey: string;
  
  // Test wallets (using test mnemonics for Preprod)
  wallets: {
    deployer: TestWallet;
    user1: TestWallet;
    user2: TestWallet;
    user3: TestWallet;
    governance: TestWallet;
  };
  
  // Contract addresses (will be deployed during tests)
  contracts: {
    poolValidator?: string;
    liquidityValidator?: string;
    lpMintingPolicy?: string;
    governanceValidator?: string;
    stakingValidator?: string;
    pADAMintingPolicy?: string;
    crossChainRouterValidator?: string;
    poolRegistryValidator?: string;
    treasuryVaultValidator?: string;
  };
  
  // Test pools configuration
  testPools: TestPool[];
  
  // Governance test configuration
  governance: {
    proposals: TestGovernanceProposal[];
    quorumThreshold: bigint;
    votingPeriod: number; // Slots
  };
  
  // Liquid staking configuration
  staking: TestStakingConfig;
  
  // Cross-chain configuration
  crossChain: TestCrossChainConfig;
  
  // Context7 monitoring configuration
  monitoring: {
    pollingInterval: number;
    maxRetries: number;
    enableWebSocket: boolean;
    enableBroadcast: boolean;
  };
  
  // Test execution parameters
  execution: {
    timeoutMs: number;
    retryAttempts: number;
    delayBetweenTests: number;
    enableDetailedLogging: boolean;
    generateReports: boolean;
  };
}

/**
 * Default test configuration for Preprod testnet
 */
export const DEFAULT_TEST_CONFIG: SimulationTestConfig = {
  // Use environment configuration
  network: ENV_CONFIG.network as "preprod",
  blockfrostApiKey: ENV_CONFIG.blockfrostApiKey,
  
  // Test wallets with Preprod testnet mnemonics
  wallets: {
    deployer: {
      name: "deployer",
      mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art"
    },
    user1: {
      name: "user1", 
      mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    },
    user2: {
      name: "user2",
      mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon above"
    },
    user3: {
      name: "user3",
      mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon absent"
    },
    governance: {
      name: "governance",
      mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon absorb"
    }
  },
  
  // Contract addresses (to be populated during deployment)
  contracts: {},
  
  // Test pools
  testPools: [
    {
      poolId: "pucky_ada_pool",
      tokenPolicy: "a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235", // Mock PUCKY policy
      tokenName: "50554b4b59", // "PUCKY" in hex
      initialAdaReserve: 1000_000_000n, // 1000 ADA
      initialTokenReserve: 23019_520_000_000n, // 23.01952M PUCKY (100 ADA = 2,301,952 PUCKY)
      feeBasisPoints: 30, // 0.3%
      lpTokenPolicy: "", // Will be set during deployment
      lpTokenName: "4c505f50554b4b595f414441" // "LP_PUCKY_ADA" in hex
    },
    {
      poolId: "test_token_ada_pool",
      tokenPolicy: "b0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235", // Mock TEST policy
      tokenName: "54455354", // "TEST" in hex
      initialAdaReserve: 500_000_000n, // 500 ADA
      initialTokenReserve: 1000_000_000n, // 1000 TEST
      feeBasisPoints: 30, // 0.3%
      lpTokenPolicy: "", // Will be set during deployment
      lpTokenName: "4c505f544553545f414441" // "LP_TEST_ADA" in hex
    }
  ],
  
  // Governance configuration
  governance: {
    proposals: [
      {
        proposalId: "proposal_001",
        action: "UpdateFee",
        parameters: { newFeeBps: 25 }, // Reduce to 0.25%
        title: "Reduce Protocol Fee",
        description: "Proposal to reduce protocol fee from 0.3% to 0.25% to increase competitiveness",
        proposalDeposit: 100_000_000n // 100 ADA
      },
      {
        proposalId: "proposal_002", 
        action: "TreasuryPayout",
        parameters: { 
          payoutValue: { lovelace: 50_000_000n } // 50 ADA
        },
        title: "Treasury Development Fund",
        description: "Allocate 50 ADA from treasury for development initiatives",
        proposalDeposit: 100_000_000n // 100 ADA
      }
    ],
    quorumThreshold: 1000_000_000n, // 1000 governance tokens
    votingPeriod: 7200 // ~24 hours in slots (assuming 12s slots)
  },
  
  // Liquid staking configuration
  staking: {
    stakePoolId: "pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy", // Example Preprod pool
    initialStakeAmount: 100_000_000n, // 100 ADA
    rewardRate: 5.0, // 5% annual
    syncInterval: 300 // 5 minutes in slots
  },
  
  // Cross-chain configuration
  crossChain: {
    supportedChains: [
      {
        chainId: 1,
        bridgeAddress: "0x1234567890123456789012345678901234567890",
        name: "Ethereum"
      },
      {
        chainId: 56,
        bridgeAddress: "0x2345678901234567890123456789012345678901", 
        name: "BSC"
      }
    ],
    initialVolume: 0n,
    testTransferAmount: 10_000_000n // 10 ADA
  },
  
  // Monitoring configuration
  monitoring: {
    pollingInterval: 5000, // 5 seconds
    maxRetries: 3,
    enableWebSocket: true,
    enableBroadcast: false // Disable for tests
  },
  
  // Execution parameters
  execution: {
    timeoutMs: 300000, // 5 minutes per test
    retryAttempts: 3,
    delayBetweenTests: 2000, // 2 seconds
    enableDetailedLogging: true,
    generateReports: true
  }
};

/**
 * Get test configuration with environment overrides
 */
export function getTestConfig(): SimulationTestConfig {
  const envConfig = getEnvironmentConfig();
  
  return {
    ...DEFAULT_TEST_CONFIG,
    network: envConfig.network as "preprod",
    blockfrostApiKey: envConfig.blockfrostApiKey
  };
}

/**
 * Validate test configuration
 */
export function validateTestConfig(config: SimulationTestConfig): boolean {
  // Check required fields
  if (!config.blockfrostApiKey) {
    console.error("❌ Missing Blockfrost API key");
    return false;
  }
  
  if (!config.wallets.deployer.mnemonic) {
    console.error("❌ Missing deployer wallet mnemonic");
    return false;
  }
  
  if (config.testPools.length === 0) {
    console.error("❌ No test pools configured");
    return false;
  }
  
  console.log("✅ Test configuration is valid");
  return true;
}

export default {
  DEFAULT_TEST_CONFIG,
  getTestConfig,
  validateTestConfig
};
