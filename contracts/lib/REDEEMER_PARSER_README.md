# PuckSwap Redeemer Parser

A comprehensive Aiken library for parsing and validating all redeemer types used in the PuckSwap DEX smart contracts.

## Overview

The redeemer parser provides type-safe parsing, validation, and serialization for all PuckSwap validator redeemers:

- **PoolRedeemer**: Main pool operations (swap, add/remove liquidity, create pool, emergency)
- **SwapRedeemer**: Enhanced CIP-68 swap operations with deadline validation
- **LPRedeemer**: LP token minting/burning operations
- **FactoryRedeemer**: Pool factory operations (create, config, pause/unpause)

## Features

- ✅ **Type-safe parsing** with comprehensive error handling
- ✅ **CIP-68 support** for enhanced datum structures
- ✅ **Validation utilities** for amounts, deadlines, and constraints
- ✅ **Serialization support** for off-chain integration
- ✅ **Detailed error reporting** for debugging
- ✅ **Round-trip compatibility** (parse → serialize → parse)

## Usage Examples

### Basic Pool Redeemer Parsing

```aiken
use puckswap/lib/redeemer_parser.{
  parse_pool_redeemer, serialize_pool_redeemer, 
  PoolRedeemer, Success, Error
}

// Parse a swap redeemer from CBOR data
let cbor_data = get_redeemer_from_transaction(ctx)
let parse_result = parse_pool_redeemer(cbor_data)

when parse_result is {
  Success(PoolRedeemer::Swap { input_amount, min_output, deadline, recipient }) -> {
    // Validate the swap operation
    validate_swap_operation(input_amount, min_output, deadline, recipient, ctx)
  }
  Success(PoolRedeemer::AddLiquidity { ada_amount, token_amount, min_lp_tokens, deadline }) -> {
    // Validate the liquidity addition
    validate_add_liquidity_operation(ada_amount, token_amount, min_lp_tokens, deadline, ctx)
  }
  Error(error) -> {
    // Handle parsing error
    let error_msg = error_to_string(error)
    trace error_msg
    False
  }
}
```

### Enhanced Swap Redeemer with CIP-68

```aiken
use puckswap/lib/redeemer_parser.{
  parse_swap_redeemer, SwapRedeemer, Success
}

// Parse enhanced swap redeemer
let parse_result = parse_swap_redeemer(cbor_data)

when parse_result is {
  Success(redeemer) -> {
    // Access CIP-68 enhanced fields
    let is_token_to_ada = redeemer.swap_in_token
    let amount_in = redeemer.amount_in
    let min_out = redeemer.min_out
    let deadline = redeemer.deadline_slot
    let user = redeemer.user_address
    
    // Validate with enhanced context
    validate_cip68_swap_operation(redeemer, ctx)
  }
  Error(error) -> False
}
```

### LP Token Operations

```aiken
use puckswap/lib/redeemer_parser.{
  parse_lp_redeemer, LPRedeemer, Success
}

let parse_result = parse_lp_redeemer(cbor_data)

when parse_result is {
  Success(LPRedeemer::MintLP { amount, pool_utxo_ref, recipient, metadata }) -> {
    // Validate LP token minting
    validate_lp_mint_operation(amount, pool_utxo_ref, recipient, metadata, ctx)
  }
  Success(LPRedeemer::BurnLP { amount, pool_utxo_ref, owner }) -> {
    // Validate LP token burning
    validate_lp_burn_operation(amount, pool_utxo_ref, owner, ctx)
  }
  Error(error) -> False
}
```

### Factory Operations

```aiken
use puckswap/lib/redeemer_parser.{
  parse_factory_redeemer, FactoryRedeemer, Success
}

let parse_result = parse_factory_redeemer(cbor_data)

when parse_result is {
  Success(FactoryRedeemer::CreatePool { token_policy, token_name, initial_ada, initial_token, fee_bps }) -> {
    // Validate pool creation
    validate_pool_creation(token_policy, token_name, initial_ada, initial_token, fee_bps, ctx)
  }
  Success(FactoryRedeemer::UpdateConfig { new_admin, new_creation_fee, new_protocol_fee }) -> {
    // Validate configuration update
    validate_config_update(new_admin, new_creation_fee, new_protocol_fee, ctx)
  }
  Error(error) -> False
}
```

## Validation Utilities

### Amount Validation

