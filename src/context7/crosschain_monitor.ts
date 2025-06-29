// PuckSwap v5 - Cross-Chain Router Monitor
// Context7 real-time monitoring for cross-chain router state changes
// Full CIP-68 compliance with CrossChainRouterDatum structure and WebSocket broadcasting

import { createIndexer, Indexer, UTxO, Address } from "../lib/mock-context7-sdk";
import { Data, Constr, fromText, toText } from "@lucid-evolution/lucid";
import { getEnvironmentConfig, ENV_CONFIG } from "../lib/environment-config";

// Master Schema CrossChainRouterDatum structure (CIP-68 compliant)
export interface CrossChainRouterDatum {
  total_volume: bigint;
  last_processed_nonce: bigint;
  chain_connections: ChainConnection[];
}

export interface ChainConnection {
  chain_id: bigint;
  bridge_address: string;
}

// Cross-chain router events
export interface CrossChainRouterEvent {
  type: 'OutboundTransferInitiated' | 'InboundTransferFinalized' | 'NonceUpdated' | 
        'ChainConnectionAdded' | 'ChainConnectionRemoved' | 'VolumeUpdated' | 'RouterStateUpdated';
  transactionHash: string;
  slot: number;
  blockHeight: number;
  timestamp: Date;
  data: {
    oldState?: CrossChainRouterDatum;
    newState: CrossChainRouterDatum;
    volumeChange?: bigint;
    nonceChange?: bigint;
    chainConnection?: ChainConnection;
  };
}

// Monitor configuration
export interface CrossChainRouterMonitorConfig {
  routerAddress: Address;
  blockfrostApiKey?: string;
  network?: "mainnet" | "preview" | "preprod";
  enableWebSocket: boolean;
  pollingInterval: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
  enableAlerts: boolean;
  alertThresholds: {
    nonceInconsistencyThreshold: number;
    suspiciousVolumeThreshold: bigint;
    maxNonceGap: number;
  };
}

export class CrossChainRouterMonitor {
  private indexer: Indexer;
  private config: CrossChainRouterMonitorConfig;
  private currentState: CrossChainRouterDatum | null = null;
  private eventListeners: Map<string, ((event: CrossChainRouterEvent) => void)[]> = new Map();
  private isMonitoring = false;
  private retryCount = 0;
  private websocketConnection: WebSocket | null = null;

  constructor(config: CrossChainRouterMonitorConfig) {
    this.config = {
      ...config,
      blockfrostApiKey: config.blockfrostApiKey || ENV_CONFIG.blockfrostApiKey,
      network: config.network || ENV_CONFIG.network
    };
  }

  // Initialize the monitor
  async initialize(): Promise<void> {
    try {
      this.indexer = await createIndexer({
        projectId: this.config.blockfrostApiKey!,
        network: this.config.network!
      });

      console.log("✅ Cross-Chain Router Monitor initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Cross-Chain Router Monitor:", error);
      throw error;
    }
  }

