import { Assets, UTxO, Address, Data } from "lucid-evolution";

/**
 * Comprehensive Min ADA Management for PuckSwap DEX
 * Handles min ADA requirements for all UTxO operations
 */

// =============================================================================
// CONSTANTS AND CONFIGURATION
// =============================================================================

// Min ADA constants (matching Aiken implementation)
export const MIN_ADA_CONSTANTS = {
  BASE_MIN_ADA: 1_000_000n,
  SCRIPT_MIN_ADA: 2_000_000n,
  POOL_MIN_ADA: 3_000_000n,
  FACTORY_MIN_ADA: 2_500_000n,
  LP_TOKEN_MIN_ADA: 2_000_000n,
  ADA_PER_ASSET: 344_798n,
  ADA_PER_DATUM_BYTE: 4_310n,
  MAX_UTXO_SIZE_BYTES: 16_384,
} as const;

// UTxO type classification
export type UTxOType = 
  | { type: "pool"; hasNft: boolean; tokenCount: number }
  | { type: "factory" }
  | { type: "lpToken"; metadataSize: number }
  | { type: "user"; hasDatum: boolean }
  | { type: "generic" };

// Pool operation types
export type PoolOperationType = "swap" | "addLiquidity" | "removeLiquidity" | "createPool";

// Min ADA calculation result
export interface MinAdaCalculation {
  requiredMinAda: bigint;
  actualAda: bigint;
  deficit: bigint;
  isValid: boolean;
  breakdown: {
    baseAmount: bigint;
    assetCost: bigint;
    datumCost: bigint;
    buffer: bigint;
  };
}

// =============================================================================
// MIN ADA CALCULATION FUNCTIONS
// =============================================================================

export class MinAdaManager {
  
  /**
   * Calculate minimum ADA required for a UTxO based on its contents
   */
  static calculateMinAdaForUtxo(
    assets: Assets,
    datumSizeBytes: number,
    isScriptAddress: boolean,
    utxoType: UTxOType = { type: "generic" }
  ): MinAdaCalculation {
    const baseAmount = isScriptAddress 
      ? MIN_ADA_CONSTANTS.SCRIPT_MIN_ADA 
      : MIN_ADA_CONSTANTS.BASE_MIN_ADA;
    
    // Count native assets (excluding ADA)
    const assetCount = Object.keys(assets).filter(key => key !== "lovelace").length;
    const assetCost = BigInt(assetCount) * MIN_ADA_CONSTANTS.ADA_PER_ASSET;
    
    // Calculate datum cost
    const datumCost = BigInt(datumSizeBytes) * MIN_ADA_CONSTANTS.ADA_PER_DATUM_BYTE;
    
    // Apply type-specific calculations
    let typeSpecificAmount = baseAmount;
    let buffer = 0n;
    
    switch (utxoType.type) {
      case "pool":
        typeSpecificAmount = MIN_ADA_CONSTANTS.POOL_MIN_ADA;
        buffer = typeSpecificAmount / 10n; // 10% buffer for pools
        break;
      case "factory":
        typeSpecificAmount = MIN_ADA_CONSTANTS.FACTORY_MIN_ADA;
        buffer = typeSpecificAmount / 20n; // 5% buffer for factory
        break;
      case "lpToken":
        typeSpecificAmount = MIN_ADA_CONSTANTS.LP_TOKEN_MIN_ADA;
        break;
      case "user":
        typeSpecificAmount = baseAmount;
        break;
      case "generic":
        typeSpecificAmount = baseAmount;
        break;
    }
    
    const requiredMinAda = typeSpecificAmount + assetCost + datumCost + buffer;
    const actualAda = BigInt(assets.lovelace || 0);
    const deficit = actualAda >= requiredMinAda ? 0n : requiredMinAda - actualAda;
    
    return {
      requiredMinAda,
      actualAda,
      deficit,
      isValid: deficit === 0n,
      breakdown: {
        baseAmount: typeSpecificAmount,
        assetCost,
        datumCost,
        buffer
      }
    };
  }

