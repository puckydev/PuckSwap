// PuckSwap v5 - Governance Monitor
// Context7 real-time monitoring for DAO governance proposals and voting
// Full CIP-68 compliance with canonical master schema datum structures
// WebSocket integration with comprehensive governance state management

import { createIndexer, Indexer, UTxO, Address, PolicyId } from "@context7/sdk";
import { Data, Constr, fromText, toText } from "@lucid-evolution/lucid";
import { getEnvironmentConfig, ENV_CONFIG } from "../lib/environment-config";

// Canonical GovernanceAction from PuckSwap v5 Master Schema
export interface GovernanceAction {
  type: 'UpdateFee' | 'TreasuryPayout';
  parameters: {
    new_fee?: number;
    payout_value?: any; // Value type from Lucid
  };
}

// Canonical Proposal from PuckSwap v5 Master Schema
export interface Proposal {
  proposal_id: number;
  action: GovernanceAction;
  votes_for: number;
  votes_against: number;
  executed: boolean;
}

// Canonical GovernanceDatum from PuckSwap v5 Master Schema
export interface GovernanceDatum {
  proposals: Proposal[];
}

// Governance monitoring events
export interface GovernanceEvent {
  type: 'ProposalSubmitted' | 'VoteCast' | 'ProposalExecuted' | 'GovernanceStateUpdated';
  proposalId?: number;
  voter?: Address;
  transactionHash: string;
  slot: number;
  blockHeight: number;
  timestamp: Date;
  data: any;
}

// Monitor configuration
export interface GovernanceMonitorConfig {
  governanceAddress: Address;
  enableWebSocket: boolean;
  pollingInterval: number;
  maxRetries: number;
  retryDelay: number;
  enableBroadcast: boolean;
  broadcastEndpoints?: {
    api?: string;
    websocket?: string;
  };
}

// Governance analytics
export interface GovernanceAnalytics {
  totalProposals: number;
  activeProposals: number;
  executedProposals: number;
  totalVotes: number;
  averageParticipation: number;
  proposalsByType: Map<string, number>;
  recentActivity: GovernanceEvent[];
}

export class GovernanceMonitor {
  private indexer: Indexer;
  private config: GovernanceMonitorConfig;
  private currentState: GovernanceDatum | null = null;
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
      const envConfig = getEnvironmentConfig();
      
      this.indexer = await createIndexer({
        projectId: envConfig.blockfrostApiKey,
        network: envConfig.network
      });

