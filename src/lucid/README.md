# PuckSwap v5 - Lucid Evolution Transaction Builders

This directory contains comprehensive transaction builders for PuckSwap DEX operations using Lucid Evolution with full CIP-68 compliance.

## 🚀 Transaction Builders

### 1. Swap Transaction Builder (`swap.ts`)

Handles AMM swap operations with automatic price calculation and slippage protection.

```typescript
import { PuckSwapSwapBuilder } from './swap';

// Initialize swap builder
const swapBuilder = await PuckSwapSwapBuilder.create(
  poolValidatorCbor,
  "Preprod", // Network
  "eternl"   // Wallet
);

// Execute a swap
const swapResult = await swapBuilder.executeSwap({
  poolUtxo: poolUtxo,
  swapInToken: false, // ADA -> Token
  amountIn: 10_000_000n, // 10 ADA
  minOut: 24_000_000n,   // Minimum 24 tokens
  slippageTolerance: 0.5 // 0.5%
});

console.log(`Swap completed: ${swapResult.txHash}`);
console.log(`Received: ${swapResult.actualOutput} tokens`);
console.log(`Price impact: ${swapResult.priceImpact}%`);
```

**Features:**
- ✅ Automatic pool discovery by token policy/name
- ✅ Constant product AMM formula (x*y=k)
- ✅ 0.3% trading fee + protocol fee
- ✅ Price impact calculation
- ✅ Slippage protection
- ✅ CIP-68 datum updates
- ✅ Min ADA compliance

### 2. Liquidity Transaction Builder (`liquidity.ts`)

Handles liquidity provision and withdrawal with LP token minting/burning.

```typescript
import { PuckSwapLiquidityBuilder } from './liquidity';

// Initialize liquidity builder
const liquidityBuilder = await PuckSwapLiquidityBuilder.create(
  poolValidatorCbor,
  liquidityValidatorCbor,
  lpMintingPolicyCbor,
  "Preprod",
  "eternl"
);

// Add liquidity
const addResult = await liquidityBuilder.addLiquidity({
  poolUtxo: poolUtxo,
  adaAmount: 100_000_000n, // 100 ADA
  tokenAmount: 250_000_000n, // 250 tokens
  minLpTokens: 150_000_000n, // Minimum LP tokens
  autoOptimalRatio: true // Auto-adjust to pool ratio
});

// Remove liquidity
const removeResult = await liquidityBuilder.removeLiquidity({
  poolUtxo: poolUtxo,
  lpTokenAmount: 50_000_000n, // LP tokens to burn
  minAdaOut: 40_000_000n,     // Minimum ADA out
  minTokenOut: 100_000_000n   // Minimum tokens out
});
```

**Features:**
- ✅ Optimal ratio calculation
- ✅ LP token minting/burning
- ✅ Proportional withdrawal
- ✅ Pool share percentage tracking
- ✅ Fee estimation
- ✅ Balance checking

### 3. Governance Transaction Builder (`governance.ts`)

Handles DAO governance operations including proposal creation, voting, and execution.

```typescript
import { PuckSwapGovernanceBuilder } from './governance';

// Initialize governance builder
const governanceBuilder = await PuckSwapGovernanceBuilder.create(
  governanceValidatorCbor,
  governanceTokenPolicyCbor,
  governanceAddress,
  treasuryAddress,
  "Preprod",
  "eternl"
);

// Create a proposal
const proposalResult = await governanceBuilder.createProposal({
  action: {
    type: 'UpdateProtocolFee',
    parameters: { newFeeBps: 25 } // 0.25%
  },
  title: "Reduce Protocol Fee",
  description: "Proposal to reduce protocol fee from 0.3% to 0.25%",
  proposalDeposit: 100_000_000n // 100 ADA deposit
});

// Vote on a proposal
const voteResult = await governanceBuilder.voteOnProposal({
  proposalId: "proposal_123",
  vote: 'For',
  votingPower: 1_000_000n // Auto-calculated if not provided
});

// Execute a passed proposal
const executeResult = await governanceBuilder.executeProposal({
  proposalId: "proposal_123"
});
```

**Features:**
- ✅ Proposal creation with deposits
- ✅ Voting with governance tokens
- ✅ Quorum and approval thresholds
- ✅ Execution delay periods
- ✅ Treasury payouts
- ✅ Parameter updates

### 4. Liquid Staking Transaction Builder (`staking.ts`)

Handles liquid staking operations with stADA minting and reward syncing.

```typescript
import { PuckSwapLiquidStaking } from './staking';

// Initialize staking builder
const stakingBuilder = await PuckSwapLiquidStaking.create(
  blockfrostApiKey,
  "Preprod",
  {
    stakingValidator: stakingValidatorCbor,
    stADAMintingPolicy: stADAMintingPolicyCbor
  },
  stakingAddress
);

// Deposit ADA for stADA
const depositResult = await stakingBuilder.depositStaking({
  amount: 1000_000_000n, // 1000 ADA
  minStADAOut: 950_000_000n, // Minimum stADA (accounting for fees)
  userAddress: userAddress
});

// Request withdrawal
const withdrawalResult = await stakingBuilder.requestWithdrawal({
  stADAAmount: 500_000_000n, // 500 stADA
  minADAOut: 520_000_000n,   // Minimum ADA (including rewards)
  userAddress: userAddress
});

// Sync rewards (oracle only)
const syncResult = await stakingBuilder.syncRewards({
  epoch: 450,
  totalRewards: 50_000_000n, // 50 ADA rewards
  timestamp: Date.now(),
  signature: "oracle_signature"
});
```

