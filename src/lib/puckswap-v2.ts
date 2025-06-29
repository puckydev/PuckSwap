import {
  Lucid,
  Data,
  Constr,
  fromText,
  toUnit,
  fromUnit,
  UTxO,
  TxHash,
  Address,
  Assets,
  SpendingValidator,
  PolicyId,
  Unit
} from "@lucid-evolution/lucid";

import { createLucidInstance, connectWallet } from "./lucid-config";
import { ValueParser, ParsedValue, Asset, TransactionAssetAnalysis } from "./value-parser";
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

// Enhanced swap parameters with CIP-68 support
export interface CIP68SwapParams {
  swapInToken: boolean;  // true for Token->ADA, false for ADA->Token
  amountIn: bigint;
  minOut: bigint;
  deadlineSlot?: number; // Optional deadline
  userAddress?: string;  // Optional user address for validation
}

// Enhanced pool state for frontend with CIP-68 data
export interface EnhancedPoolState {
  // Core reserves
  adaReserve: bigint;
  tokenReserve: bigint;
  tokenPolicy: string;
  tokenName: string;

  // Pricing and liquidity
  price: number;        // tokens per ADA
  totalLiquidity: bigint;
  totalLPSupply: bigint;

  // Pool configuration
  feeBps: number;
  protocolFeeBps: number;
  creator: string;
  admin: string;
  isPaused: boolean;

  // Statistics
  totalVolumeAda: bigint;
  totalVolumeToken: bigint;
  totalFeesCollected: bigint;
  swapCount: number;
  lastPrice: number;

  // Metadata
  poolName: string;
  poolDescription: string;
  createdAtSlot: number;
  lastInteractionSlot: number;
}

export class PuckSwapV2 {
  private lucid: Lucid;
  private swapValidator: SpendingValidator;
  private poolAddress: Address;

  constructor(lucid: Lucid, swapValidator: SpendingValidator) {
    this.lucid = lucid;
    this.swapValidator = swapValidator;
    this.poolAddress = lucid.utils.validatorToAddress(swapValidator);
  }

  // Initialize with Lucid Evolution
  static async create(
    swapValidatorCbor: string,
    network?: "Mainnet" | "Preview" | "Preprod"
  ): Promise<PuckSwapV2> {
    const lucid = await createLucidInstance(network ? { network } : undefined);

    // Load swap validator from CBOR
    const swapValidator: SpendingValidator = {
      type: "PlutusV2",
      script: swapValidatorCbor
    };

    return new PuckSwapV2(lucid, swapValidator);
  }

  // Connect wallet
  async connectWallet(walletName: "eternl" | "nami" | "vespr" | "lace"): Promise<void> {
    await connectWallet(this.lucid, walletName);
  }

  // Enhanced pool UTxO finding with comprehensive validation
  async findPoolUtxo(tokenPolicy: string, tokenName: string): Promise<UTxO | null> {
    const utxos = await this.lucid.utxosAt(this.poolAddress);

    // Find UTxO containing the specific token with proper validation
    const poolUtxo = utxos.find(utxo => {
      const parsedValue = ValueParser.parseUtxoValue(utxo);

      // Must have datum
      if (!utxo.datum) return false;

      // Must contain the target token
      if (!ValueParser.containsAsset(parsedValue, tokenPolicy, tokenName)) return false;

      // Must have minimum ADA
      if (!ValueParser.validateMinAda(parsedValue)) return false;

      // Should only contain expected assets (ADA + target token + LP tokens)
      const allowedPolicies = [tokenPolicy, 'lp_policy_placeholder']; // Would get from datum
      if (!ValueParser.validateAllowedAssets(parsedValue, allowedPolicies)) return false;

      return true;
    });

    return poolUtxo || null;
  }