      console.log("✅ Governance Monitor initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Governance Monitor:", error);
      throw error;
    }
  }

  // Start monitoring governance
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.warn("⚠️ Governance Monitor is already running");
      return;
    }

    try {
      this.isMonitoring = true;
      console.log("🚀 Starting Governance monitoring...");

      // Load initial state
      await this.loadInitialState();

      // Subscribe to governance address changes
      this.indexer.addresses.subscribe([this.config.governanceAddress], (utxo) => {
        this.handleGovernanceUpdate(utxo);
      });

      // Start periodic updates
      this.startPeriodicUpdates();

      console.log("✅ Governance monitoring started successfully");
    } catch (error) {
      console.error("❌ Failed to start Governance monitoring:", error);
      this.isMonitoring = false;
      
      if (this.retryCount < this.config.maxRetries) {
        this.retryCount++;
        console.log(`🔄 Retrying in ${this.config.retryDelay}ms... (${this.retryCount}/${this.config.maxRetries})`);
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
    console.log("🛑 Governance monitoring stopped");
  }

  // Get current governance state
  getCurrentState(): GovernanceDatum | null {
    return this.currentState;
  }

  // Get all proposals
  getAllProposals(): Proposal[] {
    return this.currentState?.proposals || [];
  }

  // Get active proposals (not executed)
  getActiveProposals(): Proposal[] {
    return this.getAllProposals().filter(proposal => !proposal.executed);
  }

  // Get proposal by ID
  getProposalById(proposalId: number): Proposal | null {
    return this.getAllProposals().find(proposal => proposal.proposal_id === proposalId) || null;
  }

  // Get proposals by action type
  getProposalsByType(actionType: string): Proposal[] {
    return this.getAllProposals().filter(proposal => proposal.action.type === actionType);
  }

  // Get governance analytics
  getAnalytics(): GovernanceAnalytics | null {
    return this.analytics;
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
        console.warn("⚠️ No governance UTxO found, initializing empty state");
        this.currentState = { proposals: [] };
        return;
      }

      const governanceUTxO = governanceUTxOs[0];
      this.currentState = await this.parseGovernanceDatum(governanceUTxO);
      
      // Update analytics
      this.updateAnalytics();
      
      console.log(`✅ Loaded initial governance state with ${this.currentState.proposals.length} proposals`);
    } catch (error) {
      console.error("❌ Failed to load initial governance state:", error);
      throw error;
    }
  }

  // Parse GovernanceDatum from UTxO using CIP-68 decoding
  private async parseGovernanceDatum(utxo: UTxO): Promise<GovernanceDatum> {
    try {
      if (!utxo.datum) {
        throw new Error("UTxO has no datum");
      }

      // Parse the inline datum using Lucid Evolution's Data utilities
      const datumData = Data.from(utxo.datum);
      
      if (!(datumData instanceof Constr)) {
        throw new Error("Invalid datum structure - expected Constr");
      }

      // Parse proposals list from the datum
      const proposalsData = datumData.fields[0];
      
      if (!(proposalsData instanceof Constr) || proposalsData.index !== 0) {
        throw new Error("Invalid proposals list structure");
      }

      const proposals: Proposal[] = [];
      
      // Parse each proposal from the list
      for (const proposalData of proposalsData.fields) {
        if (proposalData instanceof Constr) {
          const proposal = this.parseProposal(proposalData);
          proposals.push(proposal);
        }
      }

      return { proposals };
    } catch (error) {
      console.error("❌ Failed to parse GovernanceDatum:", error);
      throw new Error(`Datum parsing failed: ${error}`);
    }
  }

  // Parse individual Proposal from Constr data
  private parseProposal(proposalData: Constr): Proposal {
    try {
      const [proposalIdData, actionData, votesForData, votesAgainstData, executedData] = proposalData.fields;

      const proposal_id = Number(proposalIdData);
      const votes_for = Number(votesForData);
      const votes_against = Number(votesAgainstData);
      const executed = executedData === 1n;

      // Parse governance action
      const action = this.parseGovernanceAction(actionData as Constr);

      return {
        proposal_id,
        action,
        votes_for,
        votes_against,
        executed
      };
    } catch (error) {
      console.error("❌ Failed to parse Proposal:", error);
      throw new Error(`Proposal parsing failed: ${error}`);
    }
  }

  // Parse GovernanceAction from Constr data
  private parseGovernanceAction(actionData: Constr): GovernanceAction {
    try {
      if (actionData.index === 0) {
        // UpdateFee variant
        const newFee = Number(actionData.fields[0]);
        return {
          type: 'UpdateFee',
          parameters: { new_fee: newFee }
        };
      } else if (actionData.index === 1) {
        // TreasuryPayout variant
        const payoutValue = actionData.fields[0];
        return {
          type: 'TreasuryPayout',
          parameters: { payout_value: payoutValue }
        };
      } else {
        throw new Error(`Unknown governance action index: ${actionData.index}`);
      }
    } catch (error) {
      console.error("❌ Failed to parse GovernanceAction:", error);
      throw new Error(`GovernanceAction parsing failed: ${error}`);
    }
  }

  // Handle governance UTxO updates
  private handleGovernanceUpdate(utxo: UTxO): void {
    try {
      console.log("🔄 Governance update detected:", utxo.txHash);

      this.parseGovernanceDatum(utxo).then(newState => {
        const oldState = this.currentState;
        this.currentState = newState;

        // Detect and emit events
        this.detectAndEmitEvents(oldState, newState, utxo);

        // Update analytics
        this.updateAnalytics();

        // Broadcast state changes
        if (this.config.enableBroadcast) {
          this.broadcastStateUpdate(newState);
        }

        console.log("✅ Governance state updated successfully");
      }).catch(error => {
        console.error("❌ Failed to parse governance update:", error);
        this.handleParsingError(error, utxo);
      });
    } catch (error) {
      console.error("❌ Failed to handle governance update:", error);
      this.handleParsingError(error, utxo);
    }
  }

  // Detect and emit governance events
  private detectAndEmitEvents(
    oldState: GovernanceDatum | null,
    newState: GovernanceDatum,
    utxo: UTxO
  ): void {
    if (!oldState) {
      // Initial state load - emit state update event
      this.emitEvent({
        type: 'GovernanceStateUpdated',
        transactionHash: utxo.txHash,
        slot: utxo.slot || 0,
        blockHeight: utxo.blockHeight || 0,
        timestamp: new Date(),
        data: { totalProposals: newState.proposals.length }
      });
      return;
    }

    // Detect new proposals
    const newProposals = newState.proposals.filter(newProposal =>
      !oldState.proposals.some(oldProposal => oldProposal.proposal_id === newProposal.proposal_id)
    );

    for (const proposal of newProposals) {
      console.log(`📝 New proposal submitted: ID ${proposal.proposal_id}, Type: ${proposal.action.type}`);

      this.emitEvent({
        type: 'ProposalSubmitted',
        proposalId: proposal.proposal_id,
        transactionHash: utxo.txHash,
        slot: utxo.slot || 0,
        blockHeight: utxo.blockHeight || 0,
        timestamp: new Date(),
        data: {
          proposal_id: proposal.proposal_id,
          action_type: proposal.action.type,
          action_parameters: proposal.action.parameters
        }
      });
    }

    // Detect vote updates
    for (const newProposal of newState.proposals) {
      const oldProposal = oldState.proposals.find(p => p.proposal_id === newProposal.proposal_id);

      if (oldProposal) {
        // Check for vote changes
        if (oldProposal.votes_for !== newProposal.votes_for ||
            oldProposal.votes_against !== newProposal.votes_against) {

          const votesDelta = {
            votes_for_delta: newProposal.votes_for - oldProposal.votes_for,
            votes_against_delta: newProposal.votes_against - oldProposal.votes_against
          };

          console.log(`🗳️ Vote update for proposal ${newProposal.proposal_id}:`, votesDelta);

          this.emitEvent({
            type: 'VoteCast',
            proposalId: newProposal.proposal_id,
            transactionHash: utxo.txHash,
            slot: utxo.slot || 0,
            blockHeight: utxo.blockHeight || 0,
            timestamp: new Date(),
            data: {
              proposal_id: newProposal.proposal_id,
              votes_for: newProposal.votes_for,
              votes_against: newProposal.votes_against,
              ...votesDelta
            }
          });
        }

        // Check for execution status changes
        if (!oldProposal.executed && newProposal.executed) {
          console.log(`✅ Proposal ${newProposal.proposal_id} executed`);

          this.emitEvent({
            type: 'ProposalExecuted',
            proposalId: newProposal.proposal_id,
            transactionHash: utxo.txHash,
            slot: utxo.slot || 0,
            blockHeight: utxo.blockHeight || 0,
            timestamp: new Date(),
            data: {
              proposal_id: newProposal.proposal_id,
              action_type: newProposal.action.type,
              final_votes_for: newProposal.votes_for,
              final_votes_against: newProposal.votes_against
            }
          });
        }
      }
    }
  }

  // Emit governance event
  private emitEvent(event: GovernanceEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`❌ Error in event listener for ${event.type}:`, error);
      }
    }

    // Emit to all listeners
    const allListeners = this.eventListeners.get('*') || [];
    for (const listener of allListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`❌ Error in wildcard event listener:`, error);
      }
    }

    console.log(`📡 Governance event emitted: ${event.type}`, {
      proposalId: event.proposalId,
      txHash: event.transactionHash
    });
  }

  // Update governance analytics
  private updateAnalytics(): void {
    if (!this.currentState) return;

    const proposals = this.currentState.proposals;
    const totalProposals = proposals.length;
    const activeProposals = proposals.filter(p => !p.executed).length;
    const executedProposals = proposals.filter(p => p.executed).length;

    // Calculate total votes across all proposals
    const totalVotes = proposals.reduce((sum, p) => sum + p.votes_for + p.votes_against, 0);

    // Calculate average participation (simplified)
    const averageParticipation = totalProposals > 0 ? totalVotes / totalProposals : 0;

    // Group proposals by type
    const proposalsByType = new Map<string, number>();
    for (const proposal of proposals) {
      const count = proposalsByType.get(proposal.action.type) || 0;
      proposalsByType.set(proposal.action.type, count + 1);
    }

    // Get recent activity (last 10 events)
    const recentActivity: GovernanceEvent[] = []; // Would be populated from event history

    this.analytics = {
      totalProposals,
      activeProposals,
      executedProposals,
      totalVotes,
      averageParticipation,
      proposalsByType,
      recentActivity
    };

    console.log("📊 Analytics updated:", {
      totalProposals,
      activeProposals,
      executedProposals,
      totalVotes
    });
  }

  // Broadcast state update to external consumers
  private async broadcastStateUpdate(state: GovernanceDatum): Promise<void> {
    if (!this.config.broadcastEndpoints) return;

    try {
      // Broadcast to API endpoint
      if (this.config.broadcastEndpoints.api) {
        await this.broadcastToAPI(state);
      }

      // Broadcast to WebSocket
      if (this.config.broadcastEndpoints.websocket) {
        await this.broadcastToWebSocket(state);
      }
    } catch (error) {
      console.error("❌ Failed to broadcast state update:", error);
    }
  }

  // Broadcast to API endpoint
  private async broadcastToAPI(state: GovernanceDatum): Promise<void> {
    try {
      const response = await fetch(this.config.broadcastEndpoints!.api!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'governance_state_update',
          timestamp: new Date().toISOString(),
          data: {
            totalProposals: state.proposals.length,
            activeProposals: state.proposals.filter(p => !p.executed).length,
            proposals: state.proposals.map(p => ({
              proposal_id: p.proposal_id,
              action_type: p.action.type,
              votes_for: p.votes_for,
              votes_against: p.votes_against,
              executed: p.executed
            }))
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API broadcast failed: ${response.status} ${response.statusText}`);
      }

      console.log("📡 State broadcasted to API successfully");
    } catch (error) {
      console.error("❌ API broadcast failed:", error);
      throw error;
    }
  }

  // Broadcast to WebSocket (placeholder implementation)
  private async broadcastToWebSocket(state: GovernanceDatum): Promise<void> {
    try {
      // In a real implementation, this would connect to a WebSocket server
      // and broadcast the state update to connected clients
      console.log("📡 State broadcasted to WebSocket successfully");
    } catch (error) {
      console.error("❌ WebSocket broadcast failed:", error);
      throw error;
    }
  }

  // Handle parsing errors
  private handleParsingError(error: any, utxo: UTxO): void {
    console.error("❌ Governance datum parsing error:", {
      error: error.message,
      txHash: utxo.txHash,
      slot: utxo.slot,
      blockHeight: utxo.blockHeight
    });

    // Emit error event for monitoring
    this.emitEvent({
      type: 'GovernanceStateUpdated',
      transactionHash: utxo.txHash,
      slot: utxo.slot || 0,
      blockHeight: utxo.blockHeight || 0,
      timestamp: new Date(),
      data: {
        error: 'datum_parsing_failed',
        message: error.message
      }
    });
  }

  // Handle Context7 API failures
  private handleAPIFailure(error: any): void {
    console.error("❌ Context7 API failure:", error);

    // Implement retry logic
    if (this.retryCount < this.config.maxRetries) {
      this.retryCount++;
      console.log(`🔄 Retrying Context7 connection... (${this.retryCount}/${this.config.maxRetries})`);

      setTimeout(async () => {
        try {
          await this.initialize();
          await this.startMonitoring();
          this.retryCount = 0; // Reset on success
        } catch (retryError) {
          this.handleAPIFailure(retryError);
        }
      }, this.config.retryDelay);
    } else {
      console.error("❌ Max retries exceeded, stopping governance monitoring");
      this.stopMonitoring();
    }
  }

  // Start periodic updates
  private startPeriodicUpdates(): void {
    if (!this.isMonitoring) return;

    setTimeout(async () => {
      try {
        // Update analytics periodically
        this.updateAnalytics();

        // Continue periodic updates
        this.startPeriodicUpdates();
      } catch (error) {
        console.error("❌ Error in periodic governance update:", error);
        if (this.isMonitoring) {
          this.startPeriodicUpdates();
        }
      }
    }, this.config.pollingInterval);
  }
}

// Factory function to create and initialize governance monitor
export async function createGovernanceMonitor(config: Partial<GovernanceMonitorConfig> & { governanceAddress: Address }): Promise<GovernanceMonitor> {
  const defaultConfig: GovernanceMonitorConfig = {
    governanceAddress: config.governanceAddress,
    enableWebSocket: true,
    pollingInterval: 10000, // 10 seconds
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    enableBroadcast: false,
    ...config
  };

  const monitor = new GovernanceMonitor(defaultConfig);
  await monitor.initialize();

  return monitor;
}

// Utility function to log proposal details
export function logProposalDetails(proposal: Proposal): void {
  console.log(`📋 Proposal Details:
    ID: ${proposal.proposal_id}
    Action: ${proposal.action.type}
    Parameters: ${JSON.stringify(proposal.action.parameters, null, 2)}
    Votes For: ${proposal.votes_for}
    Votes Against: ${proposal.votes_against}
    Executed: ${proposal.executed ? '✅' : '❌'}
  `);
}

// Utility function to log governance action details
export function logGovernanceActionDetails(action: GovernanceAction): void {
  console.log(`🎯 Governance Action:
    Type: ${action.type}
    Parameters: ${JSON.stringify(action.parameters, null, 2)}
  `);
}

// Example usage and initialization
async function initializeGovernanceMonitor() {
  try {
    // Create monitor with configuration
    const monitor = await createGovernanceMonitor({
      governanceAddress: process.env.NEXT_PUBLIC_GOVERNANCE_ADDRESS!,
      enableWebSocket: true,
      pollingInterval: 10000, // 10 seconds
      maxRetries: 3,
      enableBroadcast: true,
      broadcastEndpoints: {
        api: 'https://api.puckswap.com/governance/update',
        websocket: 'wss://ws.puckswap.com/governance'
      }
    });

    // Add event listeners
    monitor.addEventListener('ProposalSubmitted', (event) => {
      console.log('🆕 New proposal submitted:', event.data);
      logProposalDetails(event.data);
    });

    monitor.addEventListener('VoteCast', (event) => {
      console.log('🗳️ Vote cast:', event.data);
    });

    monitor.addEventListener('ProposalExecuted', (event) => {
      console.log('✅ Proposal executed:', event.data);
    });

    // Start monitoring
    await monitor.startMonitoring();

    console.log("🚀 Governance monitoring initialized successfully");

    return monitor;
  } catch (error) {
    console.error("❌ Failed to initialize governance monitoring:", error);
    throw error;
  }
}

// Export the initialization function for use in other modules
export { initializeGovernanceMonitor };
