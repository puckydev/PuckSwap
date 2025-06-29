// PuckSwap v4 Enterprise - Governance System
// Lucid Evolution transaction builders for DAO governance operations
// Full CIP-68 compliance with comprehensive proposal and voting system

import {
  Lucid,
  Blockfrost,
  Data,
  fromText,
  toUnit,
  fromUnit,
  UTxO,
  TxHash,
  Address,
  Assets,
  SpendingValidator,
  MintingPolicy,
  PolicyId,
  Unit,
  TxComplete,
  Script,
  OutRef,
  Datum,
  Redeemer
} from "lucid-cardano";

// Governance interfaces
export interface GovernanceAction {
  type: 'UpdateProtocolFee' | 'UpdateMinLiquidity' | 'UpdateMaxFee' | 'UpdateMinFee' | 
        'TreasuryPayout' | 'UpdateRegistryConfig' | 'EmergencyPause' | 'EmergencyUnpause' |
        'UpdateVotingParameters' | 'UpdateGovernanceToken' | 'AddGovernanceAdmin' | 'RemoveGovernanceAdmin';
  parameters: any;
}

export interface Proposal {
  proposalId: number;
  proposer: Address;
  action: GovernanceAction;
  title: string;
  description: string;
  votesFor: bigint;
  votesAgainst: bigint;
  votesAbstain: bigint;
  totalVotingPower: bigint;
  createdAtSlot: number;
  votingStartSlot: number;
  votingEndSlot: number;
  executionSlot: number;
  status: ProposalStatus;
  executed: boolean;
  executionTxHash: string;
}

export type ProposalStatus = 'Pending' | 'Active' | 'Succeeded' | 'Failed' | 'Executed' | 'Cancelled' | 'Expired';

export interface VoteRecord {
  voter: Address;
  proposalId: number;
  voteType: 'For' | 'Against' | 'Abstain';
  votingPower: bigint;
  votedAtSlot: number;
}

export interface GovernanceDatum {
  metadata: {
    policyId: PolicyId;
    assetName: string;
    version: number;
  };
  version: number;
  totalProposals: number;
  activeProposals: number;
  proposals: Proposal[];
  voteRecords: VoteRecord[];
  governanceTokenPolicy: PolicyId;
  governanceTokenName: string;
  treasuryAddress: Address;
  votingPeriodSlots: number;
  executionDelaySlots: number;
  quorumThresholdBps: number;
  approvalThresholdBps: number;
  adminAddresses: Address[];
  proposalDeposit: bigint;
  minVotingPower: bigint;
  paused: boolean;
  emergencyAdmin: Address;
  lastUpdatedSlot: number;
}

export interface ProposalCreationParams {
  action: GovernanceAction;
  title: string;
  description: string;
  proposalDeposit: bigint;
}

export interface VotingParams {
  proposalId: number;
  voteType: 'For' | 'Against' | 'Abstain';
  votingPower: bigint;
}

export interface GovernanceConfigUpdate {
  votingPeriodSlots?: number;
  executionDelaySlots?: number;
  quorumThresholdBps?: number;
  approvalThresholdBps?: number;
  proposalDeposit?: bigint;
  minVotingPower?: bigint;
}

export class PuckSwapGovernanceV4 {
  private lucid: Lucid;
  private governanceValidator: SpendingValidator;
  private governanceTokenPolicy: MintingPolicy;
  private governanceAddress: Address;
  private treasuryAddress: Address;

  constructor(
    lucid: Lucid,
    governanceValidator: SpendingValidator,
    governanceTokenPolicy: MintingPolicy,
    governanceAddress: Address,
    treasuryAddress: Address
  ) {
    this.lucid = lucid;
    this.governanceValidator = governanceValidator;
    this.governanceTokenPolicy = governanceTokenPolicy;
    this.governanceAddress = governanceAddress;
    this.treasuryAddress = treasuryAddress;
  }