  // Enhanced pool state extraction with comprehensive value parsing
  async getPoolState(tokenPolicy: string, tokenName: string): Promise<PoolState | null> {
    const poolUtxo = await this.findPoolUtxo(tokenPolicy, tokenName);
    if (!poolUtxo || !poolUtxo.datum) return null;

    try {
      // Parse UTxO value comprehensively
      const parsedValue = ValueParser.parseUtxoValue(poolUtxo);

      // Extract ADA and token reserves
      const adaReserve = parsedValue.ada;
      const tokenReserve = ValueParser.getAssetQuantity(parsedValue, tokenPolicy, tokenName);

      // Validate reserves are positive
      if (adaReserve <= 0n || tokenReserve <= 0n) {
        throw new Error("Invalid pool reserves");
      }

      // Parse CIP-68 datum for additional pool info
      const datum = Data.from(poolUtxo.datum) as any;

      // Calculate price (tokens per ADA)
      const price = Number(tokenReserve) / Number(adaReserve);

      // Calculate total liquidity in ADA equivalent
      const totalLiquidity = adaReserve + (tokenReserve * BigInt(Math.floor(1 / price)));

      return {
        adaReserve,
        tokenReserve,
        tokenPolicy,
        tokenName,
        price,
        totalLiquidity
      };
    } catch (error) {
      console.error("Failed to parse pool state:", error);
      return null;
    }
  }

  // Calculate swap output using the same formula as Aiken contract
  calculateSwapOutput(
    poolState: PoolState,
    swapParams: SwapParams
  ): { outputAmount: bigint; priceImpact: number; newPrice: number } {
    const { adaReserve, tokenReserve } = poolState;
    const { swapInToken, amountIn } = swapParams;

    // Apply 0.3% fee (997/1000 after fee, matching Aiken)
    const feeNumerator = 997n;
    const feeDenominator = 1000n;
    const amountInWithFee = amountIn * feeNumerator;

    let outputAmount: bigint;
    let newAdaReserve: bigint;
    let newTokenReserve: bigint;

    if (swapInToken) {
      // Token -> ADA swap
      const numerator = amountInWithFee * adaReserve;
      const denominator = (tokenReserve * feeDenominator) + amountInWithFee;
      outputAmount = numerator / denominator;
      
      newAdaReserve = adaReserve - outputAmount;
      newTokenReserve = tokenReserve + amountIn;
    } else {
      // ADA -> Token swap
      const numerator = amountInWithFee * tokenReserve;
      const denominator = (adaReserve * feeDenominator) + amountInWithFee;
      outputAmount = numerator / denominator;
      
      newAdaReserve = adaReserve + amountIn;
      newTokenReserve = tokenReserve - outputAmount;
    }

    // Calculate price impact
    const oldPrice = Number(tokenReserve) / Number(adaReserve);
    const newPrice = Number(newTokenReserve) / Number(newAdaReserve);
    const priceImpact = Math.abs((newPrice - oldPrice) / oldPrice) * 100;

    return { outputAmount, priceImpact, newPrice };
  }

