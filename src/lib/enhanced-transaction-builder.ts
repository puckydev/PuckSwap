import { Lucid, UTxO, Assets, Address, Data, TxBuilder } from "lucid-evolution";
import { MinAdaManager, UTxOType, PoolOperationType } from "./min-ada-manager";

/**
 * Enhanced Transaction Builder with automatic min ADA handling
 * Ensures all UTxO updates meet minimum ADA requirements
 */

export interface SwapParams {
  poolUtxo: UTxO;
  inputAmount: bigint;
  minOutput: bigint;
  isAdaToToken: boolean;
  userAddress: Address;
  deadline?: number;
}

export interface LiquidityParams {
  poolUtxo: UTxO;
  adaAmount: bigint;
  tokenAmount: bigint;
  minLpTokens: bigint;
  userAddress: Address;
  deadline?: number;
}

export interface RemoveLiquidityParams {
  poolUtxo: UTxO;
  lpTokenAmount: bigint;
  minAdaOut: bigint;
  minTokenOut: bigint;
  userAddress: Address;
  deadline?: number;
}

export class EnhancedTransactionBuilder {
  constructor(private lucid: Lucid) {}

  /**
   * Build swap transaction with automatic min ADA handling
   */
  async buildSwapTransaction(params: SwapParams): Promise<TxBuilder> {
    const { poolUtxo, inputAmount, minOutput, isAdaToToken, userAddress, deadline } = params;

    // Calculate new pool state
    const poolState = await this.parsePoolState(poolUtxo);
    const { outputAmount, newAdaReserve, newTokenReserve } = this.calculateSwapOutput(
      poolState, inputAmount, isAdaToToken
    );

    // Validate minimum output
    if (outputAmount < minOutput) {
      throw new Error(`Output ${outputAmount} is less than minimum ${minOutput}`);
    }

    // Create new pool assets with min ADA validation
    const newPoolAssets = await this.createPoolAssetsWithMinAda(
      newAdaReserve,
      newTokenReserve,
      poolState.tokenPolicy,
      poolState.tokenName,
      poolUtxo
    );

    // Create user output assets with min ADA validation
    const userOutputAssets = await this.createUserOutputAssetsWithMinAda(
      outputAmount,
      isAdaToToken,
      poolState.tokenPolicy,
      poolState.tokenName
    );

    // Create new pool datum
    const newPoolDatum = this.createUpdatedPoolDatum(poolState, newAdaReserve, newTokenReserve);

    // Validate pool operation min ADA requirements
    const poolValidation = MinAdaManager.validatePoolOperationMinAda(
      poolUtxo,
      { ...poolUtxo, assets: newPoolAssets },
      MinAdaManager.estimateDatumSize(newPoolDatum),
      "swap"
    );

    if (!poolValidation.isValid) {
      throw new Error(`Pool min ADA validation failed: ${poolValidation.error}`);
    }

    // Build transaction
    const tx = this.lucid.newTx()
      .collectFrom([poolUtxo], this.createSwapRedeemer(inputAmount, minOutput, userAddress))
      .payToContract(poolUtxo.address, { inline: newPoolDatum }, newPoolAssets)
      .payToAddress(userAddress, userOutputAssets);

    // Add deadline if specified
    if (deadline) {
      tx.validTo(deadline);
    }

    return tx;
  }

