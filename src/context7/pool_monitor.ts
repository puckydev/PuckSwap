// PuckSwap v5 - Pool Monitor
// Context7 real-time monitoring for AMM pool state changes
// Full CIP-68 compliance with PoolDatum structure and WebSocket broadcasting

import { createIndexer, Indexer, UTxO, Address, PolicyId } from "../lib/mock-context7-sdk";
import { Data, Constr, fromText, toText } from "@lucid-evolution/lucid";
import { getPuckSwapEnvironmentConfig } from "../config/env";
import { PuckSwapSerializer, PoolDatum } from "../lucid/utils/serialization";

// Re-export PoolDatum from serialization utility
export { PoolDatum } from "../lucid/utils/serialization";

// Pool state change event types
export interface PoolEvent {
  type: 'swap' | 'add_liquidity' | 'remove_liquidity' | 'pool_created' | 'pool_updated';
  txHash: string;
  timestamp: number;
  blockHeight: number;
  slot: number;
  poolAddress: string;
  poolDatum: PoolDatum;
  previousDatum?: PoolDatum;
  data: SwapEventData | LiquidityEventData | PoolUpdateEventData;
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
  user: string;
  price: number;
  priceImpact: number;
  fee: bigint;
}

export interface LiquidityEventData {
  user: string;
  adaAmount: bigint;
  tokenAmount: bigint;
  lpTokenAmount: bigint;
  isAddition: boolean;
  poolShare: number;
}

export interface PoolUpdateEventData {
  field: string;
  oldValue: any;
  newValue: any;
  updatedBy: string;
}

// Pool monitor configuration
export interface PoolMonitorConfig {
  poolAddresses: Address[];
  blockfrostApiKey: string;
  network: "mainnet" | "preview" | "preprod";
  webhookUrl?: string;
  enableWebSocket: boolean;
  pollingInterval: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
  enableBroadcast: boolean;
  broadcastEndpoints?: {
    websocket?: string;
    api?: string;
    pubsub?: string;
  };
}

// Pool analytics data
export interface PoolAnalytics {
  totalValueLocked: bigint;
  volume24h: bigint;
  volume7d: bigint;
  swapCount24h: number;
  liquidityProviders: number;
  averageSwapSize: bigint;
  priceHistory: Array<{
    timestamp: number;
    price: number;
  }>;
  feeRevenue24h: bigint;
  impermanentLoss: number;
}

export class PoolMonitor {
  private indexer: Indexer;
  private config: PoolMonitorConfig;
  private currentStates: Map<string, PoolDatum> = new Map();
  private eventListeners: Map<string, ((event: PoolEvent) => void)[]> = new Map();
  private isMonitoring = false;
  private retryCount = 0;
  private analytics: Map<string, PoolAnalytics> = new Map();
  private wsConnection: WebSocket | null = null;
  private envConfig = getPuckSwapEnvironmentConfig();

  constructor(config: PoolMonitorConfig) {
    this.config = config;
  }

  // Initialize the monitor
  async initialize(): Promise<void> {
    try {
      this.indexer = await createIndexer({
        projectId: this.config.blockfrostApiKey,
        network: this.config.network
      });

      // Initialize WebSocket connection if enabled
      if (this.config.enableWebSocket && this.config.broadcastEndpoints?.websocket) {
        await this.initializeWebSocket();
      }

      console.log("Pool Monitor initialized successfully with enhanced configuration");
    } catch (error) {
      console.error("Failed to initialize Pool Monitor:", error);
      throw error;
    }
  }