  // Enhanced swap execution with comprehensive validation
  async executeSwap(
    tokenPolicy: string,
    tokenName: string,
    swapParams: SwapParams
  ): Promise<TxHash> {
    // Get current pool state
    const poolState = await this.getPoolState(tokenPolicy, tokenName);
    if (!poolState) {
      throw new Error("Pool not found");
    }

    // Find pool UTxO
    const poolUtxo = await this.findPoolUtxo(tokenPolicy, tokenName);
    if (!poolUtxo) {
      throw new Error("Pool UTxO not found");
    }

    // Validate pool UTxO structure
    const poolValue = ValueParser.parseUtxoValue(poolUtxo);
    if (!this.validatePoolStructure(poolValue, tokenPolicy, tokenName)) {
      throw new Error("Invalid pool structure");
    }

    // Calculate expected output
    const { outputAmount, priceImpact } = this.calculateSwapOutput(poolState, swapParams);

    // Validate minimum output
    if (outputAmount < swapParams.minOut) {
      throw new Error(`Insufficient output: expected ${outputAmount}, minimum ${swapParams.minOut}`);
    }

    // Validate price impact is acceptable (< 50%)
    if (priceImpact > 50) {
      throw new Error(`Price impact too high: ${priceImpact.toFixed(2)}%`);
    }

    // Create redeemer (matches Aiken structure)
    const redeemer = Data.to(new Constr(0, [
      swapParams.swapInToken,
      swapParams.amountIn,
      swapParams.minOut
    ]));

    // Calculate new pool reserves
    const { swapInToken, amountIn } = swapParams;
    let newAdaReserve: bigint;
    let newTokenReserve: bigint;

    if (swapInToken) {
      // Token -> ADA
      newAdaReserve = poolState.adaReserve - outputAmount;
      newTokenReserve = poolState.tokenReserve + amountIn;
    } else {
      // ADA -> Token
      newAdaReserve = poolState.adaReserve + amountIn;
      newTokenReserve = poolState.tokenReserve - outputAmount;
    }

    // Create new pool datum
    const newPoolDatum = Data.to(new Constr(0, [
      newAdaReserve,
      newTokenReserve,
      fromText(tokenPolicy),
      fromText(tokenName),
      fromText(poolState.tokenPolicy), // LP token policy
      fromText("LP_TOKEN") // LP token name
    ]));

    // Prepare pool output assets
    const poolOutputAssets: Assets = {
      lovelace: newAdaReserve
    };
    if (newTokenReserve > 0n) {
      poolOutputAssets[toUnit(tokenPolicy, tokenName)] = newTokenReserve;
    }

    // Prepare user output assets
    const userAddress = await this.lucid.wallet.address();
    const userOutputAssets: Assets = {};
    
    if (swapInToken) {
      // User receives ADA
      userOutputAssets.lovelace = outputAmount;
    } else {
      // User receives tokens
      userOutputAssets[toUnit(tokenPolicy, tokenName)] = outputAmount;
    }

    // Build transaction
    const tx = await this.lucid.newTx()
      .collectFrom([poolUtxo], redeemer)
      .payToContract(this.poolAddress, { inline: newPoolDatum }, poolOutputAssets)
      .payToAddress(userAddress, userOutputAssets)
      .attachSpendingValidator(this.swapValidator)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    const signedTx = await tx.sign().complete();
    return await signedTx.submit();
  }

