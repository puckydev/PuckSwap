# PuckSwap: cardano-connect-with-wallet Integration Plan

## Overview

This document outlines the comprehensive plan for integrating the official Cardano Foundation's `@cardano-foundation/cardano-connect-with-wallet` library into PuckSwap to replace the current custom wallet connection implementation and resolve persistent wallet connection issues.

## Library Evaluation

### cardano-connect-with-wallet Features

**Core Features:**
- ✅ Official Cardano Foundation library
- ✅ CIP-30 and CIP-8 compliance
- ✅ React hooks (`useCardano`) for state management
- ✅ Pre-built UI components (`ConnectWalletList`, `ConnectWalletButton`)
- ✅ Framework-independent core library
- ✅ TypeScript support with built-in declarations
- ✅ Next.js SSR compatibility
- ✅ Local storage state persistence
- ✅ Standardized error handling
- ✅ Active maintenance and community support

**Supported Wallets:**
- Eternl
- Vespr
- Lace
- Nami
- Flint
- Typhon
- And other CIP-30 compliant wallets

### Comparison with Current Implementation

| Aspect | Current PuckSwap | cardano-connect-with-wallet |
|--------|------------------|----------------------------|
| **Maintenance** | Custom implementation | Official Cardano Foundation |
| **Error Handling** | Custom error parsing | Standardized patterns |
| **State Management** | Custom WalletManager | React hooks + localStorage |
| **UI Components** | Custom components | Pre-built components |
| **CIP-30 Compliance** | Manual implementation | Official compliance |
| **Documentation** | Internal docs | Official docs + Storybook |
| **Community Support** | Limited | Active community |
| **Future Updates** | Manual updates | Automatic ecosystem updates |

## Implementation Strategy

### Phase 1: Library Installation and Setup

**1.1 Install Dependencies**
```bash
npm install @cardano-foundation/cardano-connect-with-wallet
npm install @cardano-foundation/cardano-connect-with-wallet-core
```

**1.2 Create Wrapper Hook**
- Create `src/hooks/useCardanoWallet.ts` to wrap the library's `useCardano` hook
- Maintain compatibility with existing PuckSwap wallet state structure
- Add Lucid Evolution integration layer

**1.3 Environment Configuration**
- Configure library for Cardano preprod testnet
- Set up proper network detection and validation

### Phase 2: Core Integration

**2.1 Wallet State Adapter**
- Create adapter to convert between library state and PuckSwap state
- Maintain backward compatibility with existing components
- Implement state synchronization mechanisms

**2.2 Lucid Evolution Bridge**
- Create bridge between cardano-connect-with-wallet and Lucid Evolution
- Ensure seamless transaction building integration
- Maintain existing transaction builder compatibility

**2.3 Error Handling Integration**
- Integrate library's error handling with PuckSwap's error system
- Maintain existing toast notifications and user feedback
- Add library-specific error handling patterns

### Phase 3: Component Migration

**3.1 Update WalletConnect Component**
- Replace custom wallet detection with library's components
- Integrate `ConnectWalletList` component
- Maintain PuckSwap's UI/UX design patterns

**3.2 Update Swap Component**
- Replace custom wallet connection logic with `useCardano` hook
- Maintain existing swap functionality
- Ensure balance calculation compatibility

**3.3 Update Other Components**
- Migrate all wallet-dependent components
- Ensure consistent wallet state across application
- Maintain existing user experience

### Phase 4: Testing and Validation

**4.1 Unit Testing**
- Test wallet connection with all supported wallets
- Validate state management and persistence
- Test error handling scenarios

**4.2 Integration Testing**
- Test Lucid Evolution integration
- Validate transaction building and signing
- Test network switching and validation

**4.3 End-to-End Testing**
- Test complete user workflows
- Validate real wallet connections on preprod testnet
- Test swap transactions and balance updates

## Implementation Details

### New File Structure

```
src/
├── hooks/
│   ├── useCardanoWallet.ts          # Wrapper hook for cardano-connect-with-wallet
│   └── useLucidIntegration.ts       # Lucid Evolution integration hook
├── lib/
│   ├── wallet-adapter.ts            # State adapter between library and PuckSwap
│   ├── wallet-lucid-bridge.ts      # Bridge for Lucid Evolution integration
│   └── wallet-config.ts             # Configuration for cardano-connect-with-wallet
├── components/
│   ├── WalletConnectNew.tsx         # New wallet connection component
│   └── WalletProviderWrapper.tsx    # Provider wrapper for the library
└── types/
    └── wallet-types.ts              # Type definitions and adapters
```