  /**
   * Build add liquidity transaction with automatic min ADA handling
   */
  async buildAddLiquidityTransaction(params: LiquidityParams): Promise<TxBuilder> {
    const { poolUtxo, adaAmount, tokenAmount, minLpTokens, userAddress, deadline } = params;

    // Calculate new pool state
    const poolState = await this.parsePoolState(poolUtxo);
    const lpTokensToMint = this.calculateLPTokensToMint(poolState, adaAmount, tokenAmount);

    // Validate minimum LP tokens
    if (lpTokensToMint < minLpTokens) {
      throw new Error(`LP tokens ${lpTokensToMint} is less than minimum ${minLpTokens}`);
    }

    // Create new pool assets with min ADA validation
    const newPoolAssets = await this.createPoolAssetsWithMinAda(
      poolState.adaReserve + adaAmount,
      poolState.tokenReserve + tokenAmount,
      poolState.tokenPolicy,
      poolState.tokenName,
      poolUtxo
    );

    // Create new pool datum
    const newPoolDatum = this.createUpdatedPoolDatum(
      poolState,
      poolState.adaReserve + adaAmount,
      poolState.tokenReserve + tokenAmount
    );

    // Validate pool operation min ADA requirements
    const poolValidation = MinAdaManager.validatePoolOperationMinAda(
      poolUtxo,
      { ...poolUtxo, assets: newPoolAssets },
      MinAdaManager.estimateDatumSize(newPoolDatum),
      "addLiquidity"
    );

    if (!poolValidation.isValid) {
      throw new Error(`Pool min ADA validation failed: ${poolValidation.error}`);
    }

    // Build transaction
    const tx = this.lucid.newTx()
      .collectFrom([poolUtxo], this.createAddLiquidityRedeemer(adaAmount, tokenAmount, minLpTokens))
      .payToContract(poolUtxo.address, { inline: newPoolDatum }, newPoolAssets)
      .mintAssets(
        { [`${poolState.lpTokenPolicy}.${poolState.lpTokenName}`]: lpTokensToMint },
        this.createLPMintRedeemer(lpTokensToMint, poolUtxo.outRef)
      );

    // Add deadline if specified
    if (deadline) {
      tx.validTo(deadline);
    }

    return tx;
  }