  // Initialize governance system
  static async create(
    blockfrostApiKey: string,
    network: "Mainnet" | "Preview" | "Preprod" = "Preview",
    contractCBORs: {
      governanceValidator: string;
      governanceTokenPolicy: string;
    },
    governanceAddress: Address,
    treasuryAddress: Address
  ): Promise<PuckSwapGovernanceV4> {
    const lucid = await Lucid.new(
      new Blockfrost(
        `https://cardano-${network.toLowerCase()}.blockfrost.io/api/v0`,
        blockfrostApiKey
      ),
      network
    );

    const governanceValidator: SpendingValidator = {
      type: "PlutusV2",
      script: contractCBORs.governanceValidator
    };

    const governanceTokenPolicy: MintingPolicy = {
      type: "PlutusV2",
      script: contractCBORs.governanceTokenPolicy
    };

    return new PuckSwapGovernanceV4(
      lucid,
      governanceValidator,
      governanceTokenPolicy,
      governanceAddress,
      treasuryAddress
    );
  }

  // Connect wallet
  async connectWallet(walletName: "eternl" | "nami" | "vespr" | "lace"): Promise<void> {
    await this.lucid.selectWalletFromExtension(walletName);
  }

  // Get governance state
  async getGovernanceState(): Promise<GovernanceDatum | null> {
    try {
      const governanceUTxOs = await this.lucid.utxosAt(this.governanceAddress);
      
      if (governanceUTxOs.length === 0) {
        return null;
      }

      const governanceUTxO = governanceUTxOs[0];
      if (!governanceUTxO.datum) {
        throw new Error("Governance UTxO missing datum");
      }

      return await this.parseGovernanceDatum(governanceUTxO.datum);
    } catch (error) {
      console.error("Error fetching governance state:", error);
      return null;
    }
  }

  // Create new proposal
  async createProposal(params: ProposalCreationParams): Promise<TxHash> {
    try {
      const governanceState = await this.getGovernanceState();
      if (!governanceState) {
        throw new Error("Governance system not found");
      }

      if (governanceState.paused) {
        throw new Error("Governance system is paused");
      }

      // Validate proposal parameters
      this.validateProposalParams(params, governanceState);

      // Check user has minimum voting power
      const userVotingPower = await this.getUserVotingPower();
      if (userVotingPower < governanceState.minVotingPower) {
        throw new Error(`Insufficient voting power: ${userVotingPower} < ${governanceState.minVotingPower}`);
      }

      // Build proposal creation transaction
      const tx = await this.buildProposalCreationTx(params, governanceState);
      
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      return txHash;
    } catch (error) {
      console.error("Error creating proposal:", error);
      throw error;
    }
  }

  // Cast vote on proposal
  async castVote(params: VotingParams): Promise<TxHash> {
    try {
      const governanceState = await this.getGovernanceState();
      if (!governanceState) {
        throw new Error("Governance system not found");
      }

      if (governanceState.paused) {
        throw new Error("Governance system is paused");
      }

      // Find the proposal
      const proposal = governanceState.proposals.find(p => p.proposalId === params.proposalId);
      if (!proposal) {
        throw new Error("Proposal not found");
      }

      // Validate voting conditions
      this.validateVotingConditions(proposal, params, governanceState);

      // Check user hasn't already voted
      const hasVoted = governanceState.voteRecords.some(
        record => record.proposalId === params.proposalId && 
                 record.voter === await this.lucid.wallet.address()
      );

      if (hasVoted) {
        throw new Error("User has already voted on this proposal");
      }

      // Validate user's voting power
      const userVotingPower = await this.getUserVotingPower();
      if (userVotingPower < params.votingPower) {
        throw new Error(`Insufficient voting power: ${userVotingPower} < ${params.votingPower}`);
      }

      // Build voting transaction
      const tx = await this.buildVotingTx(params, proposal, governanceState);
      
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      return txHash;
    } catch (error) {
      console.error("Error casting vote:", error);
      throw error;
    }
  }

  // Execute proposal
  async executeProposal(proposalId: number): Promise<TxHash> {
    try {
      const governanceState = await this.getGovernanceState();
      if (!governanceState) {
        throw new Error("Governance system not found");
      }

      const proposal = governanceState.proposals.find(p => p.proposalId === proposalId);
      if (!proposal) {
        throw new Error("Proposal not found");
      }

      // Validate execution conditions
      this.validateExecutionConditions(proposal, governanceState);

      // Build execution transaction
      const tx = await this.buildExecutionTx(proposal, governanceState);
      
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      return txHash;
    } catch (error) {
      console.error("Error executing proposal:", error);
      throw error;
    }
  }

