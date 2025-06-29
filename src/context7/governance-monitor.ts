// PuckSwap v4 Enterprise - Governance Monitor
// Context7 real-time monitoring for DAO governance proposals and voting
// WebSocket integration with comprehensive governance state management

import { createIndexer, Indexer, UTxO, Address, PolicyId } from "@context7/sdk";

// Governance monitoring interfaces
export interface GovernanceState {
  totalProposals: number;
  activeProposals: number;
  proposals: ProposalState[];
  voteRecords: VoteRecordState[];
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

export interface ProposalState {
  proposalId: number;
  proposer: Address;
  action: GovernanceActionState;
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
  // Real-time calculated fields
  participationRate: number;
  approvalRate: number;
  timeRemaining: number;
  canExecute: boolean;
  voterCount: number;
}

export interface GovernanceActionState {
  type: string;
  parameters: any;
  estimatedImpact: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface VoteRecordState {
  voter: Address;
  proposalId: number;
  voteType: 'For' | 'Against' | 'Abstain';
  votingPower: bigint;
  votedAtSlot: number;
  voterReputation: number;
  delegatedVotes: bigint;
}

export type ProposalStatus = 'Pending' | 'Active' | 'Succeeded' | 'Failed' | 'Executed' | 'Cancelled' | 'Expired';

export interface GovernanceEvent {
  type: 'ProposalCreated' | 'VoteCast' | 'ProposalExecuted' | 'ProposalCancelled' | 
        'ProposalExpired' | 'GovernanceConfigUpdated' | 'AdminUpdated' | 'EmergencyPause' | 
        'EmergencyUnpause' | 'QuorumReached' | 'VotingPeriodEnded';
  proposalId?: number;
  voter?: Address;
  transactionHash: string;
  slot: number;
  blockHeight: number;
  timestamp: Date;
  data: any;
}

export interface GovernanceMonitorConfig {
  governanceAddress: Address;
  blockfrostApiKey: string;
  network: "mainnet" | "preview" | "preprod";
  webhookUrl?: string;
  enableWebSocket: boolean;
  pollingInterval: number;
  maxRetries: number;
  retryDelay: number;
  enableNotifications: boolean;
  notificationThresholds: {
    quorumPercentage: number;
    timeRemainingHours: number;
    highRiskProposals: boolean;
  };
}

export interface GovernanceAnalytics {
  totalProposals: number;
  successRate: number;
  averageParticipation: number;
  averageExecutionTime: number;
  topVoters: Array<{
    address: Address;
    totalVotes: number;
    totalVotingPower: bigint;
    participationRate: number;
  }>;
  proposalsByType: Map<string, number>;
  votingTrends: Array<{
    slot: number;
    totalVotingPower: bigint;
    activeProposals: number;
  }>;
}

export class GovernanceMonitor {
  private indexer: Indexer;
  private config: GovernanceMonitorConfig;
  private currentState: GovernanceState | null = null;
  private eventListeners: Map<string, ((event: GovernanceEvent) => void)[]> = new Map();
  private isMonitoring = false;
  private retryCount = 0;
  private analytics: GovernanceAnalytics | null = null;

  constructor(config: GovernanceMonitorConfig) {
    this.config = config;
  }

  // Initialize the monitor
  async initialize(): Promise<void> {
    try {
      this.indexer = await createIndexer({
        projectId: this.config.blockfrostApiKey,
        network: this.config.network
      });

      console.log("Governance Monitor initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Governance Monitor:", error);
      throw error;
    }
  }

  // Start monitoring governance
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.warn("Governance Monitor is already running");
      return;
    }

    try {
      this.isMonitoring = true;
      console.log("Starting Governance monitoring...");

      // Load initial state
      await this.loadInitialState();

      // Subscribe to governance address changes
      this.indexer.addresses.subscribe([this.config.governanceAddress], (utxo) => {
        this.handleGovernanceUpdate(utxo);
      });

      // Start periodic updates and analytics
      this.startPeriodicUpdates();
      this.startAnalyticsUpdates();

      console.log("Governance monitoring started successfully");
    } catch (error) {
      console.error("Failed to start Governance monitoring:", error);
      this.isMonitoring = false;
      
      if (this.retryCount < this.config.maxRetries) {
        this.retryCount++;
        console.log(`Retrying in ${this.config.retryDelay}ms... (${this.retryCount}/${this.config.maxRetries})`);
        setTimeout(() => this.startMonitoring(), this.config.retryDelay);
      } else {
        throw error;
      }
    }
  }

