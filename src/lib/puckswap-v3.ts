// PuckSwap v3 - Complete DEX Implementation
// Comprehensive Lucid Evolution integration with CIP-68 compliance and enhanced security

import {
  Lucid,
  Data,
  fromText,
  toUnit,
  fromUnit,
  UTxO,
  TxHash,
  Address,
  Assets,
  SpendingValidator,
  MintingPolicy,
  PolicyId,
  Unit,
  TxComplete,
  Script,
  OutRef,
  Datum,
  Redeemer,
  Constr
} from "@lucid-evolution/lucid";

import { createLucidInstance, connectWallet } from "./lucid-config";

// Import enhanced types and utilities
import { 
  PoolCIP68Datum, 
  PoolState, 
  PoolConfig, 
  PoolStats,
  CIP68Metadata,
  CIP68_REFERENCE_PREFIX,
  CIP68_USER_PREFIX
} from "./cip68-types";
import { CIP68Serializer } from "./cip68-serializer";
import { MinADAManager } from "./min-ada-manager";
import { EnhancedTransactionBuilder } from "./enhanced-transaction-builder";

// v3 Enhanced swap parameters with comprehensive security
export interface SwapParamsV3 {
  swapInToken: boolean;
  amountIn: bigint;
  minOut: bigint;
  tokenPolicy: string;
  tokenName: string;
  deadline?: number;
  slippageTolerance?: number; // basis points (e.g., 50 = 0.5%)
  maxPriceImpact?: number; // basis points
  frontRunProtection?: boolean;
  userAddress?: string;
  referrer?: string;
}

// v3 Enhanced liquidity parameters
export interface LiquidityParamsV3 {
  adaAmount: bigint;
  tokenAmount: bigint;
  tokenPolicy: string;
  tokenName: string;
  minLPTokens?: bigint;
  deadline?: number;
  slippageTolerance?: number;
  autoOptimalRatio?: boolean;
  userAddress?: string;
}

// v3 Pool creation parameters
export interface PoolCreationParamsV3 {
  tokenPolicy: string;
  tokenName: string;
  initialADA: bigint;
  initialToken: bigint;
  feeBPS: number;
  creatorAddress: string;
  securityDeposit?: bigint;
  deadline?: number;
}

// v3 Transaction result with comprehensive data
export interface TransactionResultV3 {
  txHash: string;
  success: boolean;
  error?: string;
  gasUsed?: bigint;
  actualOutput?: bigint;
  priceImpact?: number;
  effectivePrice?: number;
  timestamp: number;
}

// Main PuckSwap v3 DEX class
export class PuckSwapV3 {
  private lucid: Lucid;
  private poolValidator: SpendingValidator;
  private lpPolicy: MintingPolicy;
  private swapValidator: SpendingValidator;
  private liquidityValidator: SpendingValidator;
  private factoryValidator: SpendingValidator;
  private minADAManager: MinADAManager;
  private txBuilder: EnhancedTransactionBuilder;
  private cip68Serializer: CIP68Serializer;

  constructor(
    lucid: Lucid,
    poolValidatorCbor: string,
    lpPolicyCbor: string,
    swapValidatorCbor: string,
    liquidityValidatorCbor: string,
    factoryValidatorCbor: string
  ) {
    this.lucid = lucid;
    
    // Initialize validators
    this.poolValidator = {
      type: "PlutusV2",
      script: poolValidatorCbor
    };
    
    this.lpPolicy = {
      type: "PlutusV2", 
      script: lpPolicyCbor
    };
    
    this.swapValidator = {
      type: "PlutusV2",
      script: swapValidatorCbor
    };
    
    this.liquidityValidator = {
      type: "PlutusV2",
      script: liquidityValidatorCbor
    };
    
    this.factoryValidator = {
      type: "PlutusV2",
      script: factoryValidatorCbor
    };
    
    // Initialize utility classes
    this.minADAManager = new MinADAManager(lucid);
    this.txBuilder = new EnhancedTransactionBuilder(lucid);
    this.cip68Serializer = new CIP68Serializer();
  }