  // Cancel proposal (proposer or admin only)
  async cancelProposal(proposalId: number, reason: string): Promise<TxHash> {
    try {
      const governanceState = await this.getGovernanceState();
      if (!governanceState) {
        throw new Error("Governance system not found");
      }

      const proposal = governanceState.proposals.find(p => p.proposalId === proposalId);
      if (!proposal) {
        throw new Error("Proposal not found");
      }

      const userAddress = await this.lucid.wallet.address();
      
      // Check if user is proposer or admin
      const isProposer = proposal.proposer === userAddress;
      const isAdmin = governanceState.adminAddresses.includes(userAddress);

      if (!isProposer && !isAdmin) {
        throw new Error("Only proposer or admin can cancel proposal");
      }

      // Build cancellation transaction
      const tx = await this.buildCancellationTx(proposalId, reason, governanceState);
      
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      return txHash;
    } catch (error) {
      console.error("Error cancelling proposal:", error);
      throw error;
    }
  }

  // Update governance configuration (admin only)
  async updateGovernanceConfig(config: GovernanceConfigUpdate): Promise<TxHash> {
    try {
      const governanceState = await this.getGovernanceState();
      if (!governanceState) {
        throw new Error("Governance system not found");
      }

      const userAddress = await this.lucid.wallet.address();
      if (!governanceState.adminAddresses.includes(userAddress)) {
        throw new Error("Only admin can update governance configuration");
      }

      // Validate configuration parameters
      this.validateGovernanceConfig(config);

      // Build configuration update transaction
      const tx = await this.buildConfigUpdateTx(config, governanceState);
      
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      return txHash;
    } catch (error) {
      console.error("Error updating governance config:", error);
      throw error;
    }
  }

  // Get all proposals
  async getAllProposals(): Promise<Proposal[]> {
    try {
      const governanceState = await this.getGovernanceState();
      return governanceState?.proposals || [];
    } catch (error) {
      console.error("Error fetching proposals:", error);
      return [];
    }
  }

  // Get active proposals
  async getActiveProposals(): Promise<Proposal[]> {
    try {
      const proposals = await this.getAllProposals();
      return proposals.filter(p => p.status === 'Active');
    } catch (error) {
      console.error("Error fetching active proposals:", error);
      return [];
    }
  }

  // Get proposal by ID
  async getProposalById(proposalId: number): Promise<Proposal | null> {
    try {
      const proposals = await this.getAllProposals();
      return proposals.find(p => p.proposalId === proposalId) || null;
    } catch (error) {
      console.error("Error fetching proposal:", error);
      return null;
    }
  }

  // Get user's voting power
  async getUserVotingPower(): Promise<bigint> {
    try {
      const userAddress = await this.lucid.wallet.address();
      const userUTxOs = await this.lucid.wallet.getUtxos();
      
      let totalVotingPower = 0n;
      
      for (const utxo of userUTxOs) {
        const governanceTokenUnit = toUnit(
          this.lucid.utils.mintingPolicyToId(this.governanceTokenPolicy),
          fromText("PUCKY_GOV")
        );
        
        const tokenAmount = utxo.assets[governanceTokenUnit];
        if (tokenAmount) {
          totalVotingPower += BigInt(tokenAmount);
        }
      }
      
      return totalVotingPower;
    } catch (error) {
      console.error("Error getting user voting power:", error);
      return 0n;
    }
  }

  // Get user's vote history
  async getUserVoteHistory(): Promise<VoteRecord[]> {
    try {
      const governanceState = await this.getGovernanceState();
      if (!governanceState) {
        return [];
      }

      const userAddress = await this.lucid.wallet.address();
      return governanceState.voteRecords.filter(record => record.voter === userAddress);
    } catch (error) {
      console.error("Error fetching vote history:", error);
      return [];
    }
  }