  // Start monitoring the cross-chain router
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.warn("⚠️ Cross-Chain Router Monitor is already running");
      return;
    }

    try {
      this.isMonitoring = true;
      console.log("🚀 Starting Cross-Chain Router monitoring...");

      // Load initial state
      await this.loadInitialState();

      // Subscribe to router address changes
      this.indexer.addresses.subscribe([this.config.routerAddress], (utxo) => {
        this.handleRouterUpdate(utxo);
      });

      // Initialize WebSocket connection if enabled
      if (this.config.enableWebSocket) {
        this.initializeWebSocket();
      }

      // Start periodic health checks
      this.startPeriodicHealthChecks();

      console.log("✅ Cross-Chain Router monitoring started successfully");
      this.retryCount = 0; // Reset retry count on successful start
    } catch (error) {
      console.error("❌ Failed to start Cross-Chain Router monitoring:", error);
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
    
    // Close WebSocket connection
    if (this.websocketConnection) {
      this.websocketConnection.close();
      this.websocketConnection = null;
    }

    console.log("🛑 Cross-Chain Router monitoring stopped");
  }

  // Get current router state
  getCurrentState(): CrossChainRouterDatum | null {
    return this.currentState;
  }

  // Get chain connections
  getChainConnections(): ChainConnection[] {
    return this.currentState?.chain_connections || [];
  }

  // Get specific chain connection
  getChainConnection(chainId: bigint): ChainConnection | null {
    return this.currentState?.chain_connections.find(conn => conn.chain_id === chainId) || null;
  }

  // Add event listener
  addEventListener(eventType: string, callback: (event: CrossChainRouterEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  // Remove event listener
  removeEventListener(eventType: string, callback: (event: CrossChainRouterEvent) => void): void {
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
      const routerUTxOs = await this.indexer.utxos.byAddress(this.config.routerAddress);

      if (routerUTxOs.length === 0) {
        throw new Error("Cross-chain router UTxO not found");
      }

      const routerUTxO = routerUTxOs[0];
      this.currentState = await this.parseCrossChainRouterDatum(routerUTxO);

      if (!this.currentState) {
        throw new Error("Failed to parse CrossChainRouterDatum from UTxO");
      }

      console.log(`📊 Loaded initial router state:`);
      console.log(`   Total Volume: ${this.currentState.total_volume} lovelace`);
      console.log(`   Last Processed Nonce: ${this.currentState.last_processed_nonce}`);
      console.log(`   Chain Connections: ${this.currentState.chain_connections.length}`);
      
      // Log each chain connection
      this.currentState.chain_connections.forEach((conn, index) => {
        console.log(`   Chain ${index + 1}: ID=${conn.chain_id}, Bridge=${conn.bridge_address}`);
      });

    } catch (error) {
      console.error("❌ Failed to load initial router state:", error);
      throw error;
    }
  }

  private async parseCrossChainRouterDatum(utxo: UTxO): Promise<CrossChainRouterDatum | null> {
    try {
      if (!utxo.datum) {
        console.error("❌ UTxO has no datum");
        return null;
      }

      // Parse the inline datum using CIP-68 structure
      const datumData = Data.from(utxo.datum);
      
      if (!(datumData instanceof Constr) || datumData.fields.length < 3) {
        console.error("❌ Invalid CrossChainRouterDatum structure");
        return null;
      }

      // Extract fields according to master schema
      const total_volume = datumData.fields[0] as bigint;
      const last_processed_nonce = datumData.fields[1] as bigint;
      const chain_connections_data = datumData.fields[2];

      // Parse chain connections list
      const chain_connections: ChainConnection[] = [];
      if (chain_connections_data instanceof Constr && chain_connections_data.fields) {
        for (const connData of chain_connections_data.fields) {
          if (connData instanceof Constr && connData.fields.length >= 2) {
            const chain_id = connData.fields[0] as bigint;
            const bridge_address = toText(connData.fields[1] as string);
            
            chain_connections.push({
              chain_id,
              bridge_address
            });
          }
        }
      }

      return {
        total_volume,
        last_processed_nonce,
        chain_connections
      };

    } catch (error) {
      console.error("❌ Error parsing CrossChainRouterDatum:", error);
      return null;
    }
  }

  private handleRouterUpdate(utxo: UTxO): void {
    try {
      console.log(`🔄 Router update detected: ${utxo.txHash}`);

      this.parseCrossChainRouterDatum(utxo).then(newState => {
        if (!newState) {
          console.error("❌ Failed to parse new router state");
          return;
        }

        const oldState = this.currentState;
        this.currentState = newState;

        // Log state changes
        this.logStateChanges(oldState, newState);

        // Detect and emit events
        this.detectAndEmitEvents(oldState, newState, utxo);

        // Broadcast state update via WebSocket
        this.broadcastStateUpdate(newState);

        // Check for alerts
        if (this.config.enableAlerts) {
          this.checkAlerts(oldState, newState);
        }

      }).catch(error => {
        console.error("❌ Failed to handle router update:", error);
      });
    } catch (error) {
      console.error("❌ Failed to handle router update:", error);
    }
  }

  private logStateChanges(oldState: CrossChainRouterDatum | null, newState: CrossChainRouterDatum): void {
    if (!oldState) {
      console.log("📊 Initial router state loaded");
      return;
    }

    // Log volume changes
    if (newState.total_volume !== oldState.total_volume) {
      const volumeChange = newState.total_volume - oldState.total_volume;
      console.log(`💰 Volume changed: ${volumeChange > 0 ? '+' : ''}${volumeChange} lovelace (Total: ${newState.total_volume})`);
    }

    // Log nonce changes
    if (newState.last_processed_nonce !== oldState.last_processed_nonce) {
      const nonceChange = newState.last_processed_nonce - oldState.last_processed_nonce;
      console.log(`🔢 Nonce updated: ${oldState.last_processed_nonce} → ${newState.last_processed_nonce} (Change: +${nonceChange})`);
    }

    // Log chain connection changes
    const oldConnections = oldState.chain_connections.length;
    const newConnections = newState.chain_connections.length;
    if (newConnections !== oldConnections) {
      console.log(`🌐 Chain connections changed: ${oldConnections} → ${newConnections}`);
    }
  }

  private detectAndEmitEvents(
    oldState: CrossChainRouterDatum | null,
    newState: CrossChainRouterDatum,
    utxo: UTxO
  ): void {
    if (!oldState) {
      // Initial state load - emit RouterStateUpdated event
      this.emitEvent({
        type: 'RouterStateUpdated',
        transactionHash: utxo.txHash,
        slot: utxo.slot || 0,
        blockHeight: utxo.blockHeight || 0,
        timestamp: new Date(),
        data: { newState }
      });
      return;
    }

    // Detect outbound transfer initiations (volume increases, nonce increments)
    if (newState.total_volume > oldState.total_volume &&
        newState.last_processed_nonce > oldState.last_processed_nonce) {
      const volumeChange = newState.total_volume - oldState.total_volume;
      const nonceChange = newState.last_processed_nonce - oldState.last_processed_nonce;

      console.log(`🚀 Outbound transfer initiated: Volume +${volumeChange}, Nonce +${nonceChange}`);

      this.emitEvent({
        type: 'OutboundTransferInitiated',
        transactionHash: utxo.txHash,
        slot: utxo.slot || 0,
        blockHeight: utxo.blockHeight || 0,
        timestamp: new Date(),
        data: {
          oldState,
          newState,
          volumeChange,
          nonceChange
        }
      });
    }

    // Detect inbound transfer finalizations (nonce updates without volume increase)
    if (newState.last_processed_nonce > oldState.last_processed_nonce &&
        newState.total_volume === oldState.total_volume) {
      const nonceChange = newState.last_processed_nonce - oldState.last_processed_nonce;

      console.log(`📥 Inbound transfer finalized: Nonce +${nonceChange}`);

      this.emitEvent({
        type: 'InboundTransferFinalized',
        transactionHash: utxo.txHash,
        slot: utxo.slot || 0,
        blockHeight: utxo.blockHeight || 0,
        timestamp: new Date(),
        data: {
          oldState,
          newState,
          nonceChange
        }
      });
    }

    // Detect nonce updates (any nonce change)
    if (newState.last_processed_nonce !== oldState.last_processed_nonce) {
      const nonceChange = newState.last_processed_nonce - oldState.last_processed_nonce;

      this.emitEvent({
        type: 'NonceUpdated',
        transactionHash: utxo.txHash,
        slot: utxo.slot || 0,
        blockHeight: utxo.blockHeight || 0,
        timestamp: new Date(),
        data: {
          oldState,
          newState,
          nonceChange
        }
      });
    }

    // Detect volume updates (any volume change)
    if (newState.total_volume !== oldState.total_volume) {
      const volumeChange = newState.total_volume - oldState.total_volume;

      this.emitEvent({
        type: 'VolumeUpdated',
        transactionHash: utxo.txHash,
        slot: utxo.slot || 0,
        blockHeight: utxo.blockHeight || 0,
        timestamp: new Date(),
        data: {
          oldState,
          newState,
          volumeChange
        }
      });
    }

    // Detect chain connection changes
    this.detectChainConnectionChanges(oldState, newState, utxo);

    // Always emit general state update
    this.emitEvent({
      type: 'RouterStateUpdated',
      transactionHash: utxo.txHash,
      slot: utxo.slot || 0,
      blockHeight: utxo.blockHeight || 0,
      timestamp: new Date(),
      data: {
        oldState,
        newState
      }
    });
  }

  private detectChainConnectionChanges(
    oldState: CrossChainRouterDatum,
    newState: CrossChainRouterDatum,
    utxo: UTxO
  ): void {
    // Find new chain connections
    const newConnections = newState.chain_connections.filter(newConn =>
      !oldState.chain_connections.some(oldConn =>
        oldConn.chain_id === newConn.chain_id && oldConn.bridge_address === newConn.bridge_address
      )
    );

    for (const connection of newConnections) {
      console.log(`🌐 New chain connection added: Chain ID ${connection.chain_id}, Bridge ${connection.bridge_address}`);

      this.emitEvent({
        type: 'ChainConnectionAdded',
        transactionHash: utxo.txHash,
        slot: utxo.slot || 0,
        blockHeight: utxo.blockHeight || 0,
        timestamp: new Date(),
        data: {
          oldState,
          newState,
          chainConnection: connection
        }
      });
    }

    // Find removed chain connections
    const removedConnections = oldState.chain_connections.filter(oldConn =>
      !newState.chain_connections.some(newConn =>
        newConn.chain_id === oldConn.chain_id && newConn.bridge_address === oldConn.bridge_address
      )
    );

    for (const connection of removedConnections) {
      console.log(`🌐 Chain connection removed: Chain ID ${connection.chain_id}, Bridge ${connection.bridge_address}`);

      this.emitEvent({
        type: 'ChainConnectionRemoved',
        transactionHash: utxo.txHash,
        slot: utxo.slot || 0,
        blockHeight: utxo.blockHeight || 0,
        timestamp: new Date(),
        data: {
          oldState,
          newState,
          chainConnection: connection
        }
      });
    }
  }

  private emitEvent(event: CrossChainRouterEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error(`❌ Error in event listener for ${event.type}:`, error);
      }
    });

    // Also emit to 'all' listeners
    const allListeners = this.eventListeners.get('all') || [];
    allListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error(`❌ Error in 'all' event listener:`, error);
      }
    });
  }

  private broadcastStateUpdate(state: CrossChainRouterDatum): void {
    if (!this.config.enableWebSocket || !this.websocketConnection) {
      return;
    }

    try {
      const message = {
        type: 'crosschain_router_update',
        timestamp: new Date().toISOString(),
        data: {
          total_volume: state.total_volume.toString(),
          last_processed_nonce: state.last_processed_nonce.toString(),
          chain_connections: state.chain_connections.map(conn => ({
            chain_id: conn.chain_id.toString(),
            bridge_address: conn.bridge_address
          }))
        }
      };

      if (this.websocketConnection.readyState === WebSocket.OPEN) {
        this.websocketConnection.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error("❌ Failed to broadcast state update:", error);
    }
  }

  private checkAlerts(oldState: CrossChainRouterDatum | null, newState: CrossChainRouterDatum): void {
    if (!oldState) return;

    // Check for nonce inconsistencies
    const nonceChange = newState.last_processed_nonce - oldState.last_processed_nonce;
    if (nonceChange > this.config.alertThresholds.maxNonceGap) {
      console.warn(`⚠️ ALERT: Large nonce gap detected: ${nonceChange} (threshold: ${this.config.alertThresholds.maxNonceGap})`);
    }

    // Check for suspicious volume changes
    const volumeChange = newState.total_volume - oldState.total_volume;
    if (volumeChange > this.config.alertThresholds.suspiciousVolumeThreshold) {
      console.warn(`⚠️ ALERT: Suspicious volume increase: ${volumeChange} lovelace (threshold: ${this.config.alertThresholds.suspiciousVolumeThreshold})`);
    }

    // Check for nonce inconsistency (nonce going backwards)
    if (newState.last_processed_nonce < oldState.last_processed_nonce) {
      console.error(`🚨 CRITICAL ALERT: Nonce decreased! ${oldState.last_processed_nonce} → ${newState.last_processed_nonce}`);
    }
  }

  private initializeWebSocket(): void {
    try {
      // This would connect to your WebSocket server
      // For now, we'll create a mock connection
      console.log("🔌 Initializing WebSocket connection for cross-chain router updates...");

      // In a real implementation, you would connect to your WebSocket server:
      // this.websocketConnection = new WebSocket('wss://your-websocket-server.com/crosschain');

      console.log("✅ WebSocket connection initialized (mock)");
    } catch (error) {
      console.error("❌ Failed to initialize WebSocket:", error);
    }
  }

  private startPeriodicHealthChecks(): void {
    setInterval(() => {
      if (!this.isMonitoring) return;

      try {
        // Perform health checks
        if (this.currentState) {
          console.log(`💓 Health check - Router monitoring active. Last nonce: ${this.currentState.last_processed_nonce}`);
        }

        // Check WebSocket connection
        if (this.config.enableWebSocket && this.websocketConnection) {
          if (this.websocketConnection.readyState !== WebSocket.OPEN) {
            console.warn("⚠️ WebSocket connection lost, attempting to reconnect...");
            this.initializeWebSocket();
          }
        }
      } catch (error) {
        console.error("❌ Health check failed:", error);
      }
    }, this.config.pollingInterval);
  }
}

// Factory function to create and initialize monitor
export async function createCrossChainRouterMonitor(
  config: Partial<CrossChainRouterMonitorConfig> & { routerAddress: Address }
): Promise<CrossChainRouterMonitor> {
  const defaultConfig: CrossChainRouterMonitorConfig = {
    routerAddress: config.routerAddress,
    blockfrostApiKey: ENV_CONFIG.blockfrostApiKey,
    network: ENV_CONFIG.network,
    enableWebSocket: true,
    pollingInterval: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    enableAlerts: true,
    alertThresholds: {
      nonceInconsistencyThreshold: 10,
      suspiciousVolumeThreshold: 1000000000000n, // 1M ADA
      maxNonceGap: 100
    }
  };

  const finalConfig = { ...defaultConfig, ...config };
  const monitor = new CrossChainRouterMonitor(finalConfig);

  await monitor.initialize();
  return monitor;
}

// Export types and interfaces
export type {
  CrossChainRouterDatum,
  ChainConnection,
  CrossChainRouterEvent,
  CrossChainRouterMonitorConfig
};
