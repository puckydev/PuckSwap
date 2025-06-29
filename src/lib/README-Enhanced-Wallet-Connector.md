# PuckSwap Enhanced CIP-30 Wallet Connector

## Overview

The Enhanced CIP-30 Wallet Connector is a comprehensive wallet integration solution for PuckSwap that combines the best practices from Lucid Evolution's wallet utilities with enhanced error handling, reliability, and user experience improvements.

## Features

### 🚀 **Core Features**
- **Full CIP-30 Compliance**: Follows official CIP-30 specification
- **Lucid Evolution Integration**: Seamless integration with Lucid Evolution's `selectWallet.fromAPI()` method
- **Enhanced Error Handling**: Comprehensive error messages and recovery mechanisms
- **Hydration-Safe**: Prevents server/client mismatches with proper browser detection
- **Network Validation**: Automatic network compatibility checks
- **Timeout Protection**: Connection timeouts to prevent hanging connections

### 🔧 **Enhanced Utilities**
- **Wallet Detection**: Comprehensive wallet detection with metadata
- **Balance Formatting**: Smart balance formatting (K, M notation)
- **Token Balance**: Support for native token balance queries
- **Transaction Signing**: Enhanced transaction signing with validation
- **Address Management**: Support for both used and change addresses
- **Event Cleanup**: Proper event listener cleanup on disconnect

### 🎯 **Supported Wallets**
- Eternl
- Nami
- Vespr
- Lace
- Typhon
- Flint
- GeroWallet
- ccvault.io
- Yoroi
- NuFi

## Architecture

```
Enhanced CIP-30 Wallet Connector
├── wallet-cip30.ts (Core CIP-30 implementation)
├── wallet-integration.ts (PuckSwap integration layer)
└── Enhanced Features:
    ├── Lucid Evolution integration
    ├── Enhanced error handling
    ├── Network validation
    ├── Transaction utilities
    └── Hydration safety
```

## Usage

### Basic Wallet Detection

```typescript
import { detectAvailableWallets } from '../lib/wallet-integration';

// Detect all available wallets
const wallets = detectAvailableWallets();

// Detect wallets with filtering
const filteredWallets = detectAvailableWallets({ omit: ['nami'] });

console.log(`Found ${wallets.filter(w => w.isInstalled).length} installed wallets`);
```

### Enhanced Wallet Connection

```typescript
import { connectToWallet } from '../lib/wallet-integration';

try {
  const walletState = await connectToWallet('eternl');
  
  console.log('Wallet connected:', {
    name: walletState.walletName,
    address: walletState.address,
    balance: walletState.balance.ada,
    network: walletState.networkName,
    lucidIntegrated: !!walletState.lucid
  });
} catch (error) {
  console.error('Connection failed:', error.message);
}
```

### Transaction Signing

```typescript
import { signTransaction, submitTransaction } from '../lib/wallet-integration';

try {
  // Sign transaction
  const signedTx = await signTransaction(walletState, unsignedTx);
  
  // Submit transaction
  const txHash = await submitTransaction(walletState, signedTx);
  
  console.log('Transaction submitted:', txHash);
} catch (error) {
  console.error('Transaction failed:', error.message);
}
```

## Enhanced Features

### 1. **Improved Error Messages**

```typescript
// Before: Generic error
"Failed to connect to wallet"

// After: Specific, actionable error
"Eternl wallet is not installed. Please install it from https://chrome.google.com/webstore/detail/eternl/..."
```

### 2. **Network Validation**

```typescript
// Automatic network compatibility check
if (wallet.networkId !== expectedNetwork) {
  throw new Error(`Network mismatch. Wallet is on ${currentNetwork}, but app expects ${expectedNetworkName}.`);
}
```

### 3. **Enhanced Balance Formatting**

```typescript
formatWalletBalance("1500000000000") // "1.50M ADA"
formatWalletBalance("2500000000")    // "2.50K ADA"
formatWalletBalance("1000000")       // "1.000000 ADA"
```

### 4. **Lucid Evolution Integration**

```typescript
// Automatic Lucid Evolution integration when available
if (LucidEvolution) {
  const lucidInstance = await createLucidInstance();
  await lucidInstance.selectWallet.fromAPI(cip30Wallet.api);
  console.log('✅ Wallet integrated with Lucid Evolution');
}
```

## Migration Guide

### From Old Implementation

```typescript
// Old way
import { detectAvailableWallets, connectToWallet } from './wallet-cip30';

// New way (same API, enhanced functionality)
import { detectAvailableWallets, connectToWallet } from './wallet-integration';
```

### Enhanced State Structure

```typescript
// Old ConnectedWalletState
interface ConnectedWalletState {
  isConnected: boolean;
  walletName: string;
  address: string;
  balance: { ada: bigint; assets: Record<string, bigint> };
  utxos: any[];
  lucid?: any;
  cip30Wallet: CIP30ConnectedWallet;
}

// Enhanced ConnectedWalletState (backward compatible)
interface ConnectedWalletState {
  isConnected: boolean;
  walletName: string;
  address: string;
  balance: { ada: bigint; assets: Record<string, bigint> };
  utxos: any[];
  lucid?: any;
  cip30Wallet: CIP30ConnectedWallet;
  networkId: number;        // NEW
  networkName: string;      // NEW
  version?: string;         // NEW
  isEnabled: boolean;       // NEW
}
```

## Testing

### Hydration Safety Test

```typescript
// Test that wallet detection doesn't cause hydration mismatches
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
  const wallets = detectAvailableWallets();
  setAvailableWallets(wallets);
}, []);

// Only show wallet-specific content after mounting
{mounted ? (
  <WalletList wallets={availableWallets} />
) : (
  <div>Loading wallets...</div>
)}
```

### Connection Reliability Test

```typescript
// Test enhanced error handling
try {
  await connectToWallet('nonexistent');
} catch (error) {
  expect(error.message).toContain('not installed');
  expect(error.message).toContain('extension store');
}
```

## Best Practices

### 1. **Always Handle Errors**

```typescript
try {
  const wallet = await connectToWallet(walletName);
  // Handle success
} catch (error) {
  if (error.message.includes('cancelled by user')) {
    // User cancelled - don't show error
  } else {
    // Show error to user
    toast.error(error.message);
  }
}
```

### 2. **Validate Before Transactions**

```typescript
import { validateWalletForTransaction } from '../lib/wallet-integration';

try {
  validateWalletForTransaction(walletState);
  // Proceed with transaction
} catch (error) {
  // Handle validation error
  toast.error(error.message);
}
```

### 3. **Use Hydration-Safe Patterns**

```typescript
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

// Always check mounted state before showing wallet content
if (!mounted) return <div>Loading...</div>;
```

## Compatibility

- ✅ **Backward Compatible**: Existing PuckSwap components work without changes
- ✅ **Hydration Safe**: No server/client mismatches
- ✅ **CIP-30 Compliant**: Follows official CIP-30 specification
- ✅ **Lucid Evolution**: Seamless integration with existing Lucid code
- ✅ **Error Resilient**: Graceful degradation when features unavailable

## Performance

- **Lazy Loading**: Lucid Evolution loaded only when needed
- **Efficient Detection**: Wallet detection optimized for speed
- **Memory Management**: Proper cleanup of event listeners
- **Timeout Protection**: Prevents hanging connections

---

**Built with ❤️ for the Cardano ecosystem using Lucid Evolution and CIP-30 standards**