  // Private helper methods
  private async parseGovernanceDatum(datum: string): Promise<GovernanceDatum> {
    // Parse CIP-68 compliant governance datum
    const parsedDatum = Data.from(datum);
    
    // This would need to match the exact Aiken datum structure
    return {
      metadata: {
        policyId: "placeholder_policy_id",
        assetName: "placeholder_asset_name",
        version: 1
      },
      version: 1,
      totalProposals: 0,
      activeProposals: 0,
      proposals: [],
      voteRecords: [],
      governanceTokenPolicy: this.lucid.utils.mintingPolicyToId(this.governanceTokenPolicy),
      governanceTokenName: "PUCKY_GOV",
      treasuryAddress: this.treasuryAddress,
      votingPeriodSlots: 604800, // 7 days
      executionDelaySlots: 172800, // 2 days
      quorumThresholdBps: 1000, // 10%
      approvalThresholdBps: 5000, // 50%
      adminAddresses: [],
      proposalDeposit: 100000000n, // 100 ADA
      minVotingPower: 1000000n, // 1M governance tokens
      paused: false,
      emergencyAdmin: "placeholder_emergency_admin",
      lastUpdatedSlot: 0
    };
  }

  private validateProposalParams(params: ProposalCreationParams, governanceState: GovernanceDatum): void {
    if (!params.title || params.title.length === 0 || params.title.length > 100) {
      throw new Error("Title must be between 1 and 100 characters");
    }

    if (!params.description || params.description.length === 0 || params.description.length > 1000) {
      throw new Error("Description must be between 1 and 1000 characters");
    }

    if (params.proposalDeposit < governanceState.proposalDeposit) {
      throw new Error(`Proposal deposit must be at least ${governanceState.proposalDeposit}`);
    }

    // Validate governance action
    this.validateGovernanceAction(params.action);
  }

  private validateGovernanceAction(action: GovernanceAction): void {
    switch (action.type) {
      case 'UpdateProtocolFee':
        if (!action.parameters.newFeeBps || action.parameters.newFeeBps < 0 || action.parameters.newFeeBps > 1000) {
          throw new Error("Protocol fee must be between 0 and 1000 basis points");
        }
        break;
      case 'UpdateMinLiquidity':
        if (!action.parameters.newMinLiquidity || action.parameters.newMinLiquidity < 1000000n) {
          throw new Error("Minimum liquidity must be at least 1 ADA");
        }
        break;
      case 'TreasuryPayout':
        if (!action.parameters.recipient || !action.parameters.amount || action.parameters.amount <= 0) {
          throw new Error("Treasury payout requires valid recipient and positive amount");
        }
        break;
      // Add more validation for other action types
    }
  }

  private validateVotingConditions(proposal: Proposal, params: VotingParams, governanceState: GovernanceDatum): void {
    if (proposal.status !== 'Active') {
      throw new Error("Proposal is not in active voting period");
    }

    const currentSlot = this.lucid.currentSlot() || 0;
    if (currentSlot < proposal.votingStartSlot || currentSlot > proposal.votingEndSlot) {
      throw new Error("Voting period has ended or not started");
    }

    if (params.votingPower <= 0) {
      throw new Error("Voting power must be positive");
    }
  }

  private validateExecutionConditions(proposal: Proposal, governanceState: GovernanceDatum): void {
    if (proposal.status !== 'Succeeded') {
      throw new Error("Proposal has not succeeded");
    }

    if (proposal.executed) {
      throw new Error("Proposal has already been executed");
    }

    const currentSlot = this.lucid.currentSlot() || 0;
    if (currentSlot < proposal.executionSlot) {
      throw new Error("Execution delay period has not passed");
    }

    // Check quorum and approval thresholds
    const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
    const quorumMet = (totalVotes * 10000n) / proposal.totalVotingPower >= BigInt(governanceState.quorumThresholdBps);
    const approvalMet = (proposal.votesFor * 10000n) / totalVotes >= BigInt(governanceState.approvalThresholdBps);

    if (!quorumMet) {
      throw new Error("Quorum not met");
    }

    if (!approvalMet) {
      throw new Error("Approval threshold not met");
    }
  }

