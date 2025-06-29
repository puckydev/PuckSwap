# PuckSwap v5 Environment Configuration

This document describes the centralized environment configuration system for PuckSwap v5, which supports seamless switching between testnet (preprod) and mainnet environments.

## 🌍 Overview

PuckSwap v5 uses a centralized environment configuration system that automatically configures:
- **Lucid Evolution** connections with correct API keys
- **Context7** monitoring with proper network settings
- **All off-chain transaction builders** with appropriate network parameters
- **Frontend components** with correct blockchain endpoints

## 🔧 Environment Variables

### Core Configuration

```bash
# Primary network configuration (controls everything)
NETWORK=preprod  # or 'mainnet' or 'preview'

# Dynamic API key (automatically set based on NETWORK)
BLOCKFROST_API_KEY=preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL
```

### Network-Specific API Keys

```bash
# Preprod testnet API key
NEXT_PUBLIC_PREPROD_API_KEY=preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL

# Mainnet API key
NEXT_PUBLIC_MAINNET_API_KEY=mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7

# Legacy support (optional)
NEXT_PUBLIC_BLOCKFROST_API_KEY=your_legacy_key_here
```

### Frontend Configuration

```bash
# Next.js specific (legacy support)
NEXT_PUBLIC_NETWORK=Preprod
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_PROVIDER_TYPE=blockfrost
```

## 🚀 Usage

### 1. Basic Environment Setup

```typescript
import { getEnvironmentConfig, logEnvironmentConfig } from './lib/environment-config';

// Get current environment configuration
const envConfig = getEnvironmentConfig();
console.log('Network:', envConfig.network);        // 'preprod' | 'mainnet' | 'preview'
console.log('Lucid Network:', envConfig.lucidNetwork); // 'Preprod' | 'Mainnet' | 'Preview'
console.log('API Key:', envConfig.blockfrostApiKey);   // Correct key for network

// Log full configuration
logEnvironmentConfig();
```

### 2. Off-Chain Transaction Builders

All transaction builders automatically use the centralized environment configuration:

```typescript
// Swap Builder
const swapBuilder = await PuckSwapSwapBuilder.create(
  poolValidatorCbor,
  undefined, // Network auto-detected from environment
  "eternl"   // Wallet name
);

// Liquidity Builder
const liquidityBuilder = await PuckSwapLiquidityBuilder.create(
  poolValidatorCbor,
  liquidityValidatorCbor,
  lpMintingPolicyCbor,
  undefined, // Network auto-detected from environment
  "vespr"    // Wallet name
);

// Governance Operations
const txHash = await proposeGovernance(
  proposalParams,
  governanceValidatorCbor,
  governanceAddress,
  undefined, // Network auto-detected from environment
  "lace"     // Wallet name
);

// Liquid Staking
const depositTxHash = await depositStaking(
  stakingValidatorCbor,
  pADAMintingPolicyCbor,
  stakingAddress,
  depositParams,
  "eternl" // Wallet name
);

// Cross-Chain Router
const crossChainRouter = await PuckSwapCrossChainRouter.create(
  contractCBORs,
  routerAddress,
  undefined, // Network auto-detected from environment
  "typhon"   // Wallet name
);
```

### 3. Context7 Monitoring

```typescript
// Context7 Monitor automatically uses correct network and API key
const monitor = await createContext7MonitorV3({
  poolAddresses: [
    "addr1_pool_pucky_ada",
    "addr1_pool_wltc_ada"
  ],
  enableWebSocket: true,
  updateInterval: 5000,
  historicalDataDays: 7
});
```

## 🔄 Environment Switching

### Development to Production

**For Preprod Testnet:**
```bash
export NETWORK=preprod
# Automatically uses: preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL
```

**For Mainnet Production:**
```bash
export NETWORK=mainnet
# Automatically uses: mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7
```

**For Preview Testnet:**
```bash
export NETWORK=preview
# Uses preprod key as fallback: preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL
```

