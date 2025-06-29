import { Data, Constr, fromText, toText } from "lucid-evolution";
import { Address, PolicyId, AssetName, OutRef } from "lucid-evolution";

/**
 * TypeScript utilities for building PuckSwap redeemers that match the Aiken parser
 * This ensures compatibility between off-chain transaction building and on-chain parsing
 */

// =============================================================================
// REDEEMER TYPE INTERFACES
// =============================================================================

export interface PoolSwapRedeemer {
  type: "swap";
  inputAmount: bigint;
  minOutput: bigint;
  deadline: bigint;
  recipient: Address;
}

export interface PoolAddLiquidityRedeemer {
  type: "addLiquidity";
  adaAmount: bigint;
  tokenAmount: bigint;
  minLpTokens: bigint;
  deadline: bigint;
}

export interface PoolRemoveLiquidityRedeemer {
  type: "removeLiquidity";
  lpTokens: bigint;
  minAdaOut: bigint;
  minTokenOut: bigint;
  deadline: bigint;
}

export interface PoolCreatePoolRedeemer {
  type: "createPool";
  initialAda: bigint;
  initialToken: bigint;
  feeBps: bigint;
}

export interface PoolEmergencyPauseRedeemer {
  type: "emergencyPause";
}

export interface PoolEmergencyUnpauseRedeemer {
  type: "emergencyUnpause";
}

export type PoolRedeemer = 
  | PoolSwapRedeemer 
  | PoolAddLiquidityRedeemer 
  | PoolRemoveLiquidityRedeemer 
  | PoolCreatePoolRedeemer 
  | PoolEmergencyPauseRedeemer 
  | PoolEmergencyUnpauseRedeemer;

export interface SwapRedeemer {
  swapInToken: boolean;
  amountIn: bigint;
  minOut: bigint;
  deadlineSlot: bigint;
  userAddress: Address;
}

export interface LPMintRedeemer {
  type: "mintLP";
  amount: bigint;
  poolUtxoRef: OutRef;
  recipient: Address;
  metadata: LPTokenMetadata;
}

export interface LPBurnRedeemer {
  type: "burnLP";
  amount: bigint;
  poolUtxoRef: OutRef;
  owner: Address;
}

export interface LPUpdateMetadataRedeemer {
  type: "updateMetadata";
  tokenName: AssetName;
  newMetadata: LPTokenMetadata;
  poolUtxoRef: OutRef;
}

export type LPRedeemer = LPMintRedeemer | LPBurnRedeemer | LPUpdateMetadataRedeemer;

export interface FactoryCreatePoolRedeemer {
  type: "createPool";
  tokenPolicy: PolicyId;
  tokenName: AssetName;
  initialAda: bigint;
  initialToken: bigint;
  feeBps: bigint;
}

export interface FactoryUpdateConfigRedeemer {
  type: "updateConfig";
  newAdmin?: Address;
  newCreationFee?: bigint;
  newProtocolFee?: bigint;
}

export interface FactoryPauseRedeemer {
  type: "pauseFactory";
}

export interface FactoryUnpauseRedeemer {
  type: "unpauseFactory";
}

export type FactoryRedeemer = 
  | FactoryCreatePoolRedeemer 
  | FactoryUpdateConfigRedeemer 
  | FactoryPauseRedeemer 
  | FactoryUnpauseRedeemer;

export interface LPTokenMetadata {
  name: string;
  description: string;
  image: string;
  poolAdaReserve: bigint;
  poolTokenReserve: bigint;
  createdAt: bigint;
}

// =============================================================================
// REDEEMER BUILDERS
// =============================================================================

export class PuckSwapRedeemerBuilder {
  
  /**
   * Build a pool swap redeemer
   */
  static buildPoolSwapRedeemer(params: {
    inputAmount: bigint;
    minOutput: bigint;
    deadline: bigint;
    recipient: Address;
  }): Data {
    return new Constr(0, [
      params.inputAmount,
      params.minOutput,
      params.deadline,
      this.serializeAddress(params.recipient)
    ]);
  }

  /**
   * Build a pool add liquidity redeemer
   */
  static buildPoolAddLiquidityRedeemer(params: {
    adaAmount: bigint;
    tokenAmount: bigint;
    minLpTokens: bigint;
    deadline: bigint;
  }): Data {
    return new Constr(1, [
      params.adaAmount,
      params.tokenAmount,
      params.minLpTokens,
      params.deadline
    ]);
  }

