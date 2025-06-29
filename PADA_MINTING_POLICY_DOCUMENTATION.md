# PuckSwap v5 pADA Minting Policy Documentation

## Overview

The pADA Minting Policy is a highly secure smart contract that controls the minting and burning of pADA (liquid staking) tokens. It implements strict security measures to ensure that pADA tokens can **ONLY** be minted during valid staking deposit transactions and **ONLY** be burned during valid withdrawal transactions.

## 🔒 **Core Security Principle**

**CRITICAL**: pADA tokens can ONLY be minted or burned when the liquid staking validator is being executed in the same transaction. This prevents all unauthorized minting attempts.

## Key Features

### 🛡️ **Security Features**
- **Validator Execution Validation**: Ensures staking validator is active in transaction
- **User Authorization**: Requires user signature for all operations
- **Amount Bounds**: Enforces minimum (1 ADA) and maximum (1M ADA) limits
- **Single Token Operations**: Only allows one pADA token per transaction
- **Proper Token Naming**: Validates pADA token name conventions

### ⚡ **Operations Supported**
1. **MintForDeposit**: Mint pADA tokens during staking deposits
2. **BurnForWithdrawal**: Burn pADA tokens during withdrawals

## Data Structures

### PADAMintingRedeemer
```aiken
type PADAMintingRedeemer {
  MintForDeposit {
    staking_validator_hash: ByteArray,
    deposit_amount: Int,
  }
  
  BurnForWithdrawal {
    staking_validator_hash: ByteArray,
    withdrawal_amount: Int,
  }
}
```

### StakingDatum
```aiken
type StakingDatum {
  total_staked: Int,
  total_pADA_minted: Int,
  stake_pool_id: ByteArray,
  last_rewards_sync_slot: Int,
}
```

## Core Validation Functions

### 🔐 **validate_mint_for_deposit**
The **ONLY** authorized way to mint pADA tokens.

**Security Checks:**
1. ✅ Validates staking validator execution in same transaction
2. ✅ Finds and validates staking UTxO input/output pair
3. ✅ Parses and validates StakingDatum state transition
4. ✅ Calculates expected pADA amount based on current ratio
5. ✅ Validates deposit amount bounds (1 ADA - 1M ADA)
6. ✅ Ensures exactly one pADA token is minted
7. ✅ Validates pADA token name convention
8. ✅ Validates ADA balance increase in staking contract
9. ✅ Ensures minimum ADA requirements are met

### 🔥 **validate_burn_for_withdrawal**
The **ONLY** authorized way to burn pADA tokens.

**Security Checks:**
1. ✅ Validates staking validator execution in same transaction
2. ✅ Finds and validates staking UTxO input/output pair
3. ✅ Parses and validates StakingDatum state transition
4. ✅ Calculates expected ADA release based on current ratio
5. ✅ Validates withdrawal amount bounds (up to 1M pADA)
6. ✅ Ensures exactly one pADA token is burned (negative amount)
7. ✅ Validates pADA token name convention
8. ✅ Validates ADA balance decrease in staking contract
9. ✅ Ensures minimum ADA requirements are met

## Exchange Rate Calculations

### 📈 **Minting Calculation**
```aiken
fn calculate_pADA_to_mint(ada_amount: Int, datum: StakingDatum) -> Int {
  if datum.total_pADA_minted == 0 {
    // Initial deposit - 1:1 ratio
    ada_amount
  } else {
    // Proportional minting based on current ratio
    // pADA_to_mint = (ada_amount * total_pADA_minted) / total_staked
    (ada_amount * datum.total_pADA_minted) / datum.total_staked
  }
}
```

### 📉 **Burning Calculation**
```aiken
fn calculate_ada_to_release(pADA_amount: Int, datum: StakingDatum) -> Int {
  if datum.total_pADA_minted == 0 {
    error.void("no_pADA_minted")
  } else {
    // Proportional release based on current ratio
    // ada_to_release = (pADA_amount * total_staked) / total_pADA_minted
    (pADA_amount * datum.total_staked) / datum.total_pADA_minted
  }
}
```

## Security Validations

### 🔍 **Critical Security Checks**

#### **1. Staking Validator Execution**
```aiken
fn validate_staking_validator_execution(
  staking_validator_hash: ByteArray,
  ctx: ScriptContext
) -> Bool
```
- Validates 28-byte script hash format
- Ensures staking validator is being executed in transaction
- **CRITICAL**: This is the primary security mechanism

#### **2. Token Name Validation**
```aiken
fn validate_pADA_token_name(token_name: AssetName) -> Bool
```
- Validates "pADA" token name or CIP-68 format
- Ensures 4-32 byte length range
- Prevents malformed token names

#### **3. State Transition Validation**
- **Deposit**: `total_staked` increases, `total_pADA_minted` increases
- **Withdrawal**: `total_staked` decreases, `total_pADA_minted` decreases
- **Invariant**: `stake_pool_id` remains unchanged
- **Oracle Updates**: `last_rewards_sync_slot` can increase

## Amount Bounds & Limits

### 💰 **Deposit Limits**
- **Minimum**: 1 ADA (1,000,000 lovelace)
- **Maximum**: 1M ADA (1,000,000,000,000 lovelace)
- **Validation**: Prevents dust attacks and excessive deposits

