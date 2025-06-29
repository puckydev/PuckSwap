// PuckSwap v5 - Liquid Staking Monitor
// Context7 real-time monitoring for StakingDatum state changes
// Full CIP-68 compliance with pADA token tracking and WebSocket broadcasting

import { createIndexer, Indexer, UTxO, Address, PolicyId } from "@context7/sdk";
import { Data, Constr, fromText, toText } from "@lucid-evolution/lucid";
import { getEnvironmentConfig, ENV_CONFIG } from "../lib/environment-config";

// Master Schema StakingDatum structure (CIP-68 compliant)
export interface StakingDatum {
  total_staked: bigint;
  total_pADA_minted: bigint;
  stake_pool_id: string;
  last_rewards_sync_slot: bigint;
}

// Staking event types for monitoring
export interface StakingEvent {
  type: 'deposit' | 'withdrawal' | 'reward_sync' | 'state_change';
  txHash: string;
  timestamp: number;
  blockHeight: number;
  slot: number;
  stakingDatum: StakingDatum;
  changes?: {
    total_staked_delta?: bigint;
    total_pADA_minted_delta?: bigint;
    rewards_synced?: boolean;
  };
}

// Staking analytics for dashboard display
export interface StakingAnalytics {
  totalValueLocked: bigint;
  totalPADASupply: bigint;
  exchangeRate: number; // ADA per pADA
  stakingAPY: number;
  lastRewardSync: Date;
  rewardSyncFrequency: number; // slots between syncs
  depositCount24h: number;
  withdrawalCount24h: number;
  volumeDeposited24h: bigint;
  volumeWithdrawn24h: bigint;
}

// Configuration interface for staking monitor
export interface StakingMonitorConfig {
  stakingAddress: Address;
  pADAPolicyId: PolicyId;
  blockfrostApiKey?: string;
  network?: "mainnet" | "preview" | "preprod";
  enableWebSocket?: boolean;
  pollingInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
  broadcastEndpoints?: {
    websocket?: string;
    api?: string;
    pubsub?: string;
  };
}

// Main StakingMonitor class for Context7 integration
export class StakingMonitor {
  private indexer: Indexer | null = null;
  private config: StakingMonitorConfig;
  private currentState: StakingDatum | null = null;
  private analytics: StakingAnalytics | null = null;
  private eventListeners: Map<string, ((event: StakingEvent) => void)[]> = new Map();
  private isMonitoring = false;
  private retryCount = 0;
  private wsConnection: WebSocket | null = null;

  constructor(config: StakingMonitorConfig) {
    // Apply environment configuration and defaults
    const envConfig = getEnvironmentConfig();
    this.config = {
      blockfrostApiKey: envConfig.blockfrostApiKey,
      network: envConfig.network,
      enableWebSocket: true,
      pollingInterval: 5000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
  }

  // Initialize the Context7 indexer
  async initialize(): Promise<void> {
    try {
      if (!this.config.blockfrostApiKey) {
        throw new Error("Blockfrost API key is required for Context7 indexer");
      }

      this.indexer = await createIndexer({
        projectId: this.config.blockfrostApiKey,
        network: this.config.network || "preview"
      });

      console.log("✅ StakingMonitor initialized successfully");
      console.log(`📍 Monitoring staking address: ${this.config.stakingAddress}`);
      console.log(`🪙 Tracking pADA policy: ${this.config.pADAPolicyId}`);
    } catch (error) {
      console.error("❌ Failed to initialize StakingMonitor:", error);
      throw new Error(`StakingMonitor initialization failed: ${error}`);
    }
  }

  // Start monitoring liquid staking validator
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.warn("⚠️ StakingMonitor is already running");
      return;
    }

    if (!this.indexer) {
      throw new Error("StakingMonitor not initialized. Call initialize() first.");
    }