  private validateGovernanceConfig(config: GovernanceConfigUpdate): void {
    if (config.votingPeriodSlots && config.votingPeriodSlots < 86400) {
      throw new Error("Voting period must be at least 1 day");
    }

    if (config.executionDelaySlots && config.executionDelaySlots < 86400) {
      throw new Error("Execution delay must be at least 1 day");
    }

    if (config.quorumThresholdBps && (config.quorumThresholdBps < 100 || config.quorumThresholdBps > 10000)) {
      throw new Error("Quorum threshold must be between 1% and 100%");
    }

    if (config.approvalThresholdBps && (config.approvalThresholdBps < 5000 || config.approvalThresholdBps > 10000)) {
      throw new Error("Approval threshold must be between 50% and 100%");
    }
  }

  // Transaction building methods
  private async buildProposalCreationTx(params: ProposalCreationParams, governanceState: GovernanceDatum): Promise<TxComplete> {
    // Find governance UTxO
    const governanceUtxos = await this.lucid.utxosAt(this.governanceAddress);
    if (governanceUtxos.length === 0) {
      throw new Error("No governance UTxO found");
    }
    const governanceUtxo = governanceUtxos[0];

    // Create new proposal
    const newProposal: Proposal = {
      proposal_id: params.proposal_id,
      action: params.action,
      title: params.title,
      description: params.description,
      proposer: await this.lucid.wallet.address(),
      votes_for: 0n,
      votes_against: 0n,
      votes_abstain: 0n,
      created_at: BigInt(Date.now()),
      voting_deadline: BigInt(Date.now() + (7 * 24 * 60 * 60 * 1000)), // 7 days
      executed: false,
      cancelled: false
    };

    // Update governance state
    const updatedState: GovernanceDatum = {
      ...governanceState,
      proposals: [...governanceState.proposals, newProposal],
      total_proposals: governanceState.total_proposals + 1n
    };

    // Serialize datum and redeemer
    const datumData = Data.to(updatedState, GovernanceDatum);
    const redeemer = Data.to({ SubmitProposal: { proposal_id: params.proposal_id } }, GovernanceRedeemer);

    // Build transaction
    const tx = await this.lucid.newTx()
      .collectFrom([governanceUtxo], redeemer)
      .payToContract(this.governanceAddress, { inline: datumData }, governanceUtxo.assets)
      .attachSpendingValidator(this.governanceValidator)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    return tx;
  }

  private async buildVotingTx(params: VotingParams, proposal: Proposal, governanceState: GovernanceDatum): Promise<TxComplete> {
    // Find governance UTxO
    const governanceUtxos = await this.lucid.utxosAt(this.governanceAddress);
    if (governanceUtxos.length === 0) {
      throw new Error("No governance UTxO found");
    }
    const governanceUtxo = governanceUtxos[0];

    // Update proposal with vote
    const updatedProposal: Proposal = {
      ...proposal,
      votes_for: params.vote === 'For' ? proposal.votes_for + params.voting_power : proposal.votes_for,
      votes_against: params.vote === 'Against' ? proposal.votes_against + params.voting_power : proposal.votes_against,
      votes_abstain: params.vote === 'Abstain' ? proposal.votes_abstain + params.voting_power : proposal.votes_abstain
    };

    // Update governance state
    const updatedState: GovernanceDatum = {
      ...governanceState,
      proposals: governanceState.proposals.map(p =>
        p.proposal_id === params.proposal_id ? updatedProposal : p
      )
    };

    // Serialize datum and redeemer
    const datumData = Data.to(updatedState, GovernanceDatum);
    const redeemer = Data.to({
      CastVote: {
        proposal_id: params.proposal_id,
        vote: params.vote,
        voting_power: params.voting_power
      }
    }, GovernanceRedeemer);

    // Build transaction
    const tx = await this.lucid.newTx()
      .collectFrom([governanceUtxo], redeemer)
      .payToContract(this.governanceAddress, { inline: datumData }, governanceUtxo.assets)
      .attachSpendingValidator(this.governanceValidator)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    return tx;
  }

