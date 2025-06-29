// PuckSwap v5 - Real Pool Discovery Utility
// Lucid Evolution integration for discovering active pools on Cardano preprod
// Replaces all mock/demo functionality with actual blockchain queries

import {
  Lucid,
  UTxO,
  Address,
  PolicyId,
  Data,
  Constr,
  fromText,
  toText
} from "@lucid-evolution/lucid";
import { createLucidInstance } from "../../lib/lucid-config";
import { getEnvironmentConfig } from "../../config/env";
import { loadContractAddresses } from "./contractAddresses";

// Real PoolDatum structure matching Aiken contracts
export interface PoolDatum {
  pool_nft_policy: string;
  pool_nft_name: string;
  token_policy: string;
  token_name: string;
  ada_reserve: bigint;
  token_reserve: bigint;
  lp_total_supply: bigint;
  fee_bps: number;
}

// Discovered pool information
export interface DiscoveredPool {
  poolId: string;
  poolAddress: string;
  utxo: UTxO;
  datum: PoolDatum;
  tokenPolicy: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  adaReserve: string;
  tokenReserve: string;
  totalLiquidity: string;
  price: string;
  feeBps: number;
  isActive: boolean;
  lastUpdated: string;
}

/**
 * Real Pool Discovery Service
 * Queries actual Cardano preprod blockchain for active pools
 */
export class PoolDiscoveryService {
  private lucid: Lucid;
  private swapValidatorAddress: Address;
  private liquidityProvisionAddress: Address;

  constructor(lucid: Lucid, contractAddresses: any) {
    this.lucid = lucid;
    this.swapValidatorAddress = contractAddresses.validators.swap;
    this.liquidityProvisionAddress = contractAddresses.validators.liquidityProvision;
  }

  /**
   * Create pool discovery service instance
   */
  static async create(): Promise<PoolDiscoveryService> {
    const envConfig = getEnvironmentConfig();
    const lucid = await createLucidInstance();
    const contractAddresses = loadContractAddresses(envConfig.network);

    return new PoolDiscoveryService(lucid, contractAddresses);
  }

