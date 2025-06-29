# PuckSwap v5 - Mock Wallet Testing Framework

This directory contains a comprehensive mock wallet implementation for testing PuckSwap v5 operations without requiring real Cardano wallets or network connections.

## 🚀 Features

- **Full CIP-30 Compatibility**: Implements complete CIP-30 wallet API
- **Lucid Evolution Integration**: Seamless integration with `lucid.selectWallet.fromAPI()`
- **Multi-Asset Support**: Handles ADA, native tokens, LP tokens, pADA, and bridge tokens
- **Transaction Simulation**: Realistic transaction building, signing, and submission
- **Specialized Wallets**: Pre-configured wallets for different testing scenarios
- **State Management**: Tracks balances, UTxOs, and transaction history
- **Node.js Compatible**: Works in Node.js environments without browser dependencies

## 📦 Core Components

### MockWallet
Main wallet class that simulates CIP-30 wallet behavior.

```typescript
import { createMockWallet, setupMockWalletWithLucid } from './mockWallet';

// Basic usage
const wallet = createMockWallet();
await wallet.integrateWithLucid(lucid);

// Or use the helper
const wallet = await setupMockWalletWithLucid(lucid);
```

### MockWalletAPI
CIP-30 compliant API implementation for browser wallet simulation.

### MockLucidWallet
Lucid Evolution wallet interface implementation.

## 🎯 Specialized Wallet Factories

### Liquidity Provider Wallet
```typescript
import { createLiquidityProviderWallet } from './mockWallet';

const lpWallet = createLiquidityProviderWallet(
  1000000000n, // 1000 ADA
  5000000000n  // 5000 PUCKY tokens
);
```

### Governance Wallet
```typescript
import { createGovernanceWallet } from './mockWallet';

const govWallet = createGovernanceWallet(500000000n); // 500 ADA
```

### Staking Wallet
```typescript
import { createStakingWallet } from './mockWallet';

const stakingWallet = createStakingWallet(
  2000000000n, // 2000 ADA
  1000000000n  // 1000 pADA
);
```

### Cross-Chain Wallet
```typescript
import { createCrossChainWallet } from './mockWallet';

const crossChainWallet = createCrossChainWallet(
  1500000000n, // 1500 ADA
  1000000000n  // 1000 bridge tokens
);
```

## 🏗️ Test Environment Setup

### Single Wallet Setup
```typescript
import { setupMockWalletWithLucid } from './mockWallet';
import { createLucidInstance } from '../lib/lucid-config';

const lucid = await createLucidInstance({ network: "Preprod" });
const wallet = await setupMockWalletWithLucid(lucid);

// Now you can use lucid.wallet methods
const address = await lucid.wallet.address();
const utxos = await lucid.wallet.getUtxos();
```

### Comprehensive Test Environment
```typescript
import { createTestEnvironment } from './mockWallet';

const testEnv = await createTestEnvironment(lucid, 3, "preprod");

// Access different wallet types
const { wallets, liquidityProvider, governance, staking, crossChain } = testEnv;
```

## 🔄 Transaction Testing

### Building and Submitting Transactions
```typescript
// Build transaction (uses real Lucid Evolution API)
const tx = await lucid.newTx()
  .payToAddress(recipientAddress, { lovelace: 5000000n })
  .complete();

// Sign transaction (mocked)
const signedTx = await tx.sign().complete();

// Submit transaction (mocked)
const txHash = await signedTx.submit();

// Check transaction history
const history = wallet.getTransactionHistory();
```

### Transaction Simulation Features
- Realistic transaction fees (2-5 ADA)
- Automatic balance updates
- Transaction history tracking
- Success/failure simulation
- UTxO state management

## 🧪 Testing Patterns

### Unit Testing
```typescript
import { createMockWallet } from './mockWallet';

describe('PuckSwap Operations', () => {
  let wallet: MockWallet;
  let lucid: Lucid;

  beforeEach(async () => {
    lucid = await createLucidInstance({ network: "Preprod" });
    wallet = await setupMockWalletWithLucid(lucid);
  });

  it('should perform swap operation', async () => {
    // Test swap logic here
  });
});
```

### Integration Testing
```typescript
import { createTestEnvironment } from './mockWallet';

describe('Multi-User Scenarios', () => {
  it('should handle liquidity provision from multiple users', async () => {
    const testEnv = await createTestEnvironment(lucid, 5);
    
    // Test multi-user interactions
  });
});
```

## 📋 Configuration Options

### MockWalletConfig
```typescript
interface MockWalletConfig {
  address: Address;
  utxos: UTxO[];
  balance: Assets;
  network: "mainnet" | "preprod" | "preview";
  privateKey?: string;
  stakingAddress?: string;
}
```

### Custom Wallet Creation
```typescript
import { createMockWalletWithTokens } from './mockWallet';

const customWallet = createMockWalletWithTokens(
  500000000n, // ADA amount
  {
    "policy1.TOKEN1": 1000000n,
    "policy2.TOKEN2": 2000000n
  },
  "preprod"
);
```

## 🔧 Utility Functions

### Environment Detection
```typescript
import { isMockEnvironment } from './mockWallet';

if (isMockEnvironment()) {
  // Use mock wallet
} else {
  // Use real wallet
}
```

### Global Wallet Management
```typescript
import { setGlobalMockWallet, getGlobalMockWallet } from './mockWallet';

// Set global wallet for tests
setGlobalMockWallet(wallet);

// Access from anywhere
const globalWallet = getGlobalMockWallet();
```

## 📚 Examples

See `mockWallet.example.ts` for comprehensive usage examples including:
- Basic wallet setup
- Specialized wallet usage
- Transaction simulation
- Multi-asset UTxO handling
- Comprehensive test environments

## 🚨 Important Notes

1. **Single Active Wallet**: Only one wallet can be connected to Lucid at a time
2. **Mock Transactions**: All transactions are simulated - no real blockchain interaction
3. **State Persistence**: Wallet state is maintained during test execution
4. **Network Compatibility**: Supports mainnet, preprod, and preview networks
5. **CBOR Encoding**: Simplified CBOR encoding for testing purposes

## 🔍 Debugging

Enable detailed logging by setting environment variables:
```bash
NODE_ENV=test
MOCK_WALLET=true
PUCKSWAP_MOCK_MODE=true
```

The mock wallet provides extensive console logging for debugging test scenarios.
