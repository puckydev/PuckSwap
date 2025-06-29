import { Address } from "lucid-evolution";

// CIP-68 Standard Types
// Reference: https://github.com/cardano-foundation/CIPs/tree/master/CIP-0068

// CIP-68 Metadata Map (key-value pairs)
export interface CIP68Metadata {
  [key: string]: any;
}

// CIP-68 Version for compatibility tracking
export type CIP68Version = number;

// CIP-68 Extra field for extensibility
export type CIP68Extra = any;

// Base CIP-68 Datum Structure
export interface CIP68Datum {
  metadata: CIP68Metadata;
  version: CIP68Version;
  extra: CIP68Extra;
}

// Pool-specific CIP-68 Datum
export interface PoolCIP68Datum extends CIP68Datum {
  pool_state: PoolState;
  pool_config: PoolConfig;
  pool_stats: PoolStats;
}

// Core pool state data
export interface PoolState {
  ada_reserve: bigint;
  token_reserve: bigint;
  total_lp_supply: bigint;
  last_interaction_slot: number;
  pool_nft_name: string;
}

// Pool configuration parameters
export interface PoolConfig {
  token_policy: string;
  token_name: string;
  lp_token_policy: string;
  lp_token_name: string;
  fee_bps: number;
  protocol_fee_bps: number;
  creator: Address;
  admin: Address;
  is_paused: boolean;
}

// Pool statistics and analytics
export interface PoolStats {
  total_volume_ada: bigint;
  total_volume_token: bigint;
  total_fees_collected: bigint;
  swap_count: number;
  liquidity_providers_count: number;
  created_at_slot: number;
  last_price_ada_per_token: number; // Scaled by 1e6
  price_history_hash: string; // Hash of recent price data
}

// LP Token CIP-68 Datum
export interface LPTokenCIP68Datum extends CIP68Datum {
  lp_data: LPTokenData;
}

// LP Token specific data
export interface LPTokenData {
  pool_nft_name: string;
  pool_policy: string;
  token_policy: string;
  token_name: string;
  lp_amount: bigint;
  share_percentage: number; // Scaled by 1e6 (1000000 = 100%)
  created_at_slot: number;
  last_claim_slot: number;
}

// Swap Order CIP-68 Datum (for order book style swaps)
export interface SwapOrderCIP68Datum extends CIP68Datum {
  order_data: SwapOrderData;
}

// Swap order data
export interface SwapOrderData {
  user: Address;
  input_policy: string;
  input_name: string;
  input_amount: bigint;
  output_policy: string;
  output_name: string;
  min_output: bigint;
  deadline_slot: number;
  order_type: OrderType;
  partial_fill_allowed: boolean;
  filled_amount: bigint;
}

// Order types
export type OrderType = 
  | { type: 'Market' }
  | { type: 'Limit'; price: number }
  | { type: 'StopLoss'; trigger_price: number };

// CIP-68 Metadata Keys (standardized)
export const CIP68_METADATA_KEYS = {
  NAME: 'name',
  DESCRIPTION: 'description',
  IMAGE: 'image',
  DECIMALS: 'decimals',
  TICKER: 'ticker',
  URL: 'url',
  LOGO: 'logo',
  POOL_TYPE: 'pool_type',
  CREATED_BY: 'created_by',
  VERSION: 'version',
  POOL_FEE: 'pool_fee',
  TOTAL_LIQUIDITY: 'total_liquidity',
  PRICE_ORACLE: 'price_oracle',
  AUDIT_REPORT: 'audit_report'
} as const;

// Enhanced swap result with CIP-68 data
export interface CIP68SwapResult {
  is_ada_to_token: boolean;
  input_amount: bigint;
  output_amount: bigint;
  fee_amount: bigint;
  protocol_fee_amount: bigint;
  output_policy: string;
  output_name: string;
  new_ada_reserve: bigint;
  new_token_reserve: bigint;
  new_price: number;
  swap_slot: number;
}

// Fee calculation result
export interface FeeCalculationResult {
  user_amount: bigint;
  fee_amount: bigint;
  protocol_fee_amount: bigint;
}

// CIP-68 Datum Parser and Builder
export class CIP68DatumBuilder {
  
