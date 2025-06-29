import {
  Lucid,
  Data,
  fromText,
  toUnit,
  UTxO,
  TxHash,
  Address,
  Assets,
  Constr
} from "@lucid-evolution/lucid";

import { createLucidInstance, connectWallet } from "./lucid-config";

// Core pool state (simplified for step-by-step approach)
export interface PoolState {
  ada_reserve: bigint;
  token_reserve: bigint;
  token_policy: string;
  token_name: string;
  fee_bps: number;
}

// Simple swap parameters
export interface SwapParams {
  inputAmount: bigint;
  minOutput: bigint;
  isAdaToToken: boolean;  // true for ADA->Token, false for Token->ADA
}

// Core DEX class - focused on essential functionality
export class CorePuckSwapDEX {
  private lucid: Lucid;
  private poolValidatorScript: string;

  constructor(lucid: Lucid, poolValidatorScript: string) {
    this.lucid = lucid;
    this.poolValidatorScript = poolValidatorScript;
  }

  // Initialize with Lucid Evolution
  static async create(
    network?: "Mainnet" | "Preview" | "Preprod"
  ): Promise<CorePuckSwapDEX> {
    const lucid = await createLucidInstance(network ? { network } : undefined);

    // For now, use placeholder script - in real implementation, load from artifacts
    const poolValidatorScript = "placeholder_script_cbor";

    return new CorePuckSwapDEX(lucid, poolValidatorScript);
  }

  // Connect wallet
  async connectWallet(walletName: "eternl" | "nami" | "vespr" | "lace"): Promise<void> {
    await connectWallet(this.lucid, walletName);
  }

  // Get pool address
  getPoolAddress(): Address {
    return this.lucid.utils.validatorToAddress(this.poolValidatorScript);
  }

  // Find pool UTxO for a specific token pair
  async findPoolUtxo(tokenPolicy: string, tokenName: string): Promise<UTxO | null> {
    const poolAddress = this.getPoolAddress();
    const utxos = await this.lucid.utxosAt(poolAddress);
    
    // Find UTxO with the correct token
    const poolUtxo = utxos.find(utxo => {
      const tokenUnit = toUnit(tokenPolicy, tokenName);
      return utxo.assets[tokenUnit] !== undefined;
    });

    return poolUtxo || null;
  }

  // Get current pool state
  async getPoolState(tokenPolicy: string, tokenName: string): Promise<PoolState | null> {
    const poolUtxo = await this.findPoolUtxo(tokenPolicy, tokenName);
    if (!poolUtxo || !poolUtxo.datum) return null;

    try {
      // Parse datum (simplified - in real implementation, use proper CIP-68 parsing)
      const datum = Data.from(poolUtxo.datum);
      
      // Extract pool state from UTxO assets
      const adaAmount = poolUtxo.assets.lovelace || 0n;
      const tokenUnit = toUnit(tokenPolicy, tokenName);
      const tokenAmount = poolUtxo.assets[tokenUnit] || 0n;

      return {
        ada_reserve: adaAmount,
        token_reserve: tokenAmount,
        token_policy: tokenPolicy,
        token_name: tokenName,
        fee_bps: 30 // Default 0.3% fee
      };
    } catch (error) {
      console.error("Failed to parse pool state:", error);
      return null;
    }
  }

