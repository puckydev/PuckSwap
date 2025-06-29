// PuckSwap v5 - Context7 Staking Data API Endpoint
// Real-time liquid staking data fetching from Context7 indexer
// Replaces demo mode with actual blockchain data

import { NextApiRequest, NextApiResponse } from 'next';
import { getEnvironmentConfig } from '../../../config/env';

interface StakingData {
  totalStaked: string;
  totalPAdaMinted: string;
  stakePoolId: string;
  lastRewardsSyncSlot: number;
  currentExchangeRate: string;
  annualPercentageYield: number;
  totalRewardsEarned: string;
  nextRewardsSyncSlot: number;
  stakingActive: boolean;
  emergencyWithdrawalsEnabled: boolean;
}

interface Context7StakingResponse {
  success: boolean;
  data?: StakingData;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Context7StakingResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const envConfig = getEnvironmentConfig();

    // Fetch real staking data from Context7 API
    const context7Endpoint = envConfig.context7Endpoint;
    const apiKey = envConfig.context7ApiKey;

    if (!context7Endpoint) {
      throw new Error('Context7 endpoint not configured');
    }

    const response = await fetch(`${context7Endpoint}/staking`, {
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

    // Transform Context7 data to our StakingData format
    const stakingData: StakingData = {
      totalStaked: context7Data.total_staked || '0',
      totalPAdaMinted: context7Data.total_pADA_minted || '0',
      stakePoolId: context7Data.stake_pool_id || '',
      lastRewardsSyncSlot: context7Data.last_rewards_sync_slot || 0,
      currentExchangeRate: context7Data.current_exchange_rate || '1.0',
      annualPercentageYield: context7Data.annual_percentage_yield || 4.5,
      totalRewardsEarned: context7Data.total_rewards_earned || '0',
      nextRewardsSyncSlot: context7Data.next_rewards_sync_slot || 0,
      stakingActive: context7Data.staking_active !== false,
      emergencyWithdrawalsEnabled: context7Data.emergency_withdrawals_enabled || false
    };

    return res.status(200).json({
      success: true,
      data: stakingData
    });

  } catch (error) {
    console.error('Staking data API error:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch staking data'
    });
  }
}