**Features:**
- ✅ stADA minting on deposits
- ✅ Withdrawal request system
- ✅ Oracle-based reward syncing
- ✅ Exchange rate tracking
- ✅ Delay period enforcement
- ✅ Fee management

### 5. Cross-Chain Transaction Builder (`crosschain.ts`)

Handles cross-chain transfers with bridge integration and message passing.

```typescript
import { PuckSwapCrossChainRouter } from './crosschain';

// Initialize cross-chain builder
const crossChainBuilder = await PuckSwapCrossChainRouter.create(
  blockfrostApiKey,
  "Preprod",
  {
    routerValidator: routerValidatorCbor,
    packetValidator: packetValidatorCbor
  },
  routerAddress
);

// Initiate cross-chain transfer
const transferResult = await crossChainBuilder.initiateTransfer({
  destinationChain: 'Ethereum',
  recipient: '0x742d35Cc6634C0532925a3b8D',
  tokenPolicy: 'token_policy_id',
  tokenName: 'PUCKY',
  amount: 1000_000_000n, // 1000 tokens
  bridgeId: 'bridge_001',
  userAddress: userAddress
});

// Complete inbound transfer (bridge operator)
const completeResult = await crossChainBuilder.completeInboundTransfer({
  messageId: 'msg_123',
  proof: {
    signatures: ['sig1', 'sig2'],
    merkleProof: ['hash1', 'hash2'],
    blockHeight: 12345,
    blockHash: 'block_hash'
  },
  bridgeOperatorAddress: operatorAddress
});

// Check transfer status
const status = await crossChainBuilder.getTransferStatus('msg_123');
console.log(`Transfer status: ${status.status}`);
```

**Features:**
- ✅ Multi-chain support
- ✅ Bridge operator validation
- ✅ Cryptographic proof verification
- ✅ Message replay protection
- ✅ Fee calculation
- ✅ Status tracking

## 🔧 Common Patterns

### Error Handling

All transaction builders include comprehensive error handling:

```typescript
try {
  const result = await swapBuilder.executeSwap(params);
  console.log('Success:', result.txHash);
} catch (error) {
  if (error.message.includes('Insufficient')) {
    console.error('Insufficient funds or reserves');
  } else if (error.message.includes('Deadline')) {
    console.error('Transaction deadline exceeded');
  } else {
    console.error('Transaction failed:', error.message);
  }
}
```

### Fee Estimation

Estimate transaction fees before execution:

```typescript
const estimatedFee = await liquidityBuilder.estimateAddLiquidityFees(params);
console.log(`Estimated fee: ${estimatedFee} lovelace`);
```

### Wallet Management

Connect different wallet types:

```typescript
// Connect wallet after initialization
await builder.connectWallet('vespr');

// Or specify during creation
const builder = await PuckSwapSwapBuilder.create(
  validatorCbor,
  "Preprod",
  "lace" // Wallet type
);
```

## 📋 Requirements

- **Lucid Evolution**: `@lucid-evolution/lucid`
- **Node.js**: >= 16.0.0
- **TypeScript**: >= 4.5.0
- **Cardano Wallet**: Eternl, Vespr, Lace, Nami, Typhon, or Flint

## 🔐 Security Features

- ✅ **CIP-68 Compliance**: Full metadata and datum standards
- ✅ **Min ADA Validation**: Automatic UTxO minimum ADA calculation
- ✅ **Deadline Protection**: Transaction validity time limits
- ✅ **Slippage Protection**: Maximum acceptable price impact
- ✅ **Replay Protection**: Nonce-based message uniqueness
- ✅ **Signature Validation**: Multi-signature bridge verification
- ✅ **Access Control**: Role-based operation permissions

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install @lucid-evolution/lucid
   ```

2. **Set Up Environment**:
   ```typescript
   // Configure network and API keys
   const config = {
     network: "Preprod",
     blockfrostApiKey: "your_api_key"
   };
   ```

3. **Initialize Builders**:
   ```typescript
   // Load validator scripts (CBOR hex strings)
   const validators = {
     pool: "590a4f590a4c...", // Pool validator CBOR
     liquidity: "590b2f590b2c...", // Liquidity validator CBOR
     // ... other validators
   };
   ```

4. **Execute Transactions**:
   ```typescript
   // Connect wallet and execute operations
   const result = await builder.executeOperation(params);
   ```

## 📚 Additional Resources

- [CIP-68 Standard](https://github.com/cardano-foundation/CIPs/tree/master/CIP-0068)
- [Lucid Evolution Documentation](https://github.com/spacebudz/lucid-evolution)
- [PuckSwap Smart Contracts](../contracts/)
- [Frontend Integration Examples](../components/)