  // Create base CIP-68 metadata for pools
  static createPoolMetadata(
    name: string,
    description: string,
    poolType: string,
    feeBps: number
  ): CIP68Metadata {
    return {
      [CIP68_METADATA_KEYS.NAME]: name,
      [CIP68_METADATA_KEYS.DESCRIPTION]: description,
      [CIP68_METADATA_KEYS.POOL_TYPE]: poolType,
      [CIP68_METADATA_KEYS.POOL_FEE]: feeBps,
      [CIP68_METADATA_KEYS.VERSION]: 1
    };
  }

  // Create LP token metadata
  static createLPTokenMetadata(
    poolName: string,
    tokenASymbol: string,
    tokenBSymbol: string,
    decimals: number
  ): CIP68Metadata {
    const lpName = `${tokenASymbol}-${tokenBSymbol} LP`;
    const lpDescription = `Liquidity Provider token for ${tokenASymbol}/${tokenBSymbol}`;
    
    return {
      [CIP68_METADATA_KEYS.NAME]: lpName,
      [CIP68_METADATA_KEYS.DESCRIPTION]: lpDescription,
      [CIP68_METADATA_KEYS.DECIMALS]: decimals,
      [CIP68_METADATA_KEYS.TICKER]: lpName
    };
  }

  // Build complete pool CIP-68 datum
  static buildPoolDatum(
    poolState: PoolState,
    poolConfig: PoolConfig,
    poolStats: PoolStats,
    metadata?: CIP68Metadata,
    version: number = 1,
    extra: any = null
  ): PoolCIP68Datum {
    const defaultMetadata = this.createPoolMetadata(
      `${poolConfig.token_name}/ADA Pool`,
      `AMM liquidity pool for ${poolConfig.token_name} and ADA`,
      'AMM',
      poolConfig.fee_bps
    );

    return {
      metadata: metadata || defaultMetadata,
      version,
      extra,
      pool_state: poolState,
      pool_config: poolConfig,
      pool_stats: poolStats
    };
  }

  // Build LP token CIP-68 datum
  static buildLPTokenDatum(
    lpData: LPTokenData,
    metadata?: CIP68Metadata,
    version: number = 1,
    extra: any = null
  ): LPTokenCIP68Datum {
    const defaultMetadata = this.createLPTokenMetadata(
      `${lpData.token_name}/ADA`,
      lpData.token_name,
      'ADA',
      6
    );

    return {
      metadata: metadata || defaultMetadata,
      version,
      extra,
      lp_data: lpData
    };
  }

  // Validate CIP-68 datum structure
  static validateCIP68Structure(datum: CIP68Datum): boolean {
    return (
      datum.version > 0 &&
      typeof datum.metadata === 'object' &&
      datum.metadata[CIP68_METADATA_KEYS.NAME] !== undefined
    );
  }

  // Get metadata value safely
  static getMetadataValue<T>(metadata: CIP68Metadata, key: string): T | undefined {
    return metadata[key] as T;
  }

  // Update pool statistics
  static updatePoolStats(
    currentStats: PoolStats,
    swapAdaAmount: bigint,
    swapTokenAmount: bigint,
    feeCollected: bigint,
    newPrice: number,
    currentSlot: number
  ): PoolStats {
    return {
      ...currentStats,
      total_volume_ada: currentStats.total_volume_ada + swapAdaAmount,
      total_volume_token: currentStats.total_volume_token + swapTokenAmount,
      total_fees_collected: currentStats.total_fees_collected + feeCollected,
      swap_count: currentStats.swap_count + 1,
      last_price_ada_per_token: newPrice,
      // price_history_hash would be updated with new price data
    };
  }

  // Calculate LP token share percentage
  static calculateLPSharePercentage(lpAmount: bigint, totalLPSupply: bigint): number {
    if (totalLPSupply === 0n) {
      return 0;
    }
    // Return percentage scaled by 1e6 (1000000 = 100%)
    return Number(lpAmount * 1_000_000n / totalLPSupply);
  }

  // Validate datum version compatibility
  static isCompatibleVersion(datumVersion: number, requiredVersion: number): boolean {
    return datumVersion >= requiredVersion;
  }

  // Extract pool state from CIP-68 datum
  static extractPoolState(datum: PoolCIP68Datum): PoolState {
    return datum.pool_state;
  }

