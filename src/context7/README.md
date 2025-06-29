# PuckSwap v5 - Context7 Integration

This directory contains the Context7 indexer client implementation and monitor modules for PuckSwap v5.

## 📁 Directory Structure

```
src/context7/
├── indexerClient.ts                    # Universal Context7 client factory
├── example-pool-monitor-integration.ts # Example integration pattern
├── pool_monitor.ts                     # Pool state monitoring
├── governance_monitor.ts               # Governance monitoring
├── staking_monitor.ts                  # Liquid staking monitoring
├── crosschain_monitor.ts               # Cross-chain monitoring
├── registry_monitor.ts                 # Pool registry monitoring
└── README.md                          # This file
```

## 🏗️ Universal Context7 Client

The `indexerClient.ts` file provides a universal Context7 client factory that:

- **Environment-based configuration**: Automatically uses settings from `src/config/env.ts`
- **Singleton pattern**: Provides a shared client instance across all monitors
- **Comprehensive error handling**: Validates configuration and handles failures gracefully
- **Mock implementation**: Provides a scaffold for when the real `@context7/sdk` becomes available

### Key Features

- ✅ **Network-aware**: Automatically configures for mainnet/preprod/preview
- ✅ **API key management**: Handles optional Context7 API keys
- ✅ **Retry logic**: Built-in retry mechanisms with configurable attempts
- ✅ **Subscription management**: Address, policy, and transaction subscriptions
- ✅ **UTxO querying**: Retrieve UTxOs by address or policy
- ✅ **Type safety**: Full TypeScript interfaces and type definitions

## 🚀 Quick Start

### Basic Usage

```typescript
import { 
  getContext7IndexerClient, 
  initializeContext7IndexerClient 
} from './context7/indexerClient';

// Get the singleton client instance
const client = getContext7IndexerClient();

// Initialize the client
await initializeContext7IndexerClient();

// Subscribe to address changes
await client.subscribeToAddress('addr_test1...', (utxo) => {
  console.log('UTxO update:', utxo);
});

// Get UTxOs at address
const utxos = await client.getUtxosAtAddress('addr_test1...');
```

### Monitor Integration Pattern

```typescript
import { getContext7IndexerClient } from './context7/indexerClient';

export class MyMonitor {
  private client = getContext7IndexerClient();
  
  async initialize() {
    await initializeContext7IndexerClient();
  }
  
  async startMonitoring() {
    await this.client.subscribeToAddress(address, this.handleUpdate);
  }
  
  private handleUpdate = (utxo) => {
    // Process UTxO update
  };
}
```

## 🔧 Configuration

The client automatically uses environment configuration from `src/config/env.ts`:

### Environment Variables

```bash
# Network selection
NETWORK=preprod                    # mainnet | preprod | preview

# Context7 configuration
CONTEXT7_ENDPOINT=https://api.context7.io/preprod
CONTEXT7_API_KEY=your_api_key_here

# Blockfrost (used as project ID)
BLOCKFROST_API_KEY_PREPROD=your_blockfrost_key
```

### Network-specific Endpoints

- **Mainnet**: `https://api.context7.io/mainnet`
- **Preprod**: `https://api.context7.io/preprod`
- **Preview**: `https://api.context7.io/preview`

## 🧪 Testing

Run the Context7 client tests:

```bash
# Basic tests (quick)
npm run test-context7

# Full tests including pool monitor integration (30 seconds)
npm run test-context7-full
```

### Test Coverage

- ✅ Client creation and configuration
- ✅ Initialization and shutdown
- ✅ Address/policy/transaction subscriptions
- ✅ UTxO querying
- ✅ Environment integration
- ✅ Pool monitor integration example

## 📡 Monitor Modules

### Pool Monitor (`pool_monitor.ts`)
- Monitors AMM pool state changes
- Detects swaps, liquidity additions/removals
- Calculates price impact and analytics
- CIP-68 compliant datum parsing

