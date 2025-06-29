# 🚀 PuckSwap v5 DeFi Ecosystem - DEPLOYMENT GUIDE

## 📋 **Pre-Deployment Checklist**

### **1. Environment Setup**
```bash
# Install dependencies
npm install

# Install Aiken (if not already installed)
curl -sSfL https://install.aiken-lang.org | bash

# Verify installations
aiken --version
node --version
npm --version
```

### **2. Configuration Files**
- ✅ `aiken.toml` - Aiken project configuration
- ✅ `next.config.js` - Next.js configuration
- ✅ `package.json` - Dependencies and scripts
- ✅ `tsconfig.json` - TypeScript configuration

## 🔧 **Smart Contract Deployment**

### **Step 1: Compile Aiken Contracts**
```bash
# Navigate to contracts directory
cd contracts

# Build all validators and policies
aiken build

# Check build artifacts
ls -la artifacts/
```

### **Step 2: Generate Contract Addresses**
```bash
# Generate validator addresses
aiken address liquid_staking_validator --network preview
aiken address cross_chain_router_validator --network preview
aiken address governance_validator --network preview
aiken address pool_registry_validator --network preview
aiken address treasury_vault_validator --network preview

# Generate policy IDs
aiken policy pADA_minting_policy
aiken policy governance_token_policy
aiken policy lp_minting_policy_v4
```

### **Step 3: Deploy to Cardano Network**
```bash
# Deploy using deployment script
npm run deploy:preview  # For Preview testnet
npm run deploy:preprod  # For Preprod testnet
npm run deploy:mainnet  # For Mainnet (production)
```

## 🌐 **Frontend Configuration**

### **Step 1: Environment Variables**
Create `.env.local` file:
```env
# Blockfrost API Configuration
NEXT_PUBLIC_BLOCKFROST_API_KEY=your_blockfrost_api_key
NEXT_PUBLIC_NETWORK=preview  # or preprod/mainnet

# Contract Addresses (from deployment)
NEXT_PUBLIC_LIQUID_STAKING_ADDRESS=addr1_liquid_staking...
NEXT_PUBLIC_CROSS_CHAIN_ROUTER_ADDRESS=addr1_cross_chain...
NEXT_PUBLIC_GOVERNANCE_ADDRESS=addr1_governance...
NEXT_PUBLIC_TREASURY_ADDRESS=addr1_treasury...
NEXT_PUBLIC_POOL_REGISTRY_ADDRESS=addr1_pool_registry...

# Policy IDs (from compilation)
NEXT_PUBLIC_STADA_POLICY_ID=stada_policy_id...
NEXT_PUBLIC_GOVERNANCE_TOKEN_POLICY_ID=gov_token_policy...
NEXT_PUBLIC_LP_TOKEN_POLICY_ID=lp_token_policy...

# Context7 Configuration
NEXT_PUBLIC_CONTEXT7_PROJECT_ID=your_context7_project_id
NEXT_PUBLIC_ENABLE_WEBSOCKETS=true

# Demo Mode Configuration
NEXT_PUBLIC_ENABLE_DEMO_MODE=true
NEXT_PUBLIC_DEFAULT_DEMO_MODE=false

# Oracle Configuration
NEXT_PUBLIC_ORACLE_ADDRESS=addr1_oracle...
NEXT_PUBLIC_ORACLE_PUBLIC_KEY=oracle_public_key...

# Cross-Chain Bridge Configuration
NEXT_PUBLIC_ETHEREUM_BRIDGE_ADDRESS=0x...
NEXT_PUBLIC_BSC_BRIDGE_ADDRESS=0x...
NEXT_PUBLIC_POLYGON_BRIDGE_ADDRESS=0x...
```

### **Step 2: Contract CBOR Integration**
```typescript
// Update contract CBORs in configuration
const CONTRACT_CBORS = {
  liquidStakingValidator: "590a2f590a2c...", // From aiken build
  crossChainRouterValidator: "590b1f590b1c...",
  governanceValidator: "590c3f590c3c...",
  pADAMintingPolicy: "59081f59081c...",
  governanceTokenPolicy: "59071f59071c...",
  lpMintingPolicy: "59061f59061c..."
};
```

## 🔄 **Backend Services Setup**

### **Step 1: Context7 Monitoring**
```typescript
// Initialize monitoring services
const stakingMonitor = new StakingMonitor({
  stakingAddress: process.env.NEXT_PUBLIC_LIQUID_STAKING_ADDRESS!,
  pADAPolicyId: process.env.NEXT_PUBLIC_PADA_POLICY_ID!,
  blockfrostApiKey: process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY!,
  network: process.env.NEXT_PUBLIC_NETWORK as "preview",
  enableWebSocket: true,
  pollingInterval: 5000,
  maxRetries: 3,
  retryDelay: 1000,
  enableAlerts: true,
  alertThresholds: {
    lowLiquidityThreshold: 1000000000000n, // 1M ADA
    highWithdrawalVolumeThreshold: 5000000000000n, // 5M ADA
    rewardSyncDelayHours: 24,
    unusualActivityThreshold: 100
  }
});

await stakingMonitor.initialize();
await stakingMonitor.startMonitoring();
```

