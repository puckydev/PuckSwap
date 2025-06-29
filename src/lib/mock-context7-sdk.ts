// Mock Context7 SDK for PuckSwap v5 Testing
// Provides mock implementations of Context7 indexer functionality for development and testing

export type Address = string;
export type PolicyId = string;
export type TxHash = string;

export interface UTxO {
  txHash: TxHash;
  outputIndex: number;
  address: Address;
  assets: Record<string, bigint>;
  datum?: string;
  datumHash?: string;
  scriptRef?: string;
  slot?: number;
}

export interface IndexerConfig {
  projectId: string;
  network: "mainnet" | "preview" | "preprod";
  endpoint?: string;
}

export interface Context7 {
  network: string;
  projectId: string;
}

// Mock Indexer class
export class Indexer {
  private config: IndexerConfig;
  private subscriptions: Map<string, Function[]> = new Map();
  private isRunning: boolean = false;

  constructor(config: IndexerConfig) {
    this.config = config;
  }

  // Subscribe to address changes
  async subscribeToAddress(address: Address, callback: (utxo: UTxO) => void): Promise<void> {
    console.log(`Mock Context7: Subscribing to address ${address}`);
    
    if (!this.subscriptions.has(address)) {
      this.subscriptions.set(address, []);
    }
    this.subscriptions.get(address)!.push(callback);

    // Simulate initial UTxO for testing
    setTimeout(() => {
      const mockUtxo: UTxO = {
        txHash: "mock_tx_" + Math.random().toString(36).substr(2, 9),
        outputIndex: 0,
        address: address,
        assets: {
          lovelace: 2000000n,
          "mock_policy.mock_token": 1000000n
        },
        datum: "d87980", // Mock datum
        slot: Date.now()
      };
      callback(mockUtxo);
    }, 1000);
  }

  // Subscribe to multiple addresses
  async subscribeToAddresses(addresses: Address[], callback: (utxo: UTxO) => void): Promise<void> {
    console.log(`Mock Context7: Subscribing to ${addresses.length} addresses`);
    
    for (const address of addresses) {
      await this.subscribeToAddress(address, callback);
    }
  }

  // Subscribe to policy changes
  async subscribeToPolicy(policyId: PolicyId, callback: (utxo: UTxO) => void): Promise<void> {
    console.log(`Mock Context7: Subscribing to policy ${policyId}`);
    
    // Mock policy subscription
    setTimeout(() => {
      const mockUtxo: UTxO = {
        txHash: "mock_policy_tx_" + Math.random().toString(36).substr(2, 9),
        outputIndex: 0,
        address: "addr_test1mock",
        assets: {
          lovelace: 2000000n,
          [`${policyId}.mock_token`]: 1000000n
        },
        slot: Date.now()
      };
      callback(mockUtxo);
    }, 1500);
  }

  // Start monitoring
  async start(): Promise<void> {
    console.log("Mock Context7: Starting indexer");
    this.isRunning = true;
  }

  // Stop monitoring
  async stop(): Promise<void> {
    console.log("Mock Context7: Stopping indexer");
    this.isRunning = false;
  }

  // Get current UTxOs at address
  async getUtxosAt(address: Address): Promise<UTxO[]> {
    console.log(`Mock Context7: Getting UTxOs at ${address}`);
    
    return [
      {
        txHash: "mock_current_tx_" + Math.random().toString(36).substr(2, 9),
        outputIndex: 0,
        address: address,
        assets: {
          lovelace: 5000000n,
          "mock_policy.mock_token": 2000000n
        },
        datum: "d87980",
        slot: Date.now()
      }
    ];
  }

  // Check if indexer is running
  isActive(): boolean {
    return this.isRunning;
  }
}

// Factory function to create indexer
export async function createIndexer(config: IndexerConfig): Promise<Indexer> {
  console.log(`Mock Context7: Creating indexer for ${config.network} with project ${config.projectId.slice(0, 8)}...`);
  
  const indexer = new Indexer(config);
  await indexer.start();
  
  return indexer;
}

// Mock Context7 main class
export class MockContext7 {
  private config: IndexerConfig;

  constructor(config: IndexerConfig) {
    this.config = config;
  }

  async createIndexer(): Promise<Indexer> {
    return createIndexer(this.config);
  }
}

// Export types and functions that match the real Context7 SDK
export { MockContext7 as Context7 };

// Additional mock utilities
export const mockUtilities = {
  generateMockUtxo: (address: Address, assets?: Record<string, bigint>): UTxO => ({
    txHash: "mock_tx_" + Math.random().toString(36).substr(2, 9),
    outputIndex: Math.floor(Math.random() * 10),
    address,
    assets: assets || { lovelace: 2000000n },
    slot: Date.now()
  }),

  generateMockDatum: (data: any): string => {
    // Simple mock datum generation
    return "d87980"; // Mock CBOR
  },

  delay: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))
};

// Default export for easy importing
export default {
  createIndexer,
  Indexer,
  Context7: MockContext7,
  mockUtilities
};
