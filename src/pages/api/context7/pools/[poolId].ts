// PuckSwap v5 - Context7 Pool Data API Endpoint
// Real-time pool data fetching from Context7 indexer
// Replaces demo mode with actual blockchain data

import { NextApiRequest, NextApiResponse } from 'next';
import { getEnvironmentConfig } from '../../../../config/env';

interface PoolData {
  adaReserve: string;
  tokenReserve: string;
  tokenPolicy: string;
  tokenName: string;
  feeBps: number;
  totalLiquidity: string;
  price: string;
  poolUtxo: {
    txHash: string;
    outputIndex: number;
    address: string;
    assets: Record<string, string>;
    datum: string;
  } | null;
}

interface Context7PoolResponse {
  success: boolean;
  data?: PoolData;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Context7PoolResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { poolId } = req.query;
    const envConfig = getEnvironmentConfig();

    if (!poolId || typeof poolId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Pool ID is required'
      });
    }

    // Fetch real pool data from Context7 API
    const context7Endpoint = envConfig.context7Endpoint;
    const apiKey = envConfig.context7ApiKey;

    if (!context7Endpoint) {
      throw new Error('Context7 endpoint not configured');
    }

    const response = await fetch(`${context7Endpoint}/pools/${poolId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
      }
    });

    if (!response.ok) {
      throw new Error(`Context7 API error: ${response.status} ${response.statusText}`);
    }

    const context7Data = await response.json();

    // Transform Context7 data to our PoolData format
    const poolData: PoolData = {
      adaReserve: context7Data.ada_reserve || '0',
      tokenReserve: context7Data.token_reserve || '0',
      tokenPolicy: context7Data.token_policy || '',
      tokenName: context7Data.token_name || poolId.split('-')[0] || 'UNKNOWN',
      feeBps: context7Data.fee_basis_points || 30,
      totalLiquidity: context7Data.total_liquidity || '0',
      price: context7Data.price || '0',
      poolUtxo: context7Data.pool_utxo ? {
        txHash: context7Data.pool_utxo.tx_hash,
        outputIndex: context7Data.pool_utxo.output_index,
        address: context7Data.pool_utxo.address,
        assets: context7Data.pool_utxo.assets || {},
        datum: context7Data.pool_utxo.datum || ''
      } : null
    };

    return res.status(200).json({
      success: true,
      data: poolData
    });

  } catch (error) {
    console.error('Pool data API error:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pool data'
    });
  }
}
