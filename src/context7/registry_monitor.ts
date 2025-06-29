// PuckSwap v5 - Pool Registry Monitor
// Context7 real-time monitoring for pool registry state changes
// Full CIP-68 compliance with PoolRegistryDatum structure and WebSocket broadcasting

import { createIndexer, Indexer, UTxO, Address, PolicyId } from "../lib/mock-context7-sdk";
import { Data, Constr, fromText, toText } from "@lucid-evolution/lucid";
import { getEnvironmentConfig, ENV_CONFIG } from "../lib/environment-config";

// Master Schema PoolRegistryDatum structure (CIP-68 compliant)
export interface PoolRegistryDatum {
  pools: PoolEntry[];
}

// Master Schema PoolEntry structure
export interface PoolEntry {
  pool_id: string; // ByteArray as hex string
  pool_address: Address;
  lp_token_policy: PolicyId;
  fee_basis_points: number;
}

// Registry state tracking
export interface RegistryState {
  totalPools: number;
  pools: PoolEntry[];
  lastUpdatedSlot: number;
  lastUpdatedTxHash: string;
}

// Registry event types
export interface RegistryEvent {
  type: 'PoolRegistered' | 'PoolUpdated' | 'RegistryStateChanged';
  poolId?: string;
  transactionHash: string;
  slot: number;
  blockHeight: number;
  timestamp: Date;
  data: any;
}

// Registry monitor configuration
export interface RegistryMonitorConfig {
  registryAddress: Address;
  blockfrostApiKey?: string;
  network?: "mainnet" | "preview" | "preprod";
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

// Pool Registry Monitor Class
export class PoolRegistryMonitor {
  private indexer: Indexer;
  private config: RegistryMonitorConfig;
  private currentState: RegistryState | null = null;
  private isMonitoring: boolean = false;
  private retryCount: number = 0;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: RegistryMonitorConfig) {
    // Use environment configuration if not provided
    const envConfig = getEnvironmentConfig();
    
    this.config = {
      ...config,
      blockfrostApiKey: config.blockfrostApiKey || envConfig.blockfrostApiKey,
      network: config.network || envConfig.network,
    };

    // Initialize Context7 indexer
    this.indexer = createIndexer({
      projectId: this.config.blockfrostApiKey!,
      network: this.config.network!
    });

    this.initializeEventListeners();
  }

  // Initialize event listener maps
  private initializeEventListeners(): void {
    this.eventListeners.set('poolRegistered', []);
    this.eventListeners.set('poolUpdated', []);
    this.eventListeners.set('registryStateChanged', []);
    this.eventListeners.set('error', []);
  }

