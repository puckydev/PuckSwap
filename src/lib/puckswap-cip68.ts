import {
  Lucid,
  Data,
  UTxO,
  TxHash,
  Address,
  Assets,
  SpendingValidator
} from "@lucid-evolution/lucid";

import { createLucidInstance, connectWallet } from "./lucid-config";
import { ValueParser, ParsedValue } from "./value-parser";
import { 
  PoolCIP68Datum, 
  PoolState, 
  PoolConfig, 
  PoolStats,
  CIP68SwapResult,
  CIP68DatumBuilder,
  CIP68_METADATA_KEYS
} from "./cip68-types";
import { CIP68Serializer } from "./cip68-serializer";
import { CIP68SwapParams, EnhancedPoolState } from "./puckswap-v2";

// Enhanced PuckSwap DEX with full CIP-68 support
export class PuckSwapCIP68 {
  private lucid: Lucid;
  private poolValidator: SpendingValidator;
  private poolAddress: Address;

  constructor(lucid: Lucid, poolValidator: SpendingValidator) {
    this.lucid = lucid;
    this.poolValidator = poolValidator;
    this.poolAddress = lucid.utils.validatorToAddress(poolValidator);
  }

  // Initialize with Lucid Evolution
  static async create(
    poolValidatorCbor: string,
    network?: "Mainnet" | "Preview" | "Preprod"
  ): Promise<PuckSwapCIP68> {
    const lucid = await createLucidInstance(network ? { network } : undefined);

    const poolValidator: SpendingValidator = {
      type: "PlutusV2",
      script: poolValidatorCbor
    };

    return new PuckSwapCIP68(lucid, poolValidator);
  }

  // Connect wallet
  async connectWallet(walletName: "eternl" | "nami" | "vespr" | "lace"): Promise<void> {
    await connectWallet(this.lucid, walletName);
  }

  // Find pool UTxO with CIP-68 validation
  async findPoolUtxo(tokenPolicy: string, tokenName: string): Promise<UTxO | null> {
    const utxos = await this.lucid.utxosAt(this.poolAddress);
    
    const poolUtxo = utxos.find(utxo => {
      if (!utxo.datum) return false;
      
      try {
        // Parse CIP-68 datum
        const datum = CIP68Serializer.deserializePoolDatum(Data.from(utxo.datum));
        if (!datum) return false;
        
        // Validate CIP-68 structure
        if (!CIP68DatumBuilder.validateCIP68Structure(datum)) return false;
        
        // Check if this is the correct pool
        return (
          datum.pool_config.token_policy === tokenPolicy &&
          datum.pool_config.token_name === tokenName
        );
      } catch (error) {
        return false;
      }
    });

    return poolUtxo || null;
  }

