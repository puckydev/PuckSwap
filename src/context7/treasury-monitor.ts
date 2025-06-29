// PuckSwap v4 Enterprise - Treasury Monitor
// Context7 real-time monitoring for treasury revenue and distribution tracking
// WebSocket integration with comprehensive financial analytics

import { createIndexer, Indexer, UTxO, Address, PolicyId, Assets } from "@context7/sdk";

// Treasury monitoring interfaces
export interface TreasuryState {
  totalRevenueCollected: bigint;
  totalDistributed: bigint;
  currentBalance: Assets;
  revenueRecords: RevenueRecordState[];
  distributionRecords: DistributionRecordState[];
  lpRewardPercentage: number;
  developmentPercentage: number;
  governancePercentage: number;
  protocolPercentage: number;
  communityPercentage: number;
  governanceAddress: Address;
  autoDistributionEnabled: boolean;
  distributionThreshold: bigint;
  adminAddresses: Address[];
  emergencyAdmin: Address;
  paused: boolean;
  maxSingleDistribution: bigint;
  dailyDistributionLimit: bigint;
  lastDistributionSlot: number;
  supportedAssets: Array<{ policy: PolicyId; name: string }>;
}

export interface RevenueRecordState {
  source: RevenueSourceState;
  tokenPolicy: PolicyId;
  tokenName: string;
  amount: bigint;
  receivedAtSlot: number;
  transactionHash: string;
  // Calculated fields
  usdValue?: number;
  dailyTotal?: bigint;
  sourcePercentage?: number;
}

export interface RevenueSourceState {
  type: 'SwapFees' | 'RegistrationFees' | 'GovernanceFees' | 'LiquidityIncentives' | 'Other';
  poolId?: string;
  volume?: bigint;
  poolCount?: number;
  proposalCount?: number;
  lpRewards?: bigint;
  sourceType?: string;
  amount: bigint;
}

export interface DistributionRecordState {
  target: DistributionTargetState;
  tokenPolicy: PolicyId;
  tokenName: string;
  totalAmount: bigint;
  distributedAtSlot: number;
  transactionHash: string;
  governanceProposalId?: number;
  // Calculated fields
  usdValue?: number;
  recipientCount?: number;
  distributionEfficiency?: number;
}

export interface DistributionTargetState {
  type: 'LiquidityProviders' | 'DevelopmentFund' | 'GovernanceRewards' | 'ProtocolUpgrade' | 'CommunityGrants';
  poolId?: string;
  lpAddresses?: Address[];
  amounts?: bigint[];
  recipient?: Address;
  amount?: bigint;
  purpose?: string;
  voterAddresses?: Address[];
  votingRewards?: bigint[];
  upgradeFund?: Address;
  upgradeId?: string;
  grantRecipients?: Address[];
  grantAmounts?: bigint[];
  grantPurposes?: string[];
}

export interface TreasuryEvent {
  type: 'RevenueCollected' | 'RevenueDistributed' | 'AutoDistributionTriggered' | 
        'ConfigurationUpdated' | 'AssetAdded' | 'AssetRemoved' | 'EmergencyWithdraw' |
        'DistributionThresholdReached' | 'DailyLimitReached' | 'EmergencyPause' | 'EmergencyUnpause';
  transactionHash: string;
  slot: number;
  blockHeight: number;
  timestamp: Date;
  data: any;
}

export interface TreasuryAnalytics {
  totalRevenue: bigint;
  totalDistributed: bigint;
  currentTVL: bigint;
  revenueGrowthRate: number;
  distributionEfficiency: number;
  revenueBySource: Map<string, bigint>;
  distributionByTarget: Map<string, bigint>;
  monthlyRevenue: Array<{
    month: string;
    revenue: bigint;
    distributions: bigint;
    netGrowth: bigint;
  }>;
  topRevenueGenerators: Array<{
    poolId: string;
    revenue: bigint;
    percentage: number;
  }>;
  distributionHistory: Array<{
    date: Date;
    amount: bigint;
    target: string;
    efficiency: number;
  }>;
  assetBreakdown: Map<string, {
    balance: bigint;
    percentage: number;
    usdValue: number;
  }>;
}

