# PuckSwap v5 Environment Configuration

Centralized environment configuration module for PuckSwap v5, handling all environment-specific variables across off-chain builders, monitors, and frontend components.

## Features

- ✅ **Strict Type Safety**: TypeScript interfaces with compile-time validation
- ✅ **Environment Validation**: Runtime validation with clear error messages
- ✅ **Network Support**: Mainnet and Preprod testnet environments
- ✅ **Dotenv Compatible**: Automatic `.env` file loading
- ✅ **Backward Compatibility**: Legacy function support for existing code
- ✅ **Error Handling**: Custom `EnvironmentError` class with descriptive messages

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure your values:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Required
NETWORK=preprod
BLOCKFROST_API_KEY_MAINNET=mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7
BLOCKFROST_API_KEY_PREPROD=preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL

# Optional
CONTEXT7_ENDPOINT=https://api.context7.io/custom
```

### 2. Basic Usage

```typescript
import { 
  getNetwork, 
  getBlockfrostApiKey, 
  getBlockfrostApiUrl,
  isMainnet,
  isPreprod 
} from '@/config/env';

// Get current network
const network = getNetwork(); // 'mainnet' | 'preprod'

// Get API configuration
const apiKey = getBlockfrostApiKey();
const apiUrl = getBlockfrostApiUrl();

// Network checks
if (isMainnet()) {
  console.log('Running on mainnet');
} else if (isPreprod()) {
  console.log('Running on preprod testnet');
}
```

## Core Functions

### Network Functions

```typescript
// Get current network
getNetwork(): 'mainnet' | 'preprod'

// Network type checks
isMainnet(): boolean
isPreprod(): boolean
```

### API Configuration

```typescript
// Get Blockfrost API key for current network
getBlockfrostApiKey(): string

// Get Blockfrost API URL for current network
getBlockfrostApiUrl(): string

// Get Context7 endpoint (optional)
getContext7Endpoint(): string | null
```

### Validation & Debugging

```typescript
// Validate environment configuration
validateEnvironmentConfig(): void // throws EnvironmentError if invalid

// Get environment information for debugging
getEnvironmentInfo(): {
  network: Network;
  blockfrostApiUrl: string;
  context7Endpoint: string | null;
  hasMainnetKey: boolean;
  hasPreprodKey: boolean;
}
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NETWORK` | Target network | `mainnet` or `preprod` |
| `BLOCKFROST_API_KEY_MAINNET` | Mainnet Blockfrost API key | `mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7` |
| `BLOCKFROST_API_KEY_PREPROD` | Preprod Blockfrost API key | `preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CONTEXT7_ENDPOINT` | Custom Context7 endpoint | `null` |

## Error Handling

The module provides comprehensive error handling with the `EnvironmentError` class:

```typescript
import { EnvironmentError, validateEnvironmentConfig } from '@/config/env';

try {
  validateEnvironmentConfig();
} catch (error) {
  if (error instanceof EnvironmentError) {
    console.error('Environment configuration error:', error.message);
  }
}
```

Common error scenarios:
- Missing required environment variables
- Invalid network configuration
- Malformed API keys (wrong prefix)

## Integration Examples

### Lucid Evolution Setup

```typescript
import { getNetwork, getBlockfrostApiKey, getBlockfrostApiUrl } from '@/config/env';
import { Lucid, Blockfrost } from 'lucid-cardano';

const lucid = await Lucid.new(
  new Blockfrost(getBlockfrostApiUrl(), getBlockfrostApiKey()),
  getNetwork() === 'mainnet' ? 'Mainnet' : 'Preprod'
);
```

### Context7 Monitor Setup

```typescript
import { getContext7Endpoint } from '@/config/env';

const context7Endpoint = getContext7Endpoint();
if (context7Endpoint) {
  // Initialize Context7 monitoring
  const monitor = new Context7Monitor(context7Endpoint);
}
```

## Testing

Run the test suite to verify your environment configuration:

```bash
# Run environment tests
npm run test src/config/env.test.ts

# Or run directly with Node.js
node -r ts-node/register src/config/env.test.ts
```

## Migration from Legacy Code

The module maintains backward compatibility with existing code:

```typescript
// Old way (still works)
import { getNetworkEnvironment, getBlockfrostApiKey } from '@/config/env';
const network = getNetworkEnvironment();
const apiKey = getBlockfrostApiKey(network);

// New way (recommended)
import { getNetwork, getBlockfrostApiKey } from '@/config/env';
const network = getNetwork();
const apiKey = getBlockfrostApiKey();
```

## Best Practices

1. **Always validate environment** on application startup
2. **Use type-safe functions** instead of direct `process.env` access
3. **Handle errors gracefully** with try-catch blocks
4. **Never commit real API keys** to version control
5. **Use different keys** for different environments

## Troubleshooting

### Common Issues

**Error: "Invalid or missing NETWORK environment variable"**
- Ensure `NETWORK` is set to either `mainnet` or `preprod`

**Error: "Missing BLOCKFROST_API_KEY_MAINNET environment variable"**
- Add your Blockfrost API key to the `.env` file

**Error: "BLOCKFROST_API_KEY_MAINNET should start with 'mainnet' prefix"**
- Verify your API key format matches the expected network prefix

### Debug Mode

Enable debug logging by setting environment variables:

```env
DEBUG=true
NODE_ENV=development
```

This will provide additional logging information for troubleshooting.
