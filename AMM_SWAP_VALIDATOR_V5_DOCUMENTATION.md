# AMM Swap Validator V5 - Comprehensive Implementation

## Overview

The AMM Swap Validator V5 is a comprehensive implementation of an Automated Market Maker (AMM) swap validator for PuckSwap v5. It implements the constant product formula (x * y = k) with a 0.3% fee model (997/1000) and includes extensive security validations to prevent manipulation and dust attacks.

## Features

### ✅ Core AMM Functionality
- **Constant Product Formula**: Implements x * y = k with proper fee handling
- **0.3% Fee Model**: Uses 997/1000 ratio for fee calculation (Uniswap-style)
- **Bidirectional Swaps**: Supports both ADA → Token and Token → ADA swaps
- **CIP-68 Compliance**: Full CIP-68 datum structure support

### ✅ Security Features
- **Dust Attack Protection**: Minimum swap amounts and maximum percentage limits
- **Manipulation Protection**: Constant product validation and price impact limits
- **MEV Protection**: Deadline validation and transaction structure checks
- **Flash Loan Protection**: Transaction complexity limits and pattern detection
- **Slippage Protection**: Configurable maximum slippage and minimum output guarantees

### ✅ Validation Features
- **Minimum ADA Compliance**: Ensures all UTxOs meet Cardano protocol requirements
- **Reserve Validation**: Verifies pool reserves are updated correctly
- **Statistics Tracking**: Updates pool statistics with each swap
- **User Authorization**: Validates user signatures and permissions

## Architecture

### Core Types

#### AMMSwapRedeemer
```aiken
pub type AMMSwapRedeemer {
  swap_in_token: Bool,      // true = token→ADA, false = ADA→token
  amount_in: Int,           // Input amount (must be > 0)
  min_out: Int,             // Minimum output amount (slippage protection)
  deadline_slot: Int,       // Transaction deadline for MEV protection
  user_address: Address,    // User address for validation
  max_slippage_bps: Int,    // Maximum allowed slippage in basis points
}
```

#### SwapResult
```aiken
pub type SwapResult {
  output_amount: Int,
  fee_amount: Int,
  new_ada_reserve: Int,
  new_token_reserve: Int,
  price_impact_bps: Int,
  effective_price: Int,
}
```

### CIP-68 Datum Structure

The validator uses a comprehensive CIP-68 compliant datum structure:

```aiken
pub type PoolCIP68Datum {
  metadata: CIP68Metadata,
  version: CIP68Version,
  extra: CIP68Extra,
  pool_state: PoolState,
  pool_config: PoolConfig,
  pool_stats: PoolStats,
}
```

Where:
- `ada_reserve` and `token_reserve` are in `PoolState`
- `fee_basis_points` is `fee_bps` in `PoolConfig`
- `lp_token_policy` and `lp_token_name` are in `PoolConfig`

## AMM Calculation

### Constant Product Formula

The validator implements the constant product formula (x * y = k) with fee handling:

```aiken
// For ADA → Token swap:
let amount_in_with_fee = amount_in * 997  // 0.3% fee
let numerator = amount_in_with_fee * token_reserve
let denominator = (ada_reserve * 1000) + amount_in_with_fee
let output_amount = numerator / denominator

// For Token → ADA swap:
let amount_in_with_fee = amount_in * 997  // 0.3% fee
let numerator = amount_in_with_fee * ada_reserve
let denominator = (token_reserve * 1000) + amount_in_with_fee
let output_amount = numerator / denominator
```

### Fee Model

- **Trading Fee**: 0.3% (30 basis points)
- **Fee Calculation**: Uses 997/1000 ratio (Uniswap-style)
- **Fee Distribution**: Fees remain in the pool, increasing the constant product

## Security Validations

### 1. Dust Attack Protection

```aiken
// Minimum swap amounts
MIN_ADA_SWAP_AMOUNT: 1_000_000     // 1 ADA minimum
MIN_TOKEN_SWAP_AMOUNT: 1_000_000   // 1 token minimum

// Maximum swap percentage
MAX_SWAP_PERCENTAGE: 5000          // 50% of pool reserves
```

### 2. Manipulation Protection