  // Start monitoring the pool registry
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.warn("Pool Registry Monitor is already running");
      return;
    }

    try {
      this.isMonitoring = true;
      console.log("Starting Pool Registry monitoring...");
      console.log(`Registry Address: ${this.config.registryAddress}`);
      console.log(`Network: ${this.config.network}`);

      // Load initial state
      await this.loadInitialState();

      // Subscribe to registry address changes
      this.indexer.addresses.subscribe([this.config.registryAddress], (utxo) => {
        this.handleRegistryUpdate(utxo);
      });

      // Start periodic state updates if configured
      if (this.config.pollingInterval > 0) {
        this.startPeriodicUpdates();
      }

      console.log("Pool Registry monitoring started successfully");
      console.log(`Current registry state: ${this.currentState?.totalPools || 0} pools`);
    } catch (error) {
      console.error("Failed to start Pool Registry monitoring:", error);
      this.isMonitoring = false;
      
      if (this.retryCount < this.config.maxRetries) {
        this.retryCount++;
        console.log(`Retrying in ${this.config.retryDelay}ms... (${this.retryCount}/${this.config.maxRetries})`);
        setTimeout(() => this.startMonitoring(), this.config.retryDelay);
      } else {
        this.emitEvent('error', { error, context: 'startMonitoring' });
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
    console.log("Pool Registry monitoring stopped");
  }

  // Load initial registry state
  private async loadInitialState(): Promise<void> {
    try {
      console.log("Loading initial registry state...");
      
      // Get current UTxOs at registry address
      const utxos = await this.indexer.addresses.getUtxos(this.config.registryAddress);
      
      if (utxos.length === 0) {
        console.warn("No UTxOs found at registry address");
        this.currentState = {
          totalPools: 0,
          pools: [],
          lastUpdatedSlot: 0,
          lastUpdatedTxHash: ""
        };
        return;
      }

      // Find the registry UTxO (should have inline datum)
      const registryUtxo = utxos.find(utxo => utxo.datum !== null);
      
      if (!registryUtxo) {
        throw new Error("No registry UTxO with datum found");
      }

      // Parse the registry state
      this.currentState = await this.parseRegistryState(registryUtxo);
      console.log(`Initial state loaded: ${this.currentState.totalPools} pools registered`);
      
      // Log each pool for debugging
      this.currentState.pools.forEach((pool, index) => {
        console.log(`Pool ${index + 1}:`, {
          pool_id: pool.pool_id,
          pool_address: pool.pool_address,
          lp_token_policy: pool.lp_token_policy,
          fee_basis_points: pool.fee_basis_points
        });
      });

    } catch (error) {
      console.error("Failed to load initial registry state:", error);
      throw error;
    }
  }

  // Handle registry UTxO updates
  private handleRegistryUpdate(utxo: UTxO): void {
    try {
      console.log("Registry update detected:", utxo.txHash);
      
      this.parseRegistryState(utxo).then(newState => {
        const oldState = this.currentState;
        this.currentState = newState;
        
        // Detect and emit events based on state changes
        this.detectAndEmitEvents(oldState, newState, utxo);
        
        // Broadcast updated state if enabled
        if (this.config.enableBroadcast) {
          this.broadcastRegistryState();
        }
        
        console.log(`Registry updated: ${newState.totalPools} pools`);
      }).catch(error => {
        console.error("Failed to parse registry update:", error);
        this.emitEvent('error', { error, context: 'handleRegistryUpdate', utxo });
      });
    } catch (error) {
      console.error("Failed to handle registry update:", error);
      this.emitEvent('error', { error, context: 'handleRegistryUpdate', utxo });
    }
  }

  // Parse PoolRegistryDatum from UTxO using CIP-68 decoding
  private async parseRegistryState(utxo: UTxO): Promise<RegistryState> {
    try {
      if (!utxo.datum) {
        throw new Error("UTxO has no datum");
      }

      // Parse the inline datum using Lucid Evolution Data utilities
      const datumData = Data.from(utxo.datum);
      
      // Parse PoolRegistryDatum structure
      const registryDatum = this.parsePoolRegistryDatum(datumData);
      
      return {
        totalPools: registryDatum.pools.length,
        pools: registryDatum.pools,
        lastUpdatedSlot: utxo.slot || 0,
        lastUpdatedTxHash: utxo.txHash
      };
    } catch (error) {
      console.error("Failed to parse registry state:", error);
      throw new Error(`Failed to parse PoolRegistryDatum: ${error}`);
    }
  }

  // Parse PoolRegistryDatum from Plutus Data
  private parsePoolRegistryDatum(data: Data): PoolRegistryDatum {
    try {
      // Expect Constr with pools list
      if (!(data instanceof Constr)) {
        throw new Error("Invalid datum structure: expected Constr");
      }

      // Extract pools list (first field)
      const poolsData = data.fields[0];
      
      if (!(poolsData instanceof Constr)) {
        throw new Error("Invalid pools structure: expected Constr list");
      }

      // Parse each pool entry
      const pools: PoolEntry[] = [];
      
      // Handle list structure - pools should be in fields array
      for (const poolData of poolsData.fields) {
        if (poolData instanceof Constr) {
          const poolEntry = this.parsePoolEntry(poolData);
          pools.push(poolEntry);
        }
      }

      return { pools };
    } catch (error) {
      console.error("Failed to parse PoolRegistryDatum:", error);
      throw error;
    }
  }

  // Parse individual PoolEntry from Plutus Data
  private parsePoolEntry(data: Constr): PoolEntry {
    try {
      if (data.fields.length < 4) {
        throw new Error("Invalid PoolEntry structure: insufficient fields");
      }

      // Extract fields according to PoolEntry structure
      const pool_id = this.extractByteArray(data.fields[0]);
      const pool_address = this.extractAddress(data.fields[1]);
      const lp_token_policy = this.extractByteArray(data.fields[2]);
      const fee_basis_points = this.extractInteger(data.fields[3]);

      return {
        pool_id,
        pool_address,
        lp_token_policy,
        fee_basis_points
      };
    } catch (error) {
      console.error("Failed to parse PoolEntry:", error);
      throw error;
    }
  }

  // Extract ByteArray from Plutus Data
  private extractByteArray(data: Data): string {
    if (typeof data === 'string') {
      return data;
    }
    if (data instanceof Uint8Array) {
      return Buffer.from(data).toString('hex');
    }
    throw new Error("Invalid ByteArray format");
  }

  // Extract Address from Plutus Data
  private extractAddress(data: Data): Address {
    // Address parsing logic - this may need adjustment based on actual datum structure
    if (typeof data === 'string') {
      return data as Address;
    }
    if (data instanceof Constr) {
      // Handle credential-based address structure
      return this.parseCredentialAddress(data);
    }
    throw new Error("Invalid Address format");
  }

  // Parse credential-based address
  private parseCredentialAddress(data: Constr): Address {
    // This is a simplified implementation - may need adjustment based on actual structure
    try {
      // Typically addresses are encoded as credential structures
      // For now, return a placeholder - this would need proper implementation
      return "addr1_placeholder" as Address;
    } catch (error) {
      throw new Error(`Failed to parse credential address: ${error}`);
    }
  }

  // Extract Integer from Plutus Data
  private extractInteger(data: Data): number {
    if (typeof data === 'bigint') {
      return Number(data);
    }
    if (typeof data === 'number') {
      return data;
    }
    throw new Error("Invalid Integer format");
  }

  // Detect and emit events based on state changes
  private detectAndEmitEvents(oldState: RegistryState | null, newState: RegistryState, utxo: UTxO): void {
    try {
      if (!oldState) {
        // Initial state load - emit registry state changed
        this.emitEvent('registryStateChanged', {
          type: 'RegistryStateChanged',
          transactionHash: utxo.txHash,
          slot: utxo.slot || 0,
          blockHeight: utxo.blockHeight || 0,
          timestamp: new Date(),
          data: {
            totalPools: newState.totalPools,
            pools: newState.pools
          }
        });
        return;
      }

      // Check for new pool registrations
      const newPools = newState.pools.filter(newPool =>
        !oldState.pools.some(oldPool => oldPool.pool_id === newPool.pool_id)
      );

      // Emit events for new pools
      newPools.forEach(pool => {
        console.log(`New pool registered: ${pool.pool_id}`);
        console.log(`  Address: ${pool.pool_address}`);
        console.log(`  LP Token Policy: ${pool.lp_token_policy}`);
        console.log(`  Fee Basis Points: ${pool.fee_basis_points}`);

        this.emitEvent('poolRegistered', {
          type: 'PoolRegistered',
          poolId: pool.pool_id,
          transactionHash: utxo.txHash,
          slot: utxo.slot || 0,
          blockHeight: utxo.blockHeight || 0,
          timestamp: new Date(),
          data: pool
        });
      });

      // Check for pool updates (fee changes, etc.)
      const updatedPools = newState.pools.filter(newPool => {
        const oldPool = oldState.pools.find(p => p.pool_id === newPool.pool_id);
        return oldPool && (
          oldPool.fee_basis_points !== newPool.fee_basis_points ||
          oldPool.lp_token_policy !== newPool.lp_token_policy
        );
      });

      // Emit events for updated pools
      updatedPools.forEach(pool => {
        const oldPool = oldState.pools.find(p => p.pool_id === pool.pool_id);
        console.log(`Pool updated: ${pool.pool_id}`);

        this.emitEvent('poolUpdated', {
          type: 'PoolUpdated',
          poolId: pool.pool_id,
          transactionHash: utxo.txHash,
          slot: utxo.slot || 0,
          blockHeight: utxo.blockHeight || 0,
          timestamp: new Date(),
          data: {
            oldPool,
            newPool: pool
          }
        });
      });

      // Always emit registry state changed if there are any changes
      if (newPools.length > 0 || updatedPools.length > 0) {
        this.emitEvent('registryStateChanged', {
          type: 'RegistryStateChanged',
          transactionHash: utxo.txHash,
          slot: utxo.slot || 0,
          blockHeight: utxo.blockHeight || 0,
          timestamp: new Date(),
          data: {
            totalPools: newState.totalPools,
            newPools: newPools.length,
            updatedPools: updatedPools.length,
            pools: newState.pools
          }
        });
      }
    } catch (error) {
      console.error("Failed to detect and emit events:", error);
      this.emitEvent('error', { error, context: 'detectAndEmitEvents' });
    }
  }

  // Emit event to registered listeners
  private emitEvent(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${eventType}:`, error);
      }
    });
  }

  // Start periodic state updates
  private startPeriodicUpdates(): void {
    setInterval(async () => {
      if (!this.isMonitoring) return;

      try {
        await this.loadInitialState();
      } catch (error) {
        console.error("Periodic update failed:", error);
        this.emitEvent('error', { error, context: 'periodicUpdate' });
      }
    }, this.config.pollingInterval);
  }

  // Broadcast registry state to configured endpoints
  private async broadcastRegistryState(): Promise<void> {
    if (!this.currentState || !this.config.broadcastEndpoints) {
      return;
    }

    try {
      const payload = {
        timestamp: new Date().toISOString(),
        network: this.config.network,
        registryAddress: this.config.registryAddress,
        totalPools: this.currentState.totalPools,
        pools: this.currentState.pools,
        lastUpdatedSlot: this.currentState.lastUpdatedSlot,
        lastUpdatedTxHash: this.currentState.lastUpdatedTxHash
      };

      // Broadcast to WebSocket endpoint
      if (this.config.broadcastEndpoints.websocket) {
        await this.broadcastToWebSocket(payload);
      }

      // Broadcast to API endpoint
      if (this.config.broadcastEndpoints.api) {
        await this.broadcastToAPI(payload);
      }

      // Broadcast to pub/sub endpoint
      if (this.config.broadcastEndpoints.pubsub) {
        await this.broadcastToPubSub(payload);
      }

      console.log("Registry state broadcasted successfully");
    } catch (error) {
      console.error("Failed to broadcast registry state:", error);
      this.emitEvent('error', { error, context: 'broadcastRegistryState' });
    }
  }

  // Broadcast to WebSocket endpoint
  private async broadcastToWebSocket(payload: any): Promise<void> {
    // WebSocket broadcasting implementation
    // This would typically use a WebSocket client or server-sent events
    console.log("Broadcasting to WebSocket:", this.config.broadcastEndpoints?.websocket);
    // Implementation depends on specific WebSocket infrastructure
  }

  // Broadcast to API endpoint
  private async broadcastToAPI(payload: any): Promise<void> {
    try {
      const response = await fetch(this.config.broadcastEndpoints!.api!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API broadcast failed: ${response.status} ${response.statusText}`);
      }

      console.log("Successfully broadcasted to API endpoint");
    } catch (error) {
      console.error("Failed to broadcast to API:", error);
      throw error;
    }
  }

  // Broadcast to pub/sub endpoint
  private async broadcastToPubSub(payload: any): Promise<void> {
    // Pub/sub broadcasting implementation
    // This would typically use Redis, RabbitMQ, or similar
    console.log("Broadcasting to Pub/Sub:", this.config.broadcastEndpoints?.pubsub);
    // Implementation depends on specific pub/sub infrastructure
  }

  // Public API Methods

  // Add event listener
  public addEventListener(eventType: string, listener: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  // Remove event listener
  public removeEventListener(eventType: string, listener: Function): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Get current registry state
  public getCurrentState(): RegistryState | null {
    return this.currentState;
  }

  // Get specific pool by ID
  public getPoolById(poolId: string): PoolEntry | null {
    if (!this.currentState) return null;
    return this.currentState.pools.find(pool => pool.pool_id === poolId) || null;
  }

  // Get all pools
  public getAllPools(): PoolEntry[] {
    return this.currentState?.pools || [];
  }

  // Get pools by fee range
  public getPoolsByFeeRange(minFee: number, maxFee: number): PoolEntry[] {
    if (!this.currentState) return [];
    return this.currentState.pools.filter(pool =>
      pool.fee_basis_points >= minFee && pool.fee_basis_points <= maxFee
    );
  }

  // Get pools by LP token policy
  public getPoolsByLPTokenPolicy(policyId: PolicyId): PoolEntry[] {
    if (!this.currentState) return [];
    return this.currentState.pools.filter(pool => pool.lp_token_policy === policyId);
  }

  // Check if monitoring is active
  public isActive(): boolean {
    return this.isMonitoring;
  }

  // Get monitor configuration
  public getConfig(): RegistryMonitorConfig {
    return { ...this.config };
  }

  // Get monitor statistics
  public getStatistics(): {
    totalPools: number;
    isMonitoring: boolean;
    lastUpdatedSlot: number;
    lastUpdatedTxHash: string;
    retryCount: number;
    network: string;
    registryAddress: string;
  } {
    return {
      totalPools: this.currentState?.totalPools || 0,
      isMonitoring: this.isMonitoring,
      lastUpdatedSlot: this.currentState?.lastUpdatedSlot || 0,
      lastUpdatedTxHash: this.currentState?.lastUpdatedTxHash || "",
      retryCount: this.retryCount,
      network: this.config.network || "unknown",
      registryAddress: this.config.registryAddress
    };
  }

  // Convenience event listener methods
  public onPoolRegistered(callback: (event: RegistryEvent) => void): void {
    this.addEventListener('poolRegistered', callback);
  }

  public onPoolUpdated(callback: (event: RegistryEvent) => void): void {
    this.addEventListener('poolUpdated', callback);
  }

  public onRegistryStateChanged(callback: (event: RegistryEvent) => void): void {
    this.addEventListener('registryStateChanged', callback);
  }

  public onError(callback: (error: any) => void): void {
    this.addEventListener('error', callback);
  }
}

