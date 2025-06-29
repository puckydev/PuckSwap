// PuckSwap v3 Context7 Monitor - Enhanced Real-time Pool Monitoring
// Comprehensive blockchain state tracking with WebSocket integration

import { Context7, IndexerConfig } from "./mock-context7-sdk";
import { PoolCIP68Datum, PoolState, PoolStats } from "./cip68-types";
import { CIP68Serializer } from "./cip68-serializer";
import { getEnvironmentConfig, ENV_CONFIG } from "./environment-config";

// Enhanced pool event types for v3
export interface PoolEventV3 {
  type: 'swap' | 'add_liquidity' | 'remove_liquidity' | 'pool_created' | 'pool_updated';
  txHash: string;
  timestamp: number;
  blockHeight: number;
  user: string;
  poolId: string;
  data: SwapEventData | LiquidityEventData | PoolCreationEventData | PoolUpdateEventData;
}

export interface SwapEventData {
  inputToken: {
    policy: string;
    name: string;
    amount: bigint;
  };
  outputToken: {
    policy: string;
    name: string;
    amount: bigint;
  };
  price: number;
  priceImpact: number;
  fee: bigint;
  slippage: number;
}

export interface LiquidityEventData {
  adaAmount: bigint;
  tokenAmount: bigint;
  lpTokens: bigint;
  isAddition: boolean;
  newTotalLiquidity: bigint;
}

export interface PoolCreationEventData {
  tokenPolicy: string;
  tokenName: string;
  initialADA: bigint;
  initialToken: bigint;
  creator: string;
  feeBPS: number;
}

export interface PoolUpdateEventData {
  oldState: PoolState;
  newState: PoolState;
  updateType: 'reserves' | 'config' | 'stats';
}

// Enhanced pool statistics for v3
export interface PoolStatsV3 {
  poolId: string;
  tokenPolicy: string;
  tokenName: string;
  adaReserve: bigint;
  tokenReserve: bigint;
  totalLiquidity: bigint;
  price: number;
  volume24h: bigint;
  volumeChange24h: number;
  fees24h: bigint;
  transactions24h: number;
  priceChange24h: number;
  tvl: bigint;
  apr: number;
  lastUpdate: number;
}

// Real-time price data
export interface PriceData {
  price: number;
  timestamp: number;
  volume: bigint;
  high24h: number;
  low24h: number;
  change24h: number;
}

// Monitor configuration
export interface MonitorConfigV3 {
  blockfrostApiKey: string;
  network: "mainnet" | "preview" | "preprod";
  poolAddresses: string[];
  enableWebSocket: boolean;
  updateInterval: number; // milliseconds
  historicalDataDays: number;
}

// Event listener types
export type PoolStateListener = (poolStats: PoolStatsV3) => void;
export type PoolEventListener = (event: PoolEventV3) => void;
export type PriceUpdateListener = (poolId: string, priceData: PriceData) => void;
export type ErrorListener = (error: Error) => void;

// Main Context7 Monitor v3 class
export class Context7MonitorV3 {
  private indexer: Context7;
  private config: MonitorConfigV3;
  private cip68Serializer: CIP68Serializer;
  private isInitialized: boolean = false;
  
  // Event listeners
  private stateListeners: Set<PoolStateListener> = new Set();
  private eventListeners: Set<PoolEventListener> = new Set();
  private priceListeners: Set<PriceUpdateListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();
  
  // State management
  private poolStates: Map<string, PoolStatsV3> = new Map();
  private priceHistory: Map<string, PriceData[]> = new Map();
  private updateTimers: Map<string, NodeJS.Timeout> = new Map();
  
  // WebSocket connection
  private wsConnection: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(config: MonitorConfigV3) {
    this.config = config;
    this.cip68Serializer = new CIP68Serializer();
    
    const indexerConfig: IndexerConfig = {
      projectId: config.blockfrostApiKey,
      network: config.network
    };
    
    this.indexer = new Context7(indexerConfig);
  }

