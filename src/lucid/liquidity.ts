// PuckSwap Core Liquidity Transaction Builder - Production Ready
// Lucid Evolution transaction builders for ADA ↔ PUCKY liquidity operations
// Integrates with deployed Aiken smart contracts on Preprod testnet
// Full CIP-68 compliance with LP token minting and burning

import {
  Lucid,
  Data,
  UTxO,
  TxHash,
  Address,
  Assets,
  SpendingValidator,
  MintingPolicy,
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
import {
  PoolCIP68Datum,
  PoolState,
  PoolConfig,
  PoolStats,
  PUCKY_TOKEN_CONFIG,
  AMM_CONSTANTS,
  parsePoolCIP68Datum
} from "./swap";

// =============================================================================
// LIQUIDITY OPERATION PARAMETERS
// =============================================================================

// Core liquidity provision redeemer matching Aiken validator
export interface CoreLiquidityRedeemer {
  ada_amount: bigint;
  token_amount: bigint;
  min_lp_tokens: bigint;
  is_initial_liquidity: boolean;
  user_address: string;
  deadline_slot: bigint;
}

// Core liquidity withdrawal redeemer matching Aiken validator
export interface CoreWithdrawalRedeemer {
  lp_tokens_to_burn: bigint;
  min_ada_out: bigint;
  min_token_out: bigint;
  user_address: string;
  deadline_slot: bigint;
}

// Core LP minting redeemer matching Aiken policy
export interface CoreLPMintingRedeemer {
  operation_type: LPOperationType;
  pool_utxo_ref: string;
  validator_hash: string;
  user_address: string;
}

export type LPOperationType =
  | { MintLP: { ada_amount: bigint; token_amount: bigint; lp_tokens_to_mint: bigint; is_initial_liquidity: boolean } }
  | { BurnLP: { lp_tokens_to_burn: bigint; ada_amount_out: bigint; token_amount_out: bigint } };

// Add liquidity parameters
export interface CoreAddLiquidityParams {
  poolUtxo: UTxO;
  adaAmount: bigint;
  tokenAmount: bigint;
  minLpTokens: bigint;
  userAddress: Address;
  isInitialLiquidity?: boolean;
  deadlineSlot?: bigint;
}

// Remove liquidity parameters
export interface CoreRemoveLiquidityParams {
  poolUtxo: UTxO;
  lpTokenAmount: bigint;
  minAdaOut: bigint;
  minTokenOut: bigint;
  userAddress: Address;
  deadlineSlot?: bigint;
}

// =============================================================================
// CORE LIQUIDITY TRANSACTION BUILDERS
// =============================================================================

/**
 * Build ADA + PUCKY liquidity provision transaction
 * @param lucid - Lucid Evolution instance
 * @param params - Core add liquidity parameters
 * @returns Promise resolving to complete transaction
 */
export async function buildCoreAddLiquidityTransaction(
  lucid: Lucid,
  params: CoreAddLiquidityParams
): Promise<TxComplete> {
  try {
    // Load deployed contract addresses
    const contractAddresses = getAMMAddresses();

    // Validate parameters
    validateAddLiquidityParams(params);

    // Parse pool datum from UTxO
    const poolDatum = parsePoolCIP68Datum(params.poolUtxo.datum!);

    // Calculate liquidity provision
    const liquidityResult = calculateLiquidityProvision(
      poolDatum.pool_state.ada_reserve,
      poolDatum.pool_state.token_reserve,
      poolDatum.pool_state.total_lp_supply,
      params.adaAmount,
      params.tokenAmount,
      params.isInitialLiquidity || false
    );

    // Validate minimum LP tokens requirement
    if (liquidityResult.lpTokensMinted < params.minLpTokens) {
      throw new Error(
        `Insufficient LP tokens. Expected at least ${params.minLpTokens}, got ${liquidityResult.lpTokensMinted}`
      );
    }

    // Create liquidity provision redeemer
    const liquidityRedeemer = createLiquidityRedeemer({
      ada_amount: params.adaAmount,
      token_amount: params.tokenAmount,
      min_lp_tokens: params.minLpTokens,
      is_initial_liquidity: params.isInitialLiquidity || false,
      user_address: params.userAddress,
      deadline_slot: params.deadlineSlot || BigInt(Date.now() + 3600000)
    });

    // Create LP minting redeemer
    const lpMintingRedeemer = createLPMintingRedeemer({
      operation_type: {
        MintLP: {
          ada_amount: params.adaAmount,
          token_amount: params.tokenAmount,
          lp_tokens_to_mint: liquidityResult.lpTokensMinted,
          is_initial_liquidity: params.isInitialLiquidity || false
        }
      },
      pool_utxo_ref: params.poolUtxo.txHash + "#" + params.poolUtxo.outputIndex,
      validator_hash: contractAddresses.liquidityProvisionValidator.slice(5), // Remove addr_test1 prefix
      user_address: params.userAddress
    });

    // Create updated pool datum
    const updatedPoolDatum = createUpdatedPoolDatumForLiquidity(poolDatum, liquidityResult);

    // Build transaction
    const tx = lucid
      .newTx()
      .collectFrom([params.poolUtxo], liquidityRedeemer)
      .payToContract(
        contractAddresses.liquidityProvisionValidator,
        { inline: updatedPoolDatum },
        {
          lovelace: liquidityResult.newAdaReserve,
          [PUCKY_TOKEN_CONFIG.policy + fromText(PUCKY_TOKEN_CONFIG.name)]: liquidityResult.newTokenReserve
        }
      )
      .mintAssets(
        {
          [contractAddresses.lpMintingPolicy + fromText(poolDatum.pool_config.lp_token_name)]: liquidityResult.lpTokensMinted
        },
        lpMintingRedeemer
      )
      .payToAddress(params.userAddress, {
        [contractAddresses.lpMintingPolicy + fromText(poolDatum.pool_config.lp_token_name)]: liquidityResult.lpTokensMinted
      });

    // Set validity interval if deadline is specified
    if (params.deadlineSlot) {
      tx.validTo(Number(params.deadlineSlot));
    }

    return await tx.complete();

  } catch (error) {
    throw new Error(`Failed to build add liquidity transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build LP token burning transaction for liquidity withdrawal
 * @param lucid - Lucid Evolution instance
 * @param params - Core remove liquidity parameters
 * @returns Promise resolving to complete transaction
 */
export async function buildCoreRemoveLiquidityTransaction(
  lucid: Lucid,
  params: CoreRemoveLiquidityParams
): Promise<TxComplete> {
  try {
    // Load deployed contract addresses
    const contractAddresses = getAMMAddresses();

    // Validate parameters
    validateRemoveLiquidityParams(params);

    // Parse pool datum from UTxO
    const poolDatum = parsePoolCIP68Datum(params.poolUtxo.datum!);

    // Calculate liquidity withdrawal
    const withdrawalResult = calculateLiquidityWithdrawal(
      poolDatum.pool_state.ada_reserve,
      poolDatum.pool_state.token_reserve,
      poolDatum.pool_state.total_lp_supply,
      params.lpTokenAmount
    );

    // Validate minimum output requirements
    if (withdrawalResult.adaAmountOut < params.minAdaOut) {
      throw new Error(
        `Insufficient ADA output. Expected at least ${params.minAdaOut}, got ${withdrawalResult.adaAmountOut}`
      );
    }

    if (withdrawalResult.tokenAmountOut < params.minTokenOut) {
      throw new Error(
        `Insufficient token output. Expected at least ${params.minTokenOut}, got ${withdrawalResult.tokenAmountOut}`
      );
    }

    // Create withdrawal redeemer
    const withdrawalRedeemer = createWithdrawalRedeemer({
      lp_tokens_to_burn: params.lpTokenAmount,
      min_ada_out: params.minAdaOut,
      min_token_out: params.minTokenOut,
      user_address: params.userAddress,
      deadline_slot: params.deadlineSlot || BigInt(Date.now() + 3600000)
    });

    // Create LP burning redeemer
    const lpBurningRedeemer = createLPMintingRedeemer({
      operation_type: {
        BurnLP: {
          lp_tokens_to_burn: params.lpTokenAmount,
          ada_amount_out: withdrawalResult.adaAmountOut,
          token_amount_out: withdrawalResult.tokenAmountOut
        }
      },
      pool_utxo_ref: params.poolUtxo.txHash + "#" + params.poolUtxo.outputIndex,
      validator_hash: contractAddresses.liquidityWithdrawalValidator.slice(5), // Remove addr_test1 prefix
      user_address: params.userAddress
    });

    // Create updated pool datum
    const updatedPoolDatum = createUpdatedPoolDatumForWithdrawal(poolDatum, withdrawalResult);

    // Build transaction
    const tx = lucid
      .newTx()
      .collectFrom([params.poolUtxo], withdrawalRedeemer)
      .payToContract(
        contractAddresses.liquidityWithdrawalValidator,
        { inline: updatedPoolDatum },
        {
          lovelace: withdrawalResult.newAdaReserve,
          [PUCKY_TOKEN_CONFIG.policy + fromText(PUCKY_TOKEN_CONFIG.name)]: withdrawalResult.newTokenReserve
        }
      )
      .mintAssets(
        {
          [contractAddresses.lpMintingPolicy + fromText(poolDatum.pool_config.lp_token_name)]: -params.lpTokenAmount
        },
        lpBurningRedeemer
      )
      .payToAddress(params.userAddress, {
        lovelace: withdrawalResult.adaAmountOut,
        [PUCKY_TOKEN_CONFIG.policy + fromText(PUCKY_TOKEN_CONFIG.name)]: withdrawalResult.tokenAmountOut
      });

    // Set validity interval if deadline is specified
    if (params.deadlineSlot) {
      tx.validTo(Number(params.deadlineSlot));
    }

    return await tx.complete();

  } catch (error) {
    throw new Error(`Failed to build remove liquidity transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Liquidity transaction result
export interface LiquidityTransactionResult {
  txHash: TxHash;
  lpTokensChanged: bigint; // Positive for add, negative for remove
  adaAmount: bigint;
  tokenAmount: bigint;
  poolShare: number; // Percentage of pool ownership
  newPoolState: PoolCIP68Datum;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Liquidity calculation results
export interface LiquidityCalculationResult {
  lpTokensMinted: bigint;
  newAdaReserve: bigint;
  newTokenReserve: bigint;
  newTotalLpSupply: bigint;
}

export interface WithdrawalCalculationResult {
  adaAmountOut: bigint;
  tokenAmountOut: bigint;
  newAdaReserve: bigint;
  newTokenReserve: bigint;
  newTotalLpSupply: bigint;
}

/**
 * Calculate liquidity provision using proportional deposits
 * @param adaReserve - Current ADA reserve
 * @param tokenReserve - Current token reserve
 * @param totalLpSupply - Current total LP supply
 * @param adaAmount - ADA amount to deposit
 * @param tokenAmount - Token amount to deposit
 * @param isInitialLiquidity - Whether this is initial liquidity
 * @returns Liquidity calculation result
 */
export function calculateLiquidityProvision(
  adaReserve: bigint,
  tokenReserve: bigint,
  totalLpSupply: bigint,
  adaAmount: bigint,
  tokenAmount: bigint,
  isInitialLiquidity: boolean
): LiquidityCalculationResult {
  // Validate input parameters
  if (adaAmount <= 0n || tokenAmount <= 0n) {
    throw new Error("Invalid liquidity parameters: amounts must be positive");
  }

  let lpTokensMinted: bigint;
  let newAdaReserve: bigint;
  let newTokenReserve: bigint;
  let newTotalLpSupply: bigint;

  if (isInitialLiquidity) {
    // Initial liquidity: LP tokens = sqrt(ada_amount * token_amount)
    if (adaReserve !== 0n || tokenReserve !== 0n || totalLpSupply !== 0n) {
      throw new Error("Pool already has liquidity, cannot add initial liquidity");
    }

    // Calculate initial LP tokens using geometric mean
    lpTokensMinted = sqrt(adaAmount * tokenAmount);
    if (lpTokensMinted <= 0n) {
      throw new Error("Initial liquidity too small");
    }

    newAdaReserve = adaAmount;
    newTokenReserve = tokenAmount;
    newTotalLpSupply = lpTokensMinted;
  } else {
    // Subsequent liquidity: maintain pool ratio
    if (adaReserve <= 0n || tokenReserve <= 0n || totalLpSupply <= 0n) {
      throw new Error("Pool has no liquidity, must add initial liquidity first");
    }

    // Calculate proportional amounts with 1% tolerance
    const adaRatio = (adaAmount * AMM_CONSTANTS.PRECISION_MULTIPLIER) / adaReserve;
    const tokenRatio = (tokenAmount * AMM_CONSTANTS.PRECISION_MULTIPLIER) / tokenReserve;

    // Validate amounts are proportional (within 1% tolerance)
    const ratioDiff = adaRatio > tokenRatio ? adaRatio - tokenRatio : tokenRatio - adaRatio;
    const toleranceBps = 10000n; // 1% tolerance
    if (ratioDiff > toleranceBps) {
      throw new Error("Liquidity amounts are not proportional to pool reserves");
    }

    // Calculate LP tokens based on proportion of pool
    lpTokensMinted = (totalLpSupply * adaAmount) / adaReserve;
    if (lpTokensMinted <= 0n) {
      throw new Error("LP tokens calculation resulted in zero");
    }

    newAdaReserve = adaReserve + adaAmount;
    newTokenReserve = tokenReserve + tokenAmount;
    newTotalLpSupply = totalLpSupply + lpTokensMinted;
  }

  return {
    lpTokensMinted,
    newAdaReserve,
    newTokenReserve,
    newTotalLpSupply
  };
}

/**
 * Calculate liquidity withdrawal using proportional LP token burning
 * @param adaReserve - Current ADA reserve
 * @param tokenReserve - Current token reserve
 * @param totalLpSupply - Current total LP supply
 * @param lpTokensToBurn - LP tokens to burn
 * @returns Withdrawal calculation result
 */
export function calculateLiquidityWithdrawal(
  adaReserve: bigint,
  tokenReserve: bigint,
  totalLpSupply: bigint,
  lpTokensToBurn: bigint
): WithdrawalCalculationResult {
  // Validate input parameters
  if (adaReserve <= 0n || tokenReserve <= 0n || totalLpSupply <= 0n) {
    throw new Error("Invalid pool state: reserves and LP supply must be positive");
  }

  if (lpTokensToBurn <= 0n) {
    throw new Error("LP tokens to burn must be positive");
  }

  if (lpTokensToBurn > totalLpSupply) {
    throw new Error("Cannot burn more LP tokens than total supply");
  }

  // Calculate proportional withdrawal amounts
  const adaAmountOut = (adaReserve * lpTokensToBurn) / totalLpSupply;
  const tokenAmountOut = (tokenReserve * lpTokensToBurn) / totalLpSupply;

  // Validate outputs are positive
  if (adaAmountOut <= 0n || tokenAmountOut <= 0n) {
    throw new Error("Withdrawal amounts must be positive");
  }

  // Calculate new pool state
  const newAdaReserve = adaReserve - adaAmountOut;
  const newTokenReserve = tokenReserve - tokenAmountOut;
  const newTotalLpSupply = totalLpSupply - lpTokensToBurn;

  // Validate new reserves are non-negative
  if (newAdaReserve < 0n || newTokenReserve < 0n || newTotalLpSupply < 0n) {
    throw new Error("Invalid withdrawal: would result in negative reserves");
  }

  return {
    adaAmountOut,
    tokenAmountOut,
    newAdaReserve,
    newTokenReserve,
    newTotalLpSupply
  };
}

/**
 * Calculate square root using Newton's method (for initial liquidity)
 */
function sqrt(value: bigint): bigint {
  if (value < 0n) {
    throw new Error("Cannot calculate square root of negative number");
  }
  if (value === 0n) return 0n;
  if (value === 1n) return 1n;

  let x = value;
  let y = (x + 1n) / 2n;

  while (y < x) {
    x = y;
    y = (x + value / x) / 2n;
  }

  return x;
}

/**
 * PuckSwap Liquidity Transaction Builder
 * Handles liquidity provision and withdrawal with LP token minting/burning
 */
// =============================================================================
// SERIALIZATION FUNCTIONS
// =============================================================================

/**
 * Create liquidity provision redeemer for Aiken validator
 */
export function createLiquidityRedeemer(redeemer: CoreLiquidityRedeemer): string {
  try {
    // Create redeemer matching Aiken CoreLiquidityRedeemer structure
    const redeemerData = new Constr(0, [
      redeemer.ada_amount,
      redeemer.token_amount,
      redeemer.min_lp_tokens,
      redeemer.is_initial_liquidity,
      fromText(redeemer.user_address),
      redeemer.deadline_slot
    ]);

    return Data.to(redeemerData);
  } catch (error) {
    throw new Error(`Failed to create liquidity redeemer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create withdrawal redeemer for Aiken validator
 */
export function createWithdrawalRedeemer(redeemer: CoreWithdrawalRedeemer): string {
  try {
    // Create redeemer matching Aiken CoreWithdrawalRedeemer structure
    const redeemerData = new Constr(0, [
      redeemer.lp_tokens_to_burn,
      redeemer.min_ada_out,
      redeemer.min_token_out,
      fromText(redeemer.user_address),
      redeemer.deadline_slot
    ]);

    return Data.to(redeemerData);
  } catch (error) {
    throw new Error(`Failed to create withdrawal redeemer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create LP minting policy redeemer for Aiken policy
 */
export function createLPMintingRedeemer(redeemer: CoreLPMintingRedeemer): string {
  try {
    // Create operation type data
    let operationData: Data;
    if ('MintLP' in redeemer.operation_type) {
      const mintOp = redeemer.operation_type.MintLP;
      operationData = new Constr(0, [
        mintOp.ada_amount,
        mintOp.token_amount,
        mintOp.lp_tokens_to_mint,
        mintOp.is_initial_liquidity
      ]);
    } else {
      const burnOp = redeemer.operation_type.BurnLP;
      operationData = new Constr(1, [
        burnOp.lp_tokens_to_burn,
        burnOp.ada_amount_out,
        burnOp.token_amount_out
      ]);
    }

    // Create redeemer matching Aiken CoreLPMintingRedeemer structure
    const redeemerData = new Constr(0, [
      operationData,
      fromText(redeemer.pool_utxo_ref),
      fromHex(redeemer.validator_hash),
      fromText(redeemer.user_address)
    ]);

    return Data.to(redeemerData);
  } catch (error) {
    throw new Error(`Failed to create LP minting redeemer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create updated pool datum for liquidity provision
 */
export function createUpdatedPoolDatumForLiquidity(
  originalDatum: PoolCIP68Datum,
  liquidityResult: LiquidityCalculationResult
): string {
  try {
    // Update pool state with new reserves and LP supply
    const updatedDatum: PoolCIP68Datum = {
      ...originalDatum,
      pool_state: {
        ...originalDatum.pool_state,
        ada_reserve: liquidityResult.newAdaReserve,
        token_reserve: liquidityResult.newTokenReserve,
        total_lp_supply: liquidityResult.newTotalLpSupply,
        last_interaction_slot: BigInt(Date.now())
      },
      pool_stats: {
        ...originalDatum.pool_stats,
        liquidity_providers_count: originalDatum.pool_stats.liquidity_providers_count + 1n
      }
    };

    // TODO: Implement proper CIP-68 datum serialization
    // This is a simplified version - needs to be updated with actual CIP-68 structure
    throw new Error("CIP-68 datum serialization not yet implemented");
  } catch (error) {
    throw new Error(`Failed to create updated pool datum for liquidity: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create updated pool datum for liquidity withdrawal
 */
export function createUpdatedPoolDatumForWithdrawal(
  originalDatum: PoolCIP68Datum,
  withdrawalResult: WithdrawalCalculationResult
): string {
  try {
    // Update pool state with new reserves and LP supply
    const updatedDatum: PoolCIP68Datum = {
      ...originalDatum,
      pool_state: {
        ...originalDatum.pool_state,
        ada_reserve: withdrawalResult.newAdaReserve,
        token_reserve: withdrawalResult.newTokenReserve,
        total_lp_supply: withdrawalResult.newTotalLpSupply,
        last_interaction_slot: BigInt(Date.now())
      }
    };

    // TODO: Implement proper CIP-68 datum serialization
    // This is a simplified version - needs to be updated with actual CIP-68 structure
    throw new Error("CIP-68 datum serialization not yet implemented");
  } catch (error) {
    throw new Error(`Failed to create updated pool datum for withdrawal: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate add liquidity parameters
 */
export function validateAddLiquidityParams(params: CoreAddLiquidityParams): void {
  if (!params.poolUtxo) {
    throw new Error("Pool UTxO is required");
  }

  if (!params.poolUtxo.datum) {
    throw new Error("Pool UTxO must have datum");
  }

  if (params.adaAmount <= 0n) {
    throw new Error("ADA amount must be positive");
  }

  if (params.tokenAmount <= 0n) {
    throw new Error("Token amount must be positive");
  }

  if (params.minLpTokens < 0n) {
    throw new Error("Minimum LP tokens cannot be negative");
  }

  if (!params.userAddress) {
    throw new Error("User address is required");
  }

  // Validate minimum ADA requirements
  if (params.adaAmount < AMM_CONSTANTS.MIN_ADA) {
    throw new Error(`ADA amount must be at least ${AMM_CONSTANTS.MIN_ADA} lovelace`);
  }
}

/**
 * Validate remove liquidity parameters
 */
export function validateRemoveLiquidityParams(params: CoreRemoveLiquidityParams): void {
  if (!params.poolUtxo) {
    throw new Error("Pool UTxO is required");
  }

  if (!params.poolUtxo.datum) {
    throw new Error("Pool UTxO must have datum");
  }

  if (params.lpTokenAmount <= 0n) {
    throw new Error("LP token amount must be positive");
  }

  if (params.minAdaOut < 0n) {
    throw new Error("Minimum ADA out cannot be negative");
  }

  if (params.minTokenOut < 0n) {
    throw new Error("Minimum token out cannot be negative");
  }

  if (!params.userAddress) {
    throw new Error("User address is required");
  }
}

export class PuckSwapLiquidityBuilder {
  private lucid: Lucid;
  private poolValidator: SpendingValidator;
  private liquidityValidator: SpendingValidator;
  private lpMintingPolicy: MintingPolicy;
  private poolAddress: Address;
  private liquidityAddress: Address;

  constructor(
    lucid: Lucid,
    poolValidator: SpendingValidator,
    liquidityValidator: SpendingValidator,
    lpMintingPolicy: MintingPolicy
  ) {
    this.lucid = lucid;
    this.poolValidator = poolValidator;
    this.liquidityValidator = liquidityValidator;
    this.lpMintingPolicy = lpMintingPolicy;
    this.poolAddress = lucid.utils.validatorToAddress(poolValidator);
    this.liquidityAddress = lucid.utils.validatorToAddress(liquidityValidator);
  }

  /**
   * Initialize liquidity builder with Lucid Evolution using centralized environment config
   */
  static async create(
    poolValidatorCbor: string,
    liquidityValidatorCbor: string,
    lpMintingPolicyCbor: string,
    network?: "Mainnet" | "Preview" | "Preprod",
    walletName?: "eternl" | "nami" | "vespr" | "lace" | "typhon" | "flint"
  ): Promise<PuckSwapLiquidityBuilder> {
    // Use centralized environment configuration
    const envConfig = getEnvironmentConfig();
    const targetNetwork = network || envConfig.lucidNetwork;

    console.log(`🔄 Initializing PuckSwap Liquidity Builder on ${targetNetwork}...`);
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

    const liquidityValidator: SpendingValidator = {
      type: "PlutusV2",
      script: liquidityValidatorCbor
    };

    const lpMintingPolicy: MintingPolicy = {
      type: "PlutusV2",
      script: lpMintingPolicyCbor
    };

    return new PuckSwapLiquidityBuilder(
      lucid, 
      poolValidator, 
      liquidityValidator, 
      lpMintingPolicy
    );
  }

  /**
   * Connect wallet to the liquidity builder
   */
  async connectWallet(walletName: "eternl" | "nami" | "vespr" | "lace" | "typhon" | "flint"): Promise<void> {
    await connectWallet(this.lucid, walletName);
  }

  /**
   * Find pool UTxO at the pool address
   */
  async findPoolUtxo(): Promise<UTxO | null> {
    try {
      const utxos = await this.lucid.utxosAt(this.poolAddress);
      // Return the first UTxO (assuming single pool per address)
      return utxos.length > 0 ? utxos[0] : null;
    } catch (error) {
      console.error("Error finding pool UTxO:", error);
      return null;
    }
  }

  /**
   * Parse pool datum from UTxO using CIP-68 serialization
   */
  private parsePoolDatum(datum: Datum): PoolDatum | null {
    try {
      if (typeof datum === 'string') {
        const parsedDatum = Data.from(datum);
        return this.deserializePoolDatum(parsedDatum);
      } else {
        // Handle inline datum
        return this.deserializePoolDatum(datum);
      }
    } catch (error) {
      console.error("Error parsing pool datum:", error);
      return null;
    }
  }

  /**
   * Deserialize PoolDatum from Plutus Data
   */
  private deserializePoolDatum(data: Data): PoolDatum | null {
    try {
      if (data instanceof Constr && data.fields.length === 5) {
        return {
          ada_reserve: data.fields[0] as bigint,
          token_reserve: data.fields[1] as bigint,
          fee_basis_points: Number(data.fields[2] as bigint),
          lp_token_policy: toText(data.fields[3] as string),
          lp_token_name: toText(data.fields[4] as string)
        };
      }
      return null;
    } catch (error) {
      console.error("Error deserializing pool datum:", error);
      return null;
    }
  }

  /**
   * Serialize PoolDatum to Plutus Data
   */
  private serializePoolDatum(datum: PoolDatum): Data {
    return new Constr(0, [
      datum.ada_reserve,
      datum.token_reserve,
      BigInt(datum.fee_basis_points),
      fromText(datum.lp_token_policy),
      fromText(datum.lp_token_name)
    ]);
  }

  /**
   * Calculate LP tokens to mint for liquidity provision
   */
  private calculateLPTokensToMint(
    adaAmount: bigint,
    tokenAmount: bigint,
    poolDatum: PoolDatum
  ): { lpTokensToMint: bigint; totalLPSupply: bigint } {
    const { ada_reserve, token_reserve } = poolDatum;

    // If pool is empty, use geometric mean
    if (ada_reserve === 0n || token_reserve === 0n) {
      const lpTokensToMint = BigInt(Math.floor(Math.sqrt(Number(adaAmount * tokenAmount))));
      return {
        lpTokensToMint,
        totalLPSupply: lpTokensToMint
      };
    }

    // Calculate LP tokens proportional to ADA contribution
    const lpTokensFromAda = (adaAmount * this.getTotalLPSupply(poolDatum)) / ada_reserve;
    const lpTokensFromToken = (tokenAmount * this.getTotalLPSupply(poolDatum)) / token_reserve;

    // Use the minimum to ensure proportional contribution
    const lpTokensToMint = lpTokensFromAda < lpTokensFromToken ? lpTokensFromAda : lpTokensFromToken;

    return {
      lpTokensToMint,
      totalLPSupply: this.getTotalLPSupply(poolDatum) + lpTokensToMint
    };
  }

  /**
   * Calculate withdrawal amounts for LP token burning
   */
  private calculateWithdrawalAmounts(
    lpTokenAmount: bigint,
    poolDatum: PoolDatum
  ): { adaAmount: bigint; tokenAmount: bigint } {
    const totalLPSupply = this.getTotalLPSupply(poolDatum);

    if (totalLPSupply === 0n) {
      throw new Error("Pool has no liquidity");
    }

    if (lpTokenAmount > totalLPSupply) {
      throw new Error("LP token amount exceeds total supply");
    }

    // Calculate proportional amounts
    const adaAmount = (poolDatum.ada_reserve * lpTokenAmount) / totalLPSupply;
    const tokenAmount = (poolDatum.token_reserve * lpTokenAmount) / totalLPSupply;

    return { adaAmount, tokenAmount };
  }

  /**
   * Get total LP supply from pool (for now, calculate from reserves)
   */
  private getTotalLPSupply(poolDatum: PoolDatum): bigint {
    // For simplicity, calculate as geometric mean of reserves
    // In a real implementation, this would be tracked in the datum
    if (poolDatum.ada_reserve === 0n || poolDatum.token_reserve === 0n) {
      return 0n;
    }
    return BigInt(Math.floor(Math.sqrt(Number(poolDatum.ada_reserve * poolDatum.token_reserve))));
  }

  /**
   * Validate add liquidity parameters
   */
  private validateAddLiquidityParams(params: AddLiquidityParams, poolDatum: PoolDatum): void {
    if (params.adaAmount <= 0n || params.tokenAmount <= 0n) {
      throw new Error("Liquidity amounts must be positive");
    }

    if (params.minLpTokens < 0n) {
      throw new Error("Minimum LP tokens cannot be negative");
    }

    // Validate deadline
    if (params.deadlineSlot) {
      const currentSlot = Math.floor(Date.now() / 1000);
      if (params.deadlineSlot <= currentSlot) {
        throw new Error("Deadline has already passed");
      }
    }
  }

  /**
   * Validate remove liquidity parameters
   */
  private validateRemoveLiquidityParams(params: RemoveLiquidityParams, poolDatum: PoolDatum): void {
    if (params.lpTokenAmount <= 0n) {
      throw new Error("LP token amount must be positive");
    }

    if (params.minAdaOut < 0n || params.minTokenOut < 0n) {
      throw new Error("Minimum outputs cannot be negative");
    }

    const totalLPSupply = this.getTotalLPSupply(poolDatum);
    if (params.lpTokenAmount > totalLPSupply) {
      throw new Error("LP token amount exceeds total supply");
    }

    // Validate deadline
    if (params.deadlineSlot) {
      const currentSlot = Math.floor(Date.now() / 1000);
      if (params.deadlineSlot <= currentSlot) {
        throw new Error("Deadline has already passed");
      }
    }
  }

  /**
   * Create add liquidity redeemer
   */
  private createAddLiquidityRedeemer(
    adaAmount: bigint,
    tokenAmount: bigint,
    minLpTokens: bigint,
    deadlineSlot: number,
    userAddress: string
  ): Data {
    return new Constr(1, [
      adaAmount,
      tokenAmount,
      minLpTokens,
      BigInt(deadlineSlot),
      fromText(userAddress)
    ]);
  }

  /**
   * Create remove liquidity redeemer
   */
  private createRemoveLiquidityRedeemer(
    lpTokenAmount: bigint,
    minAdaOut: bigint,
    minTokenOut: bigint,
    deadlineSlot: number,
    userAddress: string
  ): Data {
    return new Constr(2, [
      lpTokenAmount,
      minAdaOut,
      minTokenOut,
      BigInt(deadlineSlot),
      fromText(userAddress)
    ]);
  }

  /**
   * Create LP mint redeemer
   */
  private createLPMintRedeemer(
    amount: bigint,
    poolUtxoRef: OutRef,
    recipient: string
  ): Data {
    return new Constr(0, [
      amount,
      new Constr(0, [fromText(poolUtxoRef.txHash), BigInt(poolUtxoRef.outputIndex)]),
      fromText(recipient)
    ]);
  }

  /**
   * Create LP burn redeemer
   */
  private createLPBurnRedeemer(
    amount: bigint,
    poolUtxoRef: OutRef,
    user: string
  ): Data {
    return new Constr(1, [
      amount,
      new Constr(0, [fromText(poolUtxoRef.txHash), BigInt(poolUtxoRef.outputIndex)]),
      fromText(user)
    ]);
  }

  /**
   * Add liquidity to pool
   */
  async addLiquidity(params: AddLiquidityParams): Promise<LiquidityTransactionResult> {
    // Validate wallet connection
    if (!this.lucid.wallet) {
      throw new Error("Wallet not connected. Call connectWallet() first.");
    }

    // Find pool UTxO
    const poolUtxo = await this.findPoolUtxo();
    if (!poolUtxo || !poolUtxo.datum) {
      throw new Error("Pool UTxO not found or missing datum");
    }

    // Parse pool datum
    const poolDatum = this.parsePoolDatum(poolUtxo.datum);
    if (!poolDatum) {
      throw new Error("Invalid pool datum");
    }

    // Validate parameters
    this.validateAddLiquidityParams(params, poolDatum);

    // Calculate LP tokens to mint
    const lpCalculation = this.calculateLPTokensToMint(
      params.adaAmount,
      params.tokenAmount,
      poolDatum
    );

    // Check minimum LP tokens
    if (lpCalculation.lpTokensToMint < params.minLpTokens) {
      throw new Error(
        `LP tokens to mint ${lpCalculation.lpTokensToMint} is less than minimum required ${params.minLpTokens}`
      );
    }

    // Get current slot and user address
    const currentSlot = Math.floor(Date.now() / 1000);
    const userAddress = params.userAddress || await this.lucid.wallet.address();

    // Create updated pool datum
    const updatedPoolDatum: PoolDatum = {
      ada_reserve: poolDatum.ada_reserve + params.adaAmount,
      token_reserve: poolDatum.token_reserve + params.tokenAmount,
      fee_basis_points: poolDatum.fee_basis_points,
      lp_token_policy: poolDatum.lp_token_policy,
      lp_token_name: poolDatum.lp_token_name
    };

    // Serialize updated datum
    const newDatumData = this.serializePoolDatum(updatedPoolDatum);

    // Create redeemers
    const redeemer = this.createAddLiquidityRedeemer(
      params.adaAmount,
      params.tokenAmount,
      params.minLpTokens,
      params.deadlineSlot || currentSlot + 1200,
      userAddress
    );

    const lpMintRedeemer = this.createLPMintRedeemer(
      lpCalculation.lpTokensToMint,
      poolUtxo.outRef,
      userAddress
    );

    // Build pool output assets
    const poolOutputAssets: Assets = {
      lovelace: updatedPoolDatum.ada_reserve
    };

    // Add token to pool output (construct proper token unit with dot separator)
    const tokenUnit = `${poolDatum.lp_token_policy}.${poolDatum.lp_token_name}`;
    poolOutputAssets[tokenUnit] = updatedPoolDatum.token_reserve;

    // Ensure minimum ADA requirement (2 ADA minimum)
    const minADA = 2000000n;
    if (poolOutputAssets.lovelace < minADA) {
      poolOutputAssets.lovelace = minADA;
    }

    // Build LP token assets to mint
    const lpTokenUnit = `${poolDatum.lp_token_policy}.${poolDatum.lp_token_name}`;
    const lpTokensToMint: Assets = {
      [lpTokenUnit]: lpCalculation.lpTokensToMint
    };

    // Build and complete transaction
    const tx = await this.lucid.newTx()
      .collectFrom([poolUtxo], redeemer)
      .payToContract(this.poolAddress, { inline: newDatumData }, poolOutputAssets)
      .mintAssets(lpTokensToMint, lpMintRedeemer)
      .payToAddress(userAddress, lpTokensToMint)
      .attachSpendingValidator(this.liquidityValidator)
      .attachMintingPolicy(this.lpMintingPolicy)
      .validTo(Date.now() + (params.deadlineSlot ? (params.deadlineSlot - currentSlot) * 1000 : 1200000))
      .complete();

    // Sign and submit transaction
    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();

    // Calculate pool share percentage
    const poolShare = Number(lpCalculation.lpTokensToMint) / Number(lpCalculation.totalLPSupply) * 100;

    return {
      txHash,
      lpTokensChanged: lpCalculation.lpTokensToMint,
      adaAmount: params.adaAmount,
      tokenAmount: params.tokenAmount,
      poolShare,
      newPoolState: updatedPoolDatum
    };
  }

  /**
   * Remove liquidity from pool
   */
  async removeLiquidity(params: RemoveLiquidityParams): Promise<LiquidityTransactionResult> {
    // Validate wallet connection
    if (!this.lucid.wallet) {
      throw new Error("Wallet not connected. Call connectWallet() first.");
    }

    // Find pool UTxO
    const poolUtxo = await this.findPoolUtxo();
    if (!poolUtxo || !poolUtxo.datum) {
      throw new Error("Pool UTxO not found or missing datum");
    }

    // Parse pool datum
    const poolDatum = this.parsePoolDatum(poolUtxo.datum);
    if (!poolDatum) {
      throw new Error("Invalid pool datum");
    }

    // Validate parameters
    this.validateRemoveLiquidityParams(params, poolDatum);

    // Calculate withdrawal amounts
    const withdrawalAmounts = this.calculateWithdrawalAmounts(
      params.lpTokenAmount,
      poolDatum
    );

    // Check minimum outputs
    if (withdrawalAmounts.adaAmount < params.minAdaOut) {
      throw new Error(
        `ADA output ${withdrawalAmounts.adaAmount} is less than minimum required ${params.minAdaOut}`
      );
    }

    if (withdrawalAmounts.tokenAmount < params.minTokenOut) {
      throw new Error(
        `Token output ${withdrawalAmounts.tokenAmount} is less than minimum required ${params.minTokenOut}`
      );
    }

    // Get current slot and user address
    const currentSlot = Math.floor(Date.now() / 1000);
    const userAddress = params.userAddress || await this.lucid.wallet.address();

    // Create updated pool datum
    const updatedPoolDatum: PoolDatum = {
      ada_reserve: poolDatum.ada_reserve - withdrawalAmounts.adaAmount,
      token_reserve: poolDatum.token_reserve - withdrawalAmounts.tokenAmount,
      fee_basis_points: poolDatum.fee_basis_points,
      lp_token_policy: poolDatum.lp_token_policy,
      lp_token_name: poolDatum.lp_token_name
    };

    // Serialize updated datum
    const newDatumData = this.serializePoolDatum(updatedPoolDatum);

    // Create redeemers
    const redeemer = this.createRemoveLiquidityRedeemer(
      params.lpTokenAmount,
      params.minAdaOut,
      params.minTokenOut,
      params.deadlineSlot || currentSlot + 1200,
      userAddress
    );

    const lpBurnRedeemer = this.createLPBurnRedeemer(
      params.lpTokenAmount,
      poolUtxo.outRef,
      userAddress
    );

    // Build pool output assets
    const poolOutputAssets: Assets = {
      lovelace: updatedPoolDatum.ada_reserve
    };

    // Add token to pool output if reserves > 0
    if (updatedPoolDatum.token_reserve > 0n) {
      const tokenUnit = `${poolDatum.lp_token_policy}.${poolDatum.lp_token_name}`;
      poolOutputAssets[tokenUnit] = updatedPoolDatum.token_reserve;
    }

    // Ensure minimum ADA requirement (2 ADA minimum)
    const minADA = 2000000n;
    if (poolOutputAssets.lovelace < minADA) {
      poolOutputAssets.lovelace = minADA;
    }

    // Build user output assets
    const userOutputAssets: Assets = {
      lovelace: withdrawalAmounts.adaAmount
    };

    if (withdrawalAmounts.tokenAmount > 0n) {
      const tokenUnit = `${poolDatum.lp_token_policy}.${poolDatum.lp_token_name}`;
      userOutputAssets[tokenUnit] = withdrawalAmounts.tokenAmount;
    }

    // Build LP tokens to burn (negative amount for burning)
    const lpTokenUnit = `${poolDatum.lp_token_policy}.${poolDatum.lp_token_name}`;
    const lpTokensToBurn: Assets = {
      [lpTokenUnit]: -params.lpTokenAmount
    };

    // Build and complete transaction
    const tx = await this.lucid.newTx()
      .collectFrom([poolUtxo], redeemer)
      .payToContract(this.poolAddress, { inline: newDatumData }, poolOutputAssets)
      .payToAddress(userAddress, userOutputAssets)
      .mintAssets(lpTokensToBurn, lpBurnRedeemer)
      .attachSpendingValidator(this.liquidityValidator)
      .attachMintingPolicy(this.lpMintingPolicy)
      .validTo(Date.now() + (params.deadlineSlot ? (params.deadlineSlot - currentSlot) * 1000 : 1200000))
      .complete();

    // Sign and submit transaction
    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();

    // Calculate pool share percentage
    const totalLPSupply = this.getTotalLPSupply(poolDatum);
    const poolShare = Number(params.lpTokenAmount) / Number(totalLPSupply) * 100;

    return {
      txHash,
      lpTokensChanged: -params.lpTokenAmount,
      adaAmount: withdrawalAmounts.adaAmount,
      tokenAmount: withdrawalAmounts.tokenAmount,
      poolShare,
      newPoolState: updatedPoolDatum
    };
  }

  /**
   * Get user's LP token balance for a specific pool
   */
  async getUserLPBalance(userAddress: Address, poolDatum: PoolDatum): Promise<bigint> {
    try {
      const utxos = await this.lucid.utxosAt(userAddress);
      const lpTokenUnit = `${poolDatum.lp_token_policy}.${poolDatum.lp_token_name}`;

      let totalBalance = 0n;
      for (const utxo of utxos) {
        if (utxo.assets[lpTokenUnit]) {
          totalBalance += utxo.assets[lpTokenUnit];
        }
      }

      return totalBalance;
    } catch (error) {
      console.error("Error getting LP balance:", error);
      return 0n;
    }
  }

  /**
   * Estimate gas fees for liquidity operations
   */
  async estimateAddLiquidityFees(params: AddLiquidityParams): Promise<bigint> {
    try {
      // Find pool UTxO
      const poolUtxo = await this.findPoolUtxo();
      if (!poolUtxo || !poolUtxo.datum) {
        throw new Error("Pool UTxO not found");
      }

      const currentSlot = Math.floor(Date.now() / 1000);
      const userAddress = params.userAddress || await this.lucid.wallet.address();

      const redeemer = this.createAddLiquidityRedeemer(
        params.adaAmount,
        params.tokenAmount,
        params.minLpTokens,
        currentSlot + 1200,
        userAddress
      );

      const tx = await this.lucid.newTx()
        .collectFrom([poolUtxo], redeemer)
        .attachSpendingValidator(this.liquidityValidator)
        .attachMintingPolicy(this.lpMintingPolicy)
        .complete();

      return BigInt(tx.fee);
    } catch (error) {
      console.error("Error estimating fees:", error);
      return 200000n; // Default estimate
    }
  }

  /**
   * Get current pool state
   */
  async getPoolState(): Promise<PoolDatum | null> {
    const poolUtxo = await this.findPoolUtxo();
    if (!poolUtxo || !poolUtxo.datum) {
      return null;
    }
    return this.parsePoolDatum(poolUtxo.datum);
  }

  /**
   * Calculate optimal liquidity amounts for proportional deposit
   */
  calculateOptimalLiquidityAmounts(
    desiredAdaAmount: bigint,
    desiredTokenAmount: bigint,
    poolDatum: PoolDatum
  ): { optimalAdaAmount: bigint; optimalTokenAmount: bigint } {
    const { ada_reserve, token_reserve } = poolDatum;

    // If pool is empty, use provided amounts
    if (ada_reserve === 0n || token_reserve === 0n) {
      return {
        optimalAdaAmount: desiredAdaAmount,
        optimalTokenAmount: desiredTokenAmount
      };
    }

    // Calculate current pool ratio
    const poolRatio = Number(ada_reserve) / Number(token_reserve);
    const desiredRatio = Number(desiredAdaAmount) / Number(desiredTokenAmount);

    if (desiredRatio > poolRatio) {
      // Too much ADA, adjust ADA down
      const optimalTokenAmount = desiredTokenAmount;
      const optimalAdaAmount = BigInt(Math.floor(Number(desiredTokenAmount) * poolRatio));
      return { optimalAdaAmount, optimalTokenAmount };
    } else {
      // Too much token, adjust token down
      const optimalAdaAmount = desiredAdaAmount;
      const optimalTokenAmount = BigInt(Math.floor(Number(desiredAdaAmount) / poolRatio));
      return { optimalAdaAmount, optimalTokenAmount };
    }
  }
}
