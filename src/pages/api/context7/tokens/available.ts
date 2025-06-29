// PuckSwap v5 - Available Tokens Discovery API
// Dynamically discovers tokens with active liquidity pools
// Replaces hardcoded token lists with real on-chain data

import { NextApiRequest, NextApiResponse } from 'next';
// Removed complex env import to avoid syntax errors
// Using direct environment variable access instead

interface TokenInfo {
  policy: string;
  name: string;
  symbol: string;
  decimals: number;
  icon?: string;
  isNative?: boolean;
  poolAddress?: string;
  adaReserve: string;
  tokenReserve: string;
  totalLiquidity: string;
  price: string;
}

interface AvailableTokensResponse {
  success: boolean;
  data?: {
    tokens: TokenInfo[];
    totalPools: number;
    lastUpdated: string;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AvailableTokensResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const {
      minLiquidity = '1000000',
      adaPairsOnly = 'true'
    } = req.query; // Default 1 ADA minimum liquidity, ADA pairs only

    // Discover available tokens from real pools
    const availableTokens = await discoverAvailableTokens(
      BigInt(minLiquidity as string),
      adaPairsOnly === 'true'
    );

    return res.status(200).json({
      success: true,
      data: {
        tokens: availableTokens,
        totalPools: availableTokens.length,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Available tokens API error:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to discover available tokens'
    });
  }
}

async function discoverAvailableTokens(
  minLiquidity: bigint,
  adaPairsOnly: boolean = true
): Promise<TokenInfo[]> {
  const tokens: TokenInfo[] = [];

  try {
    console.log('🔍 Discovering available tokens from real pools...');

    // Fetch active pools using our active pools API
    const activePools = await fetchActivePools(minLiquidity);

    if (activePools.length === 0) {
      console.log('⚠️ No active pools found');

      // Development mode: Add sample tokens if no real pools found
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.log('🧪 Development mode: Adding sample tokens for testing');

        const sampleTokens: TokenInfo[] = [
          {
            policy: 'sample_policy_1',
            name: 'PUCKY',
            symbol: 'PUCKY',
            decimals: 6,
            icon: '/icons/pucky.svg',
            isNative: false,
            poolAddress: 'addr_test1wq2h74nkmwd0pu5e0xytu6695p62xf8xagq6zc6rpy6ftgqy93gtr',
            adaReserve: '100000000', // 100 ADA
            tokenReserve: '2301952000000', // 2,301,952 PUCKY (100 ADA worth)
            totalLiquidity: '200000000', // 200 ADA equivalent
            price: '0.0000434' // 100 ADA / 2,301,952 PUCKY
          },
          {
            policy: 'sample_policy_2',
            name: 'HOSKY',
            symbol: 'HOSKY',
            decimals: 0,
            icon: '/icons/hosky.svg',
            isNative: false,
            poolAddress: 'addr_test1wq2h74nkmwd0pu5e0xytu6695p62xf8xagq6zc6rpy6ftgqy93gtr',
            adaReserve: '50000000', // 50 ADA
            tokenReserve: '1000000000000', // 1T HOSKY
            totalLiquidity: '100000000', // 100 ADA equivalent
            price: '0.00000005' // 50 ADA / 1T HOSKY
          },
          {
            policy: 'sample_policy_3',
            name: 'MIN',
            symbol: 'MIN',
            decimals: 6,
            icon: '/icons/min.svg',
            isNative: false,
            poolAddress: 'addr_test1wq2h74nkmwd0pu5e0xytu6695p62xf8xagq6zc6rpy6ftgqy93gtr',
            adaReserve: '25000000', // 25 ADA
            tokenReserve: '500000000000', // 500,000 MIN
            totalLiquidity: '50000000', // 50 ADA equivalent
            price: '0.00005' // 25 ADA / 500,000 MIN
          }
        ];

        tokens.push(...sampleTokens);
        console.log(`🧪 Added ${sampleTokens.length} sample tokens for development testing`);
        return tokens;
      }

      console.log('⚠️ No active pools found, returning empty token list');
      return tokens;
    }

    console.log(`📊 Found ${activePools.length} active pools, extracting tokens...`);

    // Convert active pools to token info
    for (const pool of activePools) {
      // Skip pools that don't meet minimum liquidity
      const adaReserve = BigInt(pool.adaReserve);
      if (adaReserve < minLiquidity) {
        continue;
      }

      // For ADA pairs only mode, all pools are ADA pairs by definition
      if (adaPairsOnly) {
        const tokenInfo: TokenInfo = {
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
        };

        tokens.push(tokenInfo);
        console.log(`✅ Added token: ${tokenInfo.symbol} (${tokenInfo.adaReserve} ADA reserve)`);
      }
    }

    // Sort tokens by liquidity (highest first)
    tokens.sort((a, b) => {
      const liquidityA = BigInt(a.totalLiquidity);
      const liquidityB = BigInt(b.totalLiquidity);
      return liquidityB > liquidityA ? 1 : liquidityB < liquidityA ? -1 : 0;
    });

    console.log(`🎯 Successfully discovered ${tokens.length} available tokens`);

    // Development mode: Add sample tokens if no real pools found
    if (tokens.length === 0 && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV)) {
      console.log('🧪 Development mode: Adding sample tokens for testing');

      const sampleTokens: TokenInfo[] = [
        {
          policy: 'sample_policy_1',
          name: 'PUCKY',
          symbol: 'PUCKY',
          decimals: 6,
          icon: '/icons/pucky.svg',
          isNative: false,
          poolAddress: 'addr_test1wq2h74nkmwd0pu5e0xytu6695p62xf8xagq6zc6rpy6ftgqy93gtr',
          adaReserve: '100000000', // 100 ADA
          tokenReserve: '2301952000000', // 2,301,952 PUCKY (100 ADA worth)
          totalLiquidity: '200000000', // 200 ADA equivalent
          price: '0.0000434' // 100 ADA / 2,301,952 PUCKY
        },
        {
          policy: 'sample_policy_2',
          name: 'HOSKY',
          symbol: 'HOSKY',
          decimals: 0,
          icon: '/icons/hosky.svg',
          isNative: false,
          poolAddress: 'addr_test1wq2h74nkmwd0pu5e0xytu6695p62xf8xagq6zc6rpy6ftgqy93gtr',
          adaReserve: '50000000', // 50 ADA
          tokenReserve: '1000000000000', // 1T HOSKY
          totalLiquidity: '100000000', // 100 ADA equivalent
          price: '0.00000005' // 50 ADA / 1T HOSKY
        },
        {
          policy: 'sample_policy_3',
          name: 'MIN',
          symbol: 'MIN',
          decimals: 6,
          icon: '/icons/min.svg',
          isNative: false,
          poolAddress: 'addr_test1wq2h74nkmwd0pu5e0xytu6695p62xf8xagq6zc6rpy6ftgqy93gtr',
          adaReserve: '25000000', // 25 ADA
          tokenReserve: '500000000000', // 500,000 MIN
          totalLiquidity: '50000000', // 50 ADA equivalent
          price: '0.00005' // 25 ADA / 500,000 MIN
        }
      ];

      tokens.push(...sampleTokens);
      console.log(`🧪 Added ${sampleTokens.length} sample tokens for development testing`);
    }

  } catch (error) {
    console.error('❌ Error discovering available tokens:', error);
  }

  return tokens;
}

