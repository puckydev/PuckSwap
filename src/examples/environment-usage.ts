/**
 * PuckSwap v5 Environment Configuration Usage Examples
 * 
 * This file demonstrates how to use the centralized environment configuration
 * across all PuckSwap v5 off-chain builders and Context7 connections.
 */

import { 
  getEnvironmentConfig, 
  getNetworkEnvironment, 
  getBlockfrostApiKey,
  logEnvironmentConfig,
  validateEnvironmentConfig,
  ENV_CONFIG 
} from "../lib/environment-config";

import { PuckSwapSwapBuilder } from "../lucid/swap";
import { PuckSwapLiquidityBuilder } from "../lucid/liquidity";
import { proposeGovernance } from "../lucid/governance";
import { depositStaking, withdrawStaking } from "../lucid/staking";
import { PuckSwapCrossChainRouter } from "../lucid/crosschain";
import { createContext7MonitorV3 } from "../lib/context7-monitor-v3";

/**
 * Example 1: Basic Environment Configuration Usage
 */
export async function basicEnvironmentExample() {
  console.log("=== Basic Environment Configuration ===");
  
  // Get current environment configuration
  const envConfig = getEnvironmentConfig();
  console.log("Current Network:", envConfig.network);
  console.log("Lucid Network:", envConfig.lucidNetwork);
  console.log("Is Mainnet:", envConfig.isMainnet);
  console.log("Is Testnet:", envConfig.isTestnet);
  console.log("Demo Mode:", envConfig.isDemoMode);
  
  // Log full configuration
  logEnvironmentConfig();
  
  // Validate configuration
  const isValid = validateEnvironmentConfig();
  console.log("Configuration Valid:", isValid);
}

/**
 * Example 2: Swap Builder with Environment Configuration
 */
export async function swapBuilderExample() {
  console.log("=== Swap Builder Example ===");
  
  try {
    // Initialize swap builder - automatically uses centralized environment config
    const swapBuilder = await PuckSwapSwapBuilder.create(
      "590a4f590a4c...", // Pool validator CBOR
      undefined, // Network will be auto-detected from environment
      "eternl" // Wallet name
    );
    
    console.log("✅ Swap builder initialized successfully");
    
    // The builder now automatically uses:
    // - Correct network (preprod/mainnet based on NETWORK env var)
    // - Correct API key (preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL or mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7)
    // - Proper Lucid Evolution configuration
    
  } catch (error) {
    console.error("❌ Failed to initialize swap builder:", error);
  }
}

/**
 * Example 3: Liquidity Builder with Environment Configuration
 */
export async function liquidityBuilderExample() {
  console.log("=== Liquidity Builder Example ===");
  
  try {
    // Initialize liquidity builder - automatically uses centralized environment config
    const liquidityBuilder = await PuckSwapLiquidityBuilder.create(
      "590a4f590a4c...", // Pool validator CBOR
      "590b2f590b2c...", // Liquidity validator CBOR
      "590c3f590c3c...", // LP minting policy CBOR
      undefined, // Network will be auto-detected from environment
      "vespr" // Wallet name
    );
    
    console.log("✅ Liquidity builder initialized successfully");
    
  } catch (error) {
    console.error("❌ Failed to initialize liquidity builder:", error);
  }
}

/**
 * Example 4: Governance Operations with Environment Configuration
 */
export async function governanceExample() {
  console.log("=== Governance Example ===");
  
  try {
    // Propose governance - automatically uses centralized environment config
    const txHash = await proposeGovernance(
      {
        proposal_id: "PROP_001",
        action: {
          type: 'UpdateFee',
          parameters: {
            new_fee: 25 // 0.25%
          }
        }
      },
      "590d4f590d4c...", // Governance validator CBOR
      "addr1_governance_address",
      undefined, // Network will be auto-detected from environment
      "lace" // Wallet name
    );
    
    console.log("✅ Governance proposal submitted:", txHash);
    
  } catch (error) {
    console.error("❌ Failed to submit governance proposal:", error);
  }
}

/**
 * Example 5: Liquid Staking with Environment Configuration
 */
export async function liquidStakingExample() {
  console.log("=== Liquid Staking Example ===");
  
  try {
    // Deposit staking - automatically uses centralized environment config
    const depositTxHash = await depositStaking(
      "590e5f590e5c...", // Staking validator CBOR
      "590f6f590f6c...", // pADA minting policy CBOR
      "addr1_staking_address",
      {
        ada_amount: 100_000_000n, // 100 ADA
        min_pADA_out: 95_000_000n // Minimum 95 pADA
      },
      "eternl" // Wallet name
    );
    
    console.log("✅ Staking deposit submitted:", depositTxHash);
    
    // Withdraw staking
    const withdrawTxHash = await withdrawStaking(
      "590e5f590e5c...", // Staking validator CBOR
      "590f6f590f6c...", // pADA minting policy CBOR
      "addr1_staking_address",
      {
        pADA_amount: 50_000_000n, // 50 pADA
        min_ada_out: 48_000_000n // Minimum 48 ADA
      },
      "eternl" // Wallet name
    );
    
    console.log("✅ Staking withdrawal submitted:", withdrawTxHash);
    
  } catch (error) {
    console.error("❌ Failed to execute staking operations:", error);
  }
}

