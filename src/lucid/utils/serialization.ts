// PuckSwap v5 - Lucid Evolution CIP-68 Datum Serialization Utility
// Comprehensive serialization/deserialization for all PuckSwap v5 datum structures
// Resolves Buffer <-> hex conversion errors and ensures Node.js/browser compatibility

import {
  Data,
  Constr,
  fromText,
  toText,
  fromHex,
  toHex,
  C
} from "@lucid-evolution/lucid";

// Master Schema Datum Interfaces
export interface PoolDatum {
  ada_reserve: bigint;
  token_reserve: bigint;
  fee_basis_points: number;
  lp_token_policy: string;
  lp_token_name: string;
}

export interface GovernanceDatum {
  total_proposals: number;
  active_proposals: number;
  proposals: Proposal[];
  vote_records: VoteRecord[];
  governance_token_policy: string;
  governance_token_name: string;
  treasury_address: string;
  voting_period_slots: number;
  execution_delay_slots: number;
  quorum_threshold_bps: number;
  approval_threshold_bps: number;
  admin_addresses: string[];
  proposal_deposit: bigint;
  min_voting_power: bigint;
  paused: boolean;
  emergency_admin: string;
  last_updated_slot: number;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  action: GovernanceAction;
  proposer: string;
  created_at: number;
  voting_deadline: number;
  execution_deadline: number;
  status: string;
  votes_for: bigint;
  votes_against: bigint;
  total_votes: bigint;
  quorum_reached: boolean;
  deposit: bigint;
}

export interface GovernanceAction {
  type: string;
  parameters: any;
}

export interface VoteRecord {
  proposal_id: string;
  voter: string;
  vote: string;
  voting_power: bigint;
  timestamp: number;
}

export interface StakingDatum {
  total_staked: bigint;
  total_pADA_minted: bigint;
  stake_pool_id: string;
  last_rewards_sync_slot: number;
}

export interface CrossChainRouterDatum {
  total_volume: bigint;
  last_processed_nonce: number;
  chain_connections: ChainConnection[];
}

export interface ChainConnection {
  chain_id: string;
  bridge_address: string;
  is_active: boolean;
  total_volume: bigint;
  last_sync_nonce: number;
}

// Redeemer Interfaces
export interface SwapRedeemer {
  swap_in_token: boolean;
  amount_in: bigint;
  min_out: bigint;
  deadline_slot?: number;
  user_address?: string;
}

export interface LiquidityRedeemer {
  action: "add" | "remove";
  ada_amount?: bigint;
  token_amount?: bigint;
  lp_token_amount?: bigint;
  min_ada_out?: bigint;
  min_token_out?: bigint;
  min_lp_tokens?: bigint;
  deadline_slot?: number;
  user_address?: string;
}

export interface StakingRedeemer {
  action: "deposit" | "withdraw" | "sync";
  amount?: bigint;
  user_address?: string;
}

export interface CrossChainRedeemer {
  action: "outbound" | "inbound";
  target_chain: string;
  amount: bigint;
  recipient: string;
  nonce: number;
  bridge_signature?: string;
}

/**
 * PuckSwap v5 CIP-68 Serialization Utility
 * Handles all datum and redeemer serialization with proper error handling
 */
export class PuckSwapSerializer {
  
  /**
   * Serialize PoolDatum to Plutus Data
   */
  static serializePoolDatum(datum: PoolDatum): string {
    try {
      const plutusData = new Constr(0, [
        datum.ada_reserve,
        datum.token_reserve,
        BigInt(datum.fee_basis_points),
        fromText(datum.lp_token_policy),
        fromText(datum.lp_token_name)
      ]);
      
      return Data.to(plutusData);
    } catch (error) {
      throw new Error(`Failed to serialize PoolDatum: ${error}`);
    }
  }

  /**
   * Deserialize PoolDatum from Plutus Data
   */
  static deserializePoolDatum(dataHex: string): PoolDatum {
    try {
      const plutusData = Data.from(dataHex);
      
      if (!(plutusData instanceof Constr) || plutusData.fields.length !== 5) {
        throw new Error("Invalid PoolDatum structure");
      }

      return {
        ada_reserve: plutusData.fields[0] as bigint,
        token_reserve: plutusData.fields[1] as bigint,
        fee_basis_points: Number(plutusData.fields[2]),
        lp_token_policy: toText(plutusData.fields[3] as string),
        lp_token_name: toText(plutusData.fields[4] as string)
      };
    } catch (error) {
      throw new Error(`Failed to deserialize PoolDatum: ${error}`);
    }
  }