  /**
   * Calculate minimum ADA for pool UTxO specifically
   */
  static calculatePoolMinAda(
    poolAssets: Assets,
    datumSizeBytes: number,
    hasNft: boolean = true,
    tokenCount: number = 1
  ): MinAdaCalculation {
    return this.calculateMinAdaForUtxo(
      poolAssets,
      datumSizeBytes,
      true, // Pool is always at script address
      { type: "pool", hasNft, tokenCount }
    );
  }

  /**
   * Calculate minimum ADA for user output UTxO
   */
  static calculateUserOutputMinAda(
    outputAssets: Assets,
    hasDatum: boolean = false
  ): MinAdaCalculation {
    const datumSize = hasDatum ? 50 : 0; // Assume small datum for user outputs
    return this.calculateMinAdaForUtxo(
      outputAssets,
      datumSize,
      false, // User outputs are typically not at script addresses
      { type: "user", hasDatum }
    );
  }

  /**
   * Calculate minimum ADA for factory UTxO
   */
  static calculateFactoryMinAda(
    factoryAssets: Assets,
    datumSizeBytes: number
  ): MinAdaCalculation {
    return this.calculateMinAdaForUtxo(
      factoryAssets,
      datumSizeBytes,
      true, // Factory is at script address
      { type: "factory" }
    );
  }

  /**
   * Calculate minimum ADA for LP token UTxO
   */
  static calculateLPTokenMinAda(
    lpAssets: Assets,
    metadataSize: number
  ): MinAdaCalculation {
    return this.calculateMinAdaForUtxo(
      lpAssets,
      metadataSize,
      true, // LP tokens are typically at script addresses
      { type: "lpToken", metadataSize }
    );
  }

  // =============================================================================
  // VALIDATION FUNCTIONS
  // =============================================================================

  /**
   * Validate that a UTxO meets minimum ADA requirements
   */
  static validateUtxoMinAda(
    utxo: UTxO,
    datumSizeBytes: number,
    utxoType: UTxOType
  ): { isValid: boolean; calculation: MinAdaCalculation; error?: string } {
    const isScript = this.isScriptAddress(utxo.address);
    const calculation = this.calculateMinAdaForUtxo(
      utxo.assets,
      datumSizeBytes,
      isScript,
      utxoType
    );

    return {
      isValid: calculation.isValid,
      calculation,
      error: calculation.isValid ? undefined : 
        `UTxO has ${calculation.actualAda} ADA but requires ${calculation.requiredMinAda} ADA (deficit: ${calculation.deficit})`
    };
  }

  /**
   * Validate all UTxOs in a transaction meet min ADA requirements
   */
  static validateTransactionMinAda(
    utxos: UTxO[],
    specifications: Array<{ datumSize: number; utxoType: UTxOType }>
  ): { isValid: boolean; results: Array<{ utxo: UTxO; validation: ReturnType<typeof this.validateUtxoMinAda> }> } {
    if (utxos.length !== specifications.length) {
      throw new Error("UTxO count must match specification count");
    }

    const results = utxos.map((utxo, index) => {
      const spec = specifications[index];
      return {
        utxo,
        validation: this.validateUtxoMinAda(utxo, spec.datumSize, spec.utxoType)
      };
    });

    const isValid = results.every(result => result.validation.isValid);

    return { isValid, results };
  }

