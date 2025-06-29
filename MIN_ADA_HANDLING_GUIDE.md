# PuckSwap Min ADA Handling - Comprehensive Guide

## Overview

This guide covers the comprehensive min ADA handling system implemented for PuckSwap DEX, ensuring all UTxO updates meet Cardano's minimum ADA requirements while maintaining optimal user experience and preventing transaction failures.

## 🎯 Key Features

- ✅ **Dynamic Min ADA Calculation** - Based on UTxO contents, datum size, and asset count
- ✅ **UTxO Type-Specific Validation** - Different requirements for pools, factory, LP tokens, and user outputs
- ✅ **Automatic Transaction Building** - Off-chain builders that ensure min ADA compliance
- ✅ **Comprehensive Validation** - On-chain validators with enhanced min ADA checks
- ✅ **Error Prevention** - Proactive validation to prevent transaction failures
- ✅ **Safety Buffers** - Configurable buffers to handle edge cases

## 📊 Min ADA Constants

### Base Requirements
```aiken
// Base minimum ADA per UTxO (Cardano protocol parameter)
base_min_ada: Int = 1_000_000

// Enhanced minimum ADA for script UTxOs
script_min_ada: Int = 2_000_000

// Minimum ADA for pool UTxOs (includes NFT, tokens, complex datum)
pool_min_ada: Int = 3_000_000

// Minimum ADA for factory UTxOs
factory_min_ada: Int = 2_500_000

// Minimum ADA for LP token UTxOs
lp_token_min_ada: Int = 2_000_000
```

### Cost Factors
```aiken
// Additional ADA per native asset in UTxO
ada_per_asset: Int = 344_798

// Additional ADA per byte of datum
ada_per_datum_byte: Int = 4_310

// Maximum reasonable UTxO size (prevents bloat attacks)
max_utxo_size_bytes: Int = 16_384
```

## 🔧 Min ADA Calculation

### Basic Formula
```
Min ADA = Base Amount + Asset Cost + Datum Cost + Type-Specific Buffer
```

Where:
- **Base Amount**: Depends on address type (user vs script)
- **Asset Cost**: `Number of Assets × ADA_PER_ASSET`
- **Datum Cost**: `Datum Size in Bytes × ADA_PER_DATUM_BYTE`
- **Buffer**: Safety margin based on UTxO type

### UTxO Type-Specific Calculations

#### Pool UTxOs
```aiken
pool_min_ada = pool_min_ada + nft_cost + token_cost + datum_cost + 10% buffer
```

#### Factory UTxOs
```aiken
factory_min_ada = factory_min_ada + datum_cost + 5% buffer
```

#### LP Token UTxOs
```aiken
lp_token_min_ada = lp_token_min_ada + metadata_cost
```

#### User UTxOs
```aiken
user_min_ada = base_min_ada + asset_cost + datum_cost
```

## 🛡️ Validation Layers

### 1. On-Chain Validation (Aiken)

#### Enhanced Pool Validator
```aiken
use puckswap/lib/min_ada_utils.{
  validate_pool_operation_min_ada, validate_swap_min_ada_preservation,
  calculate_pool_min_ada
}

validator enhanced_pool_validator(ctx: ScriptContext, datum: PoolDatum, redeemer: Data) -> Bool {
  // Parse redeemer and find UTxOs
  expect Some(pool_input) = find_input(ctx.transaction.inputs, output_ref)
  expect Some(pool_output) = find_output(ctx.transaction.outputs, pool_input.output.address)
  
  // Validate min ADA requirements
  let datum_size = estimate_datum_size(pool_output.datum)
  expect validate_pool_operation_min_ada(
    pool_input.output, pool_output, datum_size, SwapOperation
  )
  
  // Operation-specific validation
  handle_pool_operation(redeemer, pool_input, pool_output, datum, ctx)
}
```

#### Swap Operation Validation
```aiken
fn validate_enhanced_swap_operation(...) -> Bool {
  // Validate swap doesn't drain pool below minimum ADA
  expect validate_swap_min_ada_preservation(
    datum.ada_reserve, new_ada_reserve, pool_output.value, datum_size
  )
  
  // Validate user outputs meet min ADA requirements
  expect validate_enhanced_user_swap_output(expected_output, recipient, ctx)
  
  True
}
```

