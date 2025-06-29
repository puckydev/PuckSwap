import {
  Assets,
  Unit,
  PolicyId,
  UTxO,
  toUnit,
  fromUnit
} from "./mock-lucid";

// Enhanced asset representation
export interface Asset {
  policyId: string;
  assetName: string;
  quantity: bigint;
  unit: string;
}

// Value parsing result
export interface ParsedValue {
  ada: bigint;
  assets: Asset[];
  totalAssets: number;
  isEmpty: boolean;
}

// Asset filter criteria
export interface AssetFilter {
  policyId?: string;
  assetName?: string;
  minQuantity?: bigint;
  maxQuantity?: bigint;
}

// Multi-asset transaction analysis
export interface TransactionAssetAnalysis {
  inputAssets: ParsedValue;
  outputAssets: ParsedValue;
  netChange: ParsedValue;
  assetFlow: Map<string, bigint>; // unit -> net change
}

export class ValueParser {
  
  // Parse Lucid Assets into structured format
  static parseAssets(assets: Assets): ParsedValue {
    const ada = assets.lovelace || 0n;
    const assetList: Asset[] = [];

    // Process all non-ADA assets
    for (const [unit, quantity] of Object.entries(assets)) {
      if (unit === 'lovelace') continue;

      try {
        const { policyId, assetName } = fromUnit(unit);
        assetList.push({
          policyId,
          assetName,
          quantity: BigInt(quantity),
          unit
        });
      } catch (error) {
        console.warn(`Failed to parse asset unit: ${unit}`, error);
      }
    }

    return {
      ada,
      assets: assetList,
      totalAssets: assetList.length,
      isEmpty: ada === 0n && assetList.length === 0
    };
  }

  // Parse UTxO value
  static parseUtxoValue(utxo: UTxO): ParsedValue {
    return this.parseAssets(utxo.assets);
  }

  // Get specific asset quantity from parsed value
  static getAssetQuantity(
    parsedValue: ParsedValue, 
    policyId: string, 
    assetName: string
  ): bigint {
    if (policyId === '' && assetName === '') {
      return parsedValue.ada;
    }

    const asset = parsedValue.assets.find(
      a => a.policyId === policyId && a.assetName === assetName
    );
    return asset?.quantity || 0n;
  }

  // Check if value contains specific asset
  static containsAsset(
    parsedValue: ParsedValue,
    policyId: string,
    assetName: string,
    minQuantity: bigint = 1n
  ): boolean {
    const quantity = this.getAssetQuantity(parsedValue, policyId, assetName);
    return quantity >= minQuantity;
  }

  // Filter assets by criteria
  static filterAssets(parsedValue: ParsedValue, filter: AssetFilter): Asset[] {
    return parsedValue.assets.filter(asset => {
      if (filter.policyId && asset.policyId !== filter.policyId) return false;
      if (filter.assetName && asset.assetName !== filter.assetName) return false;
      if (filter.minQuantity && asset.quantity < filter.minQuantity) return false;
      if (filter.maxQuantity && asset.quantity > filter.maxQuantity) return false;
      return true;
    });
  }

  // Get all assets of a specific policy
  static getAssetsByPolicy(parsedValue: ParsedValue, policyId: string): Asset[] {
    return parsedValue.assets.filter(asset => asset.policyId === policyId);
  }

  // Calculate total value in ADA equivalent (requires price oracle)
  static calculateTotalValueAda(
    parsedValue: ParsedValue,
    priceOracle: Map<string, number> // unit -> ADA price
  ): bigint {
    let totalAda = parsedValue.ada;

    for (const asset of parsedValue.assets) {
      const price = priceOracle.get(asset.unit);
      if (price) {
        const adaValue = BigInt(Math.floor(Number(asset.quantity) * price));
        totalAda += adaValue;
      }
    }

    return totalAda;
  }

  // Merge multiple parsed values
  static mergeValues(values: ParsedValue[]): ParsedValue {
    const totalAda = values.reduce((sum, value) => sum + value.ada, 0n);
    const assetMap = new Map<string, Asset>();

    // Merge all assets
    for (const value of values) {
      for (const asset of value.assets) {
        const existing = assetMap.get(asset.unit);
        if (existing) {
          existing.quantity += asset.quantity;
        } else {
          assetMap.set(asset.unit, { ...asset });
        }
      }
    }

    const mergedAssets = Array.from(assetMap.values());

    return {
      ada: totalAda,
      assets: mergedAssets,
      totalAssets: mergedAssets.length,
      isEmpty: totalAda === 0n && mergedAssets.length === 0
    };
  }