  // Calculate swap output using constant product formula
  calculateSwapOutput(
    poolState: PoolState,
    inputAmount: bigint,
    isAdaToToken: boolean
  ): { outputAmount: bigint; priceImpact: number } {
    const { ada_reserve, token_reserve, fee_bps } = poolState;
    
    // Calculate fee
    const feeAmount = inputAmount * BigInt(fee_bps) / 10000n;
    const inputAfterFee = inputAmount - feeAmount;

    let outputAmount: bigint;
    let priceImpact: number;

    if (isAdaToToken) {
      // ADA -> Token swap
      const newAdaReserve = ada_reserve + inputAfterFee;
      outputAmount = token_reserve * inputAfterFee / newAdaReserve;
      
      // Calculate price impact
      const oldPrice = Number(token_reserve) / Number(ada_reserve);
      const newPrice = Number(token_reserve - outputAmount) / Number(newAdaReserve);
      priceImpact = Math.abs((newPrice - oldPrice) / oldPrice) * 100;
    } else {
      // Token -> ADA swap
      const newTokenReserve = token_reserve + inputAfterFee;
      outputAmount = ada_reserve * inputAfterFee / newTokenReserve;
      
      // Calculate price impact
      const oldPrice = Number(ada_reserve) / Number(token_reserve);
      const newPrice = Number(ada_reserve - outputAmount) / Number(newTokenReserve);
      priceImpact = Math.abs((newPrice - oldPrice) / oldPrice) * 100;
    }

    return { outputAmount, priceImpact };
  }

  // Execute a simple swap
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

    // Calculate expected output
    const { outputAmount } = this.calculateSwapOutput(
      poolState,
      swapParams.inputAmount,
      swapParams.isAdaToToken
    );

    // Validate minimum output
    if (outputAmount < swapParams.minOutput) {
      throw new Error(`Insufficient output: expected ${outputAmount}, minimum ${swapParams.minOutput}`);
    }

    // Calculate new reserves
    const feeAmount = swapParams.inputAmount * BigInt(poolState.fee_bps) / 10000n;
    const inputAfterFee = swapParams.inputAmount - feeAmount;

    let newAdaReserve: bigint;
    let newTokenReserve: bigint;

    if (swapParams.isAdaToToken) {
      newAdaReserve = poolState.ada_reserve + inputAfterFee;
      newTokenReserve = poolState.token_reserve - outputAmount;
    } else {
      newAdaReserve = poolState.ada_reserve - outputAmount;
      newTokenReserve = poolState.token_reserve + inputAfterFee;
    }

    // Create new pool datum (simplified)
    const newPoolDatum = Data.to(new Constr(0, [
      newAdaReserve,
      newTokenReserve,
      fromText(tokenPolicy),
      fromText(tokenName),
      poolState.fee_bps
    ]));

    // Create swap redeemer
    const swapRedeemer = Data.to(new Constr(0, [
      swapParams.inputAmount,
      swapParams.minOutput,
      Date.now() + 1200000, // 20 minute deadline
      await this.lucid.wallet.address() // recipient
    ]));

    // Build transaction
    const poolAddress = this.getPoolAddress();
    const userAddress = await this.lucid.wallet.address();

    // Prepare assets for pool output
    const poolOutputAssets: Assets = {
      lovelace: newAdaReserve
    };
    if (newTokenReserve > 0n) {
      poolOutputAssets[toUnit(tokenPolicy, tokenName)] = newTokenReserve;
    }

    // Prepare assets for user output
    const userOutputAssets: Assets = {};
    if (swapParams.isAdaToToken) {
      userOutputAssets[toUnit(tokenPolicy, tokenName)] = outputAmount;
    } else {
      userOutputAssets.lovelace = outputAmount;
    }

    // Build and submit transaction
    const tx = await this.lucid.newTx()
      .collectFrom([poolUtxo], swapRedeemer)
      .payToContract(poolAddress, { inline: newPoolDatum }, poolOutputAssets)
      .payToAddress(userAddress, userOutputAssets)
      .attachSpendingValidator(this.poolValidatorScript)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    const signedTx = await tx.sign().complete();
    return await signedTx.submit();
  }

  // Get current slot (for deadline calculations)
  async getCurrentSlot(): Promise<number> {
    const protocolParams = await this.lucid.provider.getProtocolParameters();
    return protocolParams.slot;
  }

  // Utility: Format amounts for display
  formatAmount(amount: bigint, decimals: number = 6): string {
    return (Number(amount) / Math.pow(10, decimals)).toFixed(decimals);
  }

  // Utility: Parse amount from string
  parseAmount(amount: string, decimals: number = 6): bigint {
    return BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));
  }
}