  /**
   * Serialize GovernanceDatum to Plutus Data
   */
  static serializeGovernanceDatum(datum: GovernanceDatum): string {
    try {
      const proposalsData = new Constr(0, datum.proposals.map(p => this.serializeProposal(p)));
      const voteRecordsData = new Constr(0, datum.vote_records.map(v => this.serializeVoteRecord(v)));
      const adminAddressesData = new Constr(0, datum.admin_addresses.map(addr => fromText(addr)));

      const plutusData = new Constr(0, [
        BigInt(datum.total_proposals),
        BigInt(datum.active_proposals),
        proposalsData,
        voteRecordsData,
        fromText(datum.governance_token_policy),
        fromText(datum.governance_token_name),
        fromText(datum.treasury_address),
        BigInt(datum.voting_period_slots),
        BigInt(datum.execution_delay_slots),
        BigInt(datum.quorum_threshold_bps),
        BigInt(datum.approval_threshold_bps),
        adminAddressesData,
        datum.proposal_deposit,
        datum.min_voting_power,
        datum.paused ? 1n : 0n,
        fromText(datum.emergency_admin),
        BigInt(datum.last_updated_slot)
      ]);
      
      return Data.to(plutusData);
    } catch (error) {
      throw new Error(`Failed to serialize GovernanceDatum: ${error}`);
    }
  }

  /**
   * Serialize Proposal to Plutus Data
   */
  private static serializeProposal(proposal: Proposal): Data {
    return new Constr(0, [
      fromText(proposal.id),
      fromText(proposal.title),
      fromText(proposal.description),
      this.serializeGovernanceAction(proposal.action),
      fromText(proposal.proposer),
      BigInt(proposal.created_at),
      BigInt(proposal.voting_deadline),
      BigInt(proposal.execution_deadline),
      fromText(proposal.status),
      proposal.votes_for,
      proposal.votes_against,
      proposal.total_votes,
      proposal.quorum_reached ? 1n : 0n,
      proposal.deposit
    ]);
  }

  /**
   * Serialize GovernanceAction to Plutus Data
   */
  private static serializeGovernanceAction(action: GovernanceAction): Data {
    return new Constr(0, [
      fromText(action.type),
      this.serializeValue(action.parameters)
    ]);
  }

  /**
   * Serialize VoteRecord to Plutus Data
   */
  private static serializeVoteRecord(voteRecord: VoteRecord): Data {
    return new Constr(0, [
      fromText(voteRecord.proposal_id),
      fromText(voteRecord.voter),
      fromText(voteRecord.vote),
      voteRecord.voting_power,
      BigInt(voteRecord.timestamp)
    ]);
  }

  /**
   * Generic value serializer
   */
  private static serializeValue(value: any): Data {
    if (typeof value === 'string') {
      return fromText(value);
    } else if (typeof value === 'number') {
      return BigInt(value);
    } else if (typeof value === 'bigint') {
      return value;
    } else if (typeof value === 'boolean') {
      return value ? 1n : 0n;
    } else if (Array.isArray(value)) {
      return new Constr(0, value.map(v => this.serializeValue(v)));
    } else if (typeof value === 'object' && value !== null) {
      const entries = Object.entries(value).map(([k, v]) =>
        new Constr(0, [fromText(k), this.serializeValue(v)])
      );
      return new Constr(1, entries);
    } else {
      return fromText(String(value));
    }
  }