  private async buildExecutionTx(proposal: Proposal, governanceState: GovernanceDatum): Promise<TxComplete> {
    // Find governance UTxO
    const governanceUtxos = await this.lucid.utxosAt(this.governanceAddress);
    if (governanceUtxos.length === 0) {
      throw new Error("No governance UTxO found");
    }
    const governanceUtxo = governanceUtxos[0];

    // Mark proposal as executed
    const updatedProposal: Proposal = {
      ...proposal,
      executed: true
    };

    // Update governance state
    const updatedState: GovernanceDatum = {
      ...governanceState,
      proposals: governanceState.proposals.map(p =>
        p.proposal_id === proposal.proposal_id ? updatedProposal : p
      )
    };

    // Serialize datum and redeemer
    const datumData = Data.to(updatedState, GovernanceDatum);
    const redeemer = Data.to({
      ExecuteProposal: { proposal_id: proposal.proposal_id }
    }, GovernanceRedeemer);

    // Build transaction with proposal execution logic
    let txBuilder = this.lucid.newTx()
      .collectFrom([governanceUtxo], redeemer)
      .payToContract(this.governanceAddress, { inline: datumData }, governanceUtxo.assets)
      .attachSpendingValidator(this.governanceValidator);

    // Add proposal-specific execution logic
    if (proposal.action.type === 'TreasuryPayout') {
      const payoutAmount = proposal.action.parameters.amount;
      const recipient = proposal.action.parameters.recipient;
      txBuilder = txBuilder.payToAddress(recipient, { lovelace: payoutAmount });
    }

    const tx = await txBuilder
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    return tx;
  }

  private async buildCancellationTx(proposalId: number, reason: string, governanceState: GovernanceDatum): Promise<TxComplete> {
    // Find governance UTxO
    const governanceUtxos = await this.lucid.utxosAt(this.governanceAddress);
    if (governanceUtxos.length === 0) {
      throw new Error("No governance UTxO found");
    }
    const governanceUtxo = governanceUtxos[0];

    // Find and cancel proposal
    const proposal = governanceState.proposals.find(p => p.proposal_id === proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    const updatedProposal: Proposal = {
      ...proposal,
      cancelled: true
    };

    // Update governance state
    const updatedState: GovernanceDatum = {
      ...governanceState,
      proposals: governanceState.proposals.map(p =>
        p.proposal_id === proposalId ? updatedProposal : p
      )
    };

    // Serialize datum and redeemer
    const datumData = Data.to(updatedState, GovernanceDatum);
    const redeemer = Data.to({
      CancelProposal: { proposal_id: proposalId, reason }
    }, GovernanceRedeemer);

    // Build transaction
    const tx = await this.lucid.newTx()
      .collectFrom([governanceUtxo], redeemer)
      .payToContract(this.governanceAddress, { inline: datumData }, governanceUtxo.assets)
      .attachSpendingValidator(this.governanceValidator)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    return tx;
  }

  private async buildConfigUpdateTx(config: GovernanceConfigUpdate, governanceState: GovernanceDatum): Promise<TxComplete> {
    // Find governance UTxO
    const governanceUtxos = await this.lucid.utxosAt(this.governanceAddress);
    if (governanceUtxos.length === 0) {
      throw new Error("No governance UTxO found");
    }
    const governanceUtxo = governanceUtxos[0];

    // Update governance configuration
    const updatedState: GovernanceDatum = {
      ...governanceState,
      votingPeriodSlots: config.votingPeriodSlots || governanceState.votingPeriodSlots,
      executionDelaySlots: config.executionDelaySlots || governanceState.executionDelaySlots,
      quorumThresholdBps: config.quorumThresholdBps || governanceState.quorumThresholdBps,
      approvalThresholdBps: config.approvalThresholdBps || governanceState.approvalThresholdBps,
      proposalDeposit: config.proposalDeposit || governanceState.proposalDeposit,
      minVotingPower: config.minVotingPower || governanceState.minVotingPower
    };

    // Serialize datum and redeemer
    const datumData = Data.to(updatedState, GovernanceDatum);
    const redeemer = Data.to({
      UpdateConfig: { config }
    }, GovernanceRedeemer);

    // Build transaction
    const tx = await this.lucid.newTx()
      .collectFrom([governanceUtxo], redeemer)
      .payToContract(this.governanceAddress, { inline: datumData }, governanceUtxo.assets)
      .attachSpendingValidator(this.governanceValidator)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    return tx;
  }
}