  // Factory method to create PuckSwap v3 instance
  static async create(
    contractCbors: {
      poolValidator: string;
      lpPolicy: string;
      swapValidator: string;
      liquidityValidator: string;
      factoryValidator: string;
    },
    network?: "Mainnet" | "Preview" | "Preprod"
  ): Promise<PuckSwapV3> {
    const lucid = await createLucidInstance(network ? { network } : undefined);

    return new PuckSwapV3(
      lucid,
      contractCbors.poolValidator,
      contractCbors.lpPolicy,
      contractCbors.swapValidator,
      contractCbors.liquidityValidator,
      contractCbors.factoryValidator
    );
  }

  // Connect wallet with enhanced error handling
  async connectWallet(walletName: "eternl" | "nami" | "vespr" | "lace"): Promise<void> {
    try {
      await connectWallet(this.lucid, walletName);
    } catch (error) {
      throw new Error(`Failed to connect ${walletName} wallet: ${error}`);
    }
  }

  // Create new pool with comprehensive validation
  async createPool(params: PoolCreationParamsV3): Promise<TransactionResultV3> {
    try {
      // Validate parameters
      this.validatePoolCreationParams(params);
      
      // Get factory UTxO
      const factoryUTxO = await this.getFactoryUTxO();
      if (!factoryUTxO) {
        throw new Error("Factory UTxO not found");
      }
      
      // Build pool creation transaction
      const tx = await this.buildPoolCreationTx(params, factoryUTxO);
      
      // Sign and submit
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();
      
      return {
        txHash,
        success: true,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        txHash: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now()
      };
    }
  }

  // Add liquidity with optimal ratio calculation
  async addLiquidity(params: LiquidityParamsV3): Promise<TransactionResultV3> {
    try {
      // Validate parameters
      this.validateLiquidityParams(params);
      
      // Get pool state
      const poolState = await this.getPoolState(params.tokenPolicy, params.tokenName);
      if (!poolState) {
        throw new Error("Pool not found");
      }
      
      // Calculate optimal amounts if requested
      const optimizedParams = params.autoOptimalRatio 
        ? await this.calculateOptimalLiquidityRatio(params, poolState)
        : params;
      
      // Build liquidity addition transaction
      const tx = await this.buildAddLiquidityTx(optimizedParams, poolState);
      
      // Sign and submit
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();
      
      return {
        txHash,
        success: true,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        txHash: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now()
      };
    }
  }

  // Remove liquidity with slippage protection
  async removeLiquidity(
    lpTokens: bigint,
    minADAOut: bigint,
    minTokenOut: bigint,
    tokenPolicy: string,
    tokenName: string,
    slippageTolerance: number = 50
  ): Promise<TransactionResultV3> {
    try {
      // Get pool state
      const poolState = await this.getPoolState(tokenPolicy, tokenName);
      if (!poolState) {
        throw new Error("Pool not found");
      }
      
      // Calculate expected outputs
      const expectedOutputs = this.calculateLiquidityRemoval(lpTokens, poolState);
      
      // Apply slippage protection
      const minADAWithSlippage = this.applySlippage(expectedOutputs.adaAmount, slippageTolerance);
      const minTokenWithSlippage = this.applySlippage(expectedOutputs.tokenAmount, slippageTolerance);
      
      // Validate minimum outputs
      if (minADAWithSlippage < minADAOut || minTokenWithSlippage < minTokenOut) {
        throw new Error("Slippage tolerance exceeded");
      }
      
      // Build liquidity removal transaction
      const tx = await this.buildRemoveLiquidityTx(
        lpTokens, 
        minADAOut, 
        minTokenOut, 
        poolState
      );
      
      // Sign and submit
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();
      
      return {
        txHash,
        success: true,
        actualOutput: expectedOutputs.adaAmount + expectedOutputs.tokenAmount,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        txHash: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now()
      };
    }
  }

  // Execute swap with comprehensive security checks
  async executeSwap(params: SwapParamsV3): Promise<TransactionResultV3> {
    try {
      // Validate parameters
      this.validateSwapParams(params);

      // Get pool state
      const poolState = await this.getPoolState(params.tokenPolicy, params.tokenName);

      if (!poolState) {
        throw new Error("Pool not found");
      }

      // Calculate swap output and price impact
      const swapCalculation = this.calculateSwapOutput(params, poolState);

      // Validate price impact
      if (params.maxPriceImpact && swapCalculation.priceImpact > params.maxPriceImpact) {
        throw new Error(`Price impact ${swapCalculation.priceImpact}bps exceeds maximum ${params.maxPriceImpact}bps`);
      }

      // Validate slippage
      if (swapCalculation.outputAmount < params.minOut) {
        throw new Error("Output amount below minimum due to slippage");
      }

      // Build swap transaction with security features
      const tx = await this.buildSwapTx(params, poolState, swapCalculation);

      // Sign and submit
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      return {
        txHash,
        success: true,
        actualOutput: swapCalculation.outputAmount,
        priceImpact: swapCalculation.priceImpact,
        effectivePrice: swapCalculation.effectivePrice,
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        txHash: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now()
      };
    }
  }

