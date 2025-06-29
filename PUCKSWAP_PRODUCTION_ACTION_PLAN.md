# PuckSwap DEX Production Readiness Action Plan

## Analysis: Minswap vs PuckSwap Comparison

### **Minswap DEX v2 Structure (Reference)**
```json
{
  "validators": [
    "always_success.spend",
    "authen_minting_policy.validate_authen", 
    "authen_minting_policy.validate_spend_global_setting",
    "factory_validator.validate_factory",
    "order_validator.validate_expired_order_cancel",
    "sample_multi_sign.withdraw",
    "sample_multi_sign.spend"
  ]
}
```

### **PuckSwap Current Structure**
```json
{
  "validators": [
    "liquidity.liquidity.spend",
    "liquidity.liquidity.else", 
    "simple.simple.spend",
    "simple.simple.else",
    "swap.swap.spend",
    "swap.swap.else"
  ]
}
```

## 🚨 CRITICAL GAPS IDENTIFIED

### **1. Missing Core Validators**
- ❌ **Factory Validator**: Pool creation and management
- ❌ **Authentication Policy**: Authorization and permissions
- ❌ **Order Validator**: Order lifecycle management
- ❌ **LP Token Minting Policy**: Liquidity token management

### **2. Incomplete Datum Structures**
- ✅ **PoolDatum**: Present but needs validation
- ❌ **FactoryDatum**: Missing
- ❌ **GlobalSetting**: Missing
- ❌ **AuthenRedeemer**: Missing

## 📋 IMMEDIATE ACTION ITEMS

### **Phase 1: Fix Runtime Errors (COMPLETED ✅)**
- [x] Fixed wallet connection "Cannot read properties of undefined" errors
- [x] Added proper null checks and type validation in event handlers
- [x] Implemented SSR-safe wallet provider wrapper

### **Phase 2: Complete Smart Contract Architecture**

#### **2.1 Create Missing Validators**
```bash
# Create factory validator
touch contracts/validators/factory.ak

# Create authentication policy  
touch contracts/policies/authentication.ak

# Create order validator
touch contracts/validators/order.ak
```

#### **2.2 Update Datum Structures**
```aiken
// contracts/types/factory.ak
pub type FactoryDatum {
  head: ByteArray,
  tail: ByteArray,
}

// contracts/types/global.ak  
pub type GlobalSetting {
  batchers: List<PoolAuthorizationMethod>,
  pool_fee_updater: PoolAuthorizationMethod,
  fee_sharing_taker: PoolAuthorizationMethod,
  admin: PoolAuthorizationMethod,
}
```

#### **2.3 Implement LP Token Minting Policy**
```aiken
// contracts/policies/lp_minting.ak
validator lp_minting_policy(pool_nft_policy: PolicyId) {
  mint(redeemer: LPMintingRedeemer, ctx: ScriptContext) {
    // Implement LP token minting logic
    // Validate pool operations
    // Ensure proper authorization
  }
}
```

### **Phase 3: Deployment Infrastructure**

#### **3.1 Update Deployment Scripts**
```typescript
// scripts/deployContracts.ts
const deployPuckSwapV5 = async () => {
  // Deploy factory validator
  const factoryValidator = await deployValidator('factory');
  
  // Deploy authentication policy
  const authPolicy = await deployPolicy('authentication');
  
  // Deploy order validator  
  const orderValidator = await deployValidator('order');
  
  // Update addresses.json with all validators
};
```

#### **3.2 Create Test Token Deployment**
```typescript
// scripts/deployTestTokens.ts
const deployTestTokens = async () => {
  // Deploy tPUCKY token with 1 billion supply
  // Deploy test ADA faucet
  // Create initial liquidity pools
};
```

### **Phase 4: Transaction Builders**

