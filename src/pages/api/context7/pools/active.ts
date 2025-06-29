// PuckSwap v5 - Active Pools Discovery API
// Returns all pools with active liquidity for dynamic token discovery
// Replaces hardcoded pool lists with real on-chain data

import { NextApiRequest, NextApiResponse } from 'next';
// Removed complex env import to avoid syntax errors
// Using direct environment variable access instead

interface ActivePoolData {
  poolId: string;
  poolAddress: string;
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

interface ActivePoolsResponse {
  success: boolean;
  data?: {
    pools: ActivePoolData[];
    totalActivePools: number;
    lastUpdated: string;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ActivePoolsResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { minLiquidity = '1000000' } = req.query; // Default 1 ADA minimum liquidity

    // Discover active pools using real blockchain data
    const activePools = await discoverActivePools(
      BigInt(minLiquidity as string)
    );

    return res.status(200).json({
      success: true,
      data: {
        pools: activePools,
        totalActivePools: activePools.length,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Active pools API error:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to discover active pools'
    });
  }
}

async function discoverActivePools(
  minLiquidity: bigint
): Promise<ActivePoolData[]> {
  try {
    console.log('🔍 Starting real pool discovery on Cardano preprod...');

    // Load deployed contract addresses
    const fs = require('fs');
    const path = require('path');
    const deploymentPath = path.join(process.cwd(), 'deployment', 'addresses.json');

    let contractAddresses = null;
    try {
      const addressesData = fs.readFileSync(deploymentPath, 'utf8');
      contractAddresses = JSON.parse(addressesData);
      console.log(`📋 Loaded contract addresses for ${contractAddresses.network} network`);
    } catch (error) {
      console.error('❌ Failed to load contract addresses:', error);
      return [];
    }

    // Get environment configuration
    const network = process.env.NETWORK || 'preprod';
    const blockfrostKey = process.env.BLOCKFROST_API_KEY_PREPROD;
    const swapValidatorAddress = contractAddresses.validators.swap;

    console.log(`📡 Network: ${network}`);
    console.log(`📍 Swap validator: ${swapValidatorAddress}`);
    console.log(`💰 Min liquidity: ${minLiquidity} lovelace`);

    if (!blockfrostKey) {
      console.error('❌ Missing Blockfrost API key');
      return [];
    }

    // Import Lucid Evolution and create instance
    const { Lucid, Blockfrost, Data, Constr, fromText, toText } = await import('@lucid-evolution/lucid');

    const lucid = await Lucid(
      new Blockfrost(
        `https://cardano-${network}.blockfrost.io/api/v0`,
        blockfrostKey
      ),
      network === 'mainnet' ? 'Mainnet' : 'Preprod'
    );

    console.log('🔗 Lucid Evolution instance created successfully');

    // Query UTxOs at swap validator address
    console.log(`🔍 Querying UTxOs at swap validator: ${swapValidatorAddress}`);
    const utxos = await lucid.utxosAt(swapValidatorAddress);
    console.log(`📦 Found ${utxos.length} UTxOs at swap validator`);

    const activePools: ActivePoolData[] = [];

    for (const utxo of utxos) {
      try {
        // Skip UTxOs without datum
        if (!utxo.datum) {
          console.log(`⚠️ Skipping UTxO ${utxo.txHash}#${utxo.outputIndex} - no datum`);
          continue;
        }

        // Parse pool datum from UTxO
        const poolDatum = parsePoolDatum(utxo.datum);
        if (!poolDatum) {
          console.log(`⚠️ Skipping UTxO ${utxo.txHash}#${utxo.outputIndex} - invalid datum`);
          continue;
        }

        // Check minimum liquidity requirement
        if (poolDatum.ada_reserve < minLiquidity) {
          console.log(`⚠️ Pool ${poolDatum.token_name} below minimum liquidity: ${poolDatum.ada_reserve}`);
          continue;
        }

        // Check that pool has both ADA and token reserves
        if (poolDatum.ada_reserve <= 0n || poolDatum.token_reserve <= 0n) {
          console.log(`⚠️ Pool ${poolDatum.token_name} has zero reserves`);
          continue;
        }

        // Create active pool entry
        const activePool = createActivePoolData(utxo, poolDatum, swapValidatorAddress);
        activePools.push(activePool);

        console.log(`✅ Discovered active pool: ${activePool.tokenSymbol} (${activePool.adaReserve} ADA, ${activePool.tokenReserve} tokens)`);

      } catch (error) {
        console.warn(`⚠️ Failed to parse UTxO ${utxo.txHash}#${utxo.outputIndex}:`, error);
        continue;
      }
    }

    console.log(`🎯 Successfully discovered ${activePools.length} active pools`);
    return activePools;

  } catch (error) {
    console.error('❌ Error discovering active pools:', error);
    return [];
  }
}

// Pool datum structure matching Aiken smart contract
interface PoolDatum {
  pool_nft_policy: string;
  pool_nft_name: string;
  token_policy: string;
  token_name: string;
  ada_reserve: bigint;
  token_reserve: bigint;
  lp_total_supply: bigint;
  fee_bps: number;
}

/**
 * Parse PoolDatum from UTxO datum using Aiken structure
 */
function parsePoolDatum(datum: string): PoolDatum | null {
  try {
    const { Data, Constr, fromText, toText } = require('@lucid-evolution/lucid');

    // Parse the datum as CBOR
    const parsedDatum = Data.from(datum);

    // Expected structure: Constr with 8 fields
    if (!(parsedDatum instanceof Constr) || parsedDatum.index !== 0 || parsedDatum.fields.length !== 8) {
      console.warn('Invalid pool datum structure');
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
    ] = parsedDatum.fields;

    return {
      pool_nft_policy: typeof pool_nft_policy === 'string' ? pool_nft_policy : '',
      pool_nft_name: typeof pool_nft_name === 'string' ? toText(pool_nft_name) : '',
      token_policy: typeof token_policy === 'string' ? token_policy : '',
      token_name: typeof token_name === 'string' ? toText(token_name) : '',
      ada_reserve: typeof ada_reserve === 'bigint' ? ada_reserve : BigInt(ada_reserve || 0),
      token_reserve: typeof token_reserve === 'bigint' ? token_reserve : BigInt(token_reserve || 0),
      lp_total_supply: typeof lp_total_supply === 'bigint' ? lp_total_supply : BigInt(lp_total_supply || 0),
      fee_bps: typeof fee_bps === 'number' ? fee_bps : Number(fee_bps || 30)
    };

  } catch (error) {
    console.warn('Failed to parse pool datum:', error);
    return null;
  }
}

/**
 * Create ActivePoolData from UTxO and parsed datum
 */
function createActivePoolData(utxo: any, datum: PoolDatum, poolAddress: string): ActivePoolData {
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
    poolAddress,
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