  // Private helper methods

  // Validate pool creation parameters
  private validatePoolCreationParams(params: PoolCreationParamsV3): void {
    if (params.initialADA < 1000000n) {
      throw new Error("Initial ADA must be at least 1 ADA");
    }
    if (params.initialToken <= 0n) {
      throw new Error("Initial token amount must be positive");
    }
    if (params.feeBPS < 0 || params.feeBPS > 1000) {
      throw new Error("Fee must be between 0 and 10%");
    }
    if (!params.tokenPolicy || !params.tokenName) {
      throw new Error("Token policy and name are required");
    }
  }

  // Validate liquidity parameters
  private validateLiquidityParams(params: LiquidityParamsV3): void {
    if (params.adaAmount <= 0n || params.tokenAmount <= 0n) {
      throw new Error("Liquidity amounts must be positive");
    }
    if (params.slippageTolerance && (params.slippageTolerance < 0 || params.slippageTolerance > 5000)) {
      throw new Error("Slippage tolerance must be between 0 and 50%");
    }
  }

  // Validate swap parameters
  private validateSwapParams(params: SwapParamsV3): void {
    if (params.amountIn <= 0n) {
      throw new Error("Input amount must be positive");
    }
    if (params.minOut < 0n) {
      throw new Error("Minimum output cannot be negative");
    }
    if (params.slippageTolerance && (params.slippageTolerance < 0 || params.slippageTolerance > 5000)) {
      throw new Error("Slippage tolerance must be between 0 and 50%");
    }
  }

  // Get factory UTxO
  private async getFactoryUTxO(): Promise<UTxO | null> {
    try {
      const factoryAddress = this.lucid.utils.validatorToAddress(this.factoryValidator);
      const utxos = await this.lucid.utxosAt(factoryAddress);
      return utxos.length > 0 ? utxos[0] : null;
    } catch (error) {
      console.error("Error getting factory UTxO:", error);
      return null;
    }
  }

  // Get pool state from blockchain
  private async getPoolState(tokenPolicy: string, tokenName: string): Promise<PoolState | null> {
    try {
      const poolAddress = this.lucid.utils.validatorToAddress(this.poolValidator);
      const utxos = await this.lucid.utxosAt(poolAddress);

      // Find pool UTxO with matching token
      const poolUTxO = utxos.find(utxo => {
        if (!utxo.datum) return false;
        try {
          const datum = Data.from(utxo.datum) as PoolCIP68Datum;
          return datum.pool_config.token_policy === tokenPolicy &&
                 datum.pool_config.token_name === tokenName;
        } catch {
          return false;
        }
      });

      if (!poolUTxO || !poolUTxO.datum) return null;

      const datum = Data.from(poolUTxO.datum) as PoolCIP68Datum;
      return datum.pool_state;

    } catch (error) {
      console.error("Error getting pool state:", error);
      return null;
    }
  }

  // Calculate swap output with price impact
  private calculateSwapOutput(params: SwapParamsV3, poolState: PoolState): SwapCalculation {
    const { amountIn, swapInToken } = params;
    const { adaReserve, tokenReserve } = poolState;

    let reserveIn: bigint, reserveOut: bigint;
    if (swapInToken) {
      reserveIn = tokenReserve;
      reserveOut = adaReserve;
    } else {
      reserveIn = adaReserve;
      reserveOut = tokenReserve;
    }

    // Apply 0.3% fee (997/1000)
    const amountInWithFee = (amountIn * 997n) / 1000n;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn + amountInWithFee;
    const outputAmount = numerator / denominator;

    // Calculate price impact
    const priceImpact = this.calculatePriceImpact(amountIn, outputAmount, reserveIn, reserveOut);

    // Calculate effective price
    const effectivePrice = Number(outputAmount) / Number(amountIn);

    return {
      outputAmount,
      priceImpact,
      effectivePrice
    };
  }

