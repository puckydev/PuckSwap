# 🚀 PuckSwap v5 DeFi - Complete Deployment Workflow

This document provides a step-by-step guide for deploying PuckSwap v5 contracts to Cardano networks.

## 📋 Prerequisites

### 1. Environment Setup

```bash
# Install dependencies
npm install

# Install Aiken (if not already installed)
curl -sSfL https://install.aiken-lang.org | bash

# Verify installations
aiken --version
node --version
tsx --version
```

### 2. Environment Variables

Create `.env.local` file with your API keys:

```bash
# Blockfrost API Keys
BLOCKFROST_API_KEY_MAINNET="mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7"
BLOCKFROST_API_KEY_PREPROD="preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL"

# Target Network
NETWORK="preprod"  # or "mainnet"
```

## 🔄 Complete Deployment Workflow

### Step 1: Pre-Deployment Testing

```bash
# Test deployment system configuration
npm run test-deployment
```

**Expected Output:**
```
🧪 PuckSwap v5 - Deployment System Test
==================================================
1️⃣ Testing environment configuration...
   ✅ Environment configuration valid
   Network: preprod
   Blockfrost: https://cardano-preprod.blockfrost.io/api/v0

2️⃣ Testing contract artifacts...
   ✅ Contract artifacts structure valid
   Validators: contracts/validators/index.aiken
   Policies: contracts/policies/index.aiken

3️⃣ Testing deployment directory structure...
   ✅ Deployment directory structure valid

4️⃣ Testing contract addresses utility...
   ✅ Contract addresses utility valid

🎉 All deployment system tests passed!
```

### Step 2: Build Contracts

```bash
# Compile Aiken contracts
npm run build-v5
```

**Expected Output:**
```
    Compiling puckswap v5.0.0
    Compiling aiken/transaction v1.8.0
    Compiling aiken/option v1.0.0
    ...
    ✓ All modules compiled successfully
```

### Step 3: Export Contract Artifacts

```bash
# Export compiled contracts to deployment/scripts/
npm run export-v5
```

**Expected Output:**
```
    Exporting puckswap_swap_validator
    Exporting puckswap_liquidity_provision_validator
    Exporting puckswap_withdrawal_validator
    ...
    ✓ All contracts exported to deployment/scripts/
```

**Verify Export:**
```bash
ls -la deployment/scripts/
```

Should show `.plutus` files for all contracts.

### Step 4: Deploy to Preprod (Testnet)

```bash
# Deploy to Preprod testnet
npm run deploy-v5-preprod
```

**Expected Output:**
```
🚀 PuckSwap v5 DeFi - Contract Deployment
============================================================
📡 Network: preprod
🔗 Blockfrost: https://cardano-preprod.blockfrost.io/api/v0

📦 Loading contract artifacts...
✅ Loaded 9 contract artifacts

🚀 Deploying contracts...
📦 Deploying puckswap_swap_validator...
   ✅ puckswap_swap_validator
      Script Hash: abc123...
      Address: addr1...

📦 Deploying puckswap_liquidity_provision_validator...
   ✅ puckswap_liquidity_provision_validator
      Script Hash: def456...
      Address: addr1...

...

🔧 Generating contract addresses utility...
✅ Contract addresses utility generated

💾 Deployment state saved:
   Current: deployment/addresses.json
   History: deployment/json/deployment-preprod-2024-06-24T10-30-00-000Z.json

🎉 Deployment Summary
============================================================
📡 Network: preprod
⏰ Started: 2024-06-24T10:30:00.000Z
📦 Contracts: 9
🏠 Addresses: 7
🔑 Policy IDs: 2
```

### Step 5: Verify Deployment

```bash
# Verify deployment completeness
npm run verify-deployment-preprod
```

**Expected Output:**
```
🔍 PuckSwap v5 - Deployment Verification
==================================================
📡 Network: preprod

1️⃣ Checking deployment status...
✅ Contracts are deployed

2️⃣ Loading deployment information...
   Network: preprod
   Deployed: 2024-06-24T10:35:00.000Z
   Validators: 7
   Policies: 2

3️⃣ Validating deployment completeness...
✅ All required contracts are deployed

4️⃣ Contract Addresses:
   puckswap_swap_validator:
     addr1...
   ...

5️⃣ Policy IDs:
   lp_minting_policy:
     policy123...
   ...

6️⃣ Verifying address formats...
✅ All addresses have valid formats

🎉 Deployment verification completed successfully!
```