### 🔥 **Withdrawal Limits**
- **Maximum**: 1M pADA (1,000,000,000,000 units)
- **Validation**: Prevents excessive burns and maintains liquidity

### 🏦 **UTxO Requirements**
- **Minimum ADA**: 2 ADA per UTxO (with datum)
- **Validation**: Ensures Cardano protocol compliance

## Error Handling

### ❌ **Common Error Conditions**
1. **`invalid_script_purpose`**: Policy used outside minting context
2. **`no_pADA_minted`**: Attempting to burn when no pADA exists
3. **Validation Failures**: Any security check failure causes transaction rejection

### 🛡️ **Attack Prevention**
- **Unauthorized Minting**: Only possible with staking validator execution
- **Double Spending**: Prevented by UTxO model and state validation
- **Amount Manipulation**: Strict bounds checking and ratio calculations
- **Token Confusion**: Precise token name and policy validation

## Testing & Validation

### 🧪 **Comprehensive Test Suite**
Located in: `contracts/tests/pADA_minting_policy_test.aiken`

**Test Coverage:**
- ✅ Hash format validation (28 bytes for validator, policy)
- ✅ Token name format validation (4-32 bytes)
- ✅ Amount bounds testing (min/max deposits and withdrawals)
- ✅ Exchange rate calculations (1:1 initial, proportional thereafter)
- ✅ Token filtering logic (policy-specific filtering)
- ✅ Single token operations (exactly one pADA per transaction)
- ✅ Burn amount validation (negative amounts for burning)
- ✅ Fee calculation validation (reasonable fee structures)
- ✅ Security constraint validation (all critical identifiers)
- ✅ Operation boundary testing (min/max operational limits)
- ✅ Error condition handling (zero amounts, invalid hashes)
- ✅ Precision handling (lovelace to ADA conversions)

### 🔒 **Security Guarantees**

✅ **Minting Authorization**: Only staking validator can authorize minting
✅ **User Consent**: Only signed users can mint/burn their tokens
✅ **Amount Integrity**: All amounts within reasonable bounds
✅ **Token Uniqueness**: Only one pADA token per operation
✅ **Withdrawal Legitimacy**: Burns only with valid withdrawals
✅ **Balance Conservation**: Cannot burn more than owned

## Integration

### Off-chain Integration

```typescript
// Example usage in Lucid Evolution
const mintingRedeemer: PADAMintingRedeemer = {
  MintForDeposit: {
    staking_validator_hash: stakingValidatorHash,
    user_address: userAddress,
    ada_amount: 100_000_000n, // 100 ADA
    pADA_amount: 95_000_000n, // 95 pADA (after exchange rate)
  }
};

const tx = await lucid
  .newTx()
  .collectFrom([stakingUtxo], stakingRedeemer)
  .payToContract(stakingAddress, stakingDatum, stakingAssets)
  .mintAssets({ [pADAUnit]: pADAAmount }, Data.to(mintingRedeemer))
  .attachMintingPolicy(pADAMintingPolicy)
  .attachSpendingValidator(stakingValidator)
  .complete();
```

### Contract Deployment

```bash
# Build the contract
aiken build

# Generate policy ID
aiken policy pADA_minting_policy

# Deploy to testnet
aiken address pADA_minting_policy --network preview
```

## File Structure

```
contracts/
├── policies/
│   └── pADA_minting_policy.aiken          # Main minting policy
├── validators/
│   └── liquid_staking_validator.aiken     # Staking validator (dependency)
└── tests/
    └── pADA_minting_policy_test.aiken     # Comprehensive tests

docs/
└── PADA_MINTING_POLICY_DOCUMENTATION.md  # This documentation
```

## Dependencies

### Required Aiken Modules
- `aiken/transaction` - Transaction context and types
- `aiken/transaction/credential` - Address and credential handling
- `aiken/transaction/value` - Value and asset manipulation
- `cardano/assets` - Asset quantity operations
- `aiken/option` - Option type handling
- `aiken/error` - Error handling utilities
- `aiken/list` - List operations
- `aiken/bytearray` - Byte array utilities

### Critical Dependencies
- **Staking Validator**: Must be secure and properly implemented
- **StakingDatum Structure**: Must match exactly between contracts
- **CIP-68 Compliance**: Token naming and metadata standards

## Security Considerations

### 🚨 **Critical Security Notes**

1. **Validator Coupling**: pADA minting is tightly coupled to staking validator execution
2. **State Consistency**: StakingDatum must be consistent across all operations
3. **Exchange Rate Integrity**: Calculations must prevent manipulation
4. **Minimum ADA**: All UTxOs must meet Cardano minimum requirements
5. **Token Uniqueness**: Only one pADA token type per policy

### 🔐 **Best Practices**

- Always validate staking validator execution before minting/burning
- Implement comprehensive bounds checking for all amounts
- Use precise arithmetic to prevent rounding errors
- Validate all token names and policy IDs
- Ensure proper error handling for all edge cases
- Test extensively with various exchange rates and amounts

## Conclusion

The pADA Minting Policy provides a secure, auditable mechanism for liquid staking token management in the PuckSwap v5 ecosystem. Its tight integration with the staking validator ensures that pADA tokens can only be created or destroyed through legitimate staking operations, maintaining the integrity of the liquid staking system.

For implementation details and integration examples, refer to the source code and test suite in the PuckSwap v5 repository.