    try {
      this.isMonitoring = true;
      console.log("🚀 Starting liquid staking monitoring...");

      // Load initial staking state
      await this.loadInitialState();

      // Subscribe to liquid staking validator address changes
      this.indexer.addresses.subscribe([this.config.stakingAddress], (utxo) => {
        this.handleStakingValidatorUpdate(utxo);
      });

      // Monitor pADA token policy for minting/burning events
      this.indexer.policies.subscribe([this.config.pADAPolicyId], (utxo) => {
        this.handlePADATokenUpdate(utxo);
      });

      // Initialize WebSocket connection if enabled
      if (this.config.enableWebSocket) {
        await this.initializeWebSocket();
      }

      // Start periodic analytics updates
      this.startPeriodicUpdates();

      console.log("✅ Liquid staking monitoring started successfully");
      this.emitEvent('monitoring_started', {
        type: 'state_change',
        txHash: 'system',
        timestamp: Date.now(),
        blockHeight: 0,
        slot: 0,
        stakingDatum: this.currentState!
      });

    } catch (error) {
      console.error("❌ Failed to start liquid staking monitoring:", error);
      this.isMonitoring = false;
      
      if (this.retryCount < (this.config.maxRetries || 3)) {
        this.retryCount++;
        const retryDelay = this.config.retryDelay || 1000;
        console.log(`🔄 Retrying in ${retryDelay}ms... (${this.retryCount}/${this.config.maxRetries})`);
        setTimeout(() => this.startMonitoring(), retryDelay);
      } else {
        throw new Error(`StakingMonitor failed to start after ${this.config.maxRetries} attempts: ${error}`);
      }
    }
  }

  // Stop monitoring
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    // Close WebSocket connection
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }

    console.log("🛑 Liquid staking monitoring stopped");
  }

  // Get current staking state
  getCurrentState(): StakingDatum | null {
    return this.currentState;
  }

  // Get staking analytics
  getAnalytics(): StakingAnalytics | null {
    return this.analytics;
  }

  // Get current exchange rate (ADA per pADA)
  getCurrentExchangeRate(): number {
    if (!this.currentState || this.currentState.total_pADA_minted === 0n) {
      return 1.0; // Initial 1:1 ratio
    }
    
    return Number(this.currentState.total_staked) / Number(this.currentState.total_pADA_minted);
  }

  // Get total value locked in ADA
  getTotalValueLocked(): bigint {
    return this.currentState?.total_staked || 0n;
  }

  // Get total pADA supply
  getTotalPADASupply(): bigint {
    return this.currentState?.total_pADA_minted || 0n;
  }

  // Add event listener for staking events
  addEventListener(eventType: string, callback: (event: StakingEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  // Remove event listener
  removeEventListener(eventType: string, callback: (event: StakingEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Private methods for internal operations

  // Load initial staking state from blockchain
  private async loadInitialState(): Promise<void> {
    try {
      if (!this.indexer) {
        throw new Error("Indexer not initialized");
      }

      const stakingUTxOs = await this.indexer.utxos.byAddress(this.config.stakingAddress);
      
      if (stakingUTxOs.length === 0) {
        throw new Error(`No UTxOs found at staking address: ${this.config.stakingAddress}`);
      }

      // Find the UTxO with the staking datum (typically the first one)
      const stakingUTxO = stakingUTxOs[0];
      this.currentState = await this.parseStakingDatum(stakingUTxO);
      
      // Initialize analytics
      this.updateAnalytics();
      
      console.log(`📊 Loaded initial staking state:`);
      console.log(`   💰 Total Staked: ${Number(this.currentState.total_staked) / 1_000_000} ADA`);
      console.log(`   🪙 Total pADA Minted: ${Number(this.currentState.total_pADA_minted) / 1_000_000} pADA`);
      console.log(`   🏊 Stake Pool: ${this.currentState.stake_pool_id}`);
      console.log(`   🔄 Last Rewards Sync: Slot ${this.currentState.last_rewards_sync_slot}`);
      
    } catch (error) {
      console.error("❌ Failed to load initial staking state:", error);
      throw new Error(`Failed to load initial staking state: ${error}`);
    }
  }

  // Parse StakingDatum from UTxO using CIP-68 decoding
  private async parseStakingDatum(utxo: UTxO): Promise<StakingDatum> {
    try {
      if (!utxo.datum) {
        throw new Error("UTxO has no datum");
      }

      // Decode the CIP-68 datum structure
      // Expected structure: Constr(0, [total_staked, total_pADA_minted, stake_pool_id, last_rewards_sync_slot])
      const decodedDatum = Data.from(utxo.datum);
      
      if (!(decodedDatum instanceof Constr) || decodedDatum.index !== 0) {
        throw new Error("Invalid StakingDatum structure");
      }

      const fields = decodedDatum.fields;
      if (fields.length !== 4) {
        throw new Error(`Expected 4 fields in StakingDatum, got ${fields.length}`);
      }

      // Extract fields according to master schema
      const total_staked = BigInt(fields[0] as string);
      const total_pADA_minted = BigInt(fields[1] as string);
      const stake_pool_id = toText(fields[2] as string);
      const last_rewards_sync_slot = BigInt(fields[3] as string);

      return {
        total_staked,
        total_pADA_minted,
        stake_pool_id,
        last_rewards_sync_slot
      };

    } catch (error) {
      console.error("❌ Failed to parse StakingDatum:", error);
      throw new Error(`StakingDatum parsing failed: ${error}`);
    }
  }

  // Handle staking validator UTxO updates
  private handleStakingValidatorUpdate(utxo: UTxO): void {
    try {
      console.log(`🔄 Staking validator update detected: ${utxo.txHash}`);

      this.parseStakingDatum(utxo).then(newState => {
        const oldState = this.currentState;
        this.currentState = newState;

        // Detect and emit specific events
        this.detectAndEmitStakingEvents(oldState, newState, utxo);

        // Update analytics
        this.updateAnalytics();

        // Broadcast state update
        this.broadcastStakingState(newState, utxo);

      }).catch(error => {
        console.error("❌ Failed to parse staking validator update:", error);
        this.emitEvent('error', {
          type: 'state_change',
          txHash: utxo.txHash,
          timestamp: Date.now(),
          blockHeight: utxo.blockHeight || 0,
          slot: utxo.slot || 0,
          stakingDatum: this.currentState!,
          changes: { error: error.message }
        });
      });
    } catch (error) {
      console.error("❌ Failed to handle staking validator update:", error);
    }
  }

  // Handle pADA token policy updates (minting/burning)
  private handlePADATokenUpdate(utxo: UTxO): void {
    try {
      console.log(`🪙 pADA token update detected: ${utxo.txHash}`);

      // Analyze pADA minting/burning events
      this.analyzePADATokenMovement(utxo);
    } catch (error) {
      console.error("❌ Failed to handle pADA token update:", error);
    }
  }

  // Analyze pADA token movements to detect deposits/withdrawals
  private analyzePADATokenMovement(utxo: UTxO): void {
    try {
      const pADAAssets = Object.entries(utxo.assets || {}).filter(([unit]) =>
        unit.startsWith(this.config.pADAPolicyId)
      );

      for (const [unit, amount] of pADAAssets) {
        const amountBigInt = BigInt(amount);

        if (amountBigInt > 0) {
          // pADA minting - indicates a deposit
          console.log(`💰 pADA minting detected: ${Number(amountBigInt) / 1_000_000} pADA`);
          this.emitEvent('deposit', {
            type: 'deposit',
            txHash: utxo.txHash,
            timestamp: Date.now(),
            blockHeight: utxo.blockHeight || 0,
            slot: utxo.slot || 0,
            stakingDatum: this.currentState!,
            changes: {
              total_pADA_minted_delta: amountBigInt
            }
          });
        } else if (amountBigInt < 0) {
          // pADA burning - indicates a withdrawal
          console.log(`🔥 pADA burning detected: ${Number(-amountBigInt) / 1_000_000} pADA`);
          this.emitEvent('withdrawal', {
            type: 'withdrawal',
            txHash: utxo.txHash,
            timestamp: Date.now(),
            blockHeight: utxo.blockHeight || 0,
            slot: utxo.slot || 0,
            stakingDatum: this.currentState!,
            changes: {
              total_pADA_minted_delta: amountBigInt
            }
          });
        }
      }
    } catch (error) {
      console.error("❌ Failed to analyze pADA token movement:", error);
    }
  }

  // Detect and emit staking events based on state changes
  private detectAndEmitStakingEvents(
    oldState: StakingDatum | null,
    newState: StakingDatum,
    utxo: UTxO
  ): void {
    if (!oldState) {
      // First state load
      console.log("📊 Initial staking state loaded");
      return;
    }

    // Detect stake deposits (total_staked increased)
    if (newState.total_staked > oldState.total_staked) {
      const depositAmount = newState.total_staked - oldState.total_staked;
      console.log(`💰 Deposit detected: ${Number(depositAmount) / 1_000_000} ADA`);

      this.emitEvent('deposit', {
        type: 'deposit',
        txHash: utxo.txHash,
        timestamp: Date.now(),
        blockHeight: utxo.blockHeight || 0,
        slot: utxo.slot || 0,
        stakingDatum: newState,
        changes: {
          total_staked_delta: depositAmount,
          total_pADA_minted_delta: newState.total_pADA_minted - oldState.total_pADA_minted
        }
      });
    }

    // Detect withdrawals (total_pADA_minted decreased)
    if (newState.total_pADA_minted < oldState.total_pADA_minted) {
      const withdrawnPADA = oldState.total_pADA_minted - newState.total_pADA_minted;
      console.log(`🔥 Withdrawal detected: ${Number(withdrawnPADA) / 1_000_000} pADA burned`);

      this.emitEvent('withdrawal', {
        type: 'withdrawal',
        txHash: utxo.txHash,
        timestamp: Date.now(),
        blockHeight: utxo.blockHeight || 0,
        slot: utxo.slot || 0,
        stakingDatum: newState,
        changes: {
          total_staked_delta: newState.total_staked - oldState.total_staked,
          total_pADA_minted_delta: -withdrawnPADA
        }
      });
    }

    // Detect reward sync events (last_rewards_sync_slot updated)
    if (newState.last_rewards_sync_slot > oldState.last_rewards_sync_slot) {
      console.log(`🔄 Reward sync detected: Slot ${newState.last_rewards_sync_slot}`);

      this.emitEvent('reward_sync', {
        type: 'reward_sync',
        txHash: utxo.txHash,
        timestamp: Date.now(),
        blockHeight: utxo.blockHeight || 0,
        slot: utxo.slot || 0,
        stakingDatum: newState,
        changes: {
          rewards_synced: true
        }
      });
    }

    // Detect stake pool changes
    if (newState.stake_pool_id !== oldState.stake_pool_id) {
      console.log(`🏊 Stake pool changed: ${oldState.stake_pool_id} → ${newState.stake_pool_id}`);

      this.emitEvent('state_change', {
        type: 'state_change',
        txHash: utxo.txHash,
        timestamp: Date.now(),
        blockHeight: utxo.blockHeight || 0,
        slot: utxo.slot || 0,
        stakingDatum: newState,
        changes: {
          stake_pool_changed: true
        }
      });
    }
  }

  // Emit events to registered listeners
  private emitEvent(eventType: string, event: StakingEvent): void {
    // Emit to specific event type listeners
    const listeners = this.eventListeners.get(eventType) || [];
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`❌ Error in event listener for ${eventType}:`, error);
      }
    }

    // Emit to wildcard listeners
    const allListeners = this.eventListeners.get('*') || [];
    for (const listener of allListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`❌ Error in wildcard event listener:`, error);
      }
    }

    console.log(`📡 Staking event emitted: ${eventType}`, {
      txHash: event.txHash,
      timestamp: new Date(event.timestamp).toISOString(),
      changes: event.changes
    });
  }

  // Update analytics based on current state
  private updateAnalytics(): void {
    if (!this.currentState) return;

    const exchangeRate = this.getCurrentExchangeRate();
    const currentTime = new Date();
    const lastSyncSlot = Number(this.currentState.last_rewards_sync_slot);
    const currentSlot = Math.floor(Date.now() / 1000); // Simplified slot calculation
    const slotsSinceLastSync = currentSlot - lastSyncSlot;

    // Calculate estimated APY based on reward sync frequency
    // This is a simplified calculation - real implementation would use historical data
    const estimatedAPY = slotsSinceLastSync > 432000 ? 4.5 : 5.2; // 4.5-5.2% APY range

    this.analytics = {
      totalValueLocked: this.currentState.total_staked,
      totalPADASupply: this.currentState.total_pADA_minted,
      exchangeRate,
      stakingAPY: estimatedAPY,
      lastRewardSync: new Date(lastSyncSlot * 1000),
      rewardSyncFrequency: 432000, // ~5 days in slots
      depositCount24h: 0, // Would be calculated from recent events
      withdrawalCount24h: 0, // Would be calculated from recent events
      volumeDeposited24h: 0n, // Would be calculated from recent events
      volumeWithdrawn24h: 0n // Would be calculated from recent events
    };

    console.log(`📊 Analytics updated - TVL: ${Number(this.analytics.totalValueLocked) / 1_000_000} ADA, Exchange Rate: ${exchangeRate.toFixed(4)}`);
  }

  // Broadcast staking state to consumers
  private async broadcastStakingState(stakingDatum: StakingDatum, utxo: UTxO): Promise<void> {
    try {
      const broadcastData = {
        stakingDatum,
        analytics: this.analytics,
        exchangeRate: this.getCurrentExchangeRate(),
        totalValueLocked: this.getTotalValueLocked(),
        totalPADASupply: this.getTotalPADASupply(),
        txHash: utxo.txHash,
        timestamp: Date.now(),
        blockHeight: utxo.blockHeight,
        slot: utxo.slot
      };

      // WebSocket broadcast
      if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
        this.wsConnection.send(JSON.stringify({
          type: 'staking_update',
          data: broadcastData
        }));
      }

      // API endpoint broadcast
      if (this.config.broadcastEndpoints?.api) {
        await fetch(this.config.broadcastEndpoints.api, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(broadcastData)
        });
      }

      // Pub/Sub broadcast (if configured)
      if (this.config.broadcastEndpoints?.pubsub) {
        // Implementation would depend on specific pub/sub system
        console.log("📡 Broadcasting to pub/sub:", this.config.broadcastEndpoints.pubsub);
      }

      console.log("📡 Staking state broadcasted successfully");
    } catch (error) {
      console.error("❌ Failed to broadcast staking state:", error);
    }
  }

  // Initialize WebSocket connection for real-time broadcasting
  private async initializeWebSocket(): Promise<void> {
    try {
      if (!this.config.broadcastEndpoints?.websocket) {
        console.log("📡 WebSocket endpoint not configured, skipping WebSocket initialization");
        return;
      }

      this.wsConnection = new WebSocket(this.config.broadcastEndpoints.websocket);

      this.wsConnection.onopen = () => {
        console.log("✅ WebSocket connection established");
      };

      this.wsConnection.onclose = () => {
        console.log("🔌 WebSocket connection closed");
        // Attempt to reconnect after delay
        if (this.isMonitoring) {
          setTimeout(() => this.initializeWebSocket(), 5000);
        }
      };

      this.wsConnection.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
      };

    } catch (error) {
      console.error("❌ Failed to initialize WebSocket:", error);
    }
  }

  // Start periodic analytics updates
  private startPeriodicUpdates(): void {
    if (!this.isMonitoring) return;

    const interval = this.config.pollingInterval || 5000;

    setTimeout(async () => {
      try {
        if (this.isMonitoring) {
          this.updateAnalytics();
          this.startPeriodicUpdates();
        }
      } catch (error) {
        console.error("❌ Error in periodic staking update:", error);
        if (this.isMonitoring) {
          this.startPeriodicUpdates();
        }
      }
    }, interval);
  }
}

// Factory function to create and initialize StakingMonitor
export async function createStakingMonitor(config: StakingMonitorConfig): Promise<StakingMonitor> {
  const monitor = new StakingMonitor(config);
  await monitor.initialize();
  return monitor;
}