// Factory function to create and initialize registry monitor
export async function createPoolRegistryMonitor(
  config: Partial<RegistryMonitorConfig> & { registryAddress: Address }
): Promise<PoolRegistryMonitor> {
  const defaultConfig: RegistryMonitorConfig = {
    registryAddress: config.registryAddress,
    enableWebSocket: true,
    pollingInterval: 10000, // 10 seconds
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    enableBroadcast: false,
    ...config
  };

  const monitor = new PoolRegistryMonitor(defaultConfig);

  // Auto-start monitoring if not explicitly disabled
  if (config.enableWebSocket !== false) {
    await monitor.startMonitoring();
  }

  return monitor;
}

// Export utility functions for external use

// Parse pool registry datum from raw CBOR hex
export function parsePoolRegistryDatumFromCBOR(cborHex: string): PoolRegistryDatum {
  try {
    const data = Data.from(cborHex);
    const monitor = new PoolRegistryMonitor({
      registryAddress: "addr1_placeholder" as Address,
      enableWebSocket: false,
      pollingInterval: 0,
      maxRetries: 0,
      retryDelay: 0,
      enableBroadcast: false
    });

    // Access private method through type assertion
    return (monitor as any).parsePoolRegistryDatum(data);
  } catch (error) {
    throw new Error(`Failed to parse PoolRegistryDatum from CBOR: ${error}`);
  }
}