  /**
   * Discover all active pools on the blockchain
   */
  async discoverActivePools(minLiquidity: bigint = 1000000n): Promise<DiscoveredPool[]> {
    console.log('🔍 Discovering active pools on Cardano preprod...');
    console.log(`📍 Swap validator address: ${this.swapValidatorAddress}`);
    console.log(`💰 Minimum liquidity: ${minLiquidity} lovelace`);

    try {
      // Query UTxOs at the swap validator address
      const utxos = await this.lucid.utxosAt(this.swapValidatorAddress);
      console.log(`📦 Found ${utxos.length} UTxOs at swap validator address`);

      const discoveredPools: DiscoveredPool[] = [];

      for (const utxo of utxos) {
        try {
          // Parse pool datum from UTxO
          const poolDatum = await this.parsePoolDatum(utxo);
          if (!poolDatum) {
            continue; // Skip UTxOs without valid pool datum
          }

          // Check minimum liquidity requirement
          if (poolDatum.ada_reserve < minLiquidity) {
            console.log(`⚠️ Pool ${poolDatum.token_name} below minimum liquidity: ${poolDatum.ada_reserve}`);
            continue;
          }

          // Create discovered pool entry
          const discoveredPool = await this.createDiscoveredPool(utxo, poolDatum);
          discoveredPools.push(discoveredPool);

          console.log(`✅ Discovered active pool: ${discoveredPool.tokenSymbol} (${discoveredPool.adaReserve} ADA reserve)`);

        } catch (error) {
          console.warn(`⚠️ Failed to parse UTxO ${utxo.txHash}#${utxo.outputIndex}:`, error);
          continue;
        }
      }

      console.log(`🎯 Successfully discovered ${discoveredPools.length} active pools`);
      return discoveredPools;

    } catch (error) {
      console.error('❌ Error discovering active pools:', error);
      throw new Error(`Pool discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse PoolDatum from UTxO using exact Aiken structure
   */
  private async parsePoolDatum(utxo: UTxO): Promise<PoolDatum | null> {
    if (!utxo.datum) {
      return null;
    }

    try {
      // Handle both inline and hash datum
      let datumData: any;
      if (typeof utxo.datum === 'string') {
        datumData = Data.from(utxo.datum);
      } else {
        datumData = utxo.datum;
      }

      // Parse Constr data matching Aiken PoolDatum structure
      if (!(datumData instanceof Constr) || datumData.fields.length !== 8) {
        return null;
      }

      const [
        pool_nft_policy,
        pool_nft_name,
        token_policy,
        token_name,
        ada_reserve,
        token_reserve,
        lp_total_supply,
        fee_bps
      ] = datumData.fields;

      return {
        pool_nft_policy: toText(pool_nft_policy as string),
        pool_nft_name: toText(pool_nft_name as string),
        token_policy: toText(token_policy as string),
        token_name: toText(token_name as string),
        ada_reserve: ada_reserve as bigint,
        token_reserve: token_reserve as bigint,
        lp_total_supply: lp_total_supply as bigint,
        fee_bps: Number(fee_bps)
      };

    } catch (error) {
      console.warn('Failed to parse pool datum:', error);
      return null;
    }
  }

  /**
   * Create discovered pool entry from UTxO and parsed datum
   */
  private async createDiscoveredPool(utxo: UTxO, datum: PoolDatum): Promise<DiscoveredPool> {
    // Calculate total liquidity (ADA + token reserves in ADA terms)
    const adaReserveNum = Number(datum.ada_reserve);
    const tokenReserveNum = Number(datum.token_reserve);
    const price = tokenReserveNum > 0 ? adaReserveNum / tokenReserveNum : 0;
    const totalLiquidity = adaReserveNum * 2; // Simplified calculation

    // Generate pool ID from token policy and name
    const poolId = `${datum.token_policy}-${datum.token_name}`.toLowerCase();

    // Extract token symbol (use token name as symbol for now)
    const tokenSymbol = datum.token_name || 'UNKNOWN';

    return {
      poolId,
      poolAddress: this.swapValidatorAddress,
      utxo,
      datum,
      tokenPolicy: datum.token_policy,
      tokenName: datum.token_name,
      tokenSymbol,
      tokenDecimals: 6, // Default to 6 decimals for Cardano native tokens
      adaReserve: datum.ada_reserve.toString(),
      tokenReserve: datum.token_reserve.toString(),
      totalLiquidity: totalLiquidity.toString(),
      price: price.toString(),
      feeBps: datum.fee_bps,
      isActive: true,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get available tokens from discovered pools
   */
  async getAvailableTokens(minLiquidity: bigint = 1000000n): Promise<{
    policy: string;
    name: string;
    symbol: string;
    decimals: number;
    icon?: string;
    isNative?: boolean;
    poolAddress: string;
    adaReserve: string;
    tokenReserve: string;
    totalLiquidity: string;
    price: string;
  }[]> {
    const pools = await this.discoverActivePools(minLiquidity);

    return pools.map(pool => ({
      policy: pool.tokenPolicy,
      name: pool.tokenName,
      symbol: pool.tokenSymbol,
      decimals: pool.tokenDecimals,
      icon: `/icons/${pool.tokenSymbol.toLowerCase()}.svg`,
      isNative: false,
      poolAddress: pool.poolAddress,
      adaReserve: pool.adaReserve,
      tokenReserve: pool.tokenReserve,
      totalLiquidity: pool.totalLiquidity,
      price: pool.price
    }));
  }

  /**
   * Find specific pool by token policy and name
   */
  async findPoolByToken(tokenPolicy: string, tokenName: string): Promise<DiscoveredPool | null> {
    const pools = await this.discoverActivePools();
    return pools.find(pool => 
      pool.tokenPolicy === tokenPolicy && pool.tokenName === tokenName
    ) || null;
  }
}

/**
 * Convenience function to discover active pools
 */
export async function discoverActivePools(minLiquidity: bigint = 1000000n): Promise<DiscoveredPool[]> {
  const service = await PoolDiscoveryService.create();
  return service.discoverActivePools(minLiquidity);
}

/**
 * Convenience function to get available tokens
 */
export async function getAvailableTokensFromPools(minLiquidity: bigint = 1000000n) {
  const service = await PoolDiscoveryService.create();
  return service.getAvailableTokens(minLiquidity);
}