```aiken
use puckswap/lib/redeemer_parser.{
  validate_swap_amounts, validate_liquidity_amounts, Success
}

// Validate swap amounts
let swap_valid = validate_swap_amounts(1000000, 950000, 1000)
expect swap_valid is Success(True)

// Validate liquidity amounts
let liquidity_valid = validate_liquidity_amounts(10000000, 5000000, 7000000)
expect liquidity_valid is Success(True)
```

### Deadline Validation

```aiken
use puckswap/lib/redeemer_parser.{validate_deadline, Success}

// Validate deadline against transaction validity range
let deadline_valid = validate_deadline(1234567890, ctx)
expect deadline_valid is Success(True)
```

### Context Validation

```aiken
use puckswap/lib/redeemer_parser.{validate_redeemer_context, Success}

// Validate entire redeemer against script context
let context_valid = validate_redeemer_context(pool_redeemer, ctx)
expect context_valid is Success(True)
```

## Error Handling

The parser provides detailed error information for debugging:

```aiken
use puckswap/lib/redeemer_parser.{
  ParseError, error_to_string, is_success
}

when parse_result is {
  Error(ParseError::InvalidConstructor { expected, found }) -> {
    trace "Invalid constructor: expected " <> string.from_int(expected) <> ", found " <> string.from_int(found)
    False
  }
  Error(ParseError::InvalidFieldCount { expected, found }) -> {
    trace "Invalid field count: expected " <> string.from_int(expected) <> ", found " <> string.from_int(found)
    False
  }
  Error(ParseError::InvalidAmount { value, constraint }) -> {
    trace "Invalid amount: " <> string.from_int(value) <> " violates " <> constraint
    False
  }
  Error(error) -> {
    let error_msg = error_to_string(error)
    trace error_msg
    False
  }
}
```

## Serialization for Off-chain Use

```aiken
use puckswap/lib/redeemer_parser.{
  serialize_pool_redeemer, serialize_swap_redeemer
}

// Create redeemer
let swap_redeemer = PoolRedeemer::Swap {
  input_amount: 1000000,
  min_output: 950000,
  deadline: 1234567890,
  recipient: user_address
}

// Serialize for transaction building
let cbor_data = serialize_pool_redeemer(swap_redeemer)

// Use in Lucid Evolution transaction
let tx = lucid
  .newTx()
  .collectFrom([pool_utxo], cbor_data)
  .complete()
```

## Integration with Validators

### Pool Validator Integration

```aiken
use puckswap/lib/redeemer_parser.{parse_pool_redeemer, Success}

validator pool_validator(ctx: ScriptContext, datum: PoolDatum, redeemer_data: Data) -> Bool {
  when parse_pool_redeemer(redeemer_data) is {
    Success(redeemer) -> {
      // Use parsed redeemer for validation
      validate_pool_operation(redeemer, datum, ctx)
    }
    Error(_) -> False
  }
}
```

### Swap Validator Integration

```aiken
use puckswap/lib/redeemer_parser.{parse_swap_redeemer, Success}

validator swap_validator(ctx: ScriptContext, datum: PoolCIP68Datum, redeemer_data: Data) -> Bool {
  when parse_swap_redeemer(redeemer_data) is {
    Success(redeemer) -> {
      // Use parsed CIP-68 enhanced redeemer
      validate_cip68_swap_operation(redeemer, datum, ctx)
    }
    Error(_) -> False
  }
}
```

## Best Practices

1. **Always validate parsed redeemers** against business logic constraints
2. **Use type-safe pattern matching** on parsed redeemer variants
3. **Handle parsing errors gracefully** with meaningful error messages
4. **Validate deadlines** against transaction validity ranges
5. **Check amount constraints** (positive values, reasonable limits)
6. **Use serialization functions** for consistent off-chain integration

## Error Types Reference

- `InvalidConstructor`: Wrong redeemer variant constructor
- `InvalidFieldCount`: Incorrect number of fields in constructor
- `InvalidFieldType`: Field has wrong data type
- `MissingRequiredField`: Required field is missing
- `InvalidAddress`: Malformed address data
- `InvalidAmount`: Amount violates constraints
- `InvalidDeadline`: Deadline validation failed
- `InvalidPolicyId`: Malformed policy ID
- `InvalidAssetName`: Malformed asset name
- `CBORDecodingError`: General CBOR parsing error