  /**
   * Build a pool remove liquidity redeemer
   */
  static buildPoolRemoveLiquidityRedeemer(params: {
    lpTokens: bigint;
    minAdaOut: bigint;
    minTokenOut: bigint;
    deadline: bigint;
  }): Data {
    return new Constr(2, [
      params.lpTokens,
      params.minAdaOut,
      params.minTokenOut,
      params.deadline
    ]);
  }

  /**
   * Build a pool creation redeemer
   */
  static buildPoolCreatePoolRedeemer(params: {
    initialAda: bigint;
    initialToken: bigint;
    feeBps: bigint;
  }): Data {
    return new Constr(3, [
      params.initialAda,
      params.initialToken,
      params.feeBps
    ]);
  }

  /**
   * Build an emergency pause redeemer
   */
  static buildPoolEmergencyPauseRedeemer(): Data {
    return new Constr(4, []);
  }

  /**
   * Build an emergency unpause redeemer
   */
  static buildPoolEmergencyUnpauseRedeemer(): Data {
    return new Constr(5, []);
  }

  /**
   * Build a generic pool redeemer from interface
   */
  static buildPoolRedeemer(redeemer: PoolRedeemer): Data {
    switch (redeemer.type) {
      case "swap":
        return this.buildPoolSwapRedeemer(redeemer);
      case "addLiquidity":
        return this.buildPoolAddLiquidityRedeemer(redeemer);
      case "removeLiquidity":
        return this.buildPoolRemoveLiquidityRedeemer(redeemer);
      case "createPool":
        return this.buildPoolCreatePoolRedeemer(redeemer);
      case "emergencyPause":
        return this.buildPoolEmergencyPauseRedeemer();
      case "emergencyUnpause":
        return this.buildPoolEmergencyUnpauseRedeemer();
      default:
        throw new Error(`Unknown pool redeemer type: ${(redeemer as any).type}`);
    }
  }

  /**
   * Build an enhanced swap redeemer (CIP-68)
   */
  static buildSwapRedeemer(params: SwapRedeemer): Data {
    return new Constr(0, [
      this.serializeBool(params.swapInToken),
      params.amountIn,
      params.minOut,
      params.deadlineSlot,
      this.serializeAddress(params.userAddress)
    ]);
  }

  /**
   * Build an LP mint redeemer
   */
  static buildLPMintRedeemer(params: {
    amount: bigint;
    poolUtxoRef: OutRef;
    recipient: Address;
    metadata: LPTokenMetadata;
  }): Data {
    return new Constr(0, [
      params.amount,
      this.serializeOutRef(params.poolUtxoRef),
      this.serializeAddress(params.recipient),
      this.serializeLPTokenMetadata(params.metadata)
    ]);
  }

  /**
   * Build an LP burn redeemer
   */
  static buildLPBurnRedeemer(params: {
    amount: bigint;
    poolUtxoRef: OutRef;
    owner: Address;
  }): Data {
    return new Constr(1, [
      params.amount,
      this.serializeOutRef(params.poolUtxoRef),
      this.serializeAddress(params.owner)
    ]);
  }

  /**
   * Build an LP metadata update redeemer
   */
  static buildLPUpdateMetadataRedeemer(params: {
    tokenName: AssetName;
    newMetadata: LPTokenMetadata;
    poolUtxoRef: OutRef;
  }): Data {
    return new Constr(2, [
      fromText(params.tokenName),
      this.serializeLPTokenMetadata(params.newMetadata),
      this.serializeOutRef(params.poolUtxoRef)
    ]);
  }

  /**
   * Build a generic LP redeemer from interface
   */
  static buildLPRedeemer(redeemer: LPRedeemer): Data {
    switch (redeemer.type) {
      case "mintLP":
        return this.buildLPMintRedeemer(redeemer);
      case "burnLP":
        return this.buildLPBurnRedeemer(redeemer);
      case "updateMetadata":
        return this.buildLPUpdateMetadataRedeemer(redeemer);
      default:
        throw new Error(`Unknown LP redeemer type: ${(redeemer as any).type}`);
    }
  }

  /**
   * Build a factory create pool redeemer
   */
  static buildFactoryCreatePoolRedeemer(params: {
    tokenPolicy: PolicyId;
    tokenName: AssetName;
    initialAda: bigint;
    initialToken: bigint;
    feeBps: bigint;
  }): Data {
    return new Constr(0, [
      fromText(params.tokenPolicy),
      fromText(params.tokenName),
      params.initialAda,
      params.initialToken,
      params.feeBps
    ]);
  }