  /**
   * Build remove liquidity transaction with automatic min ADA handling
   */
  async buildRemoveLiquidityTransaction(params: RemoveLiquidityParams): Promise<TxBuilder> {
    const { poolUtxo, lpTokenAmount, minAdaOut, minTokenOut, userAddress, deadline } = params;

    // Calculate withdrawal amounts
    const poolState = await this.parsePoolState(poolUtxo);
    const { adaToWithdraw, tokenToWithdraw } = this.calculateWithdrawalAmounts(
      poolState, lpTokenAmount
    );

    // Validate minimum outputs
    if (adaToWithdraw < minAdaOut) {
      throw new Error(`ADA withdrawal ${adaToWithdraw} is less than minimum ${minAdaOut}`);
    }
    if (tokenToWithdraw < minTokenOut) {
      throw new Error(`Token withdrawal ${tokenToWithdraw} is less than minimum ${minTokenOut}`);
    }

    // Create new pool assets with min ADA validation
    const newPoolAssets = await this.createPoolAssetsWithMinAda(
      poolState.adaReserve - adaToWithdraw,
      poolState.tokenReserve - tokenToWithdraw,
      poolState.tokenPolicy,
      poolState.tokenName,
      poolUtxo
    );

    // Create user withdrawal assets with min ADA validation
    const userWithdrawalAssets = await this.createUserWithdrawalAssetsWithMinAda(
      adaToWithdraw,
      tokenToWithdraw,
      poolState.tokenPolicy,
      poolState.tokenName
    );

    // Create new pool datum
    const newPoolDatum = this.createUpdatedPoolDatum(
      poolState,
      poolState.adaReserve - adaToWithdraw,
      poolState.tokenReserve - tokenToWithdraw
    );

    // Validate pool operation min ADA requirements
    const poolValidation = MinAdaManager.validatePoolOperationMinAda(
      poolUtxo,
      { ...poolUtxo, assets: newPoolAssets },
      MinAdaManager.estimateDatumSize(newPoolDatum),
      "removeLiquidity"
    );

    if (!poolValidation.isValid) {
      throw new Error(`Pool min ADA validation failed: ${poolValidation.error}`);
    }

    // Build transaction
    const tx = this.lucid.newTx()
      .collectFrom([poolUtxo], this.createRemoveLiquidityRedeemer(lpTokenAmount, minAdaOut, minTokenOut))
      .payToContract(poolUtxo.address, { inline: newPoolDatum }, newPoolAssets)
      .payToAddress(userAddress, userWithdrawalAssets)
      .mintAssets(
        { [`${poolState.lpTokenPolicy}.${poolState.lpTokenName}`]: -lpTokenAmount },
        this.createLPBurnRedeemer(lpTokenAmount, poolUtxo.outRef)
      );

    // Add deadline if specified
    if (deadline) {
      tx.validTo(deadline);
    }

    return tx;
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Create pool assets with automatic min ADA calculation
   */
  private async createPoolAssetsWithMinAda(
    adaReserve: bigint,
    tokenReserve: bigint,
    tokenPolicy: string,
    tokenName: string,
    originalPoolUtxo: UTxO
  ): Promise<Assets> {
    const baseAssets: Assets = {
      lovelace: adaReserve
    };

    // Add token if reserve > 0
    if (tokenReserve > 0n) {
      baseAssets[`${tokenPolicy}.${tokenName}`] = tokenReserve;
    }

    // Add pool NFT (assuming it exists in original UTxO)
    const poolNftUnit = Object.keys(originalPoolUtxo.assets).find(
      unit => unit !== "lovelace" && unit.endsWith(".pool_nft")
    );
    if (poolNftUnit) {
      baseAssets[poolNftUnit] = 1n;
    }

    // Calculate required min ADA
    const minAdaCalc = MinAdaManager.calculatePoolMinAda(baseAssets, 500); // Estimate 500 bytes for datum
    
    // Ensure sufficient ADA
    if (adaReserve < minAdaCalc.requiredMinAda) {
      baseAssets.lovelace = minAdaCalc.requiredMinAda;
    }

    return baseAssets;
  }

  /**
   * Create user output assets with automatic min ADA calculation
   */
  private async createUserOutputAssetsWithMinAda(
    outputAmount: bigint,
    isAdaOutput: boolean,
    tokenPolicy: string,
    tokenName: string
  ): Promise<Assets> {
    const baseAssets: Assets = {};

    if (isAdaOutput) {
      // User receiving ADA
      baseAssets.lovelace = outputAmount;
    } else {
      // User receiving tokens - need min ADA for UTxO
      baseAssets[`${tokenPolicy}.${tokenName}`] = outputAmount;
      
      // Calculate required min ADA for token UTxO
      const minAdaCalc = MinAdaManager.calculateUserOutputMinAda(baseAssets, false);
      baseAssets.lovelace = minAdaCalc.requiredMinAda;
    }

    return baseAssets;
  }

  /**
   * Create user withdrawal assets with automatic min ADA calculation
   */
  private async createUserWithdrawalAssetsWithMinAda(
    adaAmount: bigint,
    tokenAmount: bigint,
    tokenPolicy: string,
    tokenName: string
  ): Promise<Assets> {
    const baseAssets: Assets = {
      lovelace: adaAmount
    };

    if (tokenAmount > 0n) {
      baseAssets[`${tokenPolicy}.${tokenName}`] = tokenAmount;
    }

    // Ensure min ADA requirements are met
    const minAdaCalc = MinAdaManager.calculateUserOutputMinAda(baseAssets, false);
    if (adaAmount < minAdaCalc.requiredMinAda) {
      baseAssets.lovelace = minAdaCalc.requiredMinAda;
    }

    return baseAssets;
  }

  /**
   * Parse pool state from UTxO
   */
  private async parsePoolState(poolUtxo: UTxO): Promise<any> {
    // This would parse the actual pool datum
    // For now, return a mock state
    return {
      adaReserve: BigInt(poolUtxo.assets.lovelace || 0),
      tokenReserve: 1000000n, // Would be parsed from assets
      tokenPolicy: "mock_policy",
      tokenName: "mock_token",
      lpTokenPolicy: "lp_policy",
      lpTokenName: "lp_token",
      totalLpSupply: 1000000n,
      feeBps: 30
    };
  }

  /**
   * Calculate swap output using constant product formula
   */
  private calculateSwapOutput(
    poolState: any,
    inputAmount: bigint,
    isAdaToToken: boolean
  ): { outputAmount: bigint; newAdaReserve: bigint; newTokenReserve: bigint } {
    const fee = inputAmount * BigInt(poolState.feeBps) / 10000n;
    const inputAfterFee = inputAmount - fee;

    if (isAdaToToken) {
      // ADA -> Token
      const newAdaReserve = poolState.adaReserve + inputAfterFee;
      const outputAmount = poolState.tokenReserve * inputAfterFee / newAdaReserve;
      const newTokenReserve = poolState.tokenReserve - outputAmount;
      return { outputAmount, newAdaReserve, newTokenReserve };
    } else {
      // Token -> ADA
      const newTokenReserve = poolState.tokenReserve + inputAfterFee;
      const outputAmount = poolState.adaReserve * inputAfterFee / newTokenReserve;
      const newAdaReserve = poolState.adaReserve - outputAmount;
      return { outputAmount, newAdaReserve, newTokenReserve };
    }
  }

  /**
   * Calculate LP tokens to mint
   */
  private calculateLPTokensToMint(
    poolState: any,
    adaAmount: bigint,
    tokenAmount: bigint
  ): bigint {
    if (poolState.totalLpSupply === 0n) {
      // Initial liquidity
      return this.sqrt(adaAmount * tokenAmount);
    } else {
      // Proportional liquidity
      const adaRatio = adaAmount * poolState.totalLpSupply / poolState.adaReserve;
      const tokenRatio = tokenAmount * poolState.totalLpSupply / poolState.tokenReserve;
      return adaRatio < tokenRatio ? adaRatio : tokenRatio;
    }
  }

  /**
   * Calculate withdrawal amounts
   */
  private calculateWithdrawalAmounts(
    poolState: any,
    lpTokenAmount: bigint
  ): { adaToWithdraw: bigint; tokenToWithdraw: bigint } {
    const adaToWithdraw = poolState.adaReserve * lpTokenAmount / poolState.totalLpSupply;
    const tokenToWithdraw = poolState.tokenReserve * lpTokenAmount / poolState.totalLpSupply;
    return { adaToWithdraw, tokenToWithdraw };
  }

  /**
   * Create updated pool datum
   */
  private createUpdatedPoolDatum(
    poolState: any,
    newAdaReserve: bigint,
    newTokenReserve: bigint
  ): Data {
    // This would create the actual updated datum
    return Data.to({
      ...poolState,
      ada_reserve: newAdaReserve,
      token_reserve: newTokenReserve
    });
  }

  /**
   * Helper functions for redeemer creation
   */
  private createSwapRedeemer(inputAmount: bigint, minOutput: bigint, userAddress: Address): Data {
    return Data.to([inputAmount, minOutput, userAddress]);
  }

  private createAddLiquidityRedeemer(adaAmount: bigint, tokenAmount: bigint, minLpTokens: bigint): Data {
    return Data.to([adaAmount, tokenAmount, minLpTokens]);
  }

  private createRemoveLiquidityRedeemer(lpTokens: bigint, minAdaOut: bigint, minTokenOut: bigint): Data {
    return Data.to([lpTokens, minAdaOut, minTokenOut]);
  }

  private createLPMintRedeemer(amount: bigint, poolUtxoRef: any): Data {
    return Data.to([amount, poolUtxoRef]);
  }

  private createLPBurnRedeemer(amount: bigint, poolUtxoRef: any): Data {
    return Data.to([-amount, poolUtxoRef]);
  }

  /**
   * Square root helper
   */
  private sqrt(value: bigint): bigint {
    if (value < 0n) throw new Error("Square root of negative number");
    if (value < 2n) return value;
    
    let x = value;
    let y = (x + 1n) / 2n;
    
    while (y < x) {
      x = y;
      y = (x + value / x) / 2n;
    }
    
    return x;
  }
}