  // Get enhanced pool state with full CIP-68 data
  async getEnhancedPoolState(tokenPolicy: string, tokenName: string): Promise<EnhancedPoolState | null> {
    const poolUtxo = await this.findPoolUtxo(tokenPolicy, tokenName);
    if (!poolUtxo || !poolUtxo.datum) return null;

    try {
      // Parse CIP-68 datum
      const datum = CIP68Serializer.deserializePoolDatum(Data.from(poolUtxo.datum));
      if (!datum) throw new Error("Failed to parse CIP-68 datum");

      // Parse UTxO value
      const parsedValue = ValueParser.parseUtxoValue(poolUtxo);
      
      // Extract data from CIP-68 structure
      const poolState = datum.pool_state;
      const poolConfig = datum.pool_config;
      const poolStats = datum.pool_stats;
      
      // Validate reserves match UTxO
      if (parsedValue.ada !== poolState.ada_reserve) {
        throw new Error("ADA reserve mismatch between datum and UTxO");
      }
      
      const tokenReserve = ValueParser.getAssetQuantity(parsedValue, tokenPolicy, tokenName);
      if (tokenReserve !== poolState.token_reserve) {
        throw new Error("Token reserve mismatch between datum and UTxO");
      }

      // Calculate derived values
      const price = Number(poolState.token_reserve) / Number(poolState.ada_reserve);
      const totalLiquidity = poolState.ada_reserve + (poolState.token_reserve * BigInt(Math.floor(1 / price)));

      // Extract metadata
      const poolName = CIP68DatumBuilder.getMetadataValue<string>(datum.metadata, CIP68_METADATA_KEYS.NAME) || 
                      `${tokenName}/ADA Pool`;
      const poolDescription = CIP68DatumBuilder.getMetadataValue<string>(datum.metadata, CIP68_METADATA_KEYS.DESCRIPTION) || 
                             `AMM pool for ${tokenName} and ADA`;

      return {
        // Core reserves
        adaReserve: poolState.ada_reserve,
        tokenReserve: poolState.token_reserve,
        tokenPolicy,
        tokenName,
        
        // Pricing and liquidity
        price,
        totalLiquidity,
        totalLPSupply: poolState.total_lp_supply,
        
        // Pool configuration
        feeBps: poolConfig.fee_bps,
        protocolFeeBps: poolConfig.protocol_fee_bps,
        creator: poolConfig.creator,
        admin: poolConfig.admin,
        isPaused: poolConfig.is_paused,
        
        // Statistics
        totalVolumeAda: poolStats.total_volume_ada,
        totalVolumeToken: poolStats.total_volume_token,
        totalFeesCollected: poolStats.total_fees_collected,
        swapCount: poolStats.swap_count,
        lastPrice: poolStats.last_price_ada_per_token,
        
        // Metadata
        poolName,
        poolDescription,
        createdAtSlot: poolStats.created_at_slot,
        lastInteractionSlot: poolState.last_interaction_slot
      };
    } catch (error) {
      console.error("Failed to parse enhanced pool state:", error);
      return null;
    }
  }

  // Calculate swap with CIP-68 enhanced data
  calculateCIP68Swap(
    poolState: EnhancedPoolState,
    swapParams: CIP68SwapParams
  ): CIP68SwapResult {
    const { adaReserve, tokenReserve, feeBps, protocolFeeBps } = poolState;
    const { swapInToken, amountIn } = swapParams;

    // Calculate fees
    const totalFeeBps = feeBps + protocolFeeBps;
    const feeNumerator = 10000 - totalFeeBps;
    const feeDenominator = 10000;

    const amountInWithFee = amountIn * BigInt(feeNumerator);
    let outputAmount: bigint;
    let newAdaReserve: bigint;
    let newTokenReserve: bigint;

    if (swapInToken) {
      // Token -> ADA swap
      const numerator = amountInWithFee * adaReserve;
      const denominator = (tokenReserve * BigInt(feeDenominator)) + amountInWithFee;
      outputAmount = numerator / denominator;
      
      newAdaReserve = adaReserve - outputAmount;
      newTokenReserve = tokenReserve + amountIn;
    } else {
      // ADA -> Token swap
      const numerator = amountInWithFee * tokenReserve;
      const denominator = (adaReserve * BigInt(feeDenominator)) + amountInWithFee;
      outputAmount = numerator / denominator;
      
      newAdaReserve = adaReserve + amountIn;
      newTokenReserve = tokenReserve - outputAmount;
    }

    // Calculate fees
    const totalFee = amountIn * BigInt(totalFeeBps) / 10000n;
    const protocolFee = amountIn * BigInt(protocolFeeBps) / 10000n;
    const tradingFee = totalFee - protocolFee;

    // Calculate new price
    const newPrice = Number(newAdaReserve) * 1_000_000 / Number(newTokenReserve);

    return {
      is_ada_to_token: !swapInToken,
      input_amount: amountIn,
      output_amount: outputAmount,
      fee_amount: tradingFee,
      protocol_fee_amount: protocolFee,
      output_policy: swapInToken ? '' : poolState.tokenPolicy,
      output_name: swapInToken ? '' : poolState.tokenName,
      new_ada_reserve: newAdaReserve,
      new_token_reserve: newTokenReserve,
      new_price: newPrice,
      swap_slot: 0 // Will be set during transaction
    };
  }