### Step 6: Test Contract Integration

```bash
# Test using deployed contracts
npm run example-contracts
```

This will demonstrate how to load and use the deployed contract addresses in your code.

### Step 7: Deploy to Mainnet (Production)

⚠️ **IMPORTANT**: Only deploy to mainnet after thorough testing on preprod!

```bash
# Switch to mainnet
export NETWORK=mainnet

# Deploy to mainnet
npm run deploy-v5-mainnet

# Verify mainnet deployment
npm run verify-deployment-mainnet
```

## 📁 Generated Files

After successful deployment, you'll have:

```
deployment/
├── addresses.json                    # Current deployment addresses
├── scripts/                         # Compiled contract artifacts
│   ├── puckswap_swap_validator.plutus
│   ├── puckswap_liquidity_provision_validator.plutus
│   └── ...
└── json/                            # Deployment history
    ├── deployment-preprod-2024-06-24T10-30-00-000Z.json
    └── deployment-mainnet-2024-06-24T11-00-00-000Z.json

src/lucid/utils/
└── contractAddresses.ts             # Updated utility for loading addresses
```

## 🔧 Using Deployed Contracts

### In TypeScript/JavaScript Code

```typescript
import { 
  getContractAddress, 
  getPolicyId,
  loadContractAddresses 
} from './src/lucid/utils/contractAddresses';

// Get specific contract address
const swapAddress = getContractAddress('puckswap_swap_validator');

// Get policy ID
const lpPolicyId = getPolicyId('lp_minting_policy');

// Load all deployment info
const deployment = loadContractAddresses();
console.log('Network:', deployment.network);
console.log('All addresses:', deployment.addresses);
```

### In Lucid Evolution Transactions

```typescript
import { Lucid, Blockfrost } from '@lucid-evolution/lucid';
import { getContractAddress } from './src/lucid/utils/contractAddresses';

const lucid = await Lucid.new(blockfrost, network);
const swapAddress = getContractAddress('puckswap_swap_validator');

const tx = lucid
  .newTx()
  .payToContract(swapAddress, datum, assets);
```

## 🐛 Troubleshooting

### Common Issues

1. **"Contract artifacts not found"**
   ```bash
   npm run build-v5
   npm run export-v5
   ```

2. **"Blockfrost API key not configured"**
   - Check `.env.local` file
   - Verify API key format (starts with network prefix)

3. **"Network mismatch"**
   - Ensure `NETWORK` environment variable is set correctly
   - Check deployment was done for the right network

4. **"Contract address not found"**
   - Verify deployment completed successfully
   - Check `deployment/addresses.json` exists
   - Run verification script

### Debug Mode

```bash
DEBUG=true npm run deploy-v5-preprod
```

### Clean Deployment

If you need to redeploy:

```bash
# Remove old deployment files
rm -rf deployment/addresses.json
rm -rf deployment/json/*

# Rebuild and redeploy
npm run deploy-v5
```

## 🔒 Security Checklist

- [ ] API keys are secure and not committed to version control
- [ ] Contracts tested thoroughly on preprod before mainnet
- [ ] Deployment addresses verified and documented
- [ ] Backup of deployment state files created
- [ ] Network configuration double-checked
- [ ] Contract hashes verified against expected values

## 📚 Next Steps

After successful deployment:

1. **Frontend Integration**: Update frontend environment variables with contract addresses
2. **Context7 Monitoring**: Configure real-time monitoring for deployed contracts
3. **Testing**: Run comprehensive integration tests
4. **Documentation**: Update API documentation with contract addresses
5. **Monitoring**: Set up alerts for contract activity

---

For more information, see:
- [Deployment System README](deployment/README.md)
- [Contract Usage Examples](src/examples/useDeployedContracts.ts)
- [Main PuckSwap Documentation](README.md)