  // Calculate price impact in basis points
  private calculatePriceImpact(
    amountIn: bigint,
    amountOut: bigint,
    reserveIn: bigint,
    reserveOut: bigint
  ): number {
    const spotPrice = Number(reserveOut) / Number(reserveIn);
    const effectivePrice = Number(amountOut) / Number(amountIn);
    const priceImpact = Math.abs((effectivePrice - spotPrice) / spotPrice) * 10000;
    return Math.round(priceImpact);
  }

  // Apply slippage to amount
  private applySlippage(amount: bigint, slippageBPS: number): bigint {
    return (amount * BigInt(10000 - slippageBPS)) / 10000n;
  }

  // Calculate optimal liquidity ratio
  private async calculateOptimalLiquidityRatio(
    params: LiquidityParamsV3,
    poolState: PoolState
  ): Promise<LiquidityParamsV3> {
    const ratio = Number(poolState.tokenReserve) / Number(poolState.adaReserve);
    const optimalTokenAmount = (params.adaAmount * BigInt(Math.floor(ratio * 1000000))) / 1000000n;

    return {
      ...params,
      tokenAmount: optimalTokenAmount < params.tokenAmount ? optimalTokenAmount : params.tokenAmount
    };
  }

  // Calculate liquidity removal amounts
  private calculateLiquidityRemoval(lpTokens: bigint, poolState: PoolState): LiquidityRemovalResult {
    const totalLiquidity = poolState.totalLiquidity || 1000000n; // Fallback
    const adaAmount = (lpTokens * poolState.adaReserve) / totalLiquidity;
    const tokenAmount = (lpTokens * poolState.tokenReserve) / totalLiquidity;

    return { adaAmount, tokenAmount };
  }

  // Calculate optimal liquidity ratio
  private async calculateOptimalLiquidityRatio(
    params: LiquidityParamsV3,
    poolState: PoolState
  ): Promise<LiquidityParamsV3> {
    const { adaAmount, tokenAmount } = params;
    const { adaReserve, tokenReserve } = poolState;

    // Calculate optimal ratio based on current pool reserves
    const adaRatio = adaAmount * tokenReserve;
    const tokenRatio = tokenAmount * adaReserve;

    if (adaRatio < tokenRatio) {
      // ADA is limiting factor
      const optimalTokenAmount = (adaAmount * tokenReserve) / adaReserve;
      return { ...params, tokenAmount: optimalTokenAmount };
    } else {
      // Token is limiting factor
      const optimalAdaAmount = (tokenAmount * adaReserve) / tokenReserve;
      return { ...params, adaAmount: optimalAdaAmount };
    }
  }

  // Calculate liquidity removal amounts
  private calculateLiquidityRemoval(lpTokens: bigint, poolState: PoolState): LiquidityRemovalResult {
    const { adaReserve, tokenReserve, totalLiquidity } = poolState;

    const adaAmount = (lpTokens * adaReserve) / totalLiquidity;
    const tokenAmount = (lpTokens * tokenReserve) / totalLiquidity;

    return { adaAmount, tokenAmount };
  }

  // Transaction builders

  // Build pool creation transaction
  private async buildPoolCreationTx(
    params: PoolCreationParamsV3,
    factoryUTxO: UTxO
  ): Promise<TxComplete> {
    const { tokenPolicy, tokenName, initialADA, initialToken, feeBPS, creatorAddress } = params;

    // Create pool NFT name
    const poolNFTName = this.generatePoolNFTName(tokenPolicy, tokenName);

    // Build CIP-68 pool datum
    const poolDatum = this.cip68Serializer.buildPoolDatum({
      adaReserve: initialADA,
      tokenReserve: initialToken,
      tokenPolicy,
      tokenName,
      feeBPS,
      creator: creatorAddress,
      totalLiquidity: 0n
    });

    // Calculate minimum ADA for pool UTxO
    const poolMinADA = await this.minADAManager.calculateMinADA({
      [tokenPolicy]: { [tokenName]: initialToken },
      "": { "": initialADA }
    });

    const poolAddress = this.lucid.utils.validatorToAddress(this.poolValidator);

    return this.lucid
      .newTx()
      .collectFrom([factoryUTxO], Data.to(new Constr(0, []))) // Factory redeemer
      .payToContract(poolAddress, { inline: Data.to(poolDatum) }, {
        lovelace: poolMinADA,
        [toUnit(tokenPolicy, tokenName)]: initialToken
      })
      .mintAssets({ [toUnit(this.getPoolNFTPolicy(), poolNFTName)]: 1n }, Data.to(new Constr(0, [])))
      .attachSpendingValidator(this.factoryValidator)
      .attachMintingPolicy(this.getPoolNFTPolicy())
      .addSigner(creatorAddress);
  }

