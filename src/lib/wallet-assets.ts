// PuckSwap Wallet Asset Detection and Management
// Real asset detection using Lucid Evolution for Cardano preprod testnet
// Replaces all mock wallet balance logic with actual blockchain data

import { Lucid, UTxO, Assets } from "@lucid-evolution/lucid";
import { fromHex, toHex } from "@lucid-evolution/lucid";

// Asset information interface
export interface AssetInfo {
  unit: string; // Full unit (policyId + assetName)
  policyId: string;
  assetName: string; // Hex encoded
  assetNameUtf8: string; // Human readable name
  amount: bigint;
  decimals: number;
  symbol: string;
  isNative: boolean; // true for ADA, false for native tokens
  metadata?: {
    name?: string;
    description?: string;
    ticker?: string;
    logo?: string;
  };
}

// Wallet balance interface
export interface WalletBalance {
  ada: bigint; // ADA in lovelace
  totalAssets: number; // Total number of different assets
  assets: AssetInfo[]; // All non-ADA assets
  totalValueAda?: bigint; // Optional: total portfolio value in ADA
}

// Known token configurations for PuckSwap
export const KNOWN_TOKENS: Record<string, Partial<AssetInfo>> = {
  // PUCKY token (using deployed LP policy as example)
  'ad524e5497fdf1f924de936f9f7ec31d460c02267e8acce544a5a09e': {
    symbol: 'PUCKY',
    decimals: 6,
    metadata: {
      name: 'PUCKY Token',
      description: 'PuckSwap native token',
      ticker: 'PUCKY'
    }
  },
  // Add more known tokens here as needed
};

/**
 * Parse asset name from hex to UTF-8
 */
export function parseAssetName(assetNameHex: string): string {
  try {
    if (!assetNameHex) return '';
    return fromHex(assetNameHex);
  } catch {
    return assetNameHex; // Return hex if parsing fails
  }
}

/**
 * Parse policy ID and asset name from unit
 */
export function parseAssetUnit(unit: string): { policyId: string; assetName: string } {
  if (unit === 'lovelace') {
    return { policyId: '', assetName: '' };
  }
  
  // Policy ID is first 56 characters (28 bytes in hex)
  const policyId = unit.slice(0, 56);
  const assetName = unit.slice(56);
  
  return { policyId, assetName };
}

/**
 * Get asset information with metadata
 */
export function getAssetInfo(unit: string, amount: bigint): AssetInfo {
  if (unit === 'lovelace') {
    return {
      unit: 'lovelace',
      policyId: '',
      assetName: '',
      assetNameUtf8: 'ADA',
      amount,
      decimals: 6,
      symbol: 'ADA',
      isNative: true,
      metadata: {
        name: 'Cardano',
        description: 'Native Cardano token',
        ticker: 'ADA'
      }
    };
  }

  const { policyId, assetName } = parseAssetUnit(unit);
  const assetNameUtf8 = parseAssetName(assetName);
  
  // Check if this is a known token
  const knownToken = KNOWN_TOKENS[policyId];
  
  return {
    unit,
    policyId,
    assetName,
    assetNameUtf8: assetNameUtf8 || assetName,
    amount,
    decimals: knownToken?.decimals || 0,
    symbol: knownToken?.symbol || assetNameUtf8 || 'UNKNOWN',
    isNative: false,
    metadata: knownToken?.metadata
  };
}

/**
 * Fetch real wallet assets using Lucid Evolution
 */
// Safely convert value to BigInt with null/undefined handling
function safeToBigInt(value: any): bigint {
  if (value === undefined || value === null || value === '') return 0n;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(value);
  if (typeof value === 'string') {
    if (value === 'undefined' || value === 'null' || value.trim() === '') return 0n;
    try { return BigInt(value); } catch { return 0n; }
  }
  return 0n;
}

export async function fetchWalletAssets(lucid: Lucid): Promise<WalletBalance> {
  try {
    console.log('🔍 Fetching real wallet assets from Cardano preprod testnet...');

    // Get all UTxOs from the connected wallet using correct Lucid Evolution API
    const utxos = await lucid.wallet().getUtxos();
    console.log(`📦 Found ${utxos.length} UTxOs in wallet`);

    // Aggregate all assets with null safety
    const assetTotals: Record<string, bigint> = {};

    for (const utxo of utxos) {
      if (!utxo?.assets) continue;

      for (const [unit, amount] of Object.entries(utxo.assets)) {
        assetTotals[unit] = (assetTotals[unit] || 0n) + safeToBigInt(amount);
      }
    }
    
    // Separate ADA from other assets
    const adaAmount = assetTotals['lovelace'] || 0n;
    delete assetTotals['lovelace'];
    
    // Convert to AssetInfo array
    const assets: AssetInfo[] = Object.entries(assetTotals)
      .map(([unit, amount]) => getAssetInfo(unit, amount))
      .filter(asset => asset.amount > 0n)
      .sort((a, b) => {
        // Sort by amount (descending)
        if (a.amount > b.amount) return -1;
        if (a.amount < b.amount) return 1;
        return a.symbol.localeCompare(b.symbol);
      });
    
    const walletBalance: WalletBalance = {
      ada: adaAmount,
      totalAssets: assets.length,
      assets
    };
    
    console.log(`💰 Wallet Balance Summary:`);
    console.log(`  ADA: ${formatADA(adaAmount)}`);
    console.log(`  Native Tokens: ${assets.length}`);
    
    for (const asset of assets.slice(0, 5)) { // Log first 5 assets
      console.log(`  ${asset.symbol}: ${formatTokenAmount(asset.amount, asset.decimals)}`);
    }
    
    return walletBalance;
    
  } catch (error) {
    console.error('❌ Failed to fetch wallet assets:', error);
    throw new Error(`Failed to fetch wallet assets: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Format ADA amount (lovelace to ADA)
 */
export function formatADA(lovelace: bigint): string {
  const ada = Number(lovelace) / 1_000_000;
  return ada.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 6 
  }) + ' ADA';
}

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  if (decimals === 0) {
    return amount.toString();
  }
  
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  
  if (fraction === 0n) {
    return whole.toString();
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0');
  const trimmedFraction = fractionStr.replace(/0+$/, '');
  
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole.toString();
}

/**
 * Get specific asset balance
 */
export function getAssetBalance(walletBalance: WalletBalance, policyId: string, assetName?: string): bigint {
  if (!policyId) {
    return walletBalance.ada; // Return ADA balance
  }
  
  const unit = assetName ? `${policyId}${assetName}` : policyId;
  const asset = walletBalance.assets.find(a => a.unit === unit || a.policyId === policyId);
  
  return asset?.amount || 0n;
}

/**
 * Check if wallet has sufficient balance for transaction
 */
export function hasSufficientBalance(
  walletBalance: WalletBalance, 
  requiredAmount: bigint, 
  policyId?: string,
  assetName?: string
): boolean {
  if (!policyId) {
    // Check ADA balance (include some buffer for fees)
    const feeBuffer = 2_000_000n; // 2 ADA buffer for fees
    return walletBalance.ada >= requiredAmount + feeBuffer;
  }
  
  const assetBalance = getAssetBalance(walletBalance, policyId, assetName);
  return assetBalance >= requiredAmount;
}

/**
 * Refresh wallet balance (for use after transactions)
 */
export async function refreshWalletBalance(lucid: Lucid): Promise<WalletBalance> {
  console.log('🔄 Refreshing wallet balance...');
  return await fetchWalletAssets(lucid);
}
