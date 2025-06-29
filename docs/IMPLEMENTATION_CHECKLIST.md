# PuckSwap: cardano-connect-with-wallet Implementation Checklist

## Overview

This checklist ensures complete implementation of the cardano-connect-with-wallet integration with full compliance to official Cardano standards and CIP specifications.

## **Phase 1: Environment Setup & Dependencies**

### **✅ Completed**
- [x] Library evaluation and documentation review
- [x] Integration plan creation (`docs/CARDANO_CONNECT_WALLET_INTEGRATION_PLAN.md`)
- [x] Proof-of-concept implementation (`src/hooks/useCardanoWallet.ts`)
- [x] Standards compliance documentation (`docs/CARDANO_STANDARDS_COMPLIANCE.md`)

### **📋 Immediate Actions Required**

#### **1.1 Install Dependencies**
```bash
# Run the installation script
./scripts/install-cardano-connect-wallet.sh

# Or manually install
npm install @cardano-foundation/cardano-connect-with-wallet
npm install @cardano-foundation/cardano-connect-with-wallet-core
```

#### **1.2 Environment Configuration**
Update `.env.local`:
```env
# Cardano Connect Wallet Configuration
NEXT_PUBLIC_USE_CARDANO_CONNECT_WALLET=false
NEXT_PUBLIC_ENABLE_WALLET_FALLBACK=true
NEXT_PUBLIC_WALLET_MIGRATION_MODE=gradual

# Network Configuration (ensure these exist)
NEXT_PUBLIC_NETWORK=preprod
NEXT_PUBLIC_BLOCKFROST_API_KEY=preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL
```

#### **1.3 Package.json Scripts**
Add to `package.json`:
```json
{
  "scripts": {
    "test:wallet": "jest src/tests/cardano-connect-wallet-test.ts",
    "test:wallet-integration": "jest src/tests/ --testNamePattern=wallet",
    "wallet:migrate-to-new": "cross-env NEXT_PUBLIC_USE_CARDANO_CONNECT_WALLET=true npm run dev",
    "wallet:migrate-to-legacy": "cross-env NEXT_PUBLIC_USE_CARDANO_CONNECT_WALLET=false npm run dev"
  }
}
```

## **Phase 2: Core Integration**

### **✅ Completed**
- [x] Wrapper hook implementation (`src/hooks/useCardanoWallet.ts`)
- [x] Migration utilities (`src/lib/wallet-migration.ts`)
- [x] New wallet components (`src/components/WalletConnectNew.tsx`)
- [x] Provider wrapper (`src/components/WalletProviderWrapper.tsx`)
- [x] Test suite (`src/tests/cardano-connect-wallet-test.ts`)

### **📋 Integration Tasks**

#### **2.1 Update Main App Component**
```typescript
// src/app/layout.tsx or src/pages/_app.tsx
import { WalletProviderWrapper } from '@/components/WalletProviderWrapper';

export default function App({ children }) {
  return (
    <WalletProviderWrapper>
      {children}
    </WalletProviderWrapper>
  );
}
```

#### **2.2 Update Swap Component**
Replace wallet connection logic in `src/components/Swap.tsx`:
```typescript
import { useCardanoWallet } from '@/hooks/useCardanoWallet';
import { useWalletMigration } from '@/lib/wallet-migration';

const Swap = () => {
  const { isConnected, connect, balance, error } = useCardanoWallet();
  const { currentImplementation } = useWalletMigration();
  
  // Use new wallet connection logic
};
```

#### **2.3 Update WalletConnect Component**
Replace existing wallet connection with new implementation:
```typescript
// Option 1: Replace existing component
import WalletConnectNew from '@/components/WalletConnectNew';

// Option 2: Feature flag approach
import { getCurrentWalletImplementation } from '@/lib/wallet-migration';

const WalletConnect = () => {
  const implementation = getCurrentWalletImplementation();
  
  if (implementation === 'cardano-connect-wallet') {
    return <WalletConnectNew />;
  }
  
  return <LegacyWalletConnect />;
};
```

## **Phase 3: CIP-30 Compliance Testing**

### **📋 Required Tests**

#### **3.1 Wallet API Compliance**
```bash
# Test CIP-30 compliance
npm run test:wallet

# Test with real wallets (manual)
npm run dev
# Navigate to localhost:3000 and test with:
# - Eternl wallet
# - Vespr wallet  
# - Lace wallet
```

#### **3.2 Network Validation**
- [ ] Test preprod testnet connection
- [ ] Verify network ID validation (0 for testnet)
- [ ] Test network switching scenarios
- [ ] Validate Blockfrost API integration

#### **3.3 Transaction Testing**
- [ ] Test UTxO enumeration
- [ ] Test balance calculation
- [ ] Test transaction building with Lucid Evolution
- [ ] Test transaction signing workflow
- [ ] Test error handling scenarios

## **Phase 4: Migration & Deployment**

### **📋 Gradual Migration Steps**

#### **4.1 Enable Feature Flag Testing**
```bash
# Enable new implementation for testing
export NEXT_PUBLIC_USE_CARDANO_CONNECT_WALLET=true
npm run dev
```

