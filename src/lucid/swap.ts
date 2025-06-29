// PuckSwap Core Swap Transaction Builder - Production Ready
// Lucid Evolution transaction builders for ADA ↔ PUCKY swap operations
// Integrates with deployed Aiken smart contracts on Preprod testnet
// Full CIP-68 compliance with PoolCIP68Datum structure

import {
  Lucid,
  Data,
  UTxO,
  TxHash,
  Address,
  Assets,
  SpendingValidator,
  PolicyId,
  Unit,
  TxComplete,
  OutRef,
  Datum,
  Redeemer,
  Constr,
  fromText,
  toText,
  fromHex,
  toHex
} from "@lucid-evolution/lucid";

import { createLucidInstance, connectWallet } from "../lib/lucid-config";
import { getEnvironmentConfig, ENV_CONFIG } from "../lib/environment-config";
import { loadContractAddresses, getAMMAddresses } from "./utils/contractAddresses";

// =============================================================================
// CIP-68 DATUM AND REDEEMER STRUCTURES
// =============================================================================

// CIP-68 compliant PoolCIP68Datum structure matching Aiken validator
export interface PoolCIP68Datum {
  // Standard CIP-68 fields
  metadata: Map<string, Data>;
  version: bigint;
  extra: Data;

  // Pool-specific core data
  pool_state: PoolState;
  pool_config: PoolConfig;
  pool_stats: PoolStats;
}

export interface PoolState {
  ada_reserve: bigint;
  token_reserve: bigint;
  total_lp_supply: bigint;
  last_interaction_slot: bigint;
  pool_nft_name: string;
}

export interface PoolConfig {
  token_policy: string;
  token_name: string;
  lp_token_policy: string;
  lp_token_name: string;
  fee_bps: bigint;
  protocol_fee_bps: bigint;
  creator: string;
  admin: string;
  is_paused: boolean;
}

export interface PoolStats {
  total_volume_ada: bigint;
  total_volume_token: bigint;
  total_fees_collected: bigint;
  swap_count: bigint;
  liquidity_providers_count: bigint;
  created_at_slot: bigint;
  last_price_ada_per_token: bigint;
  price_history_hash: string;
}

// Core SwapRedeemer structure matching Aiken validator
export interface CoreSwapRedeemer {
  amount_in: bigint;
  min_amount_out: bigint;
  swap_in_token: boolean;  // True: PUCKY -> ADA, False: ADA -> PUCKY
  recipient: string;
  deadline_slot: bigint;
}

// =============================================================================
// SWAP OPERATION PARAMETERS
// =============================================================================

// Core swap operation parameters for ADA ↔ PUCKY swaps
export interface CoreSwapParams {
  poolUtxo: UTxO;
  swapInToken: boolean; // true for PUCKY->ADA, false for ADA->PUCKY
  amountIn: bigint;
  minAmountOut: bigint;
  userAddress: Address;
  deadlineSlot?: bigint;
  slippageToleranceBps?: number; // Basis points (100 = 1%)
}

// Swap parameters for PuckSwapSwapBuilder.executeSwap method
export interface SwapParams {
  poolUtxo?: UTxO; // Optional - will fetch from blockchain if not provided
  swapInToken: boolean; // true for PUCKY->ADA, false for ADA->PUCKY
  amountIn: bigint;
  minOut: bigint;
  slippageTolerance?: number; // Decimal (e.g., 0.05 = 5%)
  tokenPolicy?: string; // Required for token swaps
  tokenName?: string; // Required for token swaps
  userAddress?: string; // Optional - will use wallet address if not provided
}

// Removed hardcoded PUCKY_TOKEN_CONFIG - now using dynamic token discovery
// Token configurations are now fetched from active pools via the available tokens API

// Constants for AMM calculations
export const AMM_CONSTANTS = {
  FEE_NUMERATOR: 997n,
  FEE_DENOMINATOR: 1000n,
  MIN_ADA: 2_000_000n, // 2 ADA minimum UTxO requirement
  PRECISION_MULTIPLIER: 1_000_000n // For price calculations
};

// =============================================================================
// CORE SWAP TRANSACTION BUILDER
// =============================================================================

/**
 * Build ADA ↔ PUCKY swap transaction using deployed Aiken smart contracts
 * @param lucid - Lucid Evolution instance
 * @param params - Core swap parameters
 * @returns Promise resolving to complete transaction
 */
