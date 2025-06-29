# PuckSwap v5 Liquid Staking Component

## Overview

The `LiquidStaking.tsx` component provides a comprehensive interface for PuckSwap v5's liquid staking functionality, allowing users to stake ADA, mint pADA tokens, and manage staking rewards through a retro terminal-themed UI.

## Features

### 🏦 Core Functionality
- **Deposit ADA (Stake)**: Stake ADA to mint corresponding pADA tokens
- **Withdraw ADA (Unstake)**: Burn pADA tokens to withdraw ADA
- **Sync Staking Rewards**: Admin/Oracle function to update reward sync slots

### 🔗 Wallet Integration
- **Lucid Evolution CIP-30**: Full wallet connection support
- **Multi-Wallet Support**: Eternl, Nami, Vespr, Lace compatibility
- **Real-time Balances**: Live ADA and pADA balance tracking

### 📊 Real-time Monitoring
- **Context7 Integration**: Live staking state updates via WebSocket
- **StakingDatum Display**: Total staked, total pADA minted, pool ID, sync slot
- **Exchange Rate Calculation**: Dynamic ADA ↔ pADA conversion rates

### 🎨 UI/UX Features
- **Retro Terminal Aesthetic**: Dark theme with green/amber terminal styling
- **Responsive Design**: Mobile-friendly grid layouts
- **Transaction Status**: Real-time transaction submission feedback
- **Demo Mode**: Safe testing environment with mock data

## Technical Implementation

### Data Structures

```typescript
// Master Schema StakingDatum (CIP-68 compliant)
interface StakingDatum {
  total_staked: bigint;
  total_pADA_minted: bigint;
  stake_pool_id: string;
  last_rewards_sync_slot: bigint;
}

// Wallet State Management
interface WalletState {
  isConnected: boolean;
  address: string;
  balance: {
    ada: bigint;
    pADA: bigint;
  };
  walletName: string;
}
```

### Key Functions

#### 1️⃣ Deposit ADA (Stake)
```typescript
const handleDepositStaking = async () => {
  // Calls depositStaking from staking.ts
  // Mints pADA tokens proportional to ADA deposited
  // Updates wallet balances via Context7 monitor
}
```

#### 2️⃣ Withdraw ADA (Unstake)
```typescript
const handleWithdrawStaking = async () => {
  // Calls withdrawStaking from staking.ts
  // Burns pADA tokens to withdraw ADA
  // Applies exchange rate for reward distribution
}
```

#### 3️⃣ Sync Staking Rewards
```typescript
const handleSyncStakingRewards = async () => {
  // Calls syncStakingRewards from staking.ts
  // Updates last_rewards_sync_slot
  // Typically used by authorized oracles
}
```

## Dependencies

### Required Imports
- `React` - Core React functionality with hooks
- `framer-motion` - Smooth animations and transitions
- `react-hot-toast` - User notification system
- `../../src/lucid/staking` - Off-chain transaction builders
- `../../src/context7/staking_monitor` - Real-time state monitoring
- `../../src/lib/lucid-config` - Wallet connection utilities
- `../../src/lib/format-utils` - Number and currency formatting
- `../../src/lib/environment-config` - Environment configuration

### Environment Variables
```bash
NEXT_PUBLIC_DEMO_MODE=true                    # Enable demo mode
NEXT_PUBLIC_STAKING_VALIDATOR_CBOR=...        # Staking validator script
NEXT_PUBLIC_PADA_MINTING_POLICY_CBOR=...      # pADA minting policy
NEXT_PUBLIC_STAKING_ADDRESS=...               # Staking contract address
```

## Usage

### Basic Integration
```typescript
import LiquidStaking from './components/LiquidStaking';

function App() {
  return (
    <div className="min-h-screen bg-terminal-black">
      <LiquidStaking />
    </div>
  );
}
```

### Demo Mode
The component automatically detects demo mode via environment variables and provides:
- Mock staking data (5M ADA staked, 4.8M pADA minted)
- Simulated wallet connections
- Fake transaction hashes
- Safe testing environment

### Real Mode
In production mode, the component:
- Connects to actual Cardano wallets
- Submits real blockchain transactions
- Monitors live staking state via Context7
- Updates balances in real-time

## Styling

### Terminal Theme Classes
- `terminal-card` - Main container with dark background and green border
- `terminal-button` - Interactive buttons with hover effects
- `text-glow` - Glowing text effect for headers
- `text-terminal-green` - Primary green text color
- `text-terminal-amber` - Secondary amber text color
- `text-terminal-red` - Error/warning red text color

### Responsive Design
- **Desktop**: Three-column grid layout for main functions
- **Tablet**: Responsive grid with touch-friendly buttons
- **Mobile**: Stacked layout with optimized spacing

## Error Handling

### Transaction Errors
- Network connectivity issues
- Insufficient wallet balance
- Invalid input validation
- Smart contract execution failures

### State Management
- Graceful fallbacks for missing data
- Loading states during async operations
- Clear error messages with dismissible notifications
- Automatic retry mechanisms for failed operations

## Security Features

- **Input Validation**: All user inputs are validated before processing
- **Slippage Protection**: 5% default slippage tolerance for transactions
- **Demo Mode Safety**: No real transactions in demo environment
- **Wallet Security**: Secure CIP-30 wallet integration patterns
- **Error Boundaries**: Graceful error handling throughout the component

## Future Enhancements

- **Advanced Analytics**: Staking performance metrics and charts
- **Batch Operations**: Multiple transactions in single submission
- **Governance Integration**: Voting on staking parameters
- **Cross-chain Support**: Bridge integration for multi-chain staking
- **Mobile App**: React Native version for mobile devices