  // Build add liquidity transaction
  private async buildAddLiquidityTx(
    params: LiquidityParamsV3,
    poolState: PoolState
  ): Promise<TxComplete> {
    const { adaAmount, tokenAmount, userAddress } = params;

    // Find pool UTxO
    const poolUTxO = await this.findPoolUTxO(poolState.tokenPolicy, poolState.tokenName);
    if (!poolUTxO) throw new Error("Pool UTxO not found");

    // Calculate LP tokens to mint
    const lpTokensToMint = this.calculateLPTokensToMint(adaAmount, tokenAmount, poolState);

    // Build updated pool datum
    const newPoolDatum = this.cip68Serializer.buildPoolDatum({
      ...poolState,
      adaReserve: poolState.adaReserve + adaAmount,
      tokenReserve: poolState.tokenReserve + tokenAmount,
      totalLiquidity: poolState.totalLiquidity + lpTokensToMint
    });

    const poolAddress = this.lucid.utils.validatorToAddress(this.poolValidator);
    const lpTokenUnit = toUnit(poolState.lpTokenPolicy, "");

    return this.lucid
      .newTx()
      .collectFrom([poolUTxO], Data.to(new Constr(0, [adaAmount, tokenAmount]))) // AddLiquidity redeemer
      .payToContract(poolAddress, { inline: Data.to(newPoolDatum) }, {
        lovelace: poolState.adaReserve + adaAmount,
        [toUnit(poolState.tokenPolicy, poolState.tokenName)]: poolState.tokenReserve + tokenAmount
      })
      .payToAddress(userAddress || await this.lucid.wallet.address(), {
        [lpTokenUnit]: lpTokensToMint
      })
      .mintAssets({ [lpTokenUnit]: lpTokensToMint }, Data.to(new Constr(0, [])))
      .attachSpendingValidator(this.poolValidator)
      .attachMintingPolicy(this.lpPolicy);
  }

  // Build remove liquidity transaction
  private async buildRemoveLiquidityTx(
    lpTokens: bigint,
    minADAOut: bigint,
    minTokenOut: bigint,
    poolState: PoolState
  ): Promise<TxComplete> {
    // Find pool UTxO
    const poolUTxO = await this.findPoolUTxO(poolState.tokenPolicy, poolState.tokenName);
    if (!poolUTxO) throw new Error("Pool UTxO not found");

    // Calculate amounts to withdraw
    const { adaAmount, tokenAmount } = this.calculateLiquidityRemoval(lpTokens, poolState);

    // Build updated pool datum
    const newPoolDatum = this.cip68Serializer.buildPoolDatum({
      ...poolState,
      adaReserve: poolState.adaReserve - adaAmount,
      tokenReserve: poolState.tokenReserve - tokenAmount,
      totalLiquidity: poolState.totalLiquidity - lpTokens
    });

    const poolAddress = this.lucid.utils.validatorToAddress(this.poolValidator);
    const userAddress = await this.lucid.wallet.address();
    const lpTokenUnit = toUnit(poolState.lpTokenPolicy, "");

    return this.lucid
      .newTx()
      .collectFrom([poolUTxO], Data.to(new Constr(1, [lpTokens, minADAOut, minTokenOut]))) // RemoveLiquidity redeemer
      .payToContract(poolAddress, { inline: Data.to(newPoolDatum) }, {
        lovelace: poolState.adaReserve - adaAmount,
        [toUnit(poolState.tokenPolicy, poolState.tokenName)]: poolState.tokenReserve - tokenAmount
      })
      .payToAddress(userAddress, {
        lovelace: adaAmount,
        [toUnit(poolState.tokenPolicy, poolState.tokenName)]: tokenAmount
      })
      .mintAssets({ [lpTokenUnit]: -lpTokens }, Data.to(new Constr(1, []))) // Burn LP tokens
      .attachSpendingValidator(this.poolValidator)
      .attachMintingPolicy(this.lpPolicy);
  }