### 2. Off-Chain Validation (TypeScript)

#### Min ADA Manager
```typescript
import { MinAdaManager } from './lib/min-ada-manager';

// Calculate min ADA for pool UTxO
const poolMinAda = MinAdaManager.calculatePoolMinAda(
  poolAssets,
  datumSizeBytes,
  true, // has NFT
  1     // token count
);

// Validate UTxO meets requirements
const validation = MinAdaManager.validateUtxoMinAda(
  utxo,
  datumSize,
  { type: "pool", hasNft: true, tokenCount: 1 }
);

if (!validation.isValid) {
  throw new Error(`Min ADA validation failed: ${validation.error}`);
}
```

#### Enhanced Transaction Builder
```typescript
import { EnhancedTransactionBuilder } from './lib/enhanced-transaction-builder';

const builder = new EnhancedTransactionBuilder(lucid);

// Build swap with automatic min ADA handling
const tx = await builder.buildSwapTransaction({
  poolUtxo,
  inputAmount: 1000000n,
  minOutput: 950000n,
  isAdaToToken: true,
  userAddress
});
```

## 🔄 Operation-Specific Handling

### Swap Operations

#### ADA → Token Swaps
```typescript
// Ensure user receives tokens with sufficient min ADA
const userOutputAssets = {
  [`${tokenPolicy}.${tokenName}`]: outputAmount,
  lovelace: MinAdaManager.calculateUserOutputMinAda(
    { [`${tokenPolicy}.${tokenName}`]: outputAmount },
    false
  ).requiredMinAda
};
```

#### Token → ADA Swaps
```typescript
// Ensure user receives sufficient ADA (already meets min ADA)
const userOutputAssets = {
  lovelace: outputAmount // ADA output naturally meets min ADA
};
```

#### Pool State Updates
```aiken
// Validate pool maintains min ADA after swap
let new_ada_reserve = ada_reserve + input_after_fee
let min_pool_ada = calculate_pool_min_ada(pool_output.value, datum_size, True, 1)
expect new_ada_reserve >= min_pool_ada
```

### Liquidity Operations

#### Add Liquidity
```aiken
// Validate increased ADA maintains min ADA requirements
expect validate_pool_operation_min_ada(
  pool_input.output, pool_output, datum_size, AddLiquidityOperation
)

// Ensure new reserves meet requirements
let new_ada_reserve = ada_reserve + ada_amount
let min_pool_ada = calculate_pool_min_ada(pool_output.value, datum_size, True, 1)
expect new_ada_reserve >= min_pool_ada
```

#### Remove Liquidity
```aiken
// Validate remaining ADA is sufficient
expect validate_liquidity_removal_min_ada(
  ada_reserve, ada_reserve - ada_to_withdraw,
  ada_to_withdraw, pool_output.value, datum_size
)

// Ensure user withdrawal meets min ADA
let user_withdrawal_assets = create_user_withdrawal_assets(ada_to_withdraw, token_to_withdraw)
let min_user_ada = calculate_user_output_min_ada(user_withdrawal_assets, False)
expect ada_to_withdraw >= min_user_ada
```

### Pool Creation

#### Initial Funding Validation
```aiken
// Validate initial pool funding meets enhanced requirements
let required_min_ada = calculate_pool_min_ada(pool_output.value, datum_size, True, 1)
expect initial_ada >= required_min_ada

// Add safety buffer for new pools
let min_with_buffer = required_min_ada + (required_min_ada / 10) // 10% buffer
expect initial_ada >= min_with_buffer
```

## 🚨 Error Handling

### Common Min ADA Errors

#### Insufficient Pool ADA
```
Error: Pool min ADA validation failed: Pool has 2500000 ADA but requires 3000000 ADA (deficit: 500000)
```

**Solution**: Increase pool ADA reserves or reduce datum/asset complexity

#### User Output Below Minimum
```
Error: User output has 800000 ADA but requires 1344798 ADA for token UTxO
```

**Solution**: Add sufficient ADA to user output or combine with existing UTxO