  /**
   * Validate pool operation maintains minimum ADA
   */
  static validatePoolOperationMinAda(
    poolInput: UTxO,
    poolOutput: UTxO,
    datumSizeBytes: number,
    operationType: PoolOperationType
  ): { isValid: boolean; inputValidation: MinAdaCalculation; outputValidation: MinAdaCalculation; error?: string } {
    const inputValidation = this.calculatePoolMinAda(poolInput.assets, datumSizeBytes);
    const outputValidation = this.calculatePoolMinAda(poolOutput.assets, datumSizeBytes);

    let operationSpecificValid = true;
    let error: string | undefined;

    // Additional validation based on operation type
    switch (operationType) {
      case "swap":
        // Ensure ADA reserves don't go below minimum
        const outputAda = BigInt(poolOutput.assets.lovelace || 0);
        if (outputAda < outputValidation.requiredMinAda) {
          operationSpecificValid = false;
          error = `Swap would leave pool with insufficient ADA: ${outputAda} < ${outputValidation.requiredMinAda}`;
        }
        break;
      
      case "addLiquidity":
        // Ensure ADA increases or stays same
        const inputAda = BigInt(poolInput.assets.lovelace || 0);
        const newOutputAda = BigInt(poolOutput.assets.lovelace || 0);
        if (newOutputAda < inputAda) {
          operationSpecificValid = false;
          error = `Add liquidity should not decrease pool ADA: ${newOutputAda} < ${inputAda}`;
        }
        break;
      
      case "removeLiquidity":
        // Ensure remaining ADA is sufficient
        const remainingAda = BigInt(poolOutput.assets.lovelace || 0);
        if (remainingAda < outputValidation.requiredMinAda) {
          operationSpecificValid = false;
          error = `Remove liquidity would leave insufficient ADA: ${remainingAda} < ${outputValidation.requiredMinAda}`;
        }
        break;
      
      case "createPool":
        // Validate initial funding
        const initialAda = BigInt(poolOutput.assets.lovelace || 0);
        if (initialAda < outputValidation.requiredMinAda) {
          operationSpecificValid = false;
          error = `Initial pool funding insufficient: ${initialAda} < ${outputValidation.requiredMinAda}`;
        }
        break;
    }

    const isValid = inputValidation.isValid && outputValidation.isValid && operationSpecificValid;

    return {
      isValid,
      inputValidation,
      outputValidation,
      error: isValid ? undefined : (error || "Min ADA validation failed")
    };
  }

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  /**
   * Check if address is a script address
   */
  static isScriptAddress(address: Address): boolean {
    // This is a simplified check - in practice would need proper address parsing
    return address.includes("script") || address.startsWith("addr_test1w") || address.startsWith("addr1w");
  }

  /**
   * Estimate datum size in bytes
   */
  static estimateDatumSize(datum: Data): number {
    // Simplified estimation - in practice would use actual CBOR size
    const serialized = JSON.stringify(datum);
    return serialized.length;
  }

  /**
   * Calculate safety buffer for min ADA
   */
  static calculateSafetyBuffer(baseAmount: bigint, bufferPercentage: number): bigint {
    return baseAmount + (baseAmount * BigInt(bufferPercentage) / 100n);
  }

  /**
   * Ensure assets have sufficient ADA with buffer
   */
  static ensureMinAdaWithBuffer(
    assets: Assets,
    requiredMinAda: bigint,
    bufferPercentage: number = 10
  ): Assets {
    const currentAda = BigInt(assets.lovelace || 0);
    const minWithBuffer = this.calculateSafetyBuffer(requiredMinAda, bufferPercentage);
    
    if (currentAda < minWithBuffer) {
      return {
        ...assets,
        lovelace: minWithBuffer
      };
    }
    
    return assets;
  }

  /**
   * Generate comprehensive min ADA report
   */
  static generateMinAdaReport(
    utxo: UTxO,
    datumSize: number,
    utxoType: UTxOType
  ): {
    utxo: UTxO;
    calculation: MinAdaCalculation;
    recommendations: string[];
  } {
    const calculation = this.calculateMinAdaForUtxo(
      utxo.assets,
      datumSize,
      this.isScriptAddress(utxo.address),
      utxoType
    );

    const recommendations: string[] = [];

    if (!calculation.isValid) {
      recommendations.push(`Add ${calculation.deficit} lovelace to meet minimum ADA requirement`);
    }

    if (datumSize > MIN_ADA_CONSTANTS.MAX_UTXO_SIZE_BYTES) {
      recommendations.push(`Reduce datum size from ${datumSize} to under ${MIN_ADA_CONSTANTS.MAX_UTXO_SIZE_BYTES} bytes`);
    }

    const assetCount = Object.keys(utxo.assets).filter(key => key !== "lovelace").length;
    if (assetCount > 10) {
      recommendations.push(`Consider reducing number of assets (currently ${assetCount}) to lower min ADA requirements`);
    }

    return {
      utxo,
      calculation,
      recommendations
    };
  }
}
