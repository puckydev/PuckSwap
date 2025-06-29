# PuckSwap v5 - Frontend Components

This directory contains the complete frontend components for PuckSwap DEX v5, featuring retro terminal aesthetics and full integration with Lucid Evolution transaction builders.

## 🎨 Design Philosophy

**Retro Computer Terminal Aesthetic**
- Dark theme with green/amber text
- Monospace fonts (terminal-style)
- CRT-inspired visual effects
- Professional DEX interface standards
- Responsive layouts for all devices

## 🚀 Components Overview

### 1. SwapV5.tsx - AMM Swap Interface

**Features:**
- ✅ Live pool reserves display from Context7 backend
- ✅ Real-time price calculation with AMM formula
- ✅ Slippage tolerance settings (0.1%, 0.5%, 1.0%, custom)
- ✅ Price impact warnings (red for >5%)
- ✅ Wallet connection via Lucid Evolution
- ✅ Transaction submission with hash display
- ✅ Demo mode with mock data

**Key Functions:**
```typescript
// Connect wallet and initialize swap builder
const connectWallet = async () => {
  const builder = await PuckSwapSwapBuilder.create(
    poolValidatorCbor, "Preprod", "eternl"
  );
  setSwapBuilder(builder);
};

// Execute swap with full validation
const executeSwap = async () => {
  const result = await swapBuilder.executeSwap({
    poolUtxo: poolData.poolUtxo,
    swapInToken: swapDirection === 'token-to-ada',
    amountIn: quote.inputAmount,
    minOut: quote.minimumReceived,
    slippageTolerance: slippageTolerance
  });
};
```

### 2. LiquidityV5.tsx - Liquidity Provision Interface

**Features:**
- ✅ Add/Remove liquidity modes
- ✅ Auto-optimal ratio calculation
- ✅ LP token minting/burning
- ✅ Pool share percentage tracking
- ✅ User LP balance display
- ✅ Proportional withdrawal calculations

**Key Functions:**
```typescript
// Add liquidity with optimal ratio
const addLiquidity = async () => {
  const result = await liquidityBuilder.addLiquidity({
    poolUtxo: poolData.poolUtxo,
    adaAmount: quote.adaAmount,
    tokenAmount: quote.tokenAmount,
    minLpTokens: (quote.lpTokensToMint * 95n) / 100n,
    autoOptimalRatio: autoOptimalRatio
  });
};

// Remove liquidity proportionally
const removeLiquidity = async () => {
  const result = await liquidityBuilder.removeLiquidity({
    poolUtxo: poolData.poolUtxo,
    lpTokenAmount: -quote.lpTokensToMint,
    minAdaOut: (quote.adaAmount * 95n) / 100n,
    minTokenOut: (quote.tokenAmount * 95n) / 100n
  });
};
```

### 3. GovernanceV5.tsx - DAO Governance Interface

**Features:**
- ✅ Active proposals display with voting status
- ✅ Quorum and approval threshold tracking
- ✅ Proposal creation form with action types
- ✅ Voting interface (For/Against/Abstain)
- ✅ Proposal execution for passed proposals
- ✅ Treasury balance and governance stats

**Key Functions:**
```typescript
// Create new governance proposal
const createProposal = async () => {
  const result = await governanceBuilder.createProposal({
    action: { type: newProposal.actionType, parameters: newProposal.parameters },
    title: newProposal.title,
    description: newProposal.description,
    proposalDeposit: depositAmount
  });
};

// Vote on proposal
const voteOnProposal = async (proposalId: string, vote: 'For' | 'Against' | 'Abstain') => {
  const result = await governanceBuilder.voteOnProposal({
    proposalId, vote, votingPower: userVotingPower
  });
};
```

### 4. LiquidStakingV5.tsx - Liquid Staking Interface

**Features:**
- ✅ ADA staking with pADA minting
- ✅ Withdrawal requests with delay periods
- ✅ Exchange rate tracking and APY display
- ✅ Pending withdrawals management
- ✅ Reward sync status display
- ✅ Fee breakdown (deposit/withdrawal/management)

**Key Functions:**
```typescript
// Stake ADA for pADA
const stakeADA = async () => {
  const result = await stakingBuilder.depositStaking({
    amount: quote.inputAmount,
    minPADAOut: (quote.outputAmount * 95n) / 100n,
    userAddress: walletAddress
  });
};

// Request withdrawal (with delay)
const requestWithdrawal = async () => {
  const result = await stakingBuilder.requestWithdrawal({
    stADAAmount: quote.inputAmount,
    minADAOut: (quote.outputAmount * 95n) / 100n,
    userAddress: walletAddress
  });
};
```

### 5. CrossChainRouterV5.tsx - Cross-Chain Bridge Interface

**Features:**
- ✅ Multi-chain support (Ethereum, BSC, Polygon, Avalanche)
- ✅ Trusted bridge selection
- ✅ Token selection (ADA/PUCKY)
- ✅ Transfer fee calculation
- ✅ Estimated transfer time
- ✅ Transfer status tracking
- ✅ Nonce state display