#### Liquidity Removal Violation
```
Error: Remove liquidity would leave insufficient ADA: 1500000 < 3000000
```

**Solution**: Reduce withdrawal amount or add ADA to maintain minimum

### Error Prevention Strategies

#### 1. Proactive Validation
```typescript
// Validate before building transaction
const validation = MinAdaManager.validatePoolOperationMinAda(
  poolInput, poolOutput, datumSize, "removeLiquidity"
);

if (!validation.isValid) {
  // Adjust parameters or show user error
  throw new Error(`Operation would violate min ADA: ${validation.error}`);
}
```

#### 2. Automatic Adjustment
```typescript
// Automatically ensure sufficient min ADA
const adjustedAssets = MinAdaManager.ensureMinAdaWithBuffer(
  baseAssets,
  requiredMinAda,
  10 // 10% buffer
);
```

#### 3. User Feedback
```typescript
// Generate detailed report for users
const report = MinAdaManager.generateMinAdaReport(utxo, datumSize, utxoType);

if (!report.calculation.isValid) {
  console.log(`Min ADA Requirements:
    Required: ${report.calculation.requiredMinAda} ADA
    Current: ${report.calculation.actualAda} ADA
    Deficit: ${report.calculation.deficit} ADA
    
    Recommendations:
    ${report.recommendations.join('\n    ')}
  `);
}
```

## 📈 Best Practices

### 1. Always Validate Before Submission
```typescript
// Validate all outputs before submitting transaction
const allOutputsValid = outputs.every(output => {
  const validation = MinAdaManager.validateUtxoMinAda(
    output, estimatedDatumSize, utxoType
  );
  return validation.isValid;
});
```

### 2. Use Safety Buffers
```typescript
// Add 10% buffer for pools, 5% for other UTxOs
const minAdaWithBuffer = MinAdaManager.calculateSafetyBuffer(
  requiredMinAda, 
  utxoType === "pool" ? 10 : 5
);
```

### 3. Optimize UTxO Structure
- Minimize datum size where possible
- Combine assets efficiently
- Use appropriate UTxO types

### 4. Monitor Min ADA Requirements
```typescript
// Regular monitoring of min ADA compliance
const poolReport = MinAdaManager.generateMinAdaReport(
  poolUtxo, datumSize, { type: "pool", hasNft: true, tokenCount: 1 }
);

if (poolReport.calculation.deficit > 0) {
  // Alert or automatic adjustment
  console.warn(`Pool min ADA deficit: ${poolReport.calculation.deficit}`);
}
```

## 🔧 Integration Examples

### Complete Swap Transaction
```typescript
async function executeSwap(params: SwapParams) {
  // 1. Validate input parameters
  const poolState = await parsePoolState(params.poolUtxo);
  
  // 2. Calculate swap output
  const { outputAmount, newAdaReserve, newTokenReserve } = calculateSwapOutput(
    poolState, params.inputAmount, params.isAdaToToken
  );
  
  // 3. Create assets with min ADA validation
  const poolAssets = await createPoolAssetsWithMinAda(
    newAdaReserve, newTokenReserve, poolState.tokenPolicy, poolState.tokenName
  );
  
  const userAssets = await createUserOutputAssetsWithMinAda(
    outputAmount, params.isAdaToToken, poolState.tokenPolicy, poolState.tokenName
  );
  
  // 4. Validate min ADA requirements
  const poolValidation = MinAdaManager.validatePoolOperationMinAda(
    params.poolUtxo,
    { ...params.poolUtxo, assets: poolAssets },
    estimatedDatumSize,
    "swap"
  );
  
  if (!poolValidation.isValid) {
    throw new Error(`Min ADA validation failed: ${poolValidation.error}`);
  }
  
  // 5. Build and submit transaction
  const tx = await lucid.newTx()
    .collectFrom([params.poolUtxo], swapRedeemer)
    .payToContract(poolAddress, { inline: newPoolDatum }, poolAssets)
    .payToAddress(params.userAddress, userAssets)
    .complete();
    
  return await tx.sign().complete().submit();
}
```

This comprehensive min ADA handling system ensures that all PuckSwap operations maintain Cardano's UTxO requirements while providing clear error messages and automatic adjustments where possible.