  /**
   * Build a factory config update redeemer
   */
  static buildFactoryUpdateConfigRedeemer(params: {
    newAdmin?: Address;
    newCreationFee?: bigint;
    newProtocolFee?: bigint;
  }): Data {
    return new Constr(1, [
      this.serializeOptionalAddress(params.newAdmin),
      this.serializeOptionalBigInt(params.newCreationFee),
      this.serializeOptionalBigInt(params.newProtocolFee)
    ]);
  }

  /**
   * Build a factory pause redeemer
   */
  static buildFactoryPauseRedeemer(): Data {
    return new Constr(2, []);
  }

  /**
   * Build a factory unpause redeemer
   */
  static buildFactoryUnpauseRedeemer(): Data {
    return new Constr(3, []);
  }

  /**
   * Build a generic factory redeemer from interface
   */
  static buildFactoryRedeemer(redeemer: FactoryRedeemer): Data {
    switch (redeemer.type) {
      case "createPool":
        return this.buildFactoryCreatePoolRedeemer(redeemer);
      case "updateConfig":
        return this.buildFactoryUpdateConfigRedeemer(redeemer);
      case "pauseFactory":
        return this.buildFactoryPauseRedeemer();
      case "unpauseFactory":
        return this.buildFactoryUnpauseRedeemer();
      default:
        throw new Error(`Unknown factory redeemer type: ${(redeemer as any).type}`);
    }
  }

  // =============================================================================
  // SERIALIZATION UTILITIES
  // =============================================================================

  private static serializeAddress(address: Address): Data {
    // This would need proper address serialization based on Lucid Evolution's format
    // For now, return a placeholder
    return fromText(address);
  }

  private static serializeBool(value: boolean): Data {
    return value ? new Constr(1, []) : new Constr(0, []);
  }

  private static serializeOutRef(outRef: OutRef): Data {
    return new Constr(0, [
      fromText(outRef.txHash),
      BigInt(outRef.outputIndex)
    ]);
  }

  private static serializeLPTokenMetadata(metadata: LPTokenMetadata): Data {
    return new Constr(0, [
      fromText(metadata.name),
      fromText(metadata.description),
      fromText(metadata.image),
      metadata.poolAdaReserve,
      metadata.poolTokenReserve,
      metadata.createdAt
    ]);
  }

  private static serializeOptionalAddress(address?: Address): Data {
    if (address) {
      return new Constr(1, [this.serializeAddress(address)]);
    } else {
      return new Constr(0, []);
    }
  }

  private static serializeOptionalBigInt(value?: bigint): Data {
    if (value !== undefined) {
      return new Constr(1, [value]);
    } else {
      return new Constr(0, []);
    }
  }
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

/**
 * Example usage of the redeemer builder
 */
export class PuckSwapRedeemerExamples {
  
  /**
   * Build a swap redeemer for ADA -> Token swap
   */
  static buildAdaToTokenSwap(params: {
    adaAmount: bigint;
    minTokenOut: bigint;
    deadline: bigint;
    recipient: Address;
  }): Data {
    return PuckSwapRedeemerBuilder.buildPoolSwapRedeemer({
      inputAmount: params.adaAmount,
      minOutput: params.minTokenOut,
      deadline: params.deadline,
      recipient: params.recipient
    });
  }

  /**
   * Build a swap redeemer for Token -> ADA swap
   */
  static buildTokenToAdaSwap(params: {
    tokenAmount: bigint;
    minAdaOut: bigint;
    deadline: bigint;
    recipient: Address;
  }): Data {
    return PuckSwapRedeemerBuilder.buildPoolSwapRedeemer({
      inputAmount: params.tokenAmount,
      minOutput: params.minAdaOut,
      deadline: params.deadline,
      recipient: params.recipient
    });
  }

  /**
   * Build an add liquidity redeemer
   */
  static buildAddLiquidity(params: {
    adaAmount: bigint;
    tokenAmount: bigint;
    minLpTokens: bigint;
    deadline: bigint;
  }): Data {
    return PuckSwapRedeemerBuilder.buildPoolAddLiquidityRedeemer(params);
  }

  /**
   * Build a remove liquidity redeemer
   */
  static buildRemoveLiquidity(params: {
    lpTokens: bigint;
    minAdaOut: bigint;
    minTokenOut: bigint;
    deadline: bigint;
  }): Data {
    return PuckSwapRedeemerBuilder.buildPoolRemoveLiquidityRedeemer(params);
  }

  /**
   * Build an enhanced CIP-68 swap redeemer
   */
  static buildEnhancedSwap(params: {
    swapInToken: boolean;
    amountIn: bigint;
    minOut: bigint;
    deadlineSlot: bigint;
    userAddress: Address;
  }): Data {
    return PuckSwapRedeemerBuilder.buildSwapRedeemer(params);
  }
}