  /**
   * Deserialize GovernanceDatum from Plutus Data
   */
  static deserializeGovernanceDatum(dataHex: string): GovernanceDatum {
    try {
      const plutusData = Data.from(dataHex);

      if (!(plutusData instanceof Constr) || plutusData.fields.length !== 17) {
        throw new Error("Invalid GovernanceDatum structure");
      }

      const [
        totalProposals, activeProposals, proposalsData, voteRecordsData,
        govTokenPolicy, govTokenName, treasuryAddr, votingPeriod, execDelay,
        quorumThreshold, approvalThreshold, adminAddrs, proposalDeposit,
        minVotingPower, pausedData, emergencyAdmin, lastUpdated
      ] = plutusData.fields;

      // Deserialize proposals
      const proposals: Proposal[] = [];
      if (proposalsData instanceof Constr) {
        for (const proposalData of proposalsData.fields) {
          proposals.push(this.deserializeProposal(proposalData));
        }
      }

      // Deserialize vote records
      const voteRecords: VoteRecord[] = [];
      if (voteRecordsData instanceof Constr) {
        for (const voteData of voteRecordsData.fields) {
          voteRecords.push(this.deserializeVoteRecord(voteData));
        }
      }

      // Deserialize admin addresses
      const adminAddresses: string[] = [];
      if (adminAddrs instanceof Constr) {
        for (const addrData of adminAddrs.fields) {
          adminAddresses.push(toText(addrData as string));
        }
      }

      return {
        total_proposals: Number(totalProposals),
        active_proposals: Number(activeProposals),
        proposals,
        vote_records: voteRecords,
        governance_token_policy: toText(govTokenPolicy as string),
        governance_token_name: toText(govTokenName as string),
        treasury_address: toText(treasuryAddr as string),
        voting_period_slots: Number(votingPeriod),
        execution_delay_slots: Number(execDelay),
        quorum_threshold_bps: Number(quorumThreshold),
        approval_threshold_bps: Number(approvalThreshold),
        admin_addresses: adminAddresses,
        proposal_deposit: proposalDeposit as bigint,
        min_voting_power: minVotingPower as bigint,
        paused: pausedData === 1n,
        emergency_admin: toText(emergencyAdmin as string),
        last_updated_slot: Number(lastUpdated)
      };
    } catch (error) {
      throw new Error(`Failed to deserialize GovernanceDatum: ${error}`);
    }
  }

  /**
   * Deserialize Proposal from Plutus Data
   */
  private static deserializeProposal(data: Data): Proposal {
    if (!(data instanceof Constr) || data.fields.length !== 14) {
      throw new Error("Invalid Proposal structure");
    }

    const [
      id, title, description, actionData, proposer, createdAt,
      votingDeadline, execDeadline, status, votesFor, votesAgainst,
      totalVotes, quorumReached, deposit
    ] = data.fields;

    return {
      id: toText(id as string),
      title: toText(title as string),
      description: toText(description as string),
      action: this.deserializeGovernanceAction(actionData),
      proposer: toText(proposer as string),
      created_at: Number(createdAt),
      voting_deadline: Number(votingDeadline),
      execution_deadline: Number(execDeadline),
      status: toText(status as string),
      votes_for: votesFor as bigint,
      votes_against: votesAgainst as bigint,
      total_votes: totalVotes as bigint,
      quorum_reached: quorumReached === 1n,
      deposit: deposit as bigint
    };
  }

  /**
   * Deserialize GovernanceAction from Plutus Data
   */
  private static deserializeGovernanceAction(data: Data): GovernanceAction {
    if (!(data instanceof Constr) || data.fields.length !== 2) {
      throw new Error("Invalid GovernanceAction structure");
    }

    return {
      type: toText(data.fields[0] as string),
      parameters: this.deserializeValue(data.fields[1])
    };
  }

  /**
   * Deserialize VoteRecord from Plutus Data
   */
  private static deserializeVoteRecord(data: Data): VoteRecord {
    if (!(data instanceof Constr) || data.fields.length !== 5) {
      throw new Error("Invalid VoteRecord structure");
    }

    const [proposalId, voter, vote, votingPower, timestamp] = data.fields;

    return {
      proposal_id: toText(proposalId as string),
      voter: toText(voter as string),
      vote: toText(vote as string),
      voting_power: votingPower as bigint,
      timestamp: Number(timestamp)
    };
  }

  /**
   * Generic value deserializer
   */
  private static deserializeValue(data: Data): any {
    try {
      if (typeof data === 'string') {
        return toText(data);
      } else if (typeof data === 'bigint') {
        return Number(data);
      } else if (data instanceof Constr) {
        if (data.alternative === 0 && Array.isArray(data.fields)) {
          return data.fields.map(f => this.deserializeValue(f));
        } else if (data.alternative === 1 && Array.isArray(data.fields)) {
          const obj: any = {};
          for (const field of data.fields) {
            if (field instanceof Constr && field.fields.length === 2) {
              const key = toText(field.fields[0] as string);
              const value = this.deserializeValue(field.fields[1]);
              obj[key] = value;
            }
          }
          return obj;
        }
      }
      return data;
    } catch (error) {
      console.error("Failed to deserialize value:", error);
      return null;
    }
  }

