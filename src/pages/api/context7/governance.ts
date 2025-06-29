// PuckSwap v5 - Context7 Governance Data API Endpoint
// Real-time governance data fetching from Context7 indexer
// Replaces demo mode with actual blockchain data

import { NextApiRequest, NextApiResponse } from 'next';
import { getEnvironmentConfig } from '../../../config/env';

interface Proposal {
  proposal_id: number;
  action: {
    type: 'UpdateFee' | 'TreasuryPayout';
    parameters: any;
  };
  votes_for: bigint;
  votes_against: bigint;
  executed: boolean;
  cancelled?: boolean;
  created_slot: number;
  voting_deadline_slot: number;
  execution_deadline_slot: number;
}

interface GovernanceData {
  totalProposals: number;
  activeProposals: number;
  proposals: Proposal[];
  voteRecords: any[];
  governanceTokenPolicy: string;
  governanceTokenName: string;
  treasuryAddress: string;
  votingPeriodSlots: number;
  executionDelaySlots: number;
  quorumThresholdBps: number;
  approvalThresholdBps: number;
  adminAddresses: string[];
  proposalDeposit: string;
  minVotingPower: string;
  paused: boolean;
  emergencyAdmin: string;
  lastUpdatedSlot: number;
}

interface Context7GovernanceResponse {
  success: boolean;
  data?: GovernanceData;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Context7GovernanceResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const envConfig = getEnvironmentConfig();

    // Fetch real governance data from Context7 API
    const context7Endpoint = envConfig.context7Endpoint;
    const apiKey = envConfig.context7ApiKey;

    if (!context7Endpoint) {
      throw new Error('Context7 endpoint not configured');
    }

    const response = await fetch(`${context7Endpoint}/governance`, {
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

    // Transform Context7 data to our GovernanceData format
    const governanceData: GovernanceData = {
      totalProposals: context7Data.total_proposals || 0,
      activeProposals: context7Data.active_proposals || 0,
      proposals: (context7Data.proposals || []).map((p: any) => ({
        proposal_id: p.proposal_id,
        action: {
          type: p.action?.type || 'UpdateFee',
          parameters: p.action?.parameters || {}
        },
        votes_for: BigInt(p.votes_for || 0),
        votes_against: BigInt(p.votes_against || 0),
        executed: p.executed || false,
        cancelled: p.cancelled || false,
        created_slot: p.created_slot || 0,
        voting_deadline_slot: p.voting_deadline_slot || 0,
        execution_deadline_slot: p.execution_deadline_slot || 0
      })),
      voteRecords: context7Data.vote_records || [],
      governanceTokenPolicy: context7Data.governance_token_policy || '',
      governanceTokenName: context7Data.governance_token_name || 'PUCKY_GOV',
      treasuryAddress: context7Data.treasury_address || '',
      votingPeriodSlots: context7Data.voting_period_slots || 604800,
      executionDelaySlots: context7Data.execution_delay_slots || 172800,
      quorumThresholdBps: context7Data.quorum_threshold_bps || 1000,
      approvalThresholdBps: context7Data.approval_threshold_bps || 5000,
      adminAddresses: context7Data.admin_addresses || [],
      proposalDeposit: context7Data.proposal_deposit || '100000000',
      minVotingPower: context7Data.min_voting_power || '1000000',
      paused: context7Data.paused || false,
      emergencyAdmin: context7Data.emergency_admin || '',
      lastUpdatedSlot: context7Data.last_updated_slot || 0
    };

    return res.status(200).json({
      success: true,
      data: governanceData
    });

  } catch (error) {
    console.error('Governance data API error:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch governance data'
    });
  }
}