- **Constant Product Validation**: Ensures k increases due to fees
- **Price Impact Limits**: Maximum 10% price impact per swap
- **Reserve Validation**: Verifies reserves remain positive
- **Single Transaction Constraint**: Prevents complex multi-step attacks

### 3. MEV Protection

- **Deadline Validation**: Transactions must complete before deadline
- **Validity Range Limits**: Maximum 2 hours (7200 slots)
- **User Authorization**: Requires user signature
- **Transaction Structure**: Limits input/output complexity

### 4. Flash Loan Protection

- **Transaction Complexity**: Maximum 10 inputs/outputs
- **Minting Pattern Detection**: Limits simultaneous minting policies
- **Circular Transaction Detection**: Prevents suspicious patterns
- **Fee Validation**: Reasonable transaction fee limits

## Usage Examples

### Basic ADA → Token Swap

```aiken
let swap_redeemer = AMMSwapRedeemer {
  swap_in_token: False,           // ADA → Token
  amount_in: 100_000_000,         // 100 ADA
  min_out: 180_000_000,           // Minimum 180 tokens
  deadline_slot: current_slot + 300, // 5 minutes
  user_address: user_addr,
  max_slippage_bps: 500,          // 5% max slippage
}
```

### Basic Token → ADA Swap

```aiken
let swap_redeemer = AMMSwapRedeemer {
  swap_in_token: True,            // Token → ADA
  amount_in: 200_000_000,         // 200 tokens
  min_out: 45_000_000,            // Minimum 45 ADA
  deadline_slot: current_slot + 300, // 5 minutes
  user_address: user_addr,
  max_slippage_bps: 300,          // 3% max slippage
}
```

## Testing

The implementation includes comprehensive tests covering:

### Core Functionality Tests
- ✅ Constant product formula accuracy
- ✅ Fee calculation precision
- ✅ Bidirectional swap validation
- ✅ Reserve update verification

### Security Tests
- ✅ Dust attack prevention
- ✅ Price impact calculation
- ✅ Manipulation attempt detection
- ✅ Flash loan attack simulation

### Edge Case Tests
- ✅ Minimum liquidity scenarios
- ✅ Large number precision
- ✅ Boundary conditions
- ✅ Consecutive swap invariants

### Stress Tests
- ✅ Multiple consecutive swaps
- ✅ Alternating swap directions
- ✅ Maximum realistic swap sizes
- ✅ Sandwich attack simulation

## Integration

### Files Structure

```
contracts/
├── validators/
│   └── amm_swap_validator_v5.aiken     # Main validator
├── lib/
│   ├── amm_security_utils.aiken        # Security utilities
│   ├── cip68_types.aiken               # CIP-68 types
│   ├── min_ada_utils.aiken             # Min ADA utilities
│   └── value_utils.aiken               # Value utilities
└── tests/
    └── amm_swap_validator_v5_test.aiken # Comprehensive tests
```

### Dependencies

The validator depends on:
- `aiken/transaction` - Core transaction types
- `aiken/math` - Mathematical operations
- `aiken/list` - List operations
- `puckswap/lib/*` - PuckSwap utility libraries

## Security Considerations

### Validated Attacks

1. **Sandwich Attacks**: Price impact limits and MEV protection
2. **Flash Loan Attacks**: Transaction complexity limits
3. **Dust Attacks**: Minimum amount requirements
4. **Price Manipulation**: Constant product validation
5. **Front-running**: Deadline and slippage protection

### Best Practices

1. **Always validate deadlines** to prevent MEV attacks
2. **Set appropriate slippage limits** based on market conditions
3. **Monitor price impact** for large swaps
4. **Use minimum ADA buffers** for UTxO compliance
5. **Implement proper error handling** in off-chain code

## Performance

### Gas Efficiency
- Optimized mathematical operations
- Minimal redundant validations
- Efficient data structure access

### Scalability
- Supports large pool reserves
- Handles high-precision calculations
- Maintains performance under load

## Compliance

### Standards Compliance
- ✅ **CIP-68**: Full metadata standard compliance
- ✅ **CIP-25**: NFT metadata standard
- ✅ **CIP-30**: Wallet connector standard
- ✅ **CIP-67**: Asset name standard
- ✅ **Cardano Protocol**: Min ADA requirements

### Audit Considerations
- Comprehensive test coverage
- Security validation documentation
- Mathematical formula verification
- Edge case handling validation