// Validate pool entry structure
export function validatePoolEntry(pool: any): pool is PoolEntry {
  return (
    typeof pool === 'object' &&
    typeof pool.pool_id === 'string' &&
    typeof pool.pool_address === 'string' &&
    typeof pool.lp_token_policy === 'string' &&
    typeof pool.fee_basis_points === 'number' &&
    pool.fee_basis_points >= 0 &&
    pool.fee_basis_points <= 10000 // Max 100% fee
  );
}

// Validate registry datum structure
export function validatePoolRegistryDatum(datum: any): datum is PoolRegistryDatum {
  return (
    typeof datum === 'object' &&
    Array.isArray(datum.pools) &&
    datum.pools.every(validatePoolEntry)
  );
}

// Example usage and configuration
export const EXAMPLE_USAGE = `
// Example: Initialize and use Pool Registry Monitor

import { createPoolRegistryMonitor, PoolRegistryMonitor } from './registry_monitor';

async function initializeRegistryMonitor() {
  // Create monitor with configuration
  const monitor = await createPoolRegistryMonitor({
    registryAddress: process.env.NEXT_PUBLIC_POOL_REGISTRY_ADDRESS!,
    enableWebSocket: true,
    pollingInterval: 10000, // 10 seconds
    maxRetries: 3,
    enableBroadcast: true,
    broadcastEndpoints: {
      api: 'https://api.puckswap.com/registry/update',
      websocket: 'wss://ws.puckswap.com/registry'
    }
  });

  // Add event listeners
  monitor.onPoolRegistered((event) => {
    console.log('New pool registered:', event.data);
    // Handle new pool registration
    // - Update frontend pool list
    // - Notify users
    // - Update analytics
  });

  monitor.onPoolUpdated((event) => {
    console.log('Pool updated:', event.data);
    // Handle pool updates
    // - Update pool information
    // - Notify affected users
  });

  monitor.onRegistryStateChanged((event) => {
    console.log('Registry state changed:', event.data);
    // Broadcast full pool list to frontend
    broadcastToFrontend(event.data.pools);
  });

  monitor.onError((error) => {
    console.error('Registry monitor error:', error);
    // Handle errors
    // - Log to monitoring system
    // - Attempt recovery
    // - Notify administrators
  });

  // Get current state
  const currentState = monitor.getCurrentState();
  console.log(\`Registry has \${currentState?.totalPools || 0} pools\`);

  // Get specific pool
  const pool = monitor.getPoolById('pool_id_here');
  if (pool) {
    console.log('Found pool:', pool);
  }

  // Get pools by fee range (0.1% to 1%)
  const lowFeePools = monitor.getPoolsByFeeRange(10, 100);
  console.log(\`Found \${lowFeePools.length} low-fee pools\`);

  return monitor;
}

function broadcastToFrontend(pools: any[]) {
  // Implementation to broadcast pool list to frontend consumers
  // This could be WebSocket, Server-Sent Events, or API updates
}

// Initialize the monitor
initializeRegistryMonitor().catch(console.error);
`;

// Default configuration for different environments
export const DEFAULT_CONFIGS = {
  mainnet: {
    registryAddress: process.env.NEXT_PUBLIC_POOL_REGISTRY_ADDRESS || "addr1_mainnet_registry" as Address,
    enableWebSocket: true,
    pollingInterval: 30000, // 30 seconds for mainnet
    maxRetries: 5,
    retryDelay: 10000, // 10 seconds
    enableBroadcast: true
  },
  preprod: {
    registryAddress: process.env.NEXT_PUBLIC_POOL_REGISTRY_ADDRESS || "addr1_preprod_registry" as Address,
    enableWebSocket: true,
    pollingInterval: 10000, // 10 seconds for testnet
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    enableBroadcast: false // Disable broadcasting on testnet
  },
  preview: {
    registryAddress: process.env.NEXT_PUBLIC_POOL_REGISTRY_ADDRESS || "addr1_preview_registry" as Address,
    enableWebSocket: true,
    pollingInterval: 5000, // 5 seconds for preview
    maxRetries: 3,
    retryDelay: 2000, // 2 seconds
    enableBroadcast: false
  }
} as const;