### In Docker/Production

```dockerfile
# Dockerfile
ENV NETWORK=mainnet
ENV BLOCKFROST_API_KEY=mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7
```

```yaml
# docker-compose.yml
environment:
  - NETWORK=preprod
  - BLOCKFROST_API_KEY=preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL
```

## 📁 File Structure

```
src/
├── lib/
│   ├── environment-config.ts      # Centralized environment configuration
│   ├── lucid-config.ts           # Updated to use centralized config
│   └── context7-monitor-v3.ts    # Updated to use centralized config
├── lucid/
│   ├── swap.ts                   # Updated to use centralized config
│   ├── liquidity.ts              # Updated to use centralized config
│   ├── governance.ts             # Updated to use centralized config
│   ├── staking.ts                # Updated to use centralized config
│   └── crosschain.ts             # Updated to use centralized config
└── examples/
    └── environment-usage.ts      # Usage examples
```

## 🛡️ Security & Best Practices

### 1. Environment Variable Security

```bash
# Never commit real API keys to version control
# Use different keys for different environments
# Rotate keys regularly

# Production
NETWORK=mainnet
BLOCKFROST_API_KEY=mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7

# Development
NETWORK=preprod
BLOCKFROST_API_KEY=preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL
```

### 2. Configuration Validation

```typescript
import { validateEnvironmentConfig } from './lib/environment-config';

// Always validate configuration before using
if (!validateEnvironmentConfig()) {
  throw new Error('Invalid environment configuration');
}
```

### 3. Error Handling

```typescript
try {
  const envConfig = getEnvironmentConfig();
  // Use configuration
} catch (error) {
  console.error('Environment configuration error:', error);
  // Handle gracefully
}
```

## 🔍 Debugging

### Check Current Configuration

```typescript
import { logEnvironmentConfig, getEnvironmentConfig } from './lib/environment-config';

// Log full configuration
logEnvironmentConfig();

// Get specific values
const config = getEnvironmentConfig();
console.log('Network:', config.network);
console.log('Is Mainnet:', config.isMainnet);
console.log('API Key Preview:', config.blockfrostApiKey.substring(0, 8) + '...');
```

### Common Issues

1. **Wrong Network**: Check `NETWORK` environment variable
2. **Invalid API Key**: Verify API key format and network match
3. **Missing Configuration**: Ensure all required environment variables are set

## 📚 API Reference

### Core Functions

- `getEnvironmentConfig()`: Get complete environment configuration
- `getNetworkEnvironment()`: Get current network environment
- `getBlockfrostApiKey(network)`: Get API key for specific network
- `validateEnvironmentConfig()`: Validate current configuration
- `logEnvironmentConfig()`: Log current configuration

### Types

- `NetworkEnvironment`: `'mainnet' | 'preprod' | 'preview'`
- `LucidNetwork`: `'Mainnet' | 'Preprod' | 'Preview'`
- `EnvironmentConfig`: Complete configuration interface

## 🎯 Migration Guide

### From Old Configuration

**Before:**
```typescript
const lucid = await Lucid.new(
  new Blockfrost(
    `https://cardano-preprod.blockfrost.io/api/v0`,
    'your_api_key_here'
  ),
  'Preprod'
);
```

**After:**
```typescript
const lucid = await createLucidInstance();
// Automatically uses correct network and API key
```

### Update Environment Files

1. Update `.env.local` with new variables
2. Set `NETWORK` environment variable
3. Remove hardcoded API keys from code
4. Use centralized configuration functions

## 🚀 Benefits

1. **Simplified Deployment**: Single environment variable controls everything
2. **Reduced Errors**: No more mismatched networks and API keys
3. **Better Security**: Centralized key management
4. **Easier Testing**: Quick environment switching
5. **Consistent Configuration**: All components use same settings
6. **Future-Proof**: Easy to add new networks or providers

---

For more examples and advanced usage, see `src/examples/environment-usage.ts`.