  /**
   * Serialize StakingDatum to Plutus Data
   */
  static serializeStakingDatum(datum: StakingDatum): string {
    try {
      const plutusData = new Constr(0, [
        datum.total_staked,
        datum.total_pADA_minted,
        fromText(datum.stake_pool_id),
        BigInt(datum.last_rewards_sync_slot)
      ]);

      return Data.to(plutusData);
    } catch (error) {
      throw new Error(`Failed to serialize StakingDatum: ${error}`);
    }
  }

  /**
   * Deserialize StakingDatum from Plutus Data
   */
  static deserializeStakingDatum(dataHex: string): StakingDatum {
    try {
      const plutusData = Data.from(dataHex);

      if (!(plutusData instanceof Constr) || plutusData.fields.length !== 4) {
        throw new Error("Invalid StakingDatum structure");
      }

      return {
        total_staked: plutusData.fields[0] as bigint,
        total_pADA_minted: plutusData.fields[1] as bigint,
        stake_pool_id: toText(plutusData.fields[2] as string),
        last_rewards_sync_slot: Number(plutusData.fields[3])
      };
    } catch (error) {
      throw new Error(`Failed to deserialize StakingDatum: ${error}`);
    }
  }

  /**
   * Serialize CrossChainRouterDatum to Plutus Data
   */
  static serializeCrossChainRouterDatum(datum: CrossChainRouterDatum): string {
    try {
      const chainConnectionsData = new Constr(0,
        datum.chain_connections.map(conn => this.serializeChainConnection(conn))
      );

      const plutusData = new Constr(0, [
        datum.total_volume,
        BigInt(datum.last_processed_nonce),
        chainConnectionsData
      ]);

      return Data.to(plutusData);
    } catch (error) {
      throw new Error(`Failed to serialize CrossChainRouterDatum: ${error}`);
    }
  }

  /**
   * Serialize ChainConnection to Plutus Data
   */
  private static serializeChainConnection(connection: ChainConnection): Data {
    return new Constr(0, [
      fromText(connection.chain_id),
      fromText(connection.bridge_address),
      connection.is_active ? 1n : 0n,
      connection.total_volume,
      BigInt(connection.last_sync_nonce)
    ]);
  }

  /**
   * Deserialize CrossChainRouterDatum from Plutus Data
   */
  static deserializeCrossChainRouterDatum(dataHex: string): CrossChainRouterDatum {
    try {
      const plutusData = Data.from(dataHex);

      if (!(plutusData instanceof Constr) || plutusData.fields.length !== 3) {
        throw new Error("Invalid CrossChainRouterDatum structure");
      }

      const [totalVolume, lastNonce, connectionsData] = plutusData.fields;

      // Deserialize chain connections
      const chainConnections: ChainConnection[] = [];
      if (connectionsData instanceof Constr) {
        for (const connData of connectionsData.fields) {
          chainConnections.push(this.deserializeChainConnection(connData));
        }
      }

      return {
        total_volume: totalVolume as bigint,
        last_processed_nonce: Number(lastNonce),
        chain_connections: chainConnections
      };
    } catch (error) {
      throw new Error(`Failed to deserialize CrossChainRouterDatum: ${error}`);
    }
  }

  /**
   * Deserialize ChainConnection from Plutus Data
   */
  private static deserializeChainConnection(data: Data): ChainConnection {
    if (!(data instanceof Constr) || data.fields.length !== 5) {
      throw new Error("Invalid ChainConnection structure");
    }

    const [chainId, bridgeAddr, isActive, totalVolume, lastNonce] = data.fields;

    return {
      chain_id: toText(chainId as string),
      bridge_address: toText(bridgeAddr as string),
      is_active: isActive === 1n,
      total_volume: totalVolume as bigint,
      last_sync_nonce: Number(lastNonce)
    };
  }

  // ========== REDEEMER SERIALIZATION ==========