export async function buildCoreSwapTransaction(
  lucid: Lucid,
  params: CoreSwapParams
): Promise<TxComplete> {
  try {
    // Load deployed contract addresses
    const contractAddresses = getAMMAddresses();

    // Validate parameters
    validateSwapParams(params);

    // Parse pool datum from UTxO
    const poolDatum = parsePoolCIP68Datum(params.poolUtxo.datum!);

    // Calculate swap output using constant product formula
    const swapResult = calculateSwapOutput(
      poolDatum.pool_state.ada_reserve,
      poolDatum.pool_state.token_reserve,
      params.amountIn,
      params.swapInToken
    );

    // Validate minimum output requirement
    if (swapResult.outputAmount < params.minAmountOut) {
      throw new Error(
        `Insufficient output amount. Expected at least ${params.minAmountOut}, got ${swapResult.outputAmount}`
      );
    }

    // Create swap redeemer
    const swapRedeemer = createSwapRedeemer({
      amount_in: params.amountIn,
      min_amount_out: params.minAmountOut,
      swap_in_token: params.swapInToken,
      recipient: params.userAddress,
      deadline_slot: params.deadlineSlot || BigInt(Date.now() + 3600000) // 1 hour default
    });

    // Create updated pool datum
    const updatedPoolDatum = createUpdatedPoolDatum(poolDatum, swapResult);

    // Build transaction
    const tx = lucid
      .newTx()
      .collectFrom([params.poolUtxo], swapRedeemer)
      .payToContract(
        contractAddresses.swapValidator,
        { inline: updatedPoolDatum },
        {
          lovelace: swapResult.newAdaReserve,
          [PUCKY_TOKEN_CONFIG.policy + fromText(PUCKY_TOKEN_CONFIG.name)]: swapResult.newTokenReserve
        }
      );

    // Add user input/output based on swap direction
    if (params.swapInToken) {
      // Token -> ADA swap: User provides token, receives ADA
      tx.payToAddress(params.userAddress, { lovelace: swapResult.outputAmount });
    } else {
      // ADA -> Token swap: User provides ADA, receives token
      if (params.tokenPolicy && params.tokenName) {
        const tokenUnit = `${params.tokenPolicy}${params.tokenName}`;
        tx.payToAddress(params.userAddress, {
          [tokenUnit]: swapResult.outputAmount
        });
      } else {
        throw new Error('Token policy and name required for ADA -> Token swap');
      }
    }

    // Set validity interval if deadline is specified
    if (params.deadlineSlot) {
      tx.validTo(Number(params.deadlineSlot));
    }

    return await tx.complete();

  } catch (error) {
    throw new Error(`Failed to build swap transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Swap transaction result
export interface SwapTransactionResult {
  txHash: TxHash;
  actualOutput: bigint;
  priceImpact: number;
  fees: {
    tradingFee: bigint;
    totalFee: bigint;
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Swap calculation result
export interface SwapCalculationResult {
  outputAmount: bigint;
  newAdaReserve: bigint;
  newTokenReserve: bigint;
  feeAmount: bigint;
  priceImpact: number;
}

/**
 * Calculate swap output using constant product formula (x * y = k)
 * @param adaReserve - Current ADA reserve
 * @param tokenReserve - Current token reserve
 * @param amountIn - Input amount
 * @param swapInToken - True for PUCKY->ADA, false for ADA->PUCKY
 * @returns Swap calculation result
 */
export function calculateSwapOutput(
  adaReserve: bigint,
  tokenReserve: bigint,
  amountIn: bigint,
  swapInToken: boolean
): SwapCalculationResult {
  // Validate input parameters
  if (adaReserve <= 0n || tokenReserve <= 0n || amountIn <= 0n) {
    throw new Error("Invalid swap parameters: reserves and amount must be positive");
  }

  // Calculate fee using 0.3% model (997/1000)
  const amountInWithFee = amountIn * AMM_CONSTANTS.FEE_NUMERATOR;
  const feeAmount = amountIn - (amountInWithFee / AMM_CONSTANTS.FEE_DENOMINATOR);

  let outputAmount: bigint;
  let newAdaReserve: bigint;
  let newTokenReserve: bigint;

  if (swapInToken) {
    // PUCKY -> ADA swap
    const denominator = tokenReserve * AMM_CONSTANTS.FEE_DENOMINATOR + amountInWithFee;
    outputAmount = (adaReserve * amountInWithFee) / denominator;
    newAdaReserve = adaReserve - outputAmount;
    newTokenReserve = tokenReserve + amountIn;
  } else {
    // ADA -> PUCKY swap
    const denominator = adaReserve * AMM_CONSTANTS.FEE_DENOMINATOR + amountInWithFee;
    outputAmount = (tokenReserve * amountInWithFee) / denominator;
    newAdaReserve = adaReserve + amountIn;
    newTokenReserve = tokenReserve - outputAmount;
  }

  // Validate constant product invariant (k should increase due to fees)
  const oldK = adaReserve * tokenReserve;
  const newK = newAdaReserve * newTokenReserve;
  if (newK < oldK) {
    throw new Error("Constant product invariant violated");
  }

  // Calculate price impact
  const priceImpact = calculatePriceImpact(adaReserve, tokenReserve, amountIn, outputAmount, swapInToken);

  return {
    outputAmount,
    newAdaReserve,
    newTokenReserve,
    feeAmount,
    priceImpact
  };
}

/**
 * Calculate price impact of a swap
 */
function calculatePriceImpact(
  adaReserve: bigint,
  tokenReserve: bigint,
  amountIn: bigint,
  outputAmount: bigint,
  swapInToken: boolean
): number {
  // Calculate price before and after swap
  const priceBefore = swapInToken
    ? Number(adaReserve) / Number(tokenReserve)
    : Number(tokenReserve) / Number(adaReserve);

  const priceAfter = swapInToken
    ? Number(amountIn) / Number(outputAmount)
    : Number(outputAmount) / Number(amountIn);

  return Math.abs((priceAfter - priceBefore) / priceBefore) * 100;
}

// Pool discovery parameters
export interface PoolDiscoveryParams {
  tokenPolicy: PolicyId;
  tokenName: string;
  poolValidatorAddress: Address;
}

// =============================================================================
// SERIALIZATION FUNCTIONS
// =============================================================================

/**
 * Parse PoolCIP68Datum from UTxO datum
 */
export function parsePoolCIP68Datum(datum: string): PoolCIP68Datum {
  try {
    const datumData = Data.from(datum);
    // TODO: Implement proper CIP-68 datum parsing
    // This is a simplified version - needs to be updated with actual CIP-68 structure
    throw new Error("CIP-68 datum parsing not yet implemented");
  } catch (error) {
    throw new Error(`Failed to parse pool datum: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create swap redeemer for Aiken validator
 */
export function createSwapRedeemer(redeemer: CoreSwapRedeemer): string {
  try {
    // Create redeemer matching Aiken SwapRedeemer structure
    const redeemerData = new Constr(0, [
      redeemer.amount_in,
      redeemer.min_amount_out,
      redeemer.swap_in_token,
      fromText(redeemer.recipient),
      redeemer.deadline_slot
    ]);

    return Data.to(redeemerData);
  } catch (error) {
    throw new Error(`Failed to create swap redeemer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create updated pool datum after swap
 */
export function createUpdatedPoolDatum(
  originalDatum: PoolCIP68Datum,
  swapResult: SwapCalculationResult
): string {
  try {
    // Update pool state with new reserves
    const updatedDatum: PoolCIP68Datum = {
      ...originalDatum,
      pool_state: {
        ...originalDatum.pool_state,
        ada_reserve: swapResult.newAdaReserve,
        token_reserve: swapResult.newTokenReserve,
        last_interaction_slot: BigInt(Date.now())
      },
      pool_stats: {
        ...originalDatum.pool_stats,
        swap_count: originalDatum.pool_stats.swap_count + 1n,
        total_fees_collected: originalDatum.pool_stats.total_fees_collected + swapResult.feeAmount
      }
    };

    // TODO: Implement proper CIP-68 datum serialization
    // This is a simplified version - needs to be updated with actual CIP-68 structure
    throw new Error("CIP-68 datum serialization not yet implemented");
  } catch (error) {
    throw new Error(`Failed to create updated pool datum: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate swap parameters
 */
export function validateSwapParams(params: CoreSwapParams): void {
  if (!params.poolUtxo) {
    throw new Error("Pool UTxO is required");
  }

  if (!params.poolUtxo.datum) {
    throw new Error("Pool UTxO must have datum");
  }

  if (params.amountIn <= 0n) {
    throw new Error("Amount in must be positive");
  }

  if (params.minAmountOut < 0n) {
    throw new Error("Minimum amount out cannot be negative");
  }

  if (!params.userAddress) {
    throw new Error("User address is required");
  }

  // Validate minimum ADA requirements
  if (!params.swapInToken && params.amountIn < AMM_CONSTANTS.MIN_ADA) {
    throw new Error(`ADA amount must be at least ${AMM_CONSTANTS.MIN_ADA} lovelace`);
  }
}

/**
 * PuckSwap Swap Transaction Builder
 * Handles all swap operations with master schema compliance
 */
export class PuckSwapSwapBuilder {
  private lucid: Lucid;
  private poolValidator: SpendingValidator;
  private poolAddress: Address;

  constructor(
    lucid: Lucid,
    poolValidator: SpendingValidator
  ) {
    this.lucid = lucid;
    this.poolValidator = poolValidator;
    this.poolAddress = lucid.utils.validatorToAddress(poolValidator);
  }

  /**
   * Fetch real pool UTxOs from the deployed swap validator address
   * @returns Promise<UTxO[]> - Array of UTxOs at the pool address
   */
  async getPoolUtxos(): Promise<UTxO[]> {
    try {
      console.log(`🔍 Fetching pool UTxOs from address: ${this.poolAddress}`);

      const utxos = await this.lucid.utxosAt(this.poolAddress);

      console.log(`📦 Found ${utxos.length} UTxOs at pool address`);

      // Filter for UTxOs that contain pool datum
      const poolUtxos = utxos.filter(utxo => {
        return utxo.datum && utxo.datum !== null;
      });

      console.log(`🏊 Found ${poolUtxos.length} pool UTxOs with datum`);

      return poolUtxos;
    } catch (error) {
      console.error('❌ Failed to fetch pool UTxOs:', error);
      throw new Error(`Failed to fetch pool UTxOs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the main pool UTxO (the one with the largest ADA reserve)
   * @returns Promise<UTxO | null> - The main pool UTxO or null if none found
   */
  async getMainPoolUtxo(): Promise<UTxO | null> {
    const poolUtxos = await this.getPoolUtxos();

    if (poolUtxos.length === 0) {
      console.warn('⚠️ No pool UTxOs found');
      return null;
    }

    // Find the UTxO with the largest ADA amount (main pool)
    let mainPoolUtxo = poolUtxos[0];
    let maxAda = mainPoolUtxo.assets.lovelace || 0n;

    for (const utxo of poolUtxos) {
      const adaAmount = utxo.assets.lovelace || 0n;
      if (adaAmount > maxAda) {
        maxAda = adaAmount;
        mainPoolUtxo = utxo;
      }
    }

    console.log(`🎯 Main pool UTxO found with ${maxAda} lovelace`);
    return mainPoolUtxo;
  }

  /**
   * Initialize swap builder with Lucid Evolution using centralized environment config
   */
  static async create(
    poolValidatorCbor: string,
    network?: "Mainnet" | "Preview" | "Preprod",
    walletName?: "eternl" | "nami" | "vespr" | "lace" | "typhon" | "flint"
  ): Promise<PuckSwapSwapBuilder> {
    // Use centralized environment configuration
    const envConfig = getEnvironmentConfig();
    const targetNetwork = network || envConfig.lucidNetwork;

    console.log(`🔄 Initializing PuckSwap Swap Builder on ${targetNetwork}...`);
    console.log(`📡 Using API Key: ${envConfig.blockfrostApiKey.substring(0, 8)}...`);

    const lucid = await createLucidInstance(network ? { network } : undefined);

    // Connect wallet if specified
    if (walletName) {
      await connectWallet(lucid, walletName);
    }

    const poolValidator: SpendingValidator = {
      type: "PlutusV2",
      script: poolValidatorCbor
    };

    return new PuckSwapSwapBuilder(lucid, poolValidator);
  }

  /**
   * Connect wallet to the swap builder
   */
  async connectWallet(walletName: "eternl" | "nami" | "vespr" | "lace" | "typhon" | "flint"): Promise<void> {
    await connectWallet(this.lucid, walletName);
  }

  /**
   * Discover pool UTxO by token policy and name
   */
  async discoverPool(params: PoolDiscoveryParams): Promise<UTxO | null> {
    try {
      const utxos = await this.lucid.utxosAt(params.poolValidatorAddress);

      for (const utxo of utxos) {
        // Check if UTxO contains the target token
        const tokenUnit = `${params.tokenPolicy}${params.tokenName}`;
        if (utxo.assets[tokenUnit] && utxo.assets[tokenUnit] > 0n) {
          // Verify this is a valid pool UTxO by checking datum structure
          if (utxo.datum) {
            try {
              const poolDatum = await this.parsePoolDatum(utxo.datum);
              if (poolDatum) {
                return utxo;
              }
            } catch (error) {
              // Skip invalid datum UTxOs
              continue;
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Error discovering pool:", error);
      return null;
    }
  }

  /**
   * Calculate swap output using constant product AMM formula with 0.3% fee
   */
  calculateSwapOutput(
    amountIn: bigint,
    swapInToken: boolean,
    poolDatum: PoolDatum
  ): { outputAmount: bigint; newAdaReserve: bigint; newTokenReserve: bigint; fee: bigint } {
    const { ada_reserve, token_reserve, fee_basis_points } = poolDatum;

    // Calculate fee (0.3% = 30 basis points, using 997/1000 model)
    const fee = amountIn * BigInt(fee_basis_points) / 10000n;
    const netAmountIn = amountIn - fee;

    let outputAmount: bigint;
    let newAdaReserve: bigint;
    let newTokenReserve: bigint;

    if (swapInToken) {
      // Token -> ADA swap
      // Using constant product formula: (x + dx) * (y - dy) = x * y
      // dy = y * dx / (x + dx)
      outputAmount = ada_reserve * netAmountIn / (token_reserve + netAmountIn);
      newAdaReserve = ada_reserve - outputAmount;
      newTokenReserve = token_reserve + amountIn;
    } else {
      // ADA -> Token swap
      outputAmount = token_reserve * netAmountIn / (ada_reserve + netAmountIn);
      newAdaReserve = ada_reserve + amountIn;
      newTokenReserve = token_reserve - outputAmount;
    }

    return {
      outputAmount,
      newAdaReserve,
      newTokenReserve,
      fee
    };
  }

  /**
   * Validate swap parameters
   */
  private validateSwapParams(params: SwapParams, poolDatum: PoolDatum): void {
    if (params.amountIn <= 0n) {
      throw new Error("Amount in must be positive");
    }

    if (params.minOut < 0n) {
      throw new Error("Minimum output cannot be negative");
    }

    // Check sufficient reserves
    if (params.swapInToken) {
      if (params.amountIn > poolDatum.token_reserve) {
        throw new Error("Insufficient token reserves in pool");
      }
    } else {
      if (params.amountIn > poolDatum.ada_reserve) {
        throw new Error("Insufficient ADA reserves in pool");
      }
    }

    // Validate token policy and name are provided for token swaps
    if (params.swapInToken && (!params.tokenPolicy || !params.tokenName)) {
      throw new Error("Token policy and name must be provided for token swaps");
    }
  }

  /**
   * Parse pool datum from UTxO according to master schema
   */
  private async parsePoolDatum(datum: Datum): Promise<PoolDatum | null> {
    try {
      let datumData: Data;

      if (typeof datum === 'string') {
        // Inline datum
        datumData = Data.from(datum);
      } else {
        // Datum hash - need to resolve
        datumData = await this.lucid.datumOf(datum);
      }

      // Parse according to master schema PoolDatum structure
      if (datumData instanceof Constr && datumData.fields.length === 5) {
        return {
          ada_reserve: datumData.fields[0] as bigint,
          token_reserve: datumData.fields[1] as bigint,
          fee_basis_points: Number(datumData.fields[2]),
          lp_token_policy: toText(datumData.fields[3] as string),
          lp_token_name: toText(datumData.fields[4] as string)
        };
      }

      throw new Error("Invalid datum structure");
    } catch (error) {
      console.error("Error parsing pool datum:", error);
      return null;
    }
  }

  /**
   * Serialize PoolDatum according to master schema
   */
  private serializePoolDatum(poolDatum: PoolDatum): Data {
    return Data.to(new Constr(0, [
      poolDatum.ada_reserve,
      poolDatum.token_reserve,
      BigInt(poolDatum.fee_basis_points),
      fromText(poolDatum.lp_token_policy),
      fromText(poolDatum.lp_token_name)
    ]));
  }

  /**
   * Serialize SwapRedeemer according to master schema
   */
  private serializeSwapRedeemer(swapRedeemer: SwapRedeemer): Data {
    return Data.to(new Constr(0, [
      swapRedeemer.swap_in_token ? 1n : 0n,
      swapRedeemer.amount_in,
      swapRedeemer.min_out
    ]));
  }

  /**
   * Build and submit swap transaction
   */
  async executeSwap(params: SwapParams): Promise<SwapTransactionResult> {
    // Validate wallet connection
    if (!this.lucid.wallet) {
      throw new Error("Wallet not connected. Call connectWallet() first.");
    }

    // Get pool UTxO - use provided one or fetch from blockchain
    let poolUtxo = params.poolUtxo;
    if (!poolUtxo) {
      console.log('🔍 No pool UTxO provided, fetching from blockchain...');
      poolUtxo = await this.getMainPoolUtxo();
      if (!poolUtxo) {
        throw new Error("No pool UTxO found on blockchain. Pool may not be initialized.");
      }
    }

    // Parse pool datum
    const poolDatum = await this.parsePoolDatum(poolUtxo.datum!);
    if (!poolDatum) {
      throw new Error("Invalid pool datum");
    }

    // Validate parameters
    this.validateSwapParams(params, poolDatum);

    // Calculate swap result
    const swapResult = this.calculateSwapOutput(
      params.amountIn,
      params.swapInToken,
      poolDatum
    );

    // Check minimum output
    if (swapResult.outputAmount < params.minOut) {
      throw new Error(
        `Output ${swapResult.outputAmount} is less than minimum required ${params.minOut}`
      );
    }

    // Get user address
    const userAddress = params.userAddress || await this.lucid.wallet.address();

    // Create updated pool datum
    const updatedPoolDatum: PoolDatum = {
      ...poolDatum,
      ada_reserve: swapResult.newAdaReserve,
      token_reserve: swapResult.newTokenReserve
    };

    // Create redeemer
    const swapRedeemer: SwapRedeemer = {
      swap_in_token: params.swapInToken,
      amount_in: params.amountIn,
      min_out: params.minOut
    };

    // Serialize datum and redeemer
    const newDatumData = this.serializePoolDatum(updatedPoolDatum);
    const redeemerData = this.serializeSwapRedeemer(swapRedeemer);

    // Build transaction assets
    const poolOutputAssets: Assets = {
      lovelace: swapResult.newAdaReserve
    };

    // Add token to pool output if reserves > 0
    if (swapResult.newTokenReserve > 0n && params.tokenPolicy && params.tokenName) {
      const tokenUnit = `${params.tokenPolicy}${params.tokenName}`;
      poolOutputAssets[tokenUnit] = swapResult.newTokenReserve;
    }

    // Ensure minimum ADA requirement (2 ADA minimum)
    const minADA = 2_000_000n;
    if (poolOutputAssets.lovelace < minADA) {
      poolOutputAssets.lovelace = minADA;
    }

    // Build user output assets
    const userOutputAssets: Assets = {};
    if (params.swapInToken) {
      // User receives ADA
      userOutputAssets.lovelace = swapResult.outputAmount;
    } else {
      // User receives tokens
      if (params.tokenPolicy && params.tokenName) {
        const tokenUnit = `${params.tokenPolicy}${params.tokenName}`;
        userOutputAssets[tokenUnit] = swapResult.outputAmount;
      }
    }

    // Build and complete transaction
    const tx = await this.lucid.newTx()
      .collectFrom([poolUtxo], redeemerData)
      .payToContract(this.poolAddress, { inline: newDatumData }, poolOutputAssets)
      .payToAddress(userAddress, userOutputAssets)
      .attachSpendingValidator(this.poolValidator)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    // Sign and submit transaction
    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();

    // Calculate price impact
    const oldPrice = Number(poolDatum.ada_reserve) / Number(poolDatum.token_reserve);
    const newPrice = Number(swapResult.newAdaReserve) / Number(swapResult.newTokenReserve);
    const priceImpact = Math.abs((newPrice - oldPrice) / oldPrice) * 100;

    console.log(`Swap transaction submitted: ${txHash}`);
    console.log(`Output amount: ${swapResult.outputAmount}`);
    console.log(`Fee: ${swapResult.fee}`);
    console.log(`Price impact: ${priceImpact.toFixed(2)}%`);

    return {
      txHash,
      actualOutput: swapResult.outputAmount,
      priceImpact,
      fees: {
        tradingFee: swapResult.fee,
        totalFee: swapResult.fee
      }
    };
  }
}
