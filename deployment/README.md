# 🚀 PuckSwap v5 DeFi - Deployment System

This directory contains the complete deployment system for PuckSwap v5 contracts on Cardano.

## 📁 Directory Structure

```
deployment/
├── README.md                    # This file
├── addresses.json              # Current deployment addresses (auto-generated)
├── scripts/                    # Compiled contract artifacts (.plutus files)
│   ├── puckswap_swap_validator.plutus
│   ├── puckswap_liquidity_provision_validator.plutus
│   ├── puckswap_withdrawal_validator.plutus
│   ├── puckswap_governance_validator.plutus
│   ├── puckswap_pool_registry_validator.plutus
│   ├── puckswap_liquid_staking_validator.plutus
│   ├── puckswap_cross_chain_router_validator.plutus
│   ├── lp_minting_policy.plutus
│   └── pADA_minting_policy.plutus
└── json/                       # Deployment history (timestamped)
    ├── deployment-preprod-2024-06-24T10-30-00-000Z.json
    └── deployment-mainnet-2024-06-24T11-00-00-000Z.json
```

## 🔧 Quick Start

### 1. Prerequisites

Ensure you have the required environment variables set:

```bash
# Required for all networks
export BLOCKFROST_API_KEY_MAINNET="mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7"
export BLOCKFROST_API_KEY_PREPROD="preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL"

# Set target network
export NETWORK="preprod"  # or "mainnet"
```

### 2. Test Deployment System

```bash
# Test the deployment configuration
npm run test-deployment
```

### 3. Build and Export Contracts

```bash
# Compile Aiken contracts
npm run build-v5

# Export compiled contracts to deployment/scripts/
npm run export-v5
```

### 4. Deploy Contracts

```bash
# Deploy to Preprod testnet
npm run deploy-v5-preprod

# Deploy to Mainnet (production)
npm run deploy-v5-mainnet

# Full deployment pipeline (build + export + deploy to preprod)
npm run deploy-v5
```

## 📋 Contract Deployment Order

The deployment system follows a specific order to handle dependencies:

1. **Core AMM Validators**
   - `puckswap_swap_validator` - Core AMM swap functionality
   - `puckswap_liquidity_provision_validator` - Liquidity provision
   - `puckswap_withdrawal_validator` - Liquidity withdrawal

2. **Governance and Registry**
   - `puckswap_governance_validator` - DAO governance system
   - `puckswap_pool_registry_validator` - Global pool registry

3. **Advanced DeFi Modules**
   - `puckswap_liquid_staking_validator` - Liquid staking (pADA)
   - `puckswap_cross_chain_router_validator` - Cross-chain transfers

4. **Minting Policies**
   - `lp_minting_policy` - LP token minting/burning
   - `pADA_minting_policy` - pADA token minting/burning

## 🔍 Using Deployed Contracts

After deployment, contract addresses are automatically available through the utility:

```typescript
import { 
  loadContractAddresses, 
  getContractAddress, 
  getPolicyId 
} from '../src/lucid/utils/contractAddresses';

// Load all addresses for current network
const deployment = loadContractAddresses();
console.log('Network:', deployment.network);
console.log('Deployed at:', deployment.deployedAt);

// Get specific contract address
const swapAddress = getContractAddress('puckswap_swap_validator');

// Get specific policy ID
const lpPolicyId = getPolicyId('lp_minting_policy');

// Network-specific loading
const mainnetDeployment = loadContractAddresses('mainnet');
const preprodDeployment = loadContractAddresses('preprod');
```

## 📊 Deployment State

The deployment system maintains comprehensive state in `addresses.json`:

```json
{
  "network": "preprod",
  "startTime": "2024-06-24T10:30:00.000Z",
  "endTime": "2024-06-24T10:35:00.000Z",
  "contracts": {
    "puckswap_swap_validator": {
      "contractName": "puckswap_swap_validator",
      "scriptHash": "abc123...",
      "address": "addr1...",
      "deployedAt": "2024-06-24T10:30:15.000Z"
    }
  },
  "addresses": {
    "puckswap_swap_validator": "addr1...",
    "puckswap_liquidity_provision_validator": "addr1...",
    // ... more addresses
  },
  "policyIds": {
    "lp_minting_policy": "policy123...",
    "pADA_minting_policy": "policy456..."
  },
  "success": true,
  "errors": []
}
```

## 🛠️ Advanced Usage

### Custom Network Deployment

```bash
# Deploy to custom network
NETWORK=preview tsx scripts/deployContracts.ts
```

### Deployment Verification

```bash
# Verify deployment completeness
tsx -e "
import { validateDeployment } from './src/lucid/utils/contractAddresses';
validateDeployment('preprod');
console.log('✅ Deployment verified');
"
```

### Contract Address Lookup

```bash
# Get specific contract address
tsx -e "
import { getContractAddress } from './src/lucid/utils/contractAddresses';
console.log('Swap Validator:', getContractAddress('puckswap_swap_validator'));
"
```

## 🔒 Security Considerations

1. **Environment Variables**: Keep API keys secure and never commit them to version control
2. **Network Verification**: Always verify you're deploying to the intended network
3. **Contract Verification**: Verify contract hashes match expected values
4. **Backup**: Keep deployment history files for audit trails

## 🐛 Troubleshooting

### Common Issues

1. **"Contract artifacts not found"**
   - Run `npm run build-v5` and `npm run export-v5` first

2. **"Blockfrost API key not configured"**
   - Set the appropriate `BLOCKFROST_API_KEY_*` environment variable

3. **"Network mismatch"**
   - Ensure `NETWORK` environment variable matches your target

4. **"Contract address not found"**
   - Verify deployment completed successfully
   - Check `deployment/addresses.json` exists

### Debug Mode

Enable debug logging:

```bash
DEBUG=true npm run deploy-v5-preprod
```

## 📚 Integration Examples

See the following files for integration examples:
- `src/lucid/swap.ts` - Using swap validator
- `src/lucid/liquidity.ts` - Using liquidity validators
- `src/lucid/governance.ts` - Using governance validator
- `src/lucid/staking.ts` - Using liquid staking validator
- `src/lucid/crosschain.ts` - Using cross-chain router

## 🔄 Redeployment

To redeploy contracts:

1. Update contract code in `contracts/` directory
2. Run full deployment pipeline: `npm run deploy-v5`
3. Update frontend environment variables if needed
4. Test thoroughly on testnet before mainnet deployment

---

For more information, see the main [PuckSwap v5 Documentation](../README.md).