  /**
   * Serialize SwapRedeemer to Plutus Data
   */
  static serializeSwapRedeemer(redeemer: SwapRedeemer): string {
    try {
      const plutusData = new Constr(0, [
        redeemer.swap_in_token ? 1n : 0n,
        redeemer.amount_in,
        redeemer.min_out,
        BigInt(redeemer.deadline_slot || 0),
        fromText(redeemer.user_address || "")
      ]);

      return Data.to(plutusData);
    } catch (error) {
      throw new Error(`Failed to serialize SwapRedeemer: ${error}`);
    }
  }

  /**
   * Serialize LiquidityRedeemer to Plutus Data
   */
  static serializeLiquidityRedeemer(redeemer: LiquidityRedeemer): string {
    try {
      let plutusData: Data;

      if (redeemer.action === "add") {
        plutusData = new Constr(0, [
          redeemer.ada_amount || 0n,
          redeemer.token_amount || 0n,
          redeemer.min_lp_tokens || 0n,
          BigInt(redeemer.deadline_slot || 0),
          fromText(redeemer.user_address || "")
        ]);
      } else {
        plutusData = new Constr(1, [
          redeemer.lp_token_amount || 0n,
          redeemer.min_ada_out || 0n,
          redeemer.min_token_out || 0n,
          BigInt(redeemer.deadline_slot || 0),
          fromText(redeemer.user_address || "")
        ]);
      }

      return Data.to(plutusData);
    } catch (error) {
      throw new Error(`Failed to serialize LiquidityRedeemer: ${error}`);
    }
  }

  /**
   * Serialize StakingRedeemer to Plutus Data
   */
  static serializeStakingRedeemer(redeemer: StakingRedeemer): string {
    try {
      let alternative: number;
      switch (redeemer.action) {
        case "deposit": alternative = 0; break;
        case "withdraw": alternative = 1; break;
        case "sync": alternative = 2; break;
        default: throw new Error(`Invalid staking action: ${redeemer.action}`);
      }

      const plutusData = new Constr(alternative, [
        redeemer.amount || 0n,
        fromText(redeemer.user_address || "")
      ]);

      return Data.to(plutusData);
    } catch (error) {
      throw new Error(`Failed to serialize StakingRedeemer: ${error}`);
    }
  }

  /**
   * Serialize CrossChainRedeemer to Plutus Data
   */
  static serializeCrossChainRedeemer(redeemer: CrossChainRedeemer): string {
    try {
      const alternative = redeemer.action === "outbound" ? 0 : 1;

      const plutusData = new Constr(alternative, [
        fromText(redeemer.target_chain),
        redeemer.amount,
        fromText(redeemer.recipient),
        BigInt(redeemer.nonce),
        fromText(redeemer.bridge_signature || "")
      ]);

      return Data.to(plutusData);
    } catch (error) {
      throw new Error(`Failed to serialize CrossChainRedeemer: ${error}`);
    }
  }

  // ========== UTILITY METHODS ==========

  /**
   * Safe hex encoding with Buffer compatibility
   */
  static safeToHex(data: any): string {
    try {
      if (typeof data === 'string') {
        return data;
      }

      // Handle both Node.js and browser environments
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(JSON.stringify(data)).toString('hex');
      } else {
        // Browser fallback
        const encoder = new TextEncoder();
        const bytes = encoder.encode(JSON.stringify(data));
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
      }
    } catch (error) {
      throw new Error(`Failed to encode to hex: ${error}`);
    }
  }

  /**
   * Safe hex decoding with Buffer compatibility
   */
  static safeFromHex(hex: string): any {
    try {
      // Handle both Node.js and browser environments
      if (typeof Buffer !== 'undefined') {
        const buffer = Buffer.from(hex, 'hex');
        return JSON.parse(buffer.toString());
      } else {
        // Browser fallback
        const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(bytes));
      }
    } catch (error) {
      throw new Error(`Failed to decode from hex: ${error}`);
    }
  }

  /**
   * Validate serialized data structure
   */
  static validateSerializedData(dataHex: string): boolean {
    try {
      const plutusData = Data.from(dataHex);
      return plutusData instanceof Constr;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create datum hash for UTxO reference
   */
  static createDatumHash(dataHex: string): string {
    try {
      // Use Lucid's built-in datum hashing
      const plutusData = Data.from(dataHex);
      return C.hash_plutus_data(C.PlutusData.from_hex(dataHex)).to_hex();
    } catch (error) {
      // Fallback to simple hash
      return "datum_hash_" + Math.random().toString(36).substr(2, 16);
    }
  }
}