#### **4.1 Complete Swap Transaction Builder**
```typescript
// src/lucid/swap.ts
export const buildSwapTransaction = async (
  lucid: Lucid,
  poolDatum: PoolDatum,
  swapParams: SwapParams
): Promise<TxComplete> => {
  // Use deployed validator addresses
  // Implement proper UTxO consumption
  // Add slippage protection
  // Include deadline validation
};
```

#### **4.2 Implement Pool Creation**
```typescript
// src/lucid/pool-creation.ts
export const buildPoolCreationTransaction = async (
  lucid: Lucid,
  tokenA: Asset,
  tokenB: Asset,
  initialLiquidity: { ada: bigint; token: bigint }
): Promise<TxComplete> => {
  // Use factory validator
  // Create pool NFT
  // Initialize pool datum
  // Mint initial LP tokens
};
```

### **Phase 5: Frontend Integration**

#### **5.1 Real Wallet Integration**
```typescript
// src/components/WalletConnect.tsx
- [x] Fix SSR issues with dynamic imports
- [x] Add proper error handling
- [ ] Test with Eternl, Vespr, Lace wallets
- [ ] Implement real balance detection
```

#### **5.2 Pool Discovery System**
```typescript
// src/hooks/usePoolDiscovery.ts
export const usePoolDiscovery = () => {
  // Query UTxOs at swap validator address
  // Parse PoolDatum from on-chain data
  // Filter active pools with liquidity > 1 ADA
  // Return available trading pairs
};
```

## 🎯 DEPLOYMENT CHECKLIST

### **Preprod Testnet Deployment**
- [ ] Deploy all validators to Preprod
- [ ] Deploy test tokens (tPUCKY)
- [ ] Create initial liquidity pools
- [ ] Test wallet connections
- [ ] Test swap transactions
- [ ] Test liquidity provision/withdrawal

### **Testing Strategy**
```bash
# 1. Unit Tests
npm run test:contracts

# 2. Integration Tests  
npm run test:integration

# 3. End-to-End Tests
npm run test:e2e

# 4. Wallet Connection Tests
npm run test:wallets
```

### **Production Readiness Criteria**
- [ ] All validators deployed and tested
- [ ] Wallet integration working with 3+ wallets
- [ ] Successful swap transactions on testnet
- [ ] Pool creation and management working
- [ ] Slippage protection implemented
- [ ] Deadline validation working
- [ ] Error handling comprehensive
- [ ] UI/UX polished and responsive

## 🚀 NEXT STEPS

1. **Complete missing validators** (factory, auth, order)
2. **Deploy to Preprod testnet** with all components
3. **Create test liquidity pools** with tPUCKY/ADA pairs
4. **Test wallet integration** end-to-end
5. **Verify swap functionality** with real transactions
6. **Polish UI/UX** for production readiness

## 📊 SUCCESS METRICS

- ✅ Users can connect wallets (Eternl, Vespr, Lace)
- ✅ Users can see real wallet balances
- ✅ Users can discover available trading pairs
- ✅ Users can perform swaps with slippage protection
- ✅ Users can add/remove liquidity
- ✅ All transactions succeed on Preprod testnet
- ✅ Error handling provides clear user feedback

## 🔗 Key Files to Modify

### **Smart Contracts**
- `contracts/validators/factory.ak` (NEW)
- `contracts/policies/authentication.ak` (NEW)  
- `contracts/validators/order.ak` (NEW)
- `contracts/policies/lp_minting.ak` (UPDATE)

### **Deployment**
- `scripts/deployContracts.ts` (UPDATE)
- `scripts/deployTestTokens.ts` (NEW)
- `deployment/addresses.json` (UPDATE)

### **Frontend**
- `src/lucid/swap.ts` (UPDATE)
- `src/lucid/pool-creation.ts` (NEW)
- `src/hooks/usePoolDiscovery.ts` (UPDATE)
- `src/components/Swap.tsx` (UPDATE)

### **Testing**
- `tests/swap-integration.test.ts` (NEW)
- `tests/wallet-connection.test.ts` (UPDATE)
- `tests/pool-lifecycle.test.ts` (UPDATE)