  // Initialize monitor with enhanced features
  async initialize(): Promise<void> {
    try {
      await this.indexer.initialize();
      
      // Subscribe to pool addresses
      for (const poolAddress of this.config.poolAddresses) {
        await this.subscribeToPool(poolAddress);
      }
      
      // Initialize WebSocket if enabled
      if (this.config.enableWebSocket) {
        await this.initializeWebSocket();
      }
      
      // Start periodic updates
      this.startPeriodicUpdates();
      
      // Load historical data
      await this.loadHistoricalData();
      
      this.isInitialized = true;
      console.log("Context7 Monitor v3 initialized successfully");
      
    } catch (error) {
      this.emitError(new Error(`Failed to initialize monitor: ${error}`));
      throw error;
    }
  }

  // Subscribe to pool with enhanced monitoring
  async subscribeToPool(poolAddress: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Monitor not initialized. Call initialize() first.");
    }

    try {
      // Subscribe to UTxO changes
      this.indexer.addresses.subscribe([poolAddress], (utxo: any) => {
        this.handlePoolUTxOUpdate(poolAddress, utxo);
      });

      // Subscribe to transaction events
      this.indexer.transactions.subscribe({
        addresses: [poolAddress],
        includeMetadata: true,
        includeAssets: true
      }, (tx: any) => {
        this.handlePoolTransaction(poolAddress, tx);
      });

      console.log(`Subscribed to pool monitoring: ${poolAddress}`);
      
    } catch (error) {
      this.emitError(new Error(`Failed to subscribe to pool ${poolAddress}: ${error}`));
    }
  }

  // Add event listeners
  onPoolStateUpdate(listener: PoolStateListener): void {
    this.stateListeners.add(listener);
  }

  onPoolEvent(listener: PoolEventListener): void {
    this.eventListeners.add(listener);
  }

  onPriceUpdate(listener: PriceUpdateListener): void {
    this.priceListeners.add(listener);
  }

  onError(listener: ErrorListener): void {
    this.errorListeners.add(listener);
  }

  // Remove event listeners
  removePoolStateListener(listener: PoolStateListener): void {
    this.stateListeners.delete(listener);
  }

  removePoolEventListener(listener: PoolEventListener): void {
    this.eventListeners.delete(listener);
  }

  removePriceListener(listener: PriceUpdateListener): void {
    this.priceListeners.delete(listener);
  }

  removeErrorListener(listener: ErrorListener): void {
    this.errorListeners.delete(listener);
  }

  // Get current pool statistics
  getPoolStats(poolId: string): PoolStatsV3 | null {
    return this.poolStates.get(poolId) || null;
  }

  // Get all monitored pools
  getAllPoolStats(): PoolStatsV3[] {
    return Array.from(this.poolStates.values());
  }

  // Get price history for a pool
  getPriceHistory(poolId: string, hours: number = 24): PriceData[] {
    const history = this.priceHistory.get(poolId) || [];
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return history.filter(data => data.timestamp >= cutoffTime);
  }

  // Get real-time price data
  getCurrentPrice(poolId: string): PriceData | null {
    const history = this.priceHistory.get(poolId) || [];
    return history.length > 0 ? history[history.length - 1] : null;
  }

  // Private methods

  // Handle pool UTxO updates
  private async handlePoolUTxOUpdate(poolAddress: string, utxo: any): Promise<void> {
    try {
      if (!utxo.datum) return;
      
      // Parse CIP-68 datum
      const poolDatum = this.cip68Serializer.parsePoolDatum(utxo.datum);
      if (!poolDatum) return;
      
      // Extract pool ID
      const poolId = this.generatePoolId(poolDatum.pool_config.token_policy, poolDatum.pool_config.token_name);
      
      // Calculate enhanced statistics
      const poolStats = await this.calculatePoolStats(poolId, poolDatum, utxo);
      
      // Update state
      const oldStats = this.poolStates.get(poolId);
      this.poolStates.set(poolId, poolStats);
      
      // Update price history
      this.updatePriceHistory(poolId, {
        price: poolStats.price,
        timestamp: Date.now(),
        volume: poolStats.volume24h,
        high24h: poolStats.price, // Would calculate from history
        low24h: poolStats.price,  // Would calculate from history
        change24h: poolStats.priceChange24h
      });
      
      // Emit events
      this.emitPoolStateUpdate(poolStats);
      
      if (oldStats) {
        this.emitPoolEvent({
          type: 'pool_updated',
          txHash: utxo.txHash || '',
          timestamp: Date.now(),
          blockHeight: utxo.blockHeight || 0,
          user: '',
          poolId,
          data: {
            oldState: this.convertStatsToState(oldStats),
            newState: this.convertStatsToState(poolStats),
            updateType: 'reserves'
          }
        });
      }
      
    } catch (error) {
      this.emitError(new Error(`Error handling pool UTxO update: ${error}`));
    }
  }

  // Handle pool transactions
  private async handlePoolTransaction(poolAddress: string, tx: any): Promise<void> {
    try {
      const event = await this.parseTransactionEvent(tx, poolAddress);
      if (event) {
        this.emitPoolEvent(event);
      }
    } catch (error) {
      this.emitError(new Error(`Error handling pool transaction: ${error}`));
    }
  }

  // Parse transaction to determine event type
  private async parseTransactionEvent(tx: any, poolAddress: string): Promise<PoolEventV3 | null> {
    // Implementation would analyze transaction inputs/outputs/redeemers
    // to determine the type of operation and extract relevant data
    
    // Placeholder implementation
    return {
      type: 'swap',
      txHash: tx.hash,
      timestamp: tx.block_time * 1000,
      blockHeight: tx.block_height,
      user: tx.inputs[0]?.address || '',
      poolId: 'placeholder',
      data: {
        inputToken: {
          policy: '',
          name: '',
          amount: 0n
        },
        outputToken: {
          policy: '',
          name: '',
          amount: 0n
        },
        price: 0,
        priceImpact: 0,
        fee: 0n,
        slippage: 0
      }
    };
  }

  // Calculate comprehensive pool statistics
  private async calculatePoolStats(
    poolId: string,
    poolDatum: PoolCIP68Datum,
    utxo: any
  ): Promise<PoolStatsV3> {
    const { pool_state, pool_config, pool_stats } = poolDatum;
    
    // Calculate current price (ADA per token)
    const price = Number(pool_state.ada_reserve) / Number(pool_state.token_reserve);
    
    // Get historical data for 24h calculations
    const oldStats = this.poolStates.get(poolId);
    const priceChange24h = oldStats ? ((price - oldStats.price) / oldStats.price) * 100 : 0;
    
    // Calculate TVL (Total Value Locked)
    const tvl = pool_state.ada_reserve * 2n; // Simplified calculation
    
    return {
      poolId,
      tokenPolicy: pool_config.token_policy,
      tokenName: pool_config.token_name,
      adaReserve: pool_state.ada_reserve,
      tokenReserve: pool_state.token_reserve,
      totalLiquidity: pool_state.total_lp_supply,
      price,
      volume24h: pool_stats.total_volume_ada, // Would calculate 24h window
      volumeChange24h: 0, // Would calculate from historical data
      fees24h: pool_stats.total_fees_collected, // Would calculate 24h window
      transactions24h: pool_stats.swap_count, // Would calculate 24h window
      priceChange24h,
      tvl,
      apr: 0, // Would calculate based on fees and liquidity
      lastUpdate: Date.now()
    };
  }

  // Generate unique pool ID
  private generatePoolId(tokenPolicy: string, tokenName: string): string {
    return `${tokenPolicy}_${tokenName}`;
  }

  // Update price history
  private updatePriceHistory(poolId: string, priceData: PriceData): void {
    if (!this.priceHistory.has(poolId)) {
      this.priceHistory.set(poolId, []);
    }
    
    const history = this.priceHistory.get(poolId)!;
    history.push(priceData);
    
    // Keep only last 7 days of data
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const filteredHistory = history.filter(data => data.timestamp >= cutoffTime);
    this.priceHistory.set(poolId, filteredHistory);
    
    // Emit price update
    this.emitPriceUpdate(poolId, priceData);
  }

  // Convert stats to state (helper)
  private convertStatsToState(stats: PoolStatsV3): PoolState {
    return {
      adaReserve: stats.adaReserve,
      tokenReserve: stats.tokenReserve,
      tokenPolicy: stats.tokenPolicy,
      tokenName: stats.tokenName,
      totalLiquidity: stats.totalLiquidity,
      price: stats.price
    };
  }

  // Event emitters
  private emitPoolStateUpdate(stats: PoolStatsV3): void {
    this.stateListeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error("Error in pool state listener:", error);
      }
    });
  }

  private emitPoolEvent(event: PoolEventV3): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in pool event listener:", error);
      }
    });
  }

  private emitPriceUpdate(poolId: string, priceData: PriceData): void {
    this.priceListeners.forEach(listener => {
      try {
        listener(poolId, priceData);
      } catch (error) {
        console.error("Error in price update listener:", error);
      }
    });
  }

  private emitError(error: Error): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error("Error in error listener:", listenerError);
      }
    });
  }

  // Initialize WebSocket connection for real-time updates
  private async initializeWebSocket(): Promise<void> {
    try {
      const wsUrl = `wss://cardano-${this.config.network}.blockfrost.io/api/v0/ws`;
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        console.log("WebSocket connection established");
        this.reconnectAttempts = 0;
      };

      this.wsConnection.onmessage = (event) => {
        this.handleWebSocketMessage(event.data);
      };

      this.wsConnection.onclose = () => {
        console.log("WebSocket connection closed");
        this.handleWebSocketReconnect();
      };

      this.wsConnection.onerror = (error) => {
        this.emitError(new Error(`WebSocket error: ${error}`));
      };

    } catch (error) {
      this.emitError(new Error(`Failed to initialize WebSocket: ${error}`));
    }
  }

  // Handle WebSocket reconnection
  private handleWebSocketReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff

      setTimeout(() => {
        console.log(`Attempting WebSocket reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.initializeWebSocket();
      }, delay);
    } else {
      this.emitError(new Error("Max WebSocket reconnection attempts reached"));
    }
  }

  // Handle WebSocket messages
  private handleWebSocketMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      // Process real-time blockchain events
      // Implementation would depend on WebSocket message format
    } catch (error) {
      this.emitError(new Error(`Error processing WebSocket message: ${error}`));
    }
  }

  // Start periodic updates
  private startPeriodicUpdates(): void {
    for (const poolAddress of this.config.poolAddresses) {
      const timer = setInterval(async () => {
        try {
          await this.updatePoolData(poolAddress);
        } catch (error) {
          this.emitError(new Error(`Error in periodic update for ${poolAddress}: ${error}`));
        }
      }, this.config.updateInterval);

      this.updateTimers.set(poolAddress, timer);
    }
  }

  // Update pool data periodically
  private async updatePoolData(poolAddress: string): Promise<void> {
    try {
      // Fetch latest UTxOs for the pool
      const utxos = await this.indexer.addresses.getUtxos(poolAddress);

      for (const utxo of utxos) {
        await this.handlePoolUTxOUpdate(poolAddress, utxo);
      }
    } catch (error) {
      throw new Error(`Failed to update pool data: ${error}`);
    }
  }

  // Load historical data for analysis
  private async loadHistoricalData(): Promise<void> {
    try {
      const cutoffTime = Date.now() - (this.config.historicalDataDays * 24 * 60 * 60 * 1000);

      for (const poolAddress of this.config.poolAddresses) {
        // Load historical transactions
        const transactions = await this.indexer.transactions.getHistory({
          addresses: [poolAddress],
          fromTime: cutoffTime,
          includeMetadata: true
        });

        // Process historical data to build price history
        for (const tx of transactions) {
          const event = await this.parseTransactionEvent(tx, poolAddress);
          if (event && event.type === 'swap') {
            const swapData = event.data as SwapEventData;
            this.updatePriceHistory(event.poolId, {
              price: swapData.price,
              timestamp: event.timestamp,
              volume: swapData.inputToken.amount,
              high24h: swapData.price,
              low24h: swapData.price,
              change24h: 0
            });
          }
        }
      }
    } catch (error) {
      this.emitError(new Error(`Failed to load historical data: ${error}`));
    }
  }

  // Calculate 24-hour statistics
  private calculate24hStats(poolId: string): {
    volume24h: bigint;
    volumeChange24h: number;
    fees24h: bigint;
    transactions24h: number;
    priceChange24h: number;
  } {
    const priceHistory = this.getPriceHistory(poolId, 24);

    if (priceHistory.length === 0) {
      return {
        volume24h: 0n,
        volumeChange24h: 0,
        fees24h: 0n,
        transactions24h: 0,
        priceChange24h: 0
      };
    }

    // Calculate 24h volume
    const volume24h = priceHistory.reduce((sum, data) => sum + data.volume, 0n);

    // Calculate price change
    const oldestPrice = priceHistory[0].price;
    const latestPrice = priceHistory[priceHistory.length - 1].price;
    const priceChange24h = ((latestPrice - oldestPrice) / oldestPrice) * 100;

    // Calculate fees (simplified - would need more detailed transaction analysis)
    const fees24h = volume24h * 3n / 1000n; // 0.3% fee

    return {
      volume24h,
      volumeChange24h: 0, // Would need historical comparison
      fees24h,
      transactions24h: priceHistory.length,
      priceChange24h
    };
  }

  // Get pool analytics
  getPoolAnalytics(poolId: string): {
    stats: PoolStatsV3 | null;
    priceHistory: PriceData[];
    volume24h: bigint;
    transactions24h: number;
    apr: number;
    impermanentLoss: number;
  } {
    const stats = this.getPoolStats(poolId);
    const priceHistory = this.getPriceHistory(poolId, 24);
    const analytics24h = this.calculate24hStats(poolId);

    return {
      stats,
      priceHistory,
      volume24h: analytics24h.volume24h,
      transactions24h: analytics24h.transactions24h,
      apr: stats?.apr || 0,
      impermanentLoss: 0 // Would calculate based on price movements
    };
  }

  // Cleanup resources
  async destroy(): Promise<void> {
    try {
      // Clear timers
      this.updateTimers.forEach(timer => clearInterval(timer));
      this.updateTimers.clear();

      // Close WebSocket
      if (this.wsConnection) {
        this.wsConnection.close();
        this.wsConnection = null;
      }

      // Destroy indexer
      if (this.indexer) {
        await this.indexer.destroy();
      }

      // Clear listeners and state
      this.stateListeners.clear();
      this.eventListeners.clear();
      this.priceListeners.clear();
      this.errorListeners.clear();
      this.poolStates.clear();
      this.priceHistory.clear();

      this.isInitialized = false;
      console.log("Context7 Monitor v3 destroyed");

    } catch (error) {
      this.emitError(new Error(`Error during cleanup: ${error}`));
    }
  }
}

// Factory function to create and initialize monitor using centralized environment config
export async function createContext7MonitorV3(config?: Partial<MonitorConfigV3>): Promise<Context7MonitorV3> {
  // Use centralized environment configuration
  const envConfig = getEnvironmentConfig();

  const monitorConfig: MonitorConfigV3 = {
    blockfrostApiKey: envConfig.blockfrostApiKey,
    network: envConfig.network,
    poolAddresses: config?.poolAddresses || [],
    enableWebSocket: config?.enableWebSocket ?? true,
    updateInterval: config?.updateInterval ?? 5000,
    historicalDataDays: config?.historicalDataDays ?? 7,
    ...config
  };

  console.log(`🔍 Creating Context7 Monitor v3 on ${envConfig.network}...`);
  console.log(`📡 Using API Key: ${envConfig.blockfrostApiKey.substring(0, 8)}...`);

  const monitor = new Context7MonitorV3(monitorConfig);
  await monitor.initialize();
  return monitor;
}