  // Execute CIP-68 enhanced swap
  async executeCIP68Swap(
    tokenPolicy: string,
    tokenName: string,
    swapParams: CIP68SwapParams
  ): Promise<TxHash> {
    // Get enhanced pool state
    const poolState = await this.getEnhancedPoolState(tokenPolicy, tokenName);
    if (!poolState) {
      throw new Error("Pool not found");
    }

    // Check if pool is paused
    if (poolState.isPaused) {
      throw new Error("Pool is currently paused");
    }

    // Find pool UTxO
    const poolUtxo = await this.findPoolUtxo(tokenPolicy, tokenName);
    if (!poolUtxo) {
      throw new Error("Pool UTxO not found");
    }

    // Calculate swap result
    const swapResult = this.calculateCIP68Swap(poolState, swapParams);

    // Validate minimum output
    if (swapResult.output_amount < swapParams.minOut) {
      throw new Error(`Insufficient output: expected ${swapResult.output_amount}, minimum ${swapParams.minOut}`);
    }

    // Get current slot for deadline validation
    const currentSlot = await this.getCurrentSlot();
    if (swapParams.deadlineSlot && currentSlot > swapParams.deadlineSlot) {
      throw new Error("Transaction deadline has passed");
    }

    // Parse current datum
    const currentDatum = CIP68Serializer.deserializePoolDatum(Data.from(poolUtxo.datum!));
    if (!currentDatum) {
      throw new Error("Failed to parse current pool datum");
    }

    // Create updated datum
    const updatedDatum = CIP68DatumBuilder.createUpdatedPoolDatum(currentDatum, {
      ...swapResult,
      swap_slot: currentSlot
    });

    // Serialize updated datum
    const newDatumData = CIP68Serializer.serializePoolDatum(updatedDatum);

    // Create redeemer
    const userAddress = swapParams.userAddress || await this.lucid.wallet.address();
    const redeemer = CIP68Serializer.serializeSwapRedeemer(
      swapParams.swapInToken,
      swapParams.amountIn,
      swapParams.minOut,
      swapParams.deadlineSlot || currentSlot + 1200, // 20 minute default deadline
      userAddress
    );

    // Build transaction
    const poolOutputAssets: Assets = {
      lovelace: swapResult.new_ada_reserve
    };
    if (swapResult.new_token_reserve > 0n) {
      poolOutputAssets[`${tokenPolicy}.${tokenName}`] = swapResult.new_token_reserve;
    }

    const userOutputAssets: Assets = {};
    if (swapParams.swapInToken) {
      userOutputAssets.lovelace = swapResult.output_amount;
    } else {
      userOutputAssets[`${tokenPolicy}.${tokenName}`] = swapResult.output_amount;
    }

    const tx = await this.lucid.newTx()
      .collectFrom([poolUtxo], redeemer)
      .payToContract(this.poolAddress, { inline: newDatumData }, poolOutputAssets)
      .payToAddress(userAddress, userOutputAssets)
      .attachSpendingValidator(this.poolValidator)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    const signedTx = await tx.sign().complete();
    return await signedTx.submit();
  }

  // Get current slot
  async getCurrentSlot(): Promise<number> {
    const protocolParams = await this.lucid.provider.getProtocolParameters();
    return protocolParams.slot;
  }

  // Get all pools with enhanced data
  async getAllEnhancedPools(): Promise<EnhancedPoolState[]> {
    const utxos = await this.lucid.utxosAt(this.poolAddress);
    const pools: EnhancedPoolState[] = [];

    for (const utxo of utxos) {
      if (!utxo.datum) continue;

      try {
        const datum = CIP68Serializer.deserializePoolDatum(Data.from(utxo.datum));
        if (datum) {
          const poolState = await this.getEnhancedPoolState(
            datum.pool_config.token_policy,
            datum.pool_config.token_name
          );
          if (poolState) {
            pools.push(poolState);
          }
        }
      } catch (error) {
        console.warn("Failed to parse pool UTxO:", error);
      }
    }

    return pools;
  }

  // Utility methods
  formatAmount(amount: bigint, decimals: number = 6): string {
    return (Number(amount) / Math.pow(10, decimals)).toFixed(decimals);
  }

  parseAmount(amount: string, decimals: number = 6): bigint {
    return BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));
  }
}