export interface TreasuryMonitorConfig {
  treasuryAddress: Address;
  blockfrostApiKey: string;
  network: "mainnet" | "preview" | "preprod";
  webhookUrl?: string;
  enableWebSocket: boolean;
  pollingInterval: number;
  maxRetries: number;
  retryDelay: number;
  enableAlerts: boolean;
  alertThresholds: {
    lowBalanceThreshold: bigint;
    highDistributionThreshold: bigint;
    dailyLimitPercentage: number;
    suspiciousActivityThreshold: bigint;
  };
  priceOracle?: {
    enabled: boolean;
    apiKey?: string;
    updateInterval: number;
  };
}

export class TreasuryMonitor {
  private indexer: Indexer;
  private config: TreasuryMonitorConfig;
  private currentState: TreasuryState | null = null;
  private eventListeners: Map<string, ((event: TreasuryEvent) => void)[]> = new Map();
  private isMonitoring = false;
  private retryCount = 0;
  private analytics: TreasuryAnalytics | null = null;
  private priceCache: Map<string, number> = new Map();

  constructor(config: TreasuryMonitorConfig) {
    this.config = config;
  }

  // Initialize the monitor
  async initialize(): Promise<void> {
    try {
      this.indexer = await createIndexer({
        projectId: this.config.blockfrostApiKey,
        network: this.config.network
      });

      console.log("Treasury Monitor initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Treasury Monitor:", error);
      throw error;
    }
  }

