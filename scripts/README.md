# PuckSwap v5 Deployment Scripts

This directory contains automated deployment scripts for PuckSwap v5 smart contracts using Lucid Evolution and Blockfrost API integration.

## 🚀 Quick Start

### Prerequisites

1. **Environment Variables**: Set up your `.env` file with required API keys:
```bash
# Network Configuration
NETWORK=preprod  # or 'mainnet'

# Blockfrost API Keys
BLOCKFROST_API_KEY_MAINNET=mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7
BLOCKFROST_API_KEY_PREPROD=preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL

# Optional: Context7 Configuration
CONTEXT7_ENDPOINT=https://api.context7.io/preprod
```

2. **Compiled Contracts**: Ensure your Aiken contracts are compiled and exported:
```bash
aiken build
aiken export --output deployment/scripts
```

### Deploy Contracts

Deploy to **Preprod Testnet**:
```bash
NETWORK=preprod npx tsx scripts/deployContracts.ts
```

Deploy to **Mainnet**:
```bash
NETWORK=mainnet npx tsx scripts/deployContracts.ts
```

## 📋 Contract Coverage

The deployment script handles all PuckSwap v5 core contracts:

### Validators (7)
- ✅ `swap_validator` - Core AMM swap functionality
- ✅ `liquidity_provision_validator` - Balanced ADA + token deposits
- ✅ `withdrawal_validator` - Proportional LP token burning
- ✅ `governance_validator` - DAO proposals, voting, execution
- ✅ `pool_registry_validator` - Global pool registration
- ✅ `liquid_staking_validator` - ADA deposits, pADA minting
- ✅ `cross_chain_router_validator` - Cross-chain bridge transfers

### Minting Policies (2)
- ✅ `lp_minting_policy` - LP token minting/burning for AMM pools
- ✅ `pADA_minting_policy` - pADA liquid staking token minting/burning

## 📁 Output Structure

### Generated Files

**Primary Output**: `/deployment/addresses.json`
```json
{
  "network": "preprod",
  "deployedAt": "2025-06-24T02:42:16.098Z",
  "validators": {
    "swap": "addr_test1wzgcaxmervmczuv0xhz7l6q5dm8cph5y2ea3h62vsvvzwpcj6t98g",
    "liquidityProvision": "addr_test1wrjkmckqj5gm4znvrysj7w222a33ppdszz5nr6vwlmwpf0gxnc3pj",
    // ... more validators
  },
  "policies": {
    "lpMinting": "ad524e5497fdf1f924de936f9f7ec31d460c02267e8acce544a5a09e",
    "pADAMinting": "eb031002fa1dbc400bbb5314a63741c8bf8524106fe7b50cafbcc113"
  }
}
```

**Historical Backup**: `/deployment/json/deployment-{network}-{timestamp}.json`

## 🔧 Technical Details

### Architecture

- **Lucid Evolution**: Latest Cardano transaction library
- **Blockfrost API**: Reliable blockchain data provider
- **Environment-based**: Automatic network detection
- **Type Safety**: Full TypeScript integration
- **Error Handling**: Comprehensive validation and logging

### Address Computation

The script uses Lucid Evolution's utilities:
- `validatorToScriptHash()` - Computes script hash from validator
- `validatorToAddress()` - Derives bech32 address from validator + network
- `mintingPolicyToId()` - Generates policy ID from minting policy

### Network Support

- **Preprod Testnet**: `addr_test1...` addresses
- **Mainnet**: `addr1...` addresses
- **Automatic Detection**: Based on `NETWORK` environment variable

## 🛠️ Integration

### Using Deployed Addresses

```typescript
import { contractAddresses } from '../lucid/utils/contractAddresses';

// Strongly typed access
const swapAddress = contractAddresses.validators.swap;
const lpPolicyId = contractAddresses.policies.lpMinting;

// Use in Lucid Evolution transactions
const tx = await lucid
  .newTx()
  .payToContract(swapAddress, datum, assets)
  .complete();
```

### Legacy Compatibility

The deployment output includes legacy format for backward compatibility:
```typescript
// Legacy access (deprecated)
const swapAddress = deployment.addresses.swap_validator;
const lpPolicyId = deployment.policyIds.lp_minting_policy;
```

## 🔍 Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```
   Error: Missing BLOCKFROST_API_KEY_PREPROD environment variable
   ```
   **Solution**: Set up your `.env` file with correct API keys

2. **Contract Artifacts Not Found**
   ```
   Error: Contract artifacts directory not found
   ```
   **Solution**: Run `aiken build && aiken export --output deployment/scripts`

3. **Network Mismatch**
   ```
   Error: Invalid network configuration
   ```
   **Solution**: Ensure `NETWORK` is set to `preprod` or `mainnet`

### Debug Mode

For verbose output, check the deployment logs:
```bash
NETWORK=preprod DEBUG=true npx tsx scripts/deployContracts.ts
```

## 📚 Related Documentation

- [PuckSwap v5 Architecture](../README.md)
- [Contract Addresses Utility](../src/lucid/utils/contractAddresses.ts)
- [Environment Configuration](../src/config/env.ts)
- [Lucid Evolution Integration](../src/lib/lucid-config.ts)

---

**Note**: Always test deployments on Preprod testnet before deploying to Mainnet!