### Governance Monitor (`governance_monitor.ts`)
- Tracks DAO proposals and voting
- Monitors proposal lifecycle
- Calculates quorum and vote tallies
- Governance action execution detection

### Staking Monitor (`staking_monitor.ts`)
- Monitors liquid staking operations
- Tracks pADA minting/burning
- Syncs staking rewards from oracles
- Withdrawal queue management

### Cross-chain Monitor (`crosschain_monitor.ts`)
- Monitors cross-chain message passing
- Tracks bridge operations
- Nonce validation and replay protection
- Multi-chain state synchronization

### Registry Monitor (`registry_monitor.ts`)
- Monitors pool registry updates
- Tracks new pool registrations
- Validates pool configurations
- Governance-authorized modifications

## 🔄 Migration from Mock SDK

The current implementation uses a mock Context7 SDK. When the real `@context7/sdk` becomes available:

1. **Update imports**: Replace mock imports with real SDK
2. **Update initialization**: Use real SDK initialization methods
3. **Update subscriptions**: Use real SDK subscription APIs
4. **Update queries**: Use real SDK query methods
5. **Keep interfaces**: The client interfaces should remain compatible

### Migration Checklist

- [ ] Install real `@context7/sdk` package
- [ ] Update `indexerClient.ts` implementation
- [ ] Update all monitor imports
- [ ] Test with real Context7 endpoints
- [ ] Update documentation

## 🛠️ Development

### Adding New Monitors

1. Create new monitor file in `src/context7/`
2. Import and use the universal client:
   ```typescript
   import { getContext7IndexerClient } from './indexerClient';
   ```
3. Follow the pattern from `example-pool-monitor-integration.ts`
4. Add tests and documentation

### Client Configuration

Override default configuration:

```typescript
import { createContext7IndexerClient } from './indexerClient';

const client = createContext7IndexerClient({
  network: 'mainnet',
  retryAttempts: 5,
  timeout: 60000
});
```

## 📚 API Reference

### Context7IndexerClient Interface

```typescript
interface Context7IndexerClient {
  // Lifecycle
  initialize(): Promise<void>;
  isActive(): boolean;
  shutdown(): Promise<void>;
  
  // Address monitoring
  subscribeToAddress(address: string, callback: (utxo: Context7UTxO) => void): Promise<void>;
  unsubscribeFromAddress(address: string): Promise<void>;
  getUtxosAtAddress(address: string): Promise<Context7UTxO[]>;
  
  // Policy monitoring
  subscribeToPolicy(policyId: string, callback: (utxo: Context7UTxO) => void): Promise<void>;
  unsubscribeFromPolicy(policyId: string): Promise<void>;
  getUtxosByPolicy(policyId: string): Promise<Context7UTxO[]>;
  
  // Transaction monitoring
  subscribeToTransaction(txHash: string, callback: (utxo: Context7UTxO) => void): Promise<void>;
  getTransaction(txHash: string): Promise<any>;
  
  // Configuration
  getConfig(): Context7IndexerConfig;
  updateConfig(config: Partial<Context7IndexerConfig>): void;
}
```

### Context7UTxO Interface

```typescript
interface Context7UTxO {
  txHash: string;
  outputIndex: number;
  address: string;
  assets: Record<string, bigint>;
  datum?: string;
  datumHash?: string;
  scriptRef?: string;
  slot: number;
}
```

## 🔗 Related Files

- `src/config/env.ts` - Environment configuration
- `src/lucid/utils/serialization.ts` - CIP-68 datum parsing
- `scripts/test-context7-client.ts` - Test suite
- `package.json` - Dependencies and scripts

## 📝 Notes

- The current implementation is a scaffold/mock for development
- Real Context7 SDK integration pending package availability
- All monitor modules should use the universal client
- Environment configuration is centralized and automatic
- Full TypeScript support with comprehensive interfaces
