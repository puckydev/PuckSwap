# PuckSwap v5 Liquid Staking Validator Documentation

## Overview

The Liquid Staking Validator is a comprehensive smart contract that enables users to stake ADA and receive liquid stADA tokens in return. This allows users to earn staking rewards while maintaining liquidity through the tradeable stADA tokens.

## Key Features

### 🏦 **Core Functionality**
- **Deposit Operations**: Stake ADA and receive liquid stADA tokens
- **Withdrawal System**: Request withdrawals with configurable delay periods
- **Reward Syncing**: Oracle-based reward distribution from staking pools
- **Exchange Rate Management**: Dynamic ADA/stADA ratio based on accumulated rewards

### 🔒 **Security Features**
- **CIP-68 Compliance**: Full metadata structure validation
- **Fee Structure**: Configurable deposit, withdrawal, and management fees
- **Emergency Controls**: Pause/unpause functionality with admin overrides
- **Oracle Validation**: Cryptographic signature verification for reward data

### 🎯 **Advanced Features**
- **Governance Integration**: DAO-controlled parameter updates
- **Multi-signature Support**: Emergency admin and governance separation
- **Withdrawal Delays**: Configurable delay periods for security
- **Statistics Tracking**: Comprehensive analytics and reporting

## Data Structures

### StakingDatum (CIP-68 Compliant)

```aiken
type LiquidStakingDatum {
  // CIP-68 metadata structure
  metadata: CIP68Metadata,
  version: Int,
  extra: Data,
  
  // Core components
  staking_state: StakingState,
  staking_config: StakingConfig,
  staking_stats: StakingStats,
}
```

### StakingState
- `total_staked`: Total ADA staked in the system
- `total_pADA_minted`: Total pADA tokens in circulation
- `stake_pool_id`: Cardano stake pool identifier
- `last_rewards_sync_slot`: Last oracle reward sync timestamp
- `accumulated_rewards`: Total rewards accumulated
- `reward_rate`: Current APY in basis points
- `pADA_policy`: Policy ID for pADA tokens
- `pADA_name`: Asset name for pADA tokens

### StakingConfig
- `oracle_address`: Oracle service address
- `governance_address`: DAO governance address
- `emergency_admin`: Emergency operations admin
- `min_stake_amount`: Minimum deposit amount (1 ADA)
- `max_stake_amount`: Maximum deposit amount (1M ADA)
- `withdrawal_delay_slots`: Delay before withdrawal completion
- `deposit_fee_bps`: Deposit fee (max 10%)
- `withdrawal_fee_bps`: Withdrawal fee (max 10%)
- `management_fee_bps`: Management fee (max 5%)
- `paused`: Emergency pause state

## Operations

### 1. Deposit Staking

**Redeemer**: `DepositStaking { amount, min_pADA_out, deadline }`

**Process**:
1. Validates deposit amount within limits
2. Calculates stADA to mint based on current exchange rate
3. Applies deposit fee (0.5% default)
4. Mints stADA tokens to user
5. Updates total staked and statistics

**Exchange Rate**: `stADA_to_mint = (amount * total_stADA_minted) / (total_staked + accumulated_rewards)`

### 2. Request Withdrawal

**Redeemer**: `RequestWithdrawal { stADA_amount, min_ada_out }`

**Process**:
1. Validates user has sufficient stADA balance
2. Calculates ADA to return based on current exchange rate
3. Creates withdrawal request with delay period
4. Records request for later completion

### 3. Complete Withdrawal

**Redeemer**: `CompleteWithdrawal { withdrawal_id }`

**Process**:
1. Validates withdrawal delay has passed
2. Burns stADA tokens from user
3. Returns ADA minus withdrawal fee
4. Updates total staked and statistics

### 4. Reward Synchronization

**Redeemer**: `SyncRewards { reward_data }`

**Process**:
1. Validates oracle authorization and signature
2. Calculates management fee (2% default)
3. Distributes net rewards to stakers
4. Updates exchange rate and statistics

**Oracle Data**:
```aiken
type RewardSyncData {
  epoch: Int,
  total_rewards: Int,
  pool_stake: Int,
  pool_performance: Int,
  timestamp_slot: Int,
  signature: ByteArray,
}
```

## Security Validations

### 1. **Authorization Checks**
- Oracle operations require oracle signature
- Governance operations require governance signature
- Emergency operations require emergency admin signature

### 2. **Parameter Validation**
- Deposit amounts within configured limits
- Fee parameters within maximum bounds
- Deadline validation for time-sensitive operations

### 3. **State Consistency**
- Total staked matches ADA balance changes
- stADA minting/burning matches state updates
- Statistics updates are consistent

### 4. **CIP-68 Compliance**
- Metadata structure validation
- Version compatibility checks
- Proper datum attachment

## Fee Structure

| Operation | Default Fee | Maximum Fee |
|-----------|-------------|-------------|
| Deposit | 0.5% | 10% |
| Withdrawal | 0.5% | 10% |
| Management | 2% | 5% |

## Configuration Limits

| Parameter | Minimum | Maximum |
|-----------|---------|---------|
| Stake Amount | 1 ADA | 1M ADA |
| Withdrawal Delay | 0 slots | 30 days |
| Reward Sync Interval | 1 day | 30 days |

## Emergency Operations

### Emergency Pause
- Can be triggered by emergency admin
- Stops all user operations except withdrawals
- Requires governance approval to unpause

### Emergency Withdraw
- Only available when system is paused
- Requires governance authorization
- Used for critical security situations

## Oracle Integration

### Reward Data Validation
1. **Signature Verification**: Oracle must sign reward data
2. **Freshness Check**: Data must be recent (within 100 slots)
3. **Consistency Validation**: Rewards must be reasonable

### Oracle Update Process
1. Governance proposes new oracle
2. Validation of oracle credentials
3. Atomic update of oracle address and key

## Testing

The validator includes comprehensive tests covering:
- Exchange rate calculations
- Fee calculations
- Boundary conditions
- Security validations
- CIP-68 compliance
- Oracle integration

Run tests with:
```bash
aiken check contracts/tests/liquid_staking_validator_test.aiken
```

## Integration

### Off-chain Integration
- Use `PuckSwapLiquidStaking` class from `src/lucid/staking.ts`
- Handles transaction building and parameter validation
- Provides user balance tracking and analytics

### Frontend Integration
- Staking interface at `/staking` route
- Real-time APY calculations
- Withdrawal request tracking
- Portfolio analytics

## Security Considerations

### Validated Attack Scenarios
1. **Oracle Manipulation**: Signature validation prevents fake reward data
2. **Exchange Rate Attacks**: Accumulated rewards included in calculations
3. **Withdrawal Delays**: Configurable delays prevent flash loan attacks
4. **Fee Manipulation**: Maximum fee limits prevent excessive fees
5. **Emergency Abuse**: Governance controls prevent admin overreach

### Best Practices
- Always validate oracle signatures
- Use withdrawal delays for large amounts
- Monitor exchange rate changes
- Implement circuit breakers for unusual activity
- Regular security audits of oracle data

## Deployment

1. Deploy stADA minting policy
2. Deploy liquid staking validator
3. Initialize with proper configuration
4. Set up oracle service
5. Configure governance parameters

## Monitoring

Key metrics to monitor:
- Total value locked (TVL)
- Exchange rate stability
- Oracle uptime and accuracy
- Fee collection rates
- User adoption metrics