### Key Integration Points

**1. Wallet State Management**
```typescript
// Current PuckSwap state
interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: { ada: bigint; assets: Record<string, bigint> };
  walletName: WalletName | null;
}

// Library state adaptation
const useCardanoWallet = () => {
  const { isConnected, enabledWallet, stakeAddress, ... } = useCardano();
  
  // Adapt library state to PuckSwap format
  return {
    isConnected,
    address: stakeAddress,
    walletName: enabledWallet,
    // ... other adaptations
  };
};
```

**2. Lucid Evolution Integration**
```typescript
const useLucidIntegration = () => {
  const { enabledWallet } = useCardano();
  
  const connectToLucid = async () => {
    const lucid = await createLucidInstance();
    // Use library's wallet API to connect to Lucid
    lucid.selectWallet.fromAPI(enabledWallet.api);
    return lucid;
  };
  
  return { connectToLucid };
};
```

**3. Component Integration**
```typescript
const WalletConnect = () => {
  const { connect, disconnect, isConnected } = useCardano();
  
  return (
    <ConnectWalletList
      onConnect={(walletName) => connect(walletName)}
      customCSS={puckSwapStyles}
      // ... PuckSwap-specific configurations
    />
  );
};
```

## Migration Strategy

### Gradual Migration Approach

**Step 1: Parallel Implementation**
- Implement new wallet system alongside existing system
- Add feature flag to switch between implementations
- Test new system thoroughly before migration

**Step 2: Component-by-Component Migration**
- Start with non-critical components
- Migrate WalletConnect component first
- Gradually migrate other components

**Step 3: Full Migration**
- Switch default to new implementation
- Remove old wallet implementation
- Clean up deprecated code

### Fallback Strategy

**Feature Flag Implementation**
```typescript
const USE_CARDANO_CONNECT_WALLET = process.env.NEXT_PUBLIC_USE_CARDANO_CONNECT_WALLET === 'true';

const WalletProvider = ({ children }) => {
  if (USE_CARDANO_CONNECT_WALLET) {
    return <CardanoConnectWalletProvider>{children}</CardanoConnectWalletProvider>;
  }
  return <LegacyWalletProvider>{children}</LegacyWalletProvider>;
};
```

**Graceful Degradation**
- Maintain existing wallet implementation as fallback
- Implement automatic fallback on library errors
- Provide manual switch for users if needed

## Risk Assessment

### High Risk
- **Breaking Changes**: Library updates might break integration
- **Lucid Evolution Compatibility**: Potential compatibility issues
- **State Management**: Different state management approach

### Medium Risk
- **UI/UX Changes**: Pre-built components might not match PuckSwap design
- **Performance**: Additional library overhead
- **Migration Complexity**: Complex migration process

### Low Risk
- **Wallet Support**: Library supports all required wallets
- **CIP-30 Compliance**: Official compliance ensures compatibility
- **Community Support**: Active community for issue resolution

## Success Metrics

### Technical Metrics
- ✅ All supported wallets connect successfully
- ✅ Zero BigInt conversion errors
- ✅ Successful transaction building and signing
- ✅ Proper state persistence across page refreshes
- ✅ Network validation and switching

### User Experience Metrics
- ✅ Reduced wallet connection errors
- ✅ Faster wallet connection times
- ✅ Improved error messages and user feedback
- ✅ Consistent wallet state across application
- ✅ Seamless user experience

### Maintenance Metrics
- ✅ Reduced custom wallet code maintenance
- ✅ Automatic updates from Cardano Foundation
- ✅ Improved code quality and standardization
- ✅ Better documentation and community support

## Timeline

### Week 1-2: Research and Planning
- Complete library evaluation
- Create detailed implementation plan
- Set up development environment

### Week 3-4: Core Integration
- Install and configure library
- Create wrapper hooks and adapters
- Implement Lucid Evolution bridge

### Week 5-6: Component Migration
- Migrate WalletConnect component
- Update Swap component
- Test with real wallets

### Week 7-8: Testing and Refinement
- Comprehensive testing
- Bug fixes and optimizations
- Documentation updates

### Week 9-10: Deployment and Monitoring
- Deploy to staging environment
- Monitor for issues
- Full production deployment

## Conclusion

The integration of `@cardano-foundation/cardano-connect-with-wallet` represents a strategic move towards standardization and improved reliability for PuckSwap's wallet connections. While the migration requires significant effort, the long-term benefits of using an official, well-maintained library outweigh the implementation costs.

The gradual migration approach with fallback mechanisms ensures minimal risk while providing a path to improved wallet connectivity and user experience.