  // Calculate difference between two values (value1 - value2)
  static calculateValueDifference(value1: ParsedValue, value2: ParsedValue): ParsedValue {
    const adaDiff = value1.ada - value2.ada;
    const assetMap = new Map<string, Asset>();

    // Add all assets from value1
    for (const asset of value1.assets) {
      assetMap.set(asset.unit, { ...asset });
    }

    // Subtract assets from value2
    for (const asset of value2.assets) {
      const existing = assetMap.get(asset.unit);
      if (existing) {
        existing.quantity -= asset.quantity;
        if (existing.quantity === 0n) {
          assetMap.delete(asset.unit);
        }
      } else {
        assetMap.set(asset.unit, {
          ...asset,
          quantity: -asset.quantity
        });
      }
    }

    const diffAssets = Array.from(assetMap.values()).filter(
      asset => asset.quantity !== 0n
    );

    return {
      ada: adaDiff,
      assets: diffAssets,
      totalAssets: diffAssets.length,
      isEmpty: adaDiff === 0n && diffAssets.length === 0
    };
  }

  // Convert parsed value back to Lucid Assets format
  static toAssets(parsedValue: ParsedValue): Assets {
    const assets: Assets = {
      lovelace: parsedValue.ada
    };

    for (const asset of parsedValue.assets) {
      assets[asset.unit] = asset.quantity;
    }

    return assets;
  }

  // Validate that value meets minimum ADA requirement
  static validateMinAda(parsedValue: ParsedValue, minAda: bigint = 2_000_000n): boolean {
    return parsedValue.ada >= minAda;
  }

  // Check if value contains only allowed assets
  static validateAllowedAssets(
    parsedValue: ParsedValue,
    allowedPolicies: string[]
  ): boolean {
    return parsedValue.assets.every(asset => 
      allowedPolicies.includes(asset.policyId)
    );
  }

  // Get the largest asset by quantity
  static getLargestAsset(parsedValue: ParsedValue): Asset | null {
    if (parsedValue.assets.length === 0) return null;

    return parsedValue.assets.reduce((largest, current) => 
      current.quantity > largest.quantity ? current : largest
    );
  }

  // Check if value is "dust" (only minimal ADA)
  static isDustValue(parsedValue: ParsedValue, dustThreshold: bigint = 1_000_000n): boolean {
    return parsedValue.ada <= dustThreshold && parsedValue.assets.length === 0;
  }

  // Analyze transaction asset flow
  static analyzeTransactionAssets(
    inputs: UTxO[],
    outputs: UTxO[]
  ): TransactionAssetAnalysis {
    const inputValues = inputs.map(utxo => this.parseUtxoValue(utxo));
    const outputValues = outputs.map(utxo => this.parseUtxoValue(utxo));

    const inputAssets = this.mergeValues(inputValues);
    const outputAssets = this.mergeValues(outputValues);
    const netChange = this.calculateValueDifference(outputAssets, inputAssets);

    // Create asset flow map
    const assetFlow = new Map<string, bigint>();
    
    // Add ADA flow
    if (netChange.ada !== 0n) {
      assetFlow.set('lovelace', netChange.ada);
    }

    // Add asset flows
    for (const asset of netChange.assets) {
      assetFlow.set(asset.unit, asset.quantity);
    }

    return {
      inputAssets,
      outputAssets,
      netChange,
      assetFlow
    };
  }

  // Format asset for display
  static formatAsset(asset: Asset, decimals: number = 6): string {
    const amount = Number(asset.quantity) / Math.pow(10, decimals);
    const name = asset.assetName || 'Unknown';
    return `${amount.toFixed(decimals)} ${name}`;
  }

  // Format parsed value for display
  static formatValue(parsedValue: ParsedValue): string {
    const parts: string[] = [];
    
    if (parsedValue.ada > 0n) {
      const ada = Number(parsedValue.ada) / 1_000_000;
      parts.push(`${ada.toFixed(6)} ADA`);
    }

    for (const asset of parsedValue.assets) {
      parts.push(this.formatAsset(asset));
    }

    return parts.join(', ') || '0 ADA';
  }
}