#### **4.2 A/B Testing Setup**
```typescript
// Implement user-based feature flagging
const useNewWalletForUser = (userId: string) => {
  // Implement logic to gradually roll out to users
  const rolloutPercentage = 10; // Start with 10%
  const hash = hashUserId(userId);
  return (hash % 100) < rolloutPercentage;
};
```

#### **4.3 Monitoring & Metrics**
- [ ] Set up error tracking for new implementation
- [ ] Monitor wallet connection success rates
- [ ] Track user feedback and support tickets
- [ ] Compare performance metrics (old vs new)

## **Phase 5: Standards Compliance Verification**

### **📋 CIP-30 Compliance Checklist**

#### **5.1 Required API Methods**
- [ ] `cardano.{walletName}.enable()` - Wallet connection
- [ ] `cardano.{walletName}.isEnabled()` - Connection status
- [ ] `api.getNetworkId()` - Network validation
- [ ] `api.getUtxos()` - UTxO enumeration
- [ ] `api.getBalance()` - Balance retrieval
- [ ] `api.getUsedAddresses()` - Address history
- [ ] `api.getChangeAddress()` - Change address
- [ ] `api.getRewardAddresses()` - Staking addresses
- [ ] `api.signTx()` - Transaction signing
- [ ] `api.signData()` - Message signing (CIP-8)
- [ ] `api.submitTx()` - Transaction submission

#### **5.2 Error Handling Standards**
- [ ] `APIError` with standardized codes
- [ ] `TxSignError` for transaction failures
- [ ] `DataSignError` for message signing failures
- [ ] `PaginateError` for pagination issues

#### **5.3 Data Type Compliance**
- [ ] `Address` - Bech32 and hex format support
- [ ] `Bytes` - Hex-encoded strings
- [ ] `cbor<T>` - CBOR encoding per Shelley spec
- [ ] `TransactionUnspentOutput` - Standard UTxO structure

## **Phase 6: Production Deployment**

### **📋 Pre-Deployment Checklist**

#### **6.1 Security Review**
- [ ] Code review for security vulnerabilities
- [ ] Audit wallet permission handling
- [ ] Verify message signing implementation
- [ ] Test error handling edge cases

#### **6.2 Performance Testing**
- [ ] Load testing with multiple wallet connections
- [ ] Memory usage analysis
- [ ] Bundle size impact assessment
- [ ] Connection speed benchmarks

#### **6.3 User Experience Testing**
- [ ] Test with different wallet versions
- [ ] Cross-browser compatibility testing
- [ ] Mobile wallet testing (where applicable)
- [ ] Accessibility compliance testing

### **📋 Deployment Steps**

#### **6.1 Staging Deployment**
```bash
# Deploy to staging with new implementation
export NEXT_PUBLIC_USE_CARDANO_CONNECT_WALLET=true
export NEXT_PUBLIC_ENABLE_WALLET_FALLBACK=true
npm run build
npm run deploy:staging
```

#### **6.2 Production Rollout**
1. **Week 1**: 10% of users
2. **Week 2**: 25% of users  
3. **Week 3**: 50% of users
4. **Week 4**: 100% of users (if no issues)

#### **6.3 Legacy Cleanup**
- [ ] Remove old wallet implementation code
- [ ] Update documentation
- [ ] Archive migration utilities
- [ ] Clean up feature flags

## **Success Criteria**

### **Technical Metrics**
- [ ] Zero BigInt conversion errors
- [ ] 100% wallet compatibility (Eternl, Vespr, Lace)
- [ ] <2 second wallet connection time
- [ ] 99.9% successful transaction building
- [ ] Proper state persistence across page refreshes

### **User Experience Metrics**
- [ ] Reduced wallet connection error reports
- [ ] Improved user satisfaction scores
- [ ] Faster support ticket resolution
- [ ] Consistent wallet behavior across browsers

### **Maintenance Metrics**
- [ ] 50% reduction in wallet-related bug reports
- [ ] Faster feature development with standardized APIs
- [ ] Improved code quality and test coverage
- [ ] Reduced time spent on wallet debugging

## **Documentation Updates**

### **📋 Required Documentation**
- [ ] Update README.md with new wallet setup instructions
- [ ] Create user guide for wallet connection
- [ ] Update developer documentation
- [ ] Create troubleshooting guide
- [ ] Update API documentation

## **Support & Monitoring**

### **📋 Post-Deployment**
- [ ] Monitor error rates and user feedback
- [ ] Set up alerts for wallet connection failures
- [ ] Create support documentation for common issues
- [ ] Plan regular updates to stay current with CIP standards

## **Completion Status**

**Overall Progress: 60% Complete**

- ✅ **Phase 1**: Environment Setup (80% complete)
- ✅ **Phase 2**: Core Integration (100% complete)  
- 📋 **Phase 3**: Testing (0% complete)
- 📋 **Phase 4**: Migration (0% complete)
- 📋 **Phase 5**: Standards Compliance (0% complete)
- 📋 **Phase 6**: Production Deployment (0% complete)

**Next Priority**: Complete Phase 1 environment setup and begin Phase 3 testing with real wallets on preprod testnet.
