/**
 * PuckSwap v5 - Pool Discovery System
 * 
 * Real-time pool discovery using deployed contract addresses
 * Queries UTxOs at swap validator address to find active pools
 * Based on Minswap DEX v2 pool discovery patterns
 */

import { 
  Lucid, 
  UTxO, 
  Data,
  Address,
  PolicyId,
  AssetName,
  Assets
} from '@lucid-evolution/lucid';
import { contractAddresses } from './utils/contractAddresses';

export interface PoolInfo {
  poolUtxo: UTxO;
  poolDatum: PoolDatum;
  poolAddress: string;
  poolNftPolicy: string;
  poolNftName: string;
  tokenPolicy: string;
  tokenName: string;
  adaReserve: bigint;
  tokenReserve: bigint;
  totalLiquidity: bigint;
  feeBps: bigint;
  isActive: boolean;
}

export interface PoolDatum {
  pool_nft_policy: string;
  pool_nft_name: string;
  token_policy: string;
  token_name: string;
  ada_reserve: bigint;
  token_reserve: bigint;
  lp_total_supply: bigint;
  fee_bps: bigint;
}

export interface TokenInfo {
  policy: string;
  name: string;
  symbol: string;
  decimals: number;
  icon?: string;
  isNative: boolean;
  poolAddress: string;
  adaReserve: string;
  tokenReserve: string;
  totalLiquidity: string;
  price: string;
}

/**
 * Discover all active pools by querying UTxOs at swap validator address
 */
export async function discoverActivePools(lucid: Lucid): Promise<PoolInfo[]> {
  try {
    console.log('🔍 Discovering active pools from deployed contracts...');
    
    // Get swap validator address from deployed contracts
    const swapValidatorAddress = contractAddresses.validators.swap;
    if (!swapValidatorAddress) {
      throw new Error('Swap validator address not found in deployment');
    }
    
    console.log(`📦 Querying UTxOs at swap validator: ${swapValidatorAddress}`);
    
    // Query all UTxOs at the swap validator address
    const utxos = await lucid.utxosAt(swapValidatorAddress);
    
    console.log(`📊 Found ${utxos.length} UTxOs at swap validator`);
    
    // Parse pool data from UTxOs
    const pools: PoolInfo[] = [];
    
    for (const utxo of utxos) {
      try {
        const poolInfo = await parsePoolFromUtxo(utxo, swapValidatorAddress);
        if (poolInfo && poolInfo.isActive) {
          pools.push(poolInfo);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to parse pool from UTxO ${utxo.txHash}#${utxo.outputIndex}:`, error);
      }
    }
    
    console.log(`✅ Discovered ${pools.length} active pools`);
    return pools;
    
  } catch (error) {
    console.error('❌ Failed to discover active pools:', error);
    throw error;
  }
}

/**
 * Parse pool information from a UTxO
 */
async function parsePoolFromUtxo(utxo: UTxO, poolAddress: string): Promise<PoolInfo | null> {
  try {
    // Check if UTxO has inline datum
    if (!utxo.datum) {
      return null;
    }
    
    // Parse datum as PoolDatum
    const poolDatum = Data.from(utxo.datum) as PoolDatum;
    
    // Validate pool datum structure
    if (!isValidPoolDatum(poolDatum)) {
      return null;
    }
    
    // Check if pool has minimum liquidity (1 ADA)
    const minLiquidity = 1_000_000n; // 1 ADA in lovelace
    if (poolDatum.ada_reserve < minLiquidity) {
      return null;
    }
    
    // Extract pool NFT from UTxO assets
    const poolNftPolicy = poolDatum.pool_nft_policy;
    const poolNftName = poolDatum.pool_nft_name;
    
    // Verify UTxO contains the pool NFT
    const poolNftUnit = poolNftPolicy + poolNftName;
    const hasPoolNft = utxo.assets[poolNftUnit] === 1n;
    
    if (!hasPoolNft) {
      console.warn('UTxO does not contain expected pool NFT');
      return null;
    }
    
    return {
      poolUtxo: utxo,
      poolDatum,
      poolAddress,
      poolNftPolicy,
      poolNftName,
      tokenPolicy: poolDatum.token_policy,
      tokenName: poolDatum.token_name,
      adaReserve: poolDatum.ada_reserve,
      tokenReserve: poolDatum.token_reserve,
      totalLiquidity: poolDatum.lp_total_supply,
      feeBps: poolDatum.fee_bps,
      isActive: true,
    };
    
  } catch (error) {
    console.warn('Failed to parse pool from UTxO:', error);
    return null;
  }
}

/**
 * Validate pool datum structure
 */
function isValidPoolDatum(datum: any): datum is PoolDatum {
  return (
    datum &&
    typeof datum.pool_nft_policy === 'string' &&
    typeof datum.pool_nft_name === 'string' &&
    typeof datum.token_policy === 'string' &&
    typeof datum.token_name === 'string' &&
    typeof datum.ada_reserve === 'bigint' &&
    typeof datum.token_reserve === 'bigint' &&
    typeof datum.lp_total_supply === 'bigint' &&
    typeof datum.fee_bps === 'bigint'
  );
}

/**
 * Convert pool info to token info for frontend
 */
export function poolInfoToTokenInfo(poolInfo: PoolInfo): TokenInfo {
  const price = calculateTokenPrice(poolInfo.adaReserve, poolInfo.tokenReserve);
  
  return {
    policy: poolInfo.tokenPolicy,
    name: poolInfo.tokenName,
    symbol: poolInfo.tokenName || 'UNKNOWN',
    decimals: 6, // Default to 6 decimals
    isNative: poolInfo.tokenPolicy === '',
    poolAddress: poolInfo.poolAddress,
    adaReserve: poolInfo.adaReserve.toString(),
    tokenReserve: poolInfo.tokenReserve.toString(),
    totalLiquidity: poolInfo.totalLiquidity.toString(),
    price: price.toString(),
  };
}

/**
 * Calculate token price in ADA
 */
function calculateTokenPrice(adaReserve: bigint, tokenReserve: bigint): number {
  if (tokenReserve === 0n) return 0;
  
  // Price = ADA reserve / Token reserve
  const adaReserveNum = Number(adaReserve) / 1_000_000; // Convert from lovelace to ADA
  const tokenReserveNum = Number(tokenReserve) / 1_000_000; // Assume 6 decimals
  
  return adaReserveNum / tokenReserveNum;
}

/**
 * Find pool by token policy and name
 */
export async function findPoolByToken(
  lucid: Lucid, 
  tokenPolicy: string, 
  tokenName: string
): Promise<PoolInfo | null> {
  const pools = await discoverActivePools(lucid);
  
  return pools.find(pool => 
    pool.tokenPolicy === tokenPolicy && 
    pool.tokenName === tokenName
  ) || null;
}

/**
 * Get all available tokens from active pools
 */
export async function getAvailableTokens(lucid: Lucid): Promise<TokenInfo[]> {
  const pools = await discoverActivePools(lucid);
  
  // Convert pools to token info and add ADA
  const tokens: TokenInfo[] = pools.map(poolInfoToTokenInfo);
  
  // Add ADA as base token
  tokens.unshift({
    policy: '',
    name: '',
    symbol: 'ADA',
    decimals: 6,
    isNative: true,
    poolAddress: '',
    adaReserve: '0',
    tokenReserve: '0',
    totalLiquidity: '0',
    price: '1.0',
  });
  
  return tokens;
}