  // Stop monitoring
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    console.log("Governance monitoring stopped");
  }

  // Get current governance state
  getCurrentState(): GovernanceState | null {
    return this.currentState;
  }

  // Get all proposals
  getAllProposals(): ProposalState[] {
    return this.currentState?.proposals || [];
  }

  // Get active proposals
  getActiveProposals(): ProposalState[] {
    return this.getAllProposals().filter(proposal => proposal.status === 'Active');
  }

  // Get proposal by ID
  getProposalById(proposalId: number): ProposalState | null {
    return this.getAllProposals().find(proposal => proposal.proposalId === proposalId) || null;
  }

  // Get proposals by status
  getProposalsByStatus(status: ProposalStatus): ProposalState[] {
    return this.getAllProposals().filter(proposal => proposal.status === status);
  }

  // Get proposals by type
  getProposalsByType(actionType: string): ProposalState[] {
    return this.getAllProposals().filter(proposal => proposal.action.type === actionType);
  }

  // Get high-risk proposals
  getHighRiskProposals(): ProposalState[] {
    return this.getAllProposals().filter(proposal => 
      proposal.action.riskLevel === 'High' || proposal.action.riskLevel === 'Critical'
    );
  }

  // Get voter history
  getVoterHistory(voterAddress: Address): VoteRecordState[] {
    return this.currentState?.voteRecords.filter(record => record.voter === voterAddress) || [];
  }

  // Get proposal votes
  getProposalVotes(proposalId: number): VoteRecordState[] {
    return this.currentState?.voteRecords.filter(record => record.proposalId === proposalId) || [];
  }

  // Get governance analytics
  getAnalytics(): GovernanceAnalytics | null {
    return this.analytics;
  }

  // Get voting power distribution
  getVotingPowerDistribution(): Array<{
    address: Address;
    votingPower: bigint;
    percentage: number;
  }> {
    if (!this.currentState) return [];

    const voterPowers = new Map<Address, bigint>();
    
    for (const record of this.currentState.voteRecords) {
      const current = voterPowers.get(record.voter) || 0n;
      voterPowers.set(record.voter, current + record.votingPower);
    }

    const totalPower = Array.from(voterPowers.values()).reduce((sum, power) => sum + power, 0n);
    
    return Array.from(voterPowers.entries())
      .map(([address, power]) => ({
        address,
        votingPower: power,
        percentage: totalPower > 0n ? Number(power * 100n / totalPower) : 0
      }))
      .sort((a, b) => Number(b.votingPower - a.votingPower));
  }

  // Check if proposal can be executed
  canExecuteProposal(proposalId: number): boolean {
    const proposal = this.getProposalById(proposalId);
    if (!proposal || !this.currentState) return false;

    return proposal.status === 'Succeeded' && 
           !proposal.executed && 
           Date.now() >= proposal.executionSlot * 1000; // Convert slot to timestamp
  }

  // Get proposals requiring attention
  getProposalsRequiringAttention(): ProposalState[] {
    const currentSlot = Math.floor(Date.now() / 1000); // Simplified slot calculation
    
    return this.getActiveProposals().filter(proposal => {
      const timeRemaining = proposal.votingEndSlot - currentSlot;
      const hoursRemaining = timeRemaining / 3600; // Assuming 1 slot = 1 second
      
      return hoursRemaining <= this.config.notificationThresholds.timeRemainingHours ||
             proposal.action.riskLevel === 'High' ||
             proposal.action.riskLevel === 'Critical' ||
             proposal.participationRate < this.config.notificationThresholds.quorumPercentage;
    });
  }

  // Add event listener
  addEventListener(eventType: string, callback: (event: GovernanceEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  // Remove event listener
  removeEventListener(eventType: string, callback: (event: GovernanceEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Private methods
  private async loadInitialState(): Promise<void> {
    try {
      const governanceUTxOs = await this.indexer.utxos.byAddress(this.config.governanceAddress);
      
      if (governanceUTxOs.length === 0) {
        throw new Error("Governance UTxO not found");
      }

      const governanceUTxO = governanceUTxOs[0];
      this.currentState = await this.parseGovernanceState(governanceUTxO);
      
      // Calculate real-time fields for proposals
      this.updateProposalCalculatedFields();
      
      console.log(`Loaded initial governance state with ${this.currentState.totalProposals} proposals`);
    } catch (error) {
      console.error("Failed to load initial governance state:", error);
      throw error;
    }
  }

  private async parseGovernanceState(utxo: UTxO): Promise<GovernanceState> {
    // Parse the governance datum from UTxO
    // This would need to match the exact CIP-68 structure from the Aiken contract
    
    // Placeholder implementation
    return {
      totalProposals: 0,
      activeProposals: 0,
      proposals: [],
      voteRecords: [],
      governanceTokenPolicy: "placeholder_gov_token_policy",
      governanceTokenName: "PUCKY_GOV",
      treasuryAddress: "placeholder_treasury_address",
      votingPeriodSlots: 604800, // 7 days
      executionDelaySlots: 172800, // 2 days
      quorumThresholdBps: 1000, // 10%
      approvalThresholdBps: 5000, // 50%
      adminAddresses: [],
      proposalDeposit: 100000000n, // 100 ADA
      minVotingPower: 1000000n, // 1M governance tokens
      paused: false,
      emergencyAdmin: "placeholder_emergency_admin",
      lastUpdatedSlot: utxo.slot || 0
    };
  }

  private updateProposalCalculatedFields(): void {
    if (!this.currentState) return;

    const currentSlot = Math.floor(Date.now() / 1000); // Simplified slot calculation

    for (const proposal of this.currentState.proposals) {
      // Calculate participation rate
      const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
      proposal.participationRate = proposal.totalVotingPower > 0n ? 
        Number(totalVotes * 100n / proposal.totalVotingPower) : 0;

      // Calculate approval rate
      proposal.approvalRate = totalVotes > 0n ? 
        Number(proposal.votesFor * 100n / totalVotes) : 0;

      // Calculate time remaining
      proposal.timeRemaining = Math.max(0, proposal.votingEndSlot - currentSlot);

      // Check if can execute
      proposal.canExecute = proposal.status === 'Succeeded' && 
                           !proposal.executed && 
                           currentSlot >= proposal.executionSlot;

      // Count unique voters
      const proposalVotes = this.currentState.voteRecords.filter(
        record => record.proposalId === proposal.proposalId
      );
      proposal.voterCount = new Set(proposalVotes.map(vote => vote.voter)).size;
    }
  }

  private handleGovernanceUpdate(utxo: UTxO): void {
    try {
      console.log("Governance update detected:", utxo.txHash);
      
      this.parseGovernanceState(utxo).then(newState => {
        const oldState = this.currentState;
        this.currentState = newState;
        
        // Update calculated fields
        this.updateProposalCalculatedFields();
        
        // Detect and emit events
        this.detectAndEmitEvents(oldState, newState, utxo);
        
        // Update analytics
        this.updateAnalytics();
        
        // Check for notifications
        if (this.config.enableNotifications) {
          this.checkNotifications();
        }
      }).catch(error => {
        console.error("Failed to parse governance update:", error);
      });
    } catch (error) {
      console.error("Failed to handle governance update:", error);
    }
  }

  private detectAndEmitEvents(
    oldState: GovernanceState | null,
    newState: GovernanceState,
    utxo: UTxO
  ): void {
    if (!oldState) return;

    // Detect new proposals
    const newProposals = newState.proposals.filter(newProposal => 
      !oldState.proposals.some(oldProposal => oldProposal.proposalId === newProposal.proposalId)
    );

    for (const proposal of newProposals) {
      this.emitEvent({
        type: 'ProposalCreated',
        proposalId: proposal.proposalId,
        transactionHash: utxo.txHash,
        slot: utxo.slot || 0,
        blockHeight: utxo.blockHeight || 0,
        timestamp: new Date(),
        data: proposal
      });
    }

    // Detect new votes
    const newVotes = newState.voteRecords.filter(newVote => 
      !oldState.voteRecords.some(oldVote => 
        oldVote.voter === newVote.voter && 
        oldVote.proposalId === newVote.proposalId &&
        oldVote.votedAtSlot === newVote.votedAtSlot
      )
    );

    for (const vote of newVotes) {
      this.emitEvent({
        type: 'VoteCast',
        proposalId: vote.proposalId,
        voter: vote.voter,
        transactionHash: utxo.txHash,
        slot: utxo.slot || 0,
        blockHeight: utxo.blockHeight || 0,
        timestamp: new Date(),
        data: vote
      });
    }

    // Detect executed proposals
    const executedProposals = newState.proposals.filter(newProposal => {
      const oldProposal = oldState.proposals.find(p => p.proposalId === newProposal.proposalId);
      return oldProposal && !oldProposal.executed && newProposal.executed;
    });

    for (const proposal of executedProposals) {
      this.emitEvent({
        type: 'ProposalExecuted',
        proposalId: proposal.proposalId,
        transactionHash: utxo.txHash,
        slot: utxo.slot || 0,
        blockHeight: utxo.blockHeight || 0,
        timestamp: new Date(),
        data: proposal
      });
    }

    // Detect status changes
    for (const newProposal of newState.proposals) {
      const oldProposal = oldState.proposals.find(p => p.proposalId === newProposal.proposalId);
      if (oldProposal && oldProposal.status !== newProposal.status) {
        if (newProposal.status === 'Cancelled') {
          this.emitEvent({
            type: 'ProposalCancelled',
            proposalId: newProposal.proposalId,
            transactionHash: utxo.txHash,
            slot: utxo.slot || 0,
            blockHeight: utxo.blockHeight || 0,
            timestamp: new Date(),
            data: { oldStatus: oldProposal.status, newStatus: newProposal.status }
          });
        } else if (newProposal.status === 'Expired') {
          this.emitEvent({
            type: 'ProposalExpired',
            proposalId: newProposal.proposalId,
            transactionHash: utxo.txHash,
            slot: utxo.slot || 0,
            blockHeight: utxo.blockHeight || 0,
            timestamp: new Date(),
            data: { oldStatus: oldProposal.status, newStatus: newProposal.status }
          });
        }
      }
    }
  }

  private emitEvent(event: GovernanceEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in event listener for ${event.type}:`, error);
      }
    }

    // Emit to all listeners
    const allListeners = this.eventListeners.get('*') || [];
    for (const listener of allListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in wildcard event listener:`, error);
      }
    }

    console.log(`Governance event emitted: ${event.type}`, event);
  }

  private updateAnalytics(): void {
    if (!this.currentState) return;

    const proposals = this.currentState.proposals;
    const voteRecords = this.currentState.voteRecords;

    // Calculate success rate
    const completedProposals = proposals.filter(p => p.status === 'Executed' || p.status === 'Failed');
    const successRate = completedProposals.length > 0 ? 
      (proposals.filter(p => p.status === 'Executed').length / completedProposals.length) * 100 : 0;

    // Calculate average participation
    const averageParticipation = proposals.length > 0 ? 
      proposals.reduce((sum, p) => sum + p.participationRate, 0) / proposals.length : 0;

    // Calculate top voters
    const voterStats = new Map<Address, { votes: number; power: bigint; proposals: Set<number> }>();
    
    for (const record of voteRecords) {
      if (!voterStats.has(record.voter)) {
        voterStats.set(record.voter, { votes: 0, power: 0n, proposals: new Set() });
      }
      const stats = voterStats.get(record.voter)!;
      stats.votes++;
      stats.power += record.votingPower;
      stats.proposals.add(record.proposalId);
    }

    const topVoters = Array.from(voterStats.entries())
      .map(([address, stats]) => ({
        address,
        totalVotes: stats.votes,
        totalVotingPower: stats.power,
        participationRate: proposals.length > 0 ? (stats.proposals.size / proposals.length) * 100 : 0
      }))
      .sort((a, b) => b.totalVotes - a.totalVotes)
      .slice(0, 10);

    // Calculate proposals by type
    const proposalsByType = new Map<string, number>();
    for (const proposal of proposals) {
      const count = proposalsByType.get(proposal.action.type) || 0;
      proposalsByType.set(proposal.action.type, count + 1);
    }

    this.analytics = {
      totalProposals: this.currentState.totalProposals,
      successRate,
      averageParticipation,
      averageExecutionTime: 0, // Would need to calculate from execution times
      topVoters,
      proposalsByType,
      votingTrends: [] // Would need historical data
    };
  }

  private checkNotifications(): void {
    const proposalsRequiringAttention = this.getProposalsRequiringAttention();
    
    for (const proposal of proposalsRequiringAttention) {
      // This would integrate with notification system
      console.log(`Proposal ${proposal.proposalId} requires attention:`, {
        title: proposal.title,
        timeRemaining: proposal.timeRemaining,
        participationRate: proposal.participationRate,
        riskLevel: proposal.action.riskLevel
      });
    }
  }

  private startPeriodicUpdates(): void {
    if (!this.isMonitoring) return;

    setTimeout(async () => {
      try {
        this.updateProposalCalculatedFields();
        this.updateAnalytics();
        
        if (this.config.enableNotifications) {
          this.checkNotifications();
        }
        
        this.startPeriodicUpdates();
      } catch (error) {
        console.error("Error in periodic governance update:", error);
        if (this.isMonitoring) {
          this.startPeriodicUpdates();
        }
      }
    }, this.config.pollingInterval);
  }

  private startAnalyticsUpdates(): void {
    if (!this.isMonitoring) return;

    setTimeout(async () => {
      try {
        this.updateAnalytics();
        this.startAnalyticsUpdates();
      } catch (error) {
        console.error("Error in analytics update:", error);
        if (this.isMonitoring) {
          this.startAnalyticsUpdates();
        }
      }
    }, this.config.pollingInterval * 5); // Update analytics less frequently
  }
}