/**
 * Example 6: Cross-Chain Router with Environment Configuration
 */
export async function crossChainExample() {
  console.log("=== Cross-Chain Router Example ===");
  
  try {
    // Initialize cross-chain router - automatically uses centralized environment config
    const crossChainRouter = await PuckSwapCrossChainRouter.create(
      {
        routerValidator: "59105f59105c...", // Router validator CBOR
        packetValidator: "59116f59116c...", // Packet validator CBOR
      },
      "addr1_router_address",
      undefined, // Network will be auto-detected from environment
      "typhon" // Wallet name
    );
    
    console.log("✅ Cross-chain router initialized successfully");
    
    // Initiate cross-chain transfer
    const transferTxHash = await crossChainRouter.initiateCrossChainTransfer({
      chainId: 1n, // Ethereum
      assetType: 'ADA',
      amount: 50_000_000n, // 50 ADA
      recipientAddress: "0x1234567890abcdef1234567890abcdef12345678"
    });
    
    console.log("✅ Cross-chain transfer initiated:", transferTxHash);
    
  } catch (error) {
    console.error("❌ Failed to execute cross-chain operations:", error);
  }
}

/**
 * Example 7: Context7 Monitor with Environment Configuration
 */
export async function context7MonitorExample() {
  console.log("=== Context7 Monitor Example ===");
  
  try {
    // Create Context7 monitor - automatically uses centralized environment config
    const monitor = await createContext7MonitorV3({
      poolAddresses: [
        "addr1_pool_pucky_ada",
        "addr1_pool_wltc_ada",
        "addr1_pool_weth_ada"
      ],
      enableWebSocket: true,
      updateInterval: 5000, // 5 seconds
      historicalDataDays: 7
    });
    
    console.log("✅ Context7 monitor initialized successfully");
    
    // Add event listeners
    monitor.onPoolStateUpdate((poolStats) => {
      console.log(`Pool ${poolStats.poolId} updated:`, {
        price: poolStats.price,
        volume24h: poolStats.volume24h.toString(),
        tvl: poolStats.tvl.toString()
      });
    });
    
    monitor.onPoolEvent((event) => {
      console.log(`Pool event: ${event.type} in pool ${event.poolId}`);
    });
    
    // The monitor now automatically uses:
    // - Correct network (preprod/mainnet based on NETWORK env var)
    // - Correct API key (preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL or mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7)
    // - Proper Context7 configuration
    
  } catch (error) {
    console.error("❌ Failed to initialize Context7 monitor:", error);
  }
}

/**
 * Example 8: Environment Switching
 */
export async function environmentSwitchingExample() {
  console.log("=== Environment Switching Example ===");
  
  // To switch environments, simply change the NETWORK environment variable:
  // 
  // For Preprod testnet:
  // export NETWORK=preprod
  // 
  // For Mainnet:
  // export NETWORK=mainnet
  // 
  // For Preview testnet:
  // export NETWORK=preview
  
  console.log("Current environment:", getNetworkEnvironment());
  console.log("Current API key:", getBlockfrostApiKey(getNetworkEnvironment()).substring(0, 8) + "...");
  
  // All builders and monitors will automatically use the correct configuration
  console.log("✅ Environment switching is automatic - just change NETWORK env var");
}

/**
 * Example 9: Complete PuckSwap v5 Initialization
 */
export async function completePuckSwapExample() {
  console.log("=== Complete PuckSwap v5 Initialization ===");
  
  try {
    // Validate environment first
    if (!validateEnvironmentConfig()) {
      throw new Error("Invalid environment configuration");
    }
    
    logEnvironmentConfig();
    
    // Initialize all builders with automatic environment configuration
    const [swapBuilder, liquidityBuilder, crossChainRouter, monitor] = await Promise.all([
      PuckSwapSwapBuilder.create("590a4f590a4c..."),
      PuckSwapLiquidityBuilder.create("590a4f590a4c...", "590b2f590b2c...", "590c3f590c3c..."),
      PuckSwapCrossChainRouter.create({
        routerValidator: "59105f59105c...",
        packetValidator: "59116f59116c..."
      }, "addr1_router_address"),
      createContext7MonitorV3({
        poolAddresses: ["addr1_pool_pucky_ada"],
        enableWebSocket: true
      })
    ]);
    
    console.log("✅ All PuckSwap v5 components initialized successfully");
    console.log("🚀 PuckSwap v5 is ready for", ENV_CONFIG.isMainnet ? "MAINNET" : "TESTNET", "operations");
    
  } catch (error) {
    console.error("❌ Failed to initialize PuckSwap v5:", error);
  }
}

// Export all examples for easy testing
export const examples = {
  basicEnvironmentExample,
  swapBuilderExample,
  liquidityBuilderExample,
  governanceExample,
  liquidStakingExample,
  crossChainExample,
  context7MonitorExample,
  environmentSwitchingExample,
  completePuckSwapExample
};