  // Build swap transaction
  private async buildSwapTx(
    params: SwapParamsV3,
    poolState: PoolState,
    swapCalculation: SwapCalculation
  ): Promise<TxComplete> {
    // Find pool UTxO
    const poolUTxO = await this.findPoolUTxO(poolState.tokenPolicy, poolState.tokenName);
    if (!poolUTxO) throw new Error("Pool UTxO not found");

    const { swapInToken, amountIn, minOut, userAddress } = params;
    const { outputAmount } = swapCalculation;

    // Calculate new reserves
    let newAdaReserve: bigint, newTokenReserve: bigint;
    if (swapInToken) {
      newAdaReserve = poolState.adaReserve - outputAmount;
      newTokenReserve = poolState.tokenReserve + amountIn;
    } else {
      newAdaReserve = poolState.adaReserve + amountIn;
      newTokenReserve = poolState.tokenReserve - outputAmount;
    }

    // Build updated pool datum
    const newPoolDatum = this.cip68Serializer.buildPoolDatum({
      ...poolState,
      adaReserve: newAdaReserve,
      tokenReserve: newTokenReserve
    });

    const poolAddress = this.lucid.utils.validatorToAddress(this.poolValidator);
    const recipient = userAddress || await this.lucid.wallet.address();

    // Build swap redeemer
    const swapRedeemer = Data.to(new Constr(0, [
      swapInToken,
      amountIn,
      minOut,
      params.deadline || 0,
      recipient
    ]));

    let tx = this.lucid
      .newTx()
      .collectFrom([poolUTxO], swapRedeemer)
      .payToContract(poolAddress, { inline: Data.to(newPoolDatum) }, {
        lovelace: newAdaReserve,
        [toUnit(poolState.tokenPolicy, poolState.tokenName)]: newTokenReserve
      })
      .attachSpendingValidator(this.poolValidator);

    // Add output to user
    if (swapInToken) {
      // Token -> ADA swap
      tx = tx.payToAddress(recipient, { lovelace: outputAmount });
    } else {
      // ADA -> Token swap
      tx = tx.payToAddress(recipient, {
        [toUnit(poolState.tokenPolicy, poolState.tokenName)]: outputAmount
      });
    }

    return tx;
  }

  // Helper methods

  // Generate unique pool NFT name
  private generatePoolNFTName(tokenPolicy: string, tokenName: string): string {
    const combined = tokenPolicy + tokenName + Date.now().toString();
    return this.lucid.utils.toHex(new TextEncoder().encode(combined)).slice(0, 64);
  }

  // Get pool NFT policy (placeholder - would be actual policy)
  private getPoolNFTPolicy(): MintingPolicy {
    return this.lpPolicy; // Simplified for now
  }

  // Find pool UTxO by token
  private async findPoolUTxO(tokenPolicy: string, tokenName: string): Promise<UTxO | null> {
    const poolAddress = this.lucid.utils.validatorToAddress(this.poolValidator);
    const utxos = await this.lucid.utxosAt(poolAddress);

    return utxos.find(utxo => {
      if (!utxo.datum) return false;
      try {
        const datum = Data.from(utxo.datum) as PoolCIP68Datum;
        return datum.pool_config.token_policy === tokenPolicy &&
               datum.pool_config.token_name === tokenName;
      } catch {
        return false;
      }
    }) || null;
  }

  // Calculate LP tokens to mint for liquidity provision
  private calculateLPTokensToMint(
    adaAmount: bigint,
    tokenAmount: bigint,
    poolState: PoolState
  ): bigint {
    if (poolState.totalLiquidity === 0n) {
      // Initial liquidity - use geometric mean
      return BigInt(Math.floor(Math.sqrt(Number(adaAmount) * Number(tokenAmount))));
    } else {
      // Proportional liquidity
      const adaLPTokens = (adaAmount * poolState.totalLiquidity) / poolState.adaReserve;
      const tokenLPTokens = (tokenAmount * poolState.totalLiquidity) / poolState.tokenReserve;
      return adaLPTokens < tokenLPTokens ? adaLPTokens : tokenLPTokens;
    }
  }
}

// Supporting interfaces
interface SwapCalculation {
  outputAmount: bigint;
  priceImpact: number;
  effectivePrice: number;
}

interface LiquidityRemovalResult {
  adaAmount: bigint;
  tokenAmount: bigint;
}