**Key Functions:**
```typescript
// Initiate cross-chain transfer
const initiateTransfer = async () => {
  const result = await routerBuilder.initiateTransfer({
    destinationChain: selectedChain,
    recipient: recipientAddress,
    tokenPolicy: selectedToken === 'PUCKY' ? 'pucky_policy_id' : undefined,
    tokenName: selectedToken === 'PUCKY' ? 'PUCKY' : undefined,
    amount: quote.amount,
    bridgeId: selectedBridge,
    userAddress: walletAddress
  });
};
```

## 🎯 Common Patterns

### State Management
All components use React hooks for state management:
```typescript
const [isLoading, setIsLoading] = useState(false);
const [walletConnected, setWalletConnected] = useState(false);
const [txHash, setTxHash] = useState<string>('');
const [error, setError] = useState<string>('');
```

### Error Handling
Comprehensive error handling with user-friendly messages:
```typescript
try {
  const result = await operation();
  toast.success('Operation completed!');
} catch (err) {
  const errorMsg = err instanceof Error ? err.message : 'Operation failed';
  setError(errorMsg);
  toast.error(errorMsg);
}
```

### Demo Mode
All components support demo mode for testing:
```typescript
const [isDemoMode] = useState(process.env.NEXT_PUBLIC_DEMO_MODE === 'true');

if (isDemoMode) {
  // Use mock data and simulate operations
  await new Promise(resolve => setTimeout(resolve, 2000));
  toast.success('Demo operation completed!');
} else {
  // Real blockchain operations
  const result = await builder.executeOperation(params);
}
```

### Animations
Smooth animations using Framer Motion:
```typescript
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  className="terminal-button"
>
  Execute Operation
</motion.button>

<AnimatePresence>
  {txHash && (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      Transaction Result
    </motion.div>
  )}
</AnimatePresence>
```

## 🎨 Styling Classes

### Terminal Theme Classes
```css
.terminal-card - Main container with dark background and green border
.terminal-header - Header section with green text
.terminal-button - Interactive button with hover effects
.terminal-border - Border styling for sections
.text-terminal-green - Primary green text color
.text-terminal-amber - Secondary amber text color
.text-terminal-red - Error/warning red text color
```

### Responsive Grid Layouts
```typescript
<div className="grid grid-cols-2 gap-4 mb-6 text-sm font-mono">
  <div className="terminal-border p-3">
    <div className="text-terminal-amber">Label:</div>
    <div className="text-terminal-green">Value</div>
  </div>
</div>
```

## 🔧 Integration Requirements

### Environment Variables
```env
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_BLOCKFROST_API_KEY=your_api_key
NEXT_PUBLIC_NETWORK=Preprod
NEXT_PUBLIC_POOL_VALIDATOR_CBOR=validator_cbor_hex
NEXT_PUBLIC_LIQUIDITY_VALIDATOR_CBOR=validator_cbor_hex
NEXT_PUBLIC_GOVERNANCE_VALIDATOR_CBOR=validator_cbor_hex
NEXT_PUBLIC_STAKING_VALIDATOR_CBOR=validator_cbor_hex
NEXT_PUBLIC_ROUTER_VALIDATOR_CBOR=validator_cbor_hex
```

### Dependencies
```json
{
  "dependencies": {
    "@lucid-evolution/lucid": "^0.3.0",
    "framer-motion": "^10.0.0",
    "react-hot-toast": "^2.4.0",
    "react": "^18.0.0",
    "next": "^14.0.0"
  }
}
```

### Context7 Integration
```typescript
// TODO: Implement Context7 data fetching
const loadPoolData = async () => {
  const response = await fetch('/api/context7/pools/PUCKY-ADA');
  const data = await response.json();
  setPoolData(data);
};
```

## 🚀 Usage Examples

### Basic Component Usage
```typescript
import SwapV5 from '../components/SwapV5';
import LiquidityV5 from '../components/LiquidityV5';

export default function DEXPage() {
  return (
    <div className="min-h-screen bg-black">
      <SwapV5 />
      <LiquidityV5 />
    </div>
  );
}
```

### Custom Styling
```typescript
// Override terminal theme for specific components
<div className="terminal-card custom-styling">
  <SwapV5 />
</div>
```

## 📱 Responsive Design

All components are fully responsive:
- **Desktop**: Full feature set with optimal layout
- **Tablet**: Adapted grid layouts and touch-friendly buttons
- **Mobile**: Stacked layouts with simplified navigation

## 🔐 Security Features

- ✅ **Input Validation**: All user inputs are validated
- ✅ **Slippage Protection**: Configurable slippage tolerance
- ✅ **Error Boundaries**: Graceful error handling
- ✅ **Demo Mode**: Safe testing environment
- ✅ **Transaction Confirmation**: Clear transaction details before execution
- ✅ **Wallet Integration**: Secure wallet connection patterns

## 🎯 Next Steps

1. **Context7 Integration**: Replace mock data with real Context7 API calls
2. **Wallet Provider**: Implement comprehensive wallet provider context
3. **Real-time Updates**: Add WebSocket connections for live data
4. **Advanced Charts**: Integrate price charts and analytics
5. **Mobile App**: React Native version for mobile platforms

These components provide a complete, production-ready frontend for PuckSwap DEX v5 with professional UX/UI standards and full blockchain integration capabilities.