  // Get all available pools
  async getAllPools(): Promise<PoolState[]> {
    const utxos = await this.lucid.utxosAt(this.poolAddress);
    const pools: PoolState[] = [];

    for (const utxo of utxos) {
      if (!utxo.datum) continue;

      try {
        // Extract token info from UTxO assets
        const assets = Object.keys(utxo.assets);
        const tokenAsset = assets.find(asset => asset !== 'lovelace');
        
        if (tokenAsset) {
          const [tokenPolicy, tokenName] = tokenAsset.split('.');
          const poolState = await this.getPoolState(tokenPolicy, tokenName || '');
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

  // Utility functions
  formatAmount(amount: bigint, decimals: number = 6): string {
    return (Number(amount) / Math.pow(10, decimals)).toFixed(decimals);
  }

  parseAmount(amount: string, decimals: number = 6): bigint {
    return BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));
  }

  // Validate pool structure contains only expected assets
  private validatePoolStructure(
    poolValue: ParsedValue,
    tokenPolicy: string,
    tokenName: string
  ): boolean {
    // Must have ADA
    if (poolValue.ada <= 0n) return false;

    // Must have the target token
    if (!ValueParser.containsAsset(poolValue, tokenPolicy, tokenName)) return false;

    // Should only contain expected assets
    const allowedPolicies = [tokenPolicy]; // Add LP policy when available
    if (!ValueParser.validateAllowedAssets(poolValue, allowedPolicies)) return false;

    // Must meet minimum ADA requirement
    if (!ValueParser.validateMinAda(poolValue)) return false;

    return true;
  }

  // Enhanced transaction building with comprehensive asset validation
  private async buildSwapTransaction(
    poolUtxo: UTxO,
    poolState: PoolState,
    swapParams: SwapParams,
    outputAmount: bigint
  ): Promise<any> {
    const { swapInToken, amountIn } = swapParams;

    // Create redeemer (matches Aiken structure)
    const redeemer = Data.to(new Constr(0, [
      swapInToken,
      amountIn,
      swapParams.minOut
    ]));

    // Calculate new pool reserves
    let newAdaReserve: bigint;
    let newTokenReserve: bigint;

    if (swapInToken) {
      // Token -> ADA
      newAdaReserve = poolState.adaReserve - outputAmount;
      newTokenReserve = poolState.tokenReserve + amountIn;
    } else {
      // ADA -> Token
      newAdaReserve = poolState.adaReserve + amountIn;
      newTokenReserve = poolState.tokenReserve - outputAmount;
    }

    // Validate new reserves are positive
    if (newAdaReserve <= 0n || newTokenReserve <= 0n) {
      throw new Error("Invalid new reserves");
    }

    // Create new pool datum
    const newPoolDatum = Data.to(new Constr(0, [
      newAdaReserve,
      newTokenReserve,
      fromText(poolState.tokenPolicy),
      fromText(poolState.tokenName),
      fromText("lp_policy_placeholder"), // Would get from current datum
      fromText("LP_TOKEN")
    ]));

    // Prepare pool output assets with validation
    const poolOutputAssets = this.createPoolOutputAssets(
      newAdaReserve,
      newTokenReserve,
      poolState.tokenPolicy,
      poolState.tokenName
    );

    // Prepare user output assets
    const userAddress = await this.lucid.wallet.address();
    const userOutputAssets = this.createUserOutputAssets(
      outputAmount,
      swapInToken,
      poolState.tokenPolicy,
      poolState.tokenName
    );

    // Build transaction with comprehensive validation
    return await this.lucid.newTx()
      .collectFrom([poolUtxo], redeemer)
      .payToContract(this.poolAddress, { inline: newPoolDatum }, poolOutputAssets)
      .payToAddress(userAddress, userOutputAssets)
      .attachSpendingValidator(this.swapValidator)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();
  }

  // Create pool output assets with validation
  private createPoolOutputAssets(
    adaAmount: bigint,
    tokenAmount: bigint,
    tokenPolicy: string,
    tokenName: string
  ): Assets {
    const assets: Assets = {
      lovelace: adaAmount
    };

    if (tokenAmount > 0n) {
      const tokenUnit = toUnit(tokenPolicy, tokenName);
      assets[tokenUnit] = tokenAmount;
    }

    // Validate the created assets
    const parsedAssets = ValueParser.parseAssets(assets);
    if (!ValueParser.validateMinAda(parsedAssets)) {
      throw new Error("Pool output doesn't meet minimum ADA requirement");
    }

    return assets;
  }

  // Create user output assets
  private createUserOutputAssets(
    outputAmount: bigint,
    swapInToken: boolean,
    tokenPolicy: string,
    tokenName: string
  ): Assets {
    const assets: Assets = {};

    if (swapInToken) {
      // User receives ADA
      assets.lovelace = outputAmount;
    } else {
      // User receives tokens
      const tokenUnit = toUnit(tokenPolicy, tokenName);
      assets[tokenUnit] = outputAmount;
    }

    return assets;
  }

  // Analyze transaction for debugging
  async analyzeTransaction(txHash: string): Promise<TransactionAssetAnalysis | null> {
    try {
      const tx = await this.lucid.provider.getTx(txHash);
      if (!tx) return null;

      const inputs = tx.body.inputs.map(input => input.output);
      const outputs = tx.body.outputs;

      return ValueParser.analyzeTransactionAssets(inputs, outputs);
    } catch (error) {
      console.error("Failed to analyze transaction:", error);
      return null;
    }
  }

  // Get current slot for deadline calculations
  async getCurrentSlot(): Promise<number> {
    const protocolParams = await this.lucid.provider.getProtocolParameters();
    return protocolParams.slot;
  }

  // Enhanced utility methods
  formatAsset(asset: Asset): string {
    return ValueParser.formatAsset(asset);
  }

  formatValue(parsedValue: ParsedValue): string {
    return ValueParser.formatValue(parsedValue);
  }
}