  // Extract pool config from CIP-68 datum
  static extractPoolConfig(datum: PoolCIP68Datum): PoolConfig {
    return datum.pool_config;
  }

  // Extract pool stats from CIP-68 datum
  static extractPoolStats(datum: PoolCIP68Datum): PoolStats {
    return datum.pool_stats;
  }

  // Create updated pool datum (overloaded for different use cases)
  static createUpdatedPoolDatum(
    originalDatum: PoolCIP68Datum,
    updatesOrSwapResult: CIP68SwapResult | Partial<{
      pool_state: Partial<PoolState>;
      pool_config: Partial<PoolConfig>;
      pool_stats: Partial<PoolStats>;
    }>
  ): PoolCIP68Datum {
    // Check if it's a swap result (has specific swap properties)
    if ('new_ada_reserve' in updatesOrSwapResult && 'new_token_reserve' in updatesOrSwapResult) {
      const swapResult = updatesOrSwapResult as CIP68SwapResult;
      const updatedState: PoolState = {
        ...originalDatum.pool_state,
        ada_reserve: swapResult.new_ada_reserve,
        token_reserve: swapResult.new_token_reserve,
        last_interaction_slot: swapResult.swap_slot
      };

      const updatedStats = this.updatePoolStats(
        originalDatum.pool_stats,
        swapResult.is_ada_to_token ? swapResult.input_amount : 0n,
        swapResult.is_ada_to_token ? 0n : swapResult.input_amount,
        swapResult.fee_amount,
        swapResult.new_price,
        swapResult.swap_slot
      );

      return {
        ...originalDatum,
        pool_state: updatedState,
        pool_stats: updatedStats
      };
    } else {
      // Handle partial updates
      const updates = updatesOrSwapResult as Partial<{
        pool_state: Partial<PoolState>;
        pool_config: Partial<PoolConfig>;
        pool_stats: Partial<PoolStats>;
      }>;

      return {
        ...originalDatum,
        pool_state: updates.pool_state ? { ...originalDatum.pool_state, ...updates.pool_state } : originalDatum.pool_state,
        pool_config: updates.pool_config ? { ...originalDatum.pool_config, ...updates.pool_config } : originalDatum.pool_config,
        pool_stats: updates.pool_stats ? { ...originalDatum.pool_stats, ...updates.pool_stats } : originalDatum.pool_stats
      };
    }
  }

  // Create updated staking datum
  static createUpdatedStakingDatum(
    originalDatum: any,
    updates: Partial<{
      staking_config: any;
      staking_state: any;
    }>
  ): any {
    return {
      ...originalDatum,
      staking_config: updates.staking_config ? { ...originalDatum.staking_config, ...updates.staking_config } : originalDatum.staking_config,
      staking_state: updates.staking_state ? { ...originalDatum.staking_state, ...updates.staking_state } : originalDatum.staking_state
    };
  }

  // Create updated governance datum
  static createUpdatedGovernanceDatum(
    originalDatum: any,
    updates: Partial<{
      proposals: any[];
      voteRecords: any[];
      totalProposals: number;
      activeProposals: number;
      lastUpdatedSlot: number;
    }>
  ): any {
    return {
      ...originalDatum,
      proposals: updates.proposals !== undefined ? updates.proposals : originalDatum.proposals,
      voteRecords: updates.voteRecords !== undefined ? updates.voteRecords : originalDatum.voteRecords,
      totalProposals: updates.totalProposals !== undefined ? updates.totalProposals : originalDatum.totalProposals,
      activeProposals: updates.activeProposals !== undefined ? updates.activeProposals : originalDatum.activeProposals,
      lastUpdatedSlot: updates.lastUpdatedSlot !== undefined ? updates.lastUpdatedSlot : originalDatum.lastUpdatedSlot
    };
  }

  // Create updated router datum
  static createUpdatedRouterDatum(
    originalDatum: any,
    updates: Partial<{
      router_config: any;
      router_state: any;
    }>
  ): any {
    return {
      ...originalDatum,
      router_config: updates.router_config ? { ...originalDatum.router_config, ...updates.router_config } : originalDatum.router_config,
      router_state: updates.router_state ? { ...originalDatum.router_state, ...updates.router_state } : originalDatum.router_state
    };
  }
}