  // Start monitoring pools
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.warn("Pool Monitor is already running");
      return;
    }

    try {
      this.isMonitoring = true;
      console.log("Starting pool monitoring...");

      // Load initial states for all pools
      await this.loadInitialStates();

      // Subscribe to each pool address
      for (const poolAddress of this.config.poolAddresses) {
        await this.subscribeToPool(poolAddress);
      }

      // Start periodic analytics updates
      this.startPeriodicUpdates();

      console.log(`Pool monitoring started for ${this.config.poolAddresses.length} pools`);
    } catch (error) {
      console.error("Failed to start pool monitoring:", error);
      this.isMonitoring = false;
      throw error;
    }
  }

  // Stop monitoring
  async stopMonitoring(): Promise<void> {
    this.isMonitoring = false;
    
    // Close WebSocket connection
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }

    console.log("Pool monitoring stopped");
  }

  // Subscribe to a specific pool
  private async subscribeToPool(poolAddress: string): Promise<void> {
    try {
      // Subscribe to UTxO changes at the pool address
      this.indexer.addresses.subscribe([poolAddress], (utxo) => {
        this.handlePoolUTxOUpdate(poolAddress, utxo);
      });

      console.log(`Subscribed to pool: ${poolAddress}`);
    } catch (error) {
      console.error(`Failed to subscribe to pool ${poolAddress}:`, error);
      await this.handleRetry(() => this.subscribeToPool(poolAddress));
    }
  }

  // Handle UTxO updates for a pool
  private async handlePoolUTxOUpdate(poolAddress: string, utxo: UTxO): Promise<void> {
    try {
      console.log(`Pool UTxO update detected for ${poolAddress}:`, utxo.txHash);

      // Parse the new pool datum
      const newPoolDatum = await this.parsePoolDatum(utxo);
      if (!newPoolDatum) {
        console.error("Failed to parse pool datum from UTxO");
        return;
      }

      // Get previous state
      const previousDatum = this.currentStates.get(poolAddress);

      // Update current state
      this.currentStates.set(poolAddress, newPoolDatum);

      // Log pool state changes
      this.logPoolStateChanges(poolAddress, previousDatum, newPoolDatum);

      // Detect and emit events
      const event = await this.detectPoolEvent(poolAddress, utxo, previousDatum, newPoolDatum);
      if (event) {
        await this.emitEvent(event);
      }

      // Update analytics
      await this.updatePoolAnalytics(poolAddress, newPoolDatum);

      // Broadcast to consumers
      if (this.config.enableBroadcast) {
        await this.broadcastPoolState(poolAddress, newPoolDatum, event);
      }

    } catch (error) {
      console.error(`Error handling pool update for ${poolAddress}:`, error);
      await this.handleError(error, `handlePoolUTxOUpdate:${poolAddress}`);
    }
  }

  // Parse PoolDatum from UTxO using enhanced serialization utility
  private async parsePoolDatum(utxo: UTxO): Promise<PoolDatum | null> {
    try {
      if (!utxo.datum) {
        console.error("UTxO has no datum");
        return null;
      }

      // Use the enhanced serialization utility for proper CIP-68 parsing
      const poolDatum = PuckSwapSerializer.deserializePoolDatum(utxo.datum);

      if (!poolDatum) {
        console.error("Failed to deserialize pool datum");
        return null;
      }

      return poolDatum;
    } catch (error) {
      console.error("Error parsing pool datum:", error);
      return null;
    }
  }

  // Load initial states for all pools
  private async loadInitialStates(): Promise<void> {
    console.log("Loading initial pool states...");

    for (const poolAddress of this.config.poolAddresses) {
      try {
        const utxos = await this.indexer.utxos.byAddress(poolAddress);

        if (utxos.length > 0) {
          // Get the latest UTxO (assuming it contains the current pool state)
          const latestUtxo = utxos[utxos.length - 1];
          const poolDatum = await this.parsePoolDatum(latestUtxo);

          if (poolDatum) {
            this.currentStates.set(poolAddress, poolDatum);
            console.log(`Loaded initial state for pool ${poolAddress}`);
          }
        }
      } catch (error) {
        console.error(`Failed to load initial state for pool ${poolAddress}:`, error);
      }
    }
  }

  // Log pool state changes with detailed information
  private logPoolStateChanges(poolAddress: string, previousDatum: PoolDatum | undefined, newDatum: PoolDatum): void {
    console.log(`\n=== Pool State Update: ${poolAddress} ===`);
    console.log(`ADA Reserve: ${previousDatum?.ada_reserve || 0n} → ${newDatum.ada_reserve}`);
    console.log(`Token Reserve: ${previousDatum?.token_reserve || 0n} → ${newDatum.token_reserve}`);
    console.log(`Fee Basis Points: ${previousDatum?.fee_basis_points || 0} → ${newDatum.fee_basis_points}`);
    console.log(`LP Token Policy: ${newDatum.lp_token_policy}`);
    console.log(`LP Token Name: ${newDatum.lp_token_name}`);

    // Calculate price if both reserves exist
    if (newDatum.ada_reserve > 0n && newDatum.token_reserve > 0n) {
      const price = Number(newDatum.ada_reserve) / Number(newDatum.token_reserve);
      console.log(`Current Price: ${price.toFixed(6)} ADA per token`);
    }

    console.log(`=====================================\n`);
  }

  // Detect pool events based on state transitions
  private async detectPoolEvent(
    poolAddress: string,
    utxo: UTxO,
    previousDatum: PoolDatum | undefined,
    newDatum: PoolDatum
  ): Promise<PoolEvent | null> {
    try {
      const baseEvent = {
        txHash: utxo.txHash,
        timestamp: Date.now(),
        blockHeight: utxo.blockHeight || 0,
        slot: utxo.slot || 0,
        poolAddress,
        poolDatum: newDatum,
        previousDatum
      };

      // New pool creation
      if (!previousDatum) {
        return {
          ...baseEvent,
          type: 'pool_created' as const,
          data: {
            field: 'pool_creation',
            oldValue: null,
            newValue: newDatum,
            updatedBy: 'system'
          } as PoolUpdateEventData
        };
      }

      // Detect swap (reserves changed in opposite directions)
      const adaChange = newDatum.ada_reserve - previousDatum.ada_reserve;
      const tokenChange = newDatum.token_reserve - previousDatum.token_reserve;

      if ((adaChange > 0n && tokenChange < 0n) || (adaChange < 0n && tokenChange > 0n)) {
        const isAdaToToken = adaChange > 0n;
        const inputAmount = isAdaToToken ? adaChange : -tokenChange;
        const outputAmount = isAdaToToken ? -tokenChange : -adaChange;

        // Calculate price and fee
        const price = isAdaToToken
          ? Number(outputAmount) / Number(inputAmount)
          : Number(inputAmount) / Number(outputAmount);

        const fee = (inputAmount * BigInt(newDatum.fee_basis_points)) / 10000n;
        const priceImpact = this.calculatePriceImpact(previousDatum, inputAmount, isAdaToToken);

        return {
          ...baseEvent,
          type: 'swap' as const,
          data: {
            inputToken: {
              policy: isAdaToToken ? "" : "token_policy", // ADA has empty policy
              name: isAdaToToken ? "ADA" : "TOKEN",
              amount: inputAmount
            },
            outputToken: {
              policy: isAdaToToken ? "token_policy" : "",
              name: isAdaToToken ? "TOKEN" : "ADA",
              amount: outputAmount
            },
            user: "unknown", // Would need to parse transaction to get user
            price,
            priceImpact,
            fee
          } as SwapEventData
        };
      }

      // Detect liquidity addition/removal (both reserves changed in same direction)
      if ((adaChange > 0n && tokenChange > 0n) || (adaChange < 0n && tokenChange < 0n)) {
        const isAddition = adaChange > 0n;
        const adaAmount = isAddition ? adaChange : -adaChange;
        const tokenAmount = isAddition ? tokenChange : -tokenChange;

        // Estimate LP token amount (simplified calculation)
        const lpTokenAmount = this.estimateLPTokenAmount(previousDatum, adaAmount, tokenAmount, isAddition);
        const poolShare = this.calculatePoolShare(newDatum, lpTokenAmount);

        return {
          ...baseEvent,
          type: isAddition ? 'add_liquidity' as const : 'remove_liquidity' as const,
          data: {
            user: "unknown", // Would need to parse transaction to get user
            adaAmount,
            tokenAmount,
            lpTokenAmount,
            isAddition,
            poolShare
          } as LiquidityEventData
        };
      }

      // Other pool updates (fee changes, etc.)
      if (previousDatum.fee_basis_points !== newDatum.fee_basis_points) {
        return {
          ...baseEvent,
          type: 'pool_updated' as const,
          data: {
            field: 'fee_basis_points',
            oldValue: previousDatum.fee_basis_points,
            newValue: newDatum.fee_basis_points,
            updatedBy: 'governance'
          } as PoolUpdateEventData
        };
      }

      return null;
    } catch (error) {
      console.error("Error detecting pool event:", error);
      return null;
    }
  }

  // Calculate price impact for swaps
  private calculatePriceImpact(poolDatum: PoolDatum, inputAmount: bigint, isAdaToToken: boolean): number {
    try {
      const oldPrice = Number(poolDatum.ada_reserve) / Number(poolDatum.token_reserve);

      // Calculate new reserves after swap (simplified AMM formula)
      const fee = (inputAmount * BigInt(poolDatum.fee_basis_points)) / 10000n;
      const inputAfterFee = inputAmount - fee;

      let newAdaReserve: bigint;
      let newTokenReserve: bigint;

      if (isAdaToToken) {
        newAdaReserve = poolDatum.ada_reserve + inputAfterFee;
        newTokenReserve = (poolDatum.ada_reserve * poolDatum.token_reserve) / newAdaReserve;
      } else {
        newTokenReserve = poolDatum.token_reserve + inputAfterFee;
        newAdaReserve = (poolDatum.ada_reserve * poolDatum.token_reserve) / newTokenReserve;
      }

      const newPrice = Number(newAdaReserve) / Number(newTokenReserve);
      const priceImpact = Math.abs((newPrice - oldPrice) / oldPrice) * 100;

      return priceImpact;
    } catch (error) {
      console.error("Error calculating price impact:", error);
      return 0;
    }
  }

  // Estimate LP token amount for liquidity operations
  private estimateLPTokenAmount(poolDatum: PoolDatum, adaAmount: bigint, tokenAmount: bigint, isAddition: boolean): bigint {
    try {
      // Simplified LP token calculation
      // In reality, this would depend on the specific LP token minting policy
      const totalLiquidity = poolDatum.ada_reserve + poolDatum.token_reserve;
      const addedLiquidity = adaAmount + tokenAmount;

      if (totalLiquidity === 0n) {
        return addedLiquidity; // Initial liquidity
      }

      const lpTokenRatio = addedLiquidity * 1000000n / totalLiquidity; // Assuming 6 decimal places
      return isAddition ? lpTokenRatio : -lpTokenRatio;
    } catch (error) {
      console.error("Error estimating LP token amount:", error);
      return 0n;
    }
  }

  // Calculate pool share percentage
  private calculatePoolShare(poolDatum: PoolDatum, lpTokenAmount: bigint): number {
    try {
      const totalLiquidity = poolDatum.ada_reserve + poolDatum.token_reserve;
      if (totalLiquidity === 0n) return 0;

      const share = (Number(lpTokenAmount) / Number(totalLiquidity)) * 100;
      return Math.max(0, Math.min(100, share));
    } catch (error) {
      console.error("Error calculating pool share:", error);
      return 0;
    }
  }

  // Emit events to registered listeners
  private async emitEvent(event: PoolEvent): Promise<void> {
    try {
      console.log(`Emitting ${event.type} event for pool ${event.poolAddress}`);

      // Emit to specific event type listeners
      const typeListeners = this.eventListeners.get(event.type) || [];
      for (const listener of typeListeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      }

      // Emit to all event listeners
      const allListeners = this.eventListeners.get('*') || [];
      for (const listener of allListeners) {
        try {
          listener(event);
        } catch (error) {
          console.error("Error in universal event listener:", error);
        }
      }

      // Send webhook if configured
      if (this.config.webhookUrl) {
        await this.sendWebhook(event);
      }
    } catch (error) {
      console.error("Error emitting event:", error);
    }
  }

  // Update pool analytics
  private async updatePoolAnalytics(poolAddress: string, poolDatum: PoolDatum): Promise<void> {
    try {
      const currentAnalytics = this.analytics.get(poolAddress) || this.createEmptyAnalytics();

      // Update TVL
      currentAnalytics.totalValueLocked = poolDatum.ada_reserve + poolDatum.token_reserve;

      // Update price history
      if (poolDatum.ada_reserve > 0n && poolDatum.token_reserve > 0n) {
        const price = Number(poolDatum.ada_reserve) / Number(poolDatum.token_reserve);
        currentAnalytics.priceHistory.push({
          timestamp: Date.now(),
          price
        });

        // Keep only last 24 hours of price data
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        currentAnalytics.priceHistory = currentAnalytics.priceHistory.filter(
          entry => entry.timestamp > oneDayAgo
        );
      }

      this.analytics.set(poolAddress, currentAnalytics);
    } catch (error) {
      console.error("Error updating pool analytics:", error);
    }
  }

  // Create empty analytics object
  private createEmptyAnalytics(): PoolAnalytics {
    return {
      totalValueLocked: 0n,
      volume24h: 0n,
      volume7d: 0n,
      swapCount24h: 0,
      liquidityProviders: 0,
      averageSwapSize: 0n,
      priceHistory: [],
      feeRevenue24h: 0n,
      impermanentLoss: 0
    };
  }

  // Broadcast pool state to consumers
  private async broadcastPoolState(poolAddress: string, poolDatum: PoolDatum, event?: PoolEvent): Promise<void> {
    try {
      const broadcastData = {
        poolAddress,
        poolDatum,
        event,
        timestamp: Date.now(),
        analytics: this.analytics.get(poolAddress)
      };

      // WebSocket broadcast
      if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
        this.wsConnection.send(JSON.stringify({
          type: 'pool_update',
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

      // Pub/Sub broadcast (placeholder - would integrate with actual pub/sub service)
      if (this.config.broadcastEndpoints?.pubsub) {
        console.log(`Broadcasting to pub/sub: ${this.config.broadcastEndpoints.pubsub}`);
        // Implementation would depend on specific pub/sub service (Redis, RabbitMQ, etc.)
      }

    } catch (error) {
      console.error("Error broadcasting pool state:", error);
    }
  }

  // Initialize WebSocket connection
  private async initializeWebSocket(): Promise<void> {
    try {
      if (!this.config.broadcastEndpoints?.websocket) {
        throw new Error("WebSocket endpoint not configured");
      }

      this.wsConnection = new WebSocket(this.config.broadcastEndpoints.websocket);

      this.wsConnection.onopen = () => {
        console.log("WebSocket connection established");
      };

      this.wsConnection.onclose = () => {
        console.log("WebSocket connection closed");
        // Attempt to reconnect after delay
        setTimeout(() => {
          if (this.isMonitoring) {
            this.initializeWebSocket();
          }
        }, this.config.retryDelay);
      };

      this.wsConnection.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

    } catch (error) {
      console.error("Failed to initialize WebSocket:", error);
    }
  }

  // Send webhook notification
  private async sendWebhook(event: PoolEvent): Promise<void> {
    try {
      if (!this.config.webhookUrl) return;

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event,
          timestamp: Date.now(),
          source: 'PuckSwap_PoolMonitor_v5'
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status: ${response.status}`);
      }

      console.log(`Webhook sent successfully for ${event.type} event`);
    } catch (error) {
      console.error("Error sending webhook:", error);
    }
  }

  // Start periodic analytics updates
  private startPeriodicUpdates(): void {
    setInterval(async () => {
      if (!this.isMonitoring) return;

      try {
        // Update analytics for all pools
        for (const [poolAddress, poolDatum] of this.currentStates) {
          await this.updatePoolAnalytics(poolAddress, poolDatum);
        }

        // Log periodic status
        console.log(`Periodic update: Monitoring ${this.currentStates.size} pools`);
      } catch (error) {
        console.error("Error in periodic update:", error);
      }
    }, this.config.pollingInterval);
  }

  // Handle errors with retry logic
  private async handleError(error: Error, context: string): Promise<void> {
    console.error(`Error in ${context}:`, error);

    this.retryCount++;

    if (this.retryCount < this.config.maxRetries) {
      console.log(`Retrying in ${this.config.retryDelay}ms... (${this.retryCount}/${this.config.maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
    } else {
      console.error(`Max retries (${this.config.maxRetries}) reached for ${context}`);
      this.retryCount = 0; // Reset for next error
    }
  }

  // Generic retry handler
  private async handleRetry(operation: () => Promise<void>): Promise<void> {
    let attempts = 0;

    while (attempts < this.config.maxRetries) {
      try {
        await operation();
        return;
      } catch (error) {
        attempts++;
        console.error(`Retry attempt ${attempts}/${this.config.maxRetries} failed:`, error);

        if (attempts < this.config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }

    throw new Error(`Operation failed after ${this.config.maxRetries} attempts`);
  }

  // Public API methods

  // Add event listener
  addEventListener(eventType: string, listener: (event: PoolEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  // Remove event listener
  removeEventListener(eventType: string, listener: (event: PoolEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Get current pool state
  getPoolState(poolAddress: string): PoolDatum | null {
    return this.currentStates.get(poolAddress) || null;
  }

  // Get all pool states
  getAllPoolStates(): Map<string, PoolDatum> {
    return new Map(this.currentStates);
  }

  // Get pool analytics
  getPoolAnalytics(poolAddress: string): PoolAnalytics | null {
    return this.analytics.get(poolAddress) || null;
  }

  // Get all pool analytics
  getAllPoolAnalytics(): Map<string, PoolAnalytics> {
    return new Map(this.analytics);
  }

  // Check if monitoring is active
  isActive(): boolean {
    return this.isMonitoring;
  }

  // Get configuration
  getConfig(): PoolMonitorConfig {
    return { ...this.config };
  }

  // Update configuration (requires restart)
  updateConfig(newConfig: Partial<PoolMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("Configuration updated. Restart monitoring to apply changes.");
  }
}

// Factory function to create and initialize pool monitor
export async function createPoolMonitor(config: PoolMonitorConfig): Promise<PoolMonitor> {
  const monitor = new PoolMonitor(config);
  await monitor.initialize();
  return monitor;
}

// Export default configuration
export const DEFAULT_POOL_MONITOR_CONFIG: Partial<PoolMonitorConfig> = {
  enableWebSocket: true,
  pollingInterval: 5000, // 5 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  enableBroadcast: true
};

// Utility function to validate pool datum
export function validatePoolDatum(datum: any): datum is PoolDatum {
  return (
    typeof datum === 'object' &&
    datum !== null &&
    typeof datum.ada_reserve === 'bigint' &&
    typeof datum.token_reserve === 'bigint' &&
    typeof datum.fee_basis_points === 'number' &&
    typeof datum.lp_token_policy === 'string' &&
    typeof datum.lp_token_name === 'string' &&
    datum.ada_reserve >= 0n &&
    datum.token_reserve >= 0n &&
    datum.fee_basis_points >= 0 &&
    datum.fee_basis_points <= 10000 // Max 100%
  );
}