### **Step 2: Oracle Services**
```typescript
// Set up reward syncing oracle
const rewardOracle = new RewardSyncOracle({
  oraclePrivateKey: process.env.ORACLE_PRIVATE_KEY!,
  stakingPoolId: process.env.STAKING_POOL_ID!,
  syncInterval: 432000, // 5 days in slots
  blockfrostApiKey: process.env.BLOCKFROST_API_KEY!
});

await rewardOracle.startSyncing();
```

## 🌉 **Cross-Chain Bridge Setup**

### **Step 1: Bridge Operator Configuration**
```typescript
// Configure trusted bridges
const trustedBridges = [
  {
    bridgeId: "ethereum_bridge",
    bridgeAddress: "addr1_eth_bridge...",
    supportedChains: [1, 42161], // Ethereum, Arbitrum
    publicKey: process.env.ETHEREUM_BRIDGE_PUBLIC_KEY!,
    isActive: true,
    reputationScore: 98,
    totalVolume: 0n,
    successRate: 9980
  },
  {
    bridgeId: "bsc_bridge",
    bridgeAddress: "addr1_bsc_bridge...",
    supportedChains: [56], // BSC
    publicKey: process.env.BSC_BRIDGE_PUBLIC_KEY!,
    isActive: true,
    reputationScore: 95,
    totalVolume: 0n,
    successRate: 9950
  }
];
```

### **Step 2: Chain Connections**
```typescript
// Configure supported chains
const chainConnections = [
  {
    chainId: 1,
    chainName: "Ethereum",
    bridgeAddress: process.env.ETHEREUM_BRIDGE_CONTRACT!,
    nativeTokenPolicy: "",
    wrappedTokenPolicy: "wrapped_eth_policy",
    isActive: true,
    lastSyncSlot: 0,
    totalLocked: 0n,
    totalMinted: 0n
  },
  {
    chainId: 56,
    chainName: "BSC",
    bridgeAddress: process.env.BSC_BRIDGE_CONTRACT!,
    nativeTokenPolicy: "",
    wrappedTokenPolicy: "wrapped_bnb_policy",
    isActive: true,
    lastSyncSlot: 0,
    totalLocked: 0n,
    totalMinted: 0n
  }
];
```

## 🗳️ **DAO Governance Initialization**

### **Step 1: Initial Governance Parameters**
```typescript
const initialGovernanceState = {
  votingPeriodSlots: 604800, // 7 days
  executionDelaySlots: 172800, // 2 days
  quorumThresholdBps: 1000, // 10%
  approvalThresholdBps: 5000, // 50%
  proposalDeposit: 100000000n, // 100 ADA
  minVotingPower: 1000000n, // 1 ADA worth of governance tokens
  treasuryAddress: process.env.NEXT_PUBLIC_TREASURY_ADDRESS!,
  emergencyAdmin: process.env.EMERGENCY_ADMIN_ADDRESS!
};
```

### **Step 2: Treasury Initialization**
```typescript
// Initialize treasury with initial funds
const treasuryInitialization = {
  initialFunds: 1000000000000n, // 1M ADA
  revenueStreams: [
    { source: "trading_fees", percentage: 60 },
    { source: "staking_fees", percentage: 30 },
    { source: "cross_chain_fees", percentage: 10 }
  ],
  distributionSchedule: {
    development: 40,
    marketing: 20,
    operations: 20,
    reserves: 20
  }
};
```

## 🚀 **Production Deployment**

### **Step 1: Build and Deploy Frontend**
```bash
# Build production frontend
npm run build

# Deploy to hosting platform (Vercel, Netlify, etc.)
npm run deploy

# Or deploy to custom server
npm run start
```

### **Step 2: Health Checks**
```bash
# Verify all services are running
curl https://your-domain.com/api/health
curl https://your-domain.com/api/staking/status
curl https://your-domain.com/api/crosschain/status
curl https://your-domain.com/api/governance/status
```

### **Step 3: Monitoring Setup**
```typescript
// Set up comprehensive monitoring
const monitoringServices = [
  stakingMonitor,
  crossChainMonitor,
  governanceMonitor,
  treasuryMonitor,
  poolRegistryMonitor
];

// Start all monitoring services
await Promise.all(
  monitoringServices.map(service => service.startMonitoring())
);
```

## 🔒 **Security Checklist**

- ✅ **Contract Audits**: All validators audited and tested
- ✅ **Oracle Security**: Cryptographic signature validation
- ✅ **Bridge Security**: Multi-signature validation and reputation scoring
- ✅ **Emergency Controls**: Pause mechanisms in all modules
- ✅ **Access Controls**: Admin permissions properly configured
- ✅ **Rate Limiting**: Daily transfer limits and unusual activity detection
- ✅ **Monitoring**: Real-time alerts for suspicious activities

## 📊 **Post-Deployment Verification**

### **Test All Core Functions**
1. ✅ **Liquid Staking**: Deposit ADA, mint stADA, request withdrawal
2. ✅ **Cross-Chain**: Initiate transfer, complete inbound transfer
3. ✅ **Governance**: Create proposal, cast vote, execute proposal
4. ✅ **Treasury**: Revenue distribution, fund allocation
5. ✅ **Monitoring**: Real-time updates and alerts

### **Performance Metrics**
- ✅ **Transaction Success Rate**: >99%
- ✅ **Average Response Time**: <2 seconds
- ✅ **Uptime**: >99.9%
- ✅ **Oracle Sync Delay**: <1 hour

**PuckSwap v5 is now live and ready for users! 🎉**
