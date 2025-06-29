# PuckSwap Validator Redeemer Parsing - Complete Implementation

## Overview

This implementation provides a comprehensive, type-safe redeemer parsing system for all PuckSwap DEX validators written in Aiken. The system includes parsing, validation, serialization, and error handling for all redeemer types used across the PuckSwap ecosystem.

## 🎯 Key Features

- ✅ **Complete Coverage**: Handles all redeemer types across all PuckSwap validators
- ✅ **Type Safety**: Comprehensive parsing with detailed error types
- ✅ **CIP-68 Support**: Enhanced parsing for CIP-68 compliant structures
- ✅ **Validation**: Built-in validation for amounts, deadlines, and constraints
- ✅ **Round-trip Compatibility**: Parse → Serialize → Parse consistency
- ✅ **Off-chain Integration**: TypeScript builders for transaction construction
- ✅ **Error Handling**: Detailed error reporting for debugging
- ✅ **Testing**: Comprehensive test suite with examples

## 📁 File Structure

```
contracts/
├── lib/
│   ├── redeemer_parser.aiken          # Main parsing library
│   ├── cip68_types.aiken              # CIP-68 type definitions
│   ├── value_utils.aiken              # Value manipulation utilities
│   └── REDEEMER_PARSER_README.md      # Detailed documentation
├── tests/
│   └── redeemer_parser_test.aiken     # Comprehensive test suite
└── examples/
    └── redeemer_parser_integration.aiken # Integration examples

src/lib/
└── redeemer-builder.ts                # TypeScript off-chain builders
```

## 🔧 Supported Redeemer Types

### 1. Pool Validator Redeemers (`PoolRedeemer`)

- **Swap**: Token swaps with slippage protection and deadlines
- **AddLiquidity**: Balanced liquidity provision with minimum LP token guarantees
- **RemoveLiquidity**: Liquidity withdrawal with minimum output guarantees
- **CreatePool**: Initial pool creation with fee configuration
- **EmergencyPause/Unpause**: Governance emergency controls

### 2. Enhanced Swap Redeemers (`SwapRedeemer`)

- **CIP-68 Enhanced**: Advanced swap operations with enhanced metadata
- **Deadline Validation**: Slot-based deadline enforcement
- **User Address Tracking**: Enhanced user validation and tracking

### 3. LP Token Policy Redeemers (`LPRedeemer`)

- **MintLP**: LP token minting during liquidity addition
- **BurnLP**: LP token burning during liquidity removal
- **UpdateMetadata**: LP token metadata updates for pool state changes

### 4. Factory Validator Redeemers (`FactoryRedeemer`)

- **CreatePool**: Factory-managed pool creation
- **UpdateConfig**: Administrative configuration updates
- **PauseFactory/UnpauseFactory**: Factory-level pause controls

## 🚀 Quick Start

### Basic Usage in Validators

```aiken
use puckswap/lib/redeemer_parser.{parse_pool_redeemer, Success, Error}

validator my_pool_validator(ctx: ScriptContext, datum: PoolDatum, redeemer_data: Data) -> Bool {
  when parse_pool_redeemer(redeemer_data) is {
    Success(PoolRedeemer::Swap { input_amount, min_output, deadline, recipient }) -> {
      // Type-safe access to parsed redeemer fields
      validate_swap_operation(input_amount, min_output, deadline, recipient, ctx)
    }
    Success(PoolRedeemer::AddLiquidity { ada_amount, token_amount, min_lp_tokens, deadline }) -> {
      validate_add_liquidity_operation(ada_amount, token_amount, min_lp_tokens, deadline, ctx)
    }
    Error(error) -> {
      trace error_to_string(error)
      False
    }
  }
}
```

### Off-chain Transaction Building

```typescript
import { PuckSwapRedeemerBuilder } from './lib/redeemer-builder';

// Build a swap redeemer
const swapRedeemer = PuckSwapRedeemerBuilder.buildPoolSwapRedeemer({
  inputAmount: 1000000n,
  minOutput: 950000n,
  deadline: BigInt(Date.now() + 1200000), // 20 minutes
  recipient: userAddress
});

// Use in Lucid Evolution transaction
const tx = await lucid
  .newTx()
  .collectFrom([poolUtxo], swapRedeemer)
  .payToAddress(userAddress, outputAssets)
  .complete();
```