  // Start monitoring treasury
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.warn("Treasury Monitor is already running");
      return;
    }

    try {
      this.isMonitoring = true;
      console.log("Starting Treasury monitoring...");

      // Load initial state
      await this.loadInitialState();

      // Subscribe to treasury address changes
      this.indexer.addresses.subscribe([this.config.treasuryAddress], (utxo) => {
        this.handleTreasuryUpdate(utxo);
      });

      // Start periodic updates and analytics
      this.startPeriodicUpdates();
      this.startAnalyticsUpdates();

      // Start price updates if enabled
      if (this.config.priceOracle?.enabled) {
        this.startPriceUpdates();
      }

      console.log("Treasury monitoring started successfully");
    } catch (error) {
      console.error("Failed to start Treasury monitoring:", error);
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
    console.log("Treasury monitoring stopped");
  }

  // Get current treasury state
  getCurrentState(): TreasuryState | null {
    return this.currentState;
  }

  // Get treasury balance
  getCurrentBalance(): Assets {
    return this.currentState?.currentBalance || {};
  }

  // Get revenue history
  getRevenueHistory(limit: number = 100): RevenueRecordState[] {
    return this.currentState?.revenueRecords
      .sort((a, b) => b.receivedAtSlot - a.receivedAtSlot)
      .slice(0, limit) || [];
  }

  // Get distribution history
  getDistributionHistory(limit: number = 100): DistributionRecordState[] {
    return this.currentState?.distributionRecords
      .sort((a, b) => b.distributedAtSlot - a.distributedAtSlot)
      .slice(0, limit) || [];
  }

  // Get revenue by source
  getRevenueBySource(): Map<string, bigint> {
    const revenueBySource = new Map<string, bigint>();
    
    if (!this.currentState) return revenueBySource;

    for (const record of this.currentState.revenueRecords) {
      const current = revenueBySource.get(record.source.type) || 0n;
      revenueBySource.set(record.source.type, current + record.amount);
    }

    return revenueBySource;
  }

  // Get distribution by target
  getDistributionByTarget(): Map<string, bigint> {
    const distributionByTarget = new Map<string, bigint>();
    
    if (!this.currentState) return distributionByTarget;

    for (const record of this.currentState.distributionRecords) {
      const current = distributionByTarget.get(record.target.type) || 0n;
      distributionByTarget.set(record.target.type, current + record.totalAmount);
    }

    return distributionByTarget;
  }

  // Get daily revenue
  getDailyRevenue(days: number = 30): Array<{ date: Date; revenue: bigint; distributions: bigint }> {
    if (!this.currentState) return [];

    const dailyData = new Map<string, { revenue: bigint; distributions: bigint }>();
    const now = new Date();

    // Initialize days
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyData.set(dateKey, { revenue: 0n, distributions: 0n });
    }

    // Aggregate revenue
    for (const record of this.currentState.revenueRecords) {
      const date = new Date(record.receivedAtSlot * 1000); // Convert slot to timestamp
      const dateKey = date.toISOString().split('T')[0];
      const data = dailyData.get(dateKey);
      if (data) {
        data.revenue += record.amount;
      }
    }

    // Aggregate distributions
    for (const record of this.currentState.distributionRecords) {
      const date = new Date(record.distributedAtSlot * 1000);
      const dateKey = date.toISOString().split('T')[0];
      const data = dailyData.get(dateKey);
      if (data) {
        data.distributions += record.totalAmount;
      }
    }

    return Array.from(dailyData.entries())
      .map(([dateStr, data]) => ({
        date: new Date(dateStr),
        revenue: data.revenue,
        distributions: data.distributions
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // Get treasury analytics
  getAnalytics(): TreasuryAnalytics | null {
    return this.analytics;
  }

  // Check if auto-distribution should trigger
  shouldTriggerAutoDistribution(): boolean {
    if (!this.currentState || !this.currentState.autoDistributionEnabled) {
      return false;
    }

    const adaBalance = BigInt(this.currentState.currentBalance[""] || "0");
    return adaBalance >= this.currentState.distributionThreshold;
  }

  // Get asset USD values
  getAssetUSDValues(): Map<string, number> {
    const values = new Map<string, number>();
    
    if (!this.currentState) return values;

    for (const [unit, amount] of Object.entries(this.currentState.currentBalance)) {
      const price = this.priceCache.get(unit) || 0;
      const value = Number(amount) * price;
      values.set(unit, value);
    }

    return values;
  }

  // Get total TVL in USD
  getTotalTVLUSD(): number {
    const assetValues = this.getAssetUSDValues();
    return Array.from(assetValues.values()).reduce((sum, value) => sum + value, 0);
  }

  // Add event listener
  addEventListener(eventType: string, callback: (event: TreasuryEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  // Remove event listener
  removeEventListener(eventType: string, callback: (event: TreasuryEvent) => void): void {
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
      const treasuryUTxOs = await this.indexer.utxos.byAddress(this.config.treasuryAddress);
      
      if (treasuryUTxOs.length === 0) {
        throw new Error("Treasury UTxO not found");
      }

      const treasuryUTxO = treasuryUTxOs[0];
      this.currentState = await this.parseTreasuryState(treasuryUTxO);
      
      // Calculate additional fields
      this.calculateAdditionalFields();
      
      console.log(`Loaded initial treasury state with ${this.currentState.revenueRecords.length} revenue records`);
    } catch (error) {
      console.error("Failed to load initial treasury state:", error);
      throw error;
    }
  }

  private async parseTreasuryState(utxo: UTxO): Promise<TreasuryState> {
    // Parse the treasury datum from UTxO
    // This would need to match the exact CIP-68 structure from the Aiken contract
    
    // Placeholder implementation
    return {
      totalRevenueCollected: 0n,
      totalDistributed: 0n,
      currentBalance: utxo.assets || {},
      revenueRecords: [],
      distributionRecords: [],
      lpRewardPercentage: 4000, // 40%
      developmentPercentage: 2000, // 20%
      governancePercentage: 1500, // 15%
      protocolPercentage: 1500, // 15%
      communityPercentage: 1000, // 10%
      governanceAddress: "placeholder_governance_address",
      autoDistributionEnabled: true,
      distributionThreshold: 1000000000n, // 1000 ADA
      adminAddresses: [],
      emergencyAdmin: "placeholder_emergency_admin",
      paused: false,
      maxSingleDistribution: 10000000000n, // 10,000 ADA
      dailyDistributionLimit: 50000000000n, // 50,000 ADA
      lastDistributionSlot: utxo.slot || 0,
      supportedAssets: [
        { policy: "", name: "" }, // ADA
        { policy: "placeholder_pucky_policy", name: "PUCKY" }
      ]
    };
  }

  private calculateAdditionalFields(): void {
    if (!this.currentState) return;

    // Calculate USD values for revenue records
    for (const record of this.currentState.revenueRecords) {
      const unit = record.tokenPolicy === "" ? "" : `${record.tokenPolicy}${record.tokenName}`;
      const price = this.priceCache.get(unit) || 0;
      record.usdValue = Number(record.amount) * price;
    }

    // Calculate USD values for distribution records
    for (const record of this.currentState.distributionRecords) {
      const unit = record.tokenPolicy === "" ? "" : `${record.tokenPolicy}${record.tokenName}`;
      const price = this.priceCache.get(unit) || 0;
      record.usdValue = Number(record.totalAmount) * price;
    }
  }

  private handleTreasuryUpdate(utxo: UTxO): void {
    try {
      console.log("Treasury update detected:", utxo.txHash);
      
      this.parseTreasuryState(utxo).then(newState => {
        const oldState = this.currentState;
        this.currentState = newState;
        
        // Calculate additional fields
        this.calculateAdditionalFields();
        
        // Detect and emit events
        this.detectAndEmitEvents(oldState, newState, utxo);
        
        // Update analytics
        this.updateAnalytics();
        
        // Check for alerts
        if (this.config.enableAlerts) {
          this.checkAlerts();
        }
      }).catch(error => {
        console.error("Failed to parse treasury update:", error);
      });
    } catch (error) {
      console.error("Failed to handle treasury update:", error);
    }
  }

  private detectAndEmitEvents(
    oldState: TreasuryState | null,
    newState: TreasuryState,
    utxo: UTxO
  ): void {
    if (!oldState) return;

    // Detect new revenue
    const newRevenue = newState.revenueRecords.filter(newRecord => 
      !oldState.revenueRecords.some(oldRecord => 
        oldRecord.transactionHash === newRecord.transactionHash &&
        oldRecord.receivedAtSlot === newRecord.receivedAtSlot
      )
    );

    for (const revenue of newRevenue) {
      this.emitEvent({
        type: 'RevenueCollected',
        transactionHash: utxo.txHash,
        slot: utxo.slot || 0,
        blockHeight: utxo.blockHeight || 0,
        timestamp: new Date(),
        data: revenue
      });
    }

    // Detect new distributions
    const newDistributions = newState.distributionRecords.filter(newRecord => 
      !oldState.distributionRecords.some(oldRecord => 
        oldRecord.transactionHash === newRecord.transactionHash &&
        oldRecord.distributedAtSlot === newRecord.distributedAtSlot
      )
    );

    for (const distribution of newDistributions) {
      this.emitEvent({
        type: 'RevenueDistributed',
        transactionHash: utxo.txHash,
        slot: utxo.slot || 0,
        blockHeight: utxo.blockHeight || 0,
        timestamp: new Date(),
        data: distribution
      });
    }

    // Detect configuration changes
    if (oldState.lpRewardPercentage !== newState.lpRewardPercentage ||
        oldState.developmentPercentage !== newState.developmentPercentage ||
        oldState.governancePercentage !== newState.governancePercentage ||
        oldState.protocolPercentage !== newState.protocolPercentage ||
        oldState.communityPercentage !== newState.communityPercentage ||
        oldState.distributionThreshold !== newState.distributionThreshold ||
        oldState.autoDistributionEnabled !== newState.autoDistributionEnabled) {
      this.emitEvent({
        type: 'ConfigurationUpdated',
        transactionHash: utxo.txHash,
        slot: utxo.slot || 0,
        blockHeight: utxo.blockHeight || 0,
        timestamp: new Date(),
        data: {
          oldConfig: {
            lpRewardPercentage: oldState.lpRewardPercentage,
            developmentPercentage: oldState.developmentPercentage,
            governancePercentage: oldState.governancePercentage,
            protocolPercentage: oldState.protocolPercentage,
            communityPercentage: oldState.communityPercentage,
            distributionThreshold: oldState.distributionThreshold,
            autoDistributionEnabled: oldState.autoDistributionEnabled
          },
          newConfig: {
            lpRewardPercentage: newState.lpRewardPercentage,
            developmentPercentage: newState.developmentPercentage,
            governancePercentage: newState.governancePercentage,
            protocolPercentage: newState.protocolPercentage,
            communityPercentage: newState.communityPercentage,
            distributionThreshold: newState.distributionThreshold,
            autoDistributionEnabled: newState.autoDistributionEnabled
          }
        }
      });
    }

    // Check if distribution threshold reached
    const adaBalance = BigInt(newState.currentBalance[""] || "0");
    if (adaBalance >= newState.distributionThreshold && newState.autoDistributionEnabled) {
      this.emitEvent({
        type: 'DistributionThresholdReached',
        transactionHash: utxo.txHash,
        slot: utxo.slot || 0,
        blockHeight: utxo.blockHeight || 0,
        timestamp: new Date(),
        data: {
          currentBalance: adaBalance,
          threshold: newState.distributionThreshold
        }
      });
    }
  }

  private emitEvent(event: TreasuryEvent): void {
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

    console.log(`Treasury event emitted: ${event.type}`, event);
  }

  private updateAnalytics(): void {
    if (!this.currentState) return;

    const revenueBySource = this.getRevenueBySource();
    const distributionByTarget = this.getDistributionByTarget();
    const dailyData = this.getDailyRevenue(30);

    // Calculate growth rate (simplified)
    const recentRevenue = dailyData.slice(-7).reduce((sum, day) => sum + day.revenue, 0n);
    const previousRevenue = dailyData.slice(-14, -7).reduce((sum, day) => sum + day.revenue, 0n);
    const revenueGrowthRate = previousRevenue > 0n ? 
      Number((recentRevenue - previousRevenue) * 100n / previousRevenue) : 0;

    // Calculate distribution efficiency
    const totalDistributed = this.currentState.totalDistributed;
    const totalRevenue = this.currentState.totalRevenueCollected;
    const distributionEfficiency = totalRevenue > 0n ? 
      Number(totalDistributed * 100n / totalRevenue) : 0;

    // Calculate asset breakdown
    const assetBreakdown = new Map<string, { balance: bigint; percentage: number; usdValue: number }>();
    const totalBalance = Object.values(this.currentState.currentBalance)
      .reduce((sum, amount) => sum + BigInt(amount), 0n);

    for (const [unit, amount] of Object.entries(this.currentState.currentBalance)) {
      const balance = BigInt(amount);
      const percentage = totalBalance > 0n ? Number(balance * 100n / totalBalance) : 0;
      const price = this.priceCache.get(unit) || 0;
      const usdValue = Number(balance) * price;

      assetBreakdown.set(unit, { balance, percentage, usdValue });
    }

    this.analytics = {
      totalRevenue: this.currentState.totalRevenueCollected,
      totalDistributed: this.currentState.totalDistributed,
      currentTVL: totalBalance,
      revenueGrowthRate,
      distributionEfficiency,
      revenueBySource,
      distributionByTarget,
      monthlyRevenue: [], // Would need more complex calculation
      topRevenueGenerators: [], // Would need pool-specific data
      distributionHistory: this.currentState.distributionRecords.map(record => ({
        date: new Date(record.distributedAtSlot * 1000),
        amount: record.totalAmount,
        target: record.target.type,
        efficiency: record.distributionEfficiency || 0
      })),
      assetBreakdown
    };
  }

  private checkAlerts(): void {
    if (!this.currentState || !this.config.enableAlerts) return;

    const adaBalance = BigInt(this.currentState.currentBalance[""] || "0");
    
    // Check low balance
    if (adaBalance < this.config.alertThresholds.lowBalanceThreshold) {
      console.warn(`Treasury balance is low: ${adaBalance} < ${this.config.alertThresholds.lowBalanceThreshold}`);
    }

    // Check if auto-distribution should trigger
    if (this.shouldTriggerAutoDistribution()) {
      console.info(`Auto-distribution threshold reached: ${adaBalance} >= ${this.currentState.distributionThreshold}`);
    }
  }

  private async updatePrices(): Promise<void> {
    if (!this.config.priceOracle?.enabled) return;

    try {
      // This would integrate with a price oracle API
      // For now, just set placeholder prices
      this.priceCache.set("", 0.35); // ADA price in USD
      this.priceCache.set("placeholder_pucky_policy", 0.001); // PUCKY price in USD
    } catch (error) {
      console.error("Failed to update prices:", error);
    }
  }

  private startPeriodicUpdates(): void {
    if (!this.isMonitoring) return;

    setTimeout(async () => {
      try {
        this.calculateAdditionalFields();
        this.updateAnalytics();
        
        if (this.config.enableAlerts) {
          this.checkAlerts();
        }
        
        this.startPeriodicUpdates();
      } catch (error) {
        console.error("Error in periodic treasury update:", error);
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
    }, this.config.pollingInterval * 3); // Update analytics less frequently
  }

  private startPriceUpdates(): void {
    if (!this.isMonitoring || !this.config.priceOracle?.enabled) return;

    setTimeout(async () => {
      try {
        await this.updatePrices();
        this.startPriceUpdates();
      } catch (error) {
        console.error("Error in price update:", error);
        if (this.isMonitoring) {
          this.startPriceUpdates();
        }
      }
    }, (this.config.priceOracle?.updateInterval || 300000)); // Default 5 minutes
  }
}