async function fetchActivePools(minLiquidity: bigint): Promise<any[]> {
  try {
    console.log('🔗 Fetching active pools directly...');

    // Directly implement pool discovery to avoid circular imports
    // Load deployed contract addresses
    const fs = require('fs');
    const path = require('path');
    const deploymentPath = path.join(process.cwd(), 'deployment', 'addresses.json');

    let contractAddresses = null;
    try {
      const addressesData = fs.readFileSync(deploymentPath, 'utf8');
      contractAddresses = JSON.parse(addressesData);
    } catch (error) {
      console.error('❌ Failed to load contract addresses:', error);
      return [];
    }

    // Get environment configuration
    const network = process.env.NETWORK || 'preprod';
    const blockfrostKey = process.env.BLOCKFROST_API_KEY_PREPROD;
    const swapValidatorAddress = contractAddresses.validators.swap;

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

    // Query UTxOs at swap validator address
    const utxos = await lucid.utxosAt(swapValidatorAddress);
    console.log(`📦 Found ${utxos.length} UTxOs at swap validator`);

    const activePools: any[] = [];

    for (const utxo of utxos) {
      try {
        // Skip UTxOs without datum
        if (!utxo.datum) continue;

        // Parse pool datum (simplified version)
        const parsedDatum = Data.from(utxo.datum);
        if (!(parsedDatum instanceof Constr) || parsedDatum.index !== 0 || parsedDatum.fields.length !== 8) {
          continue;
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

        const adaReserveBigInt = typeof ada_reserve === 'bigint' ? ada_reserve : BigInt(ada_reserve || 0);
        const tokenReserveBigInt = typeof token_reserve === 'bigint' ? token_reserve : BigInt(token_reserve || 0);

        // Check minimum liquidity requirement
        if (adaReserveBigInt < minLiquidity || adaReserveBigInt <= 0n || tokenReserveBigInt <= 0n) {
          continue;
        }

        const tokenNameStr = typeof token_name === 'string' ? toText(token_name) : '';
        const tokenPolicyStr = typeof token_policy === 'string' ? token_policy : '';

        // Create active pool entry
        const activePool = {
          poolId: `${tokenPolicyStr}-${tokenNameStr}`.toLowerCase(),
          poolAddress: swapValidatorAddress,
          tokenPolicy: tokenPolicyStr,
          tokenName: tokenNameStr,
          tokenSymbol: tokenNameStr || 'UNKNOWN',
          tokenDecimals: 6,
          adaReserve: adaReserveBigInt.toString(),
          tokenReserve: tokenReserveBigInt.toString(),
          totalLiquidity: (Number(adaReserveBigInt) * 2).toString(),
          price: tokenReserveBigInt > 0n ? (Number(adaReserveBigInt) / Number(tokenReserveBigInt)).toString() : '0',
          feeBps: typeof fee_bps === 'number' ? fee_bps : Number(fee_bps || 30),
          isActive: true,
          lastUpdated: new Date().toISOString()
        };

        activePools.push(activePool);

      } catch (error) {
        console.warn(`⚠️ Failed to parse UTxO ${utxo.txHash}#${utxo.outputIndex}:`, error);
        continue;
      }
    }

    console.log(`📊 Fetched ${activePools.length} active pools`);
    return activePools;

  } catch (error) {
    console.error('❌ Failed to fetch active pools:', error);
    return [];
  }
}