## 🔍 Validation Features

### Amount Validation
- Positive input amounts
- Reasonable minimum outputs
- Fee basis points within valid ranges (0-10000)

### Deadline Validation
- Slot-based deadline enforcement
- Transaction validity range checking
- MEV protection through deadline constraints

### Address Validation
- Proper credential structure validation
- Support for both verification key and script credentials
- Optional staking credential handling

### Context Validation
- Redeemer compatibility with script context
- Transaction structure validation
- Asset conservation checks

## 🧪 Testing

The implementation includes comprehensive tests covering:

- **Round-trip Testing**: Parse → Serialize → Parse consistency
- **Error Handling**: Invalid constructor, field count, and type errors
- **Validation Logic**: Amount, deadline, and constraint validation
- **Edge Cases**: Boundary conditions and error scenarios

Run tests with:
```bash
aiken test
```

## 🔧 Integration Examples

### Pool Validator Integration

```aiken
use puckswap/lib/redeemer_parser.{
  parse_pool_redeemer, validate_redeemer_context, Success
}

validator enhanced_pool_validator(ctx: ScriptContext, datum: PoolDatum, redeemer_data: Data) -> Bool {
  when parse_pool_redeemer(redeemer_data) is {
    Success(redeemer) -> {
      when validate_redeemer_context(redeemer, ctx) is {
        Success(True) -> handle_pool_operation(redeemer, datum, ctx)
        _ -> False
      }
    }
    Error(error) -> {
      trace error_to_string(error)
      False
    }
  }
}
```

### CIP-68 Enhanced Swap Validator

```aiken
use puckswap/lib/redeemer_parser.{parse_swap_redeemer, validate_swap_amounts}

validator cip68_swap_validator(ctx: ScriptContext, datum: PoolCIP68Datum, redeemer_data: Data) -> Bool {
  when parse_swap_redeemer(redeemer_data) is {
    Success(redeemer) -> {
      when validate_swap_amounts(redeemer.amount_in, redeemer.min_out, 1000) is {
        Success(True) -> validate_cip68_swap_operation(redeemer, datum, ctx)
        _ -> False
      }
    }
    Error(_) -> False
  }
}
```

## 📊 Error Handling

The parser provides detailed error information:

```aiken
when parse_result is {
  Error(InvalidConstructor { expected, found }) -> {
    trace "Wrong redeemer type: expected " <> string.from_int(expected)
    False
  }
  Error(InvalidAmount { value, constraint }) -> {
    trace "Invalid amount: " <> string.from_int(value) <> " violates " <> constraint
    False
  }
  Error(InvalidDeadline { deadline, current_slot }) -> {
    trace "Deadline expired: " <> string.from_int(deadline) <> " < " <> string.from_int(current_slot)
    False
  }
}
```

## 🔄 Serialization Support

For off-chain integration:

```aiken
// Serialize redeemer for transaction building
let redeemer = PoolRedeemer::Swap { ... }
let cbor_data = serialize_pool_redeemer(redeemer)

// Use in transaction construction
let tx = build_transaction_with_redeemer(cbor_data)
```

## 🎯 Benefits

1. **Type Safety**: Eliminates runtime errors from malformed redeemers
2. **Maintainability**: Centralized parsing logic reduces code duplication
3. **Debugging**: Detailed error messages simplify troubleshooting
4. **Consistency**: Ensures uniform redeemer handling across validators
5. **Extensibility**: Easy to add new redeemer types or validation rules
6. **Integration**: Seamless off-chain and on-chain compatibility

## 🚀 Future Enhancements

- **Performance Optimization**: CBOR parsing optimizations
- **Additional Validation**: Business logic specific validations
- **Metadata Support**: Enhanced CIP-25/68 metadata parsing
- **Batch Operations**: Support for batch redeemer parsing
- **Schema Validation**: JSON schema validation for off-chain builders

## 📚 Documentation

- **Main Documentation**: `contracts/lib/REDEEMER_PARSER_README.md`
- **Integration Examples**: `contracts/examples/redeemer_parser_integration.aiken`
- **Test Suite**: `contracts/tests/redeemer_parser_test.aiken`
- **TypeScript Builders**: `src/lib/redeemer-builder.ts`

This comprehensive redeemer parsing system provides a robust foundation for the PuckSwap DEX, ensuring type safety, validation, and maintainability across all validator operations.
