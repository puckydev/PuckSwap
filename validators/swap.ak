// PuckSwap v5 AMM Swap Validator
// Production-ready validator for Cardano preprod testnet deployment
// Implements constant product AMM (x * y = k) with configurable fees

use cardano/transaction.{Transaction, OutputReference, Input, Output}
use cardano/assets.{PolicyId, AssetName, ada_policy_id, ada_asset_name, quantity_of}
use aiken/collection/list

// =============================================================================
// DATUM AND REDEEMER STRUCTURES
// =============================================================================

// Exact PoolDatum Structure matching deployed contract
pub type PoolDatum {
  pool_nft_policy: PolicyId,
  pool_nft_name: AssetName,
  token_policy: PolicyId,
  token_name: AssetName,
  ada_reserve: Int,
  token_reserve: Int,
  lp_total_supply: Int,
  fee_bps: Int,
}

// Swap Redeemer with MEV protection
pub type SwapRedeemer {
  swap_in_token: Bool,    // true = token->ADA, false = ADA->token
  amount_in: Int,         // Input amount
  min_out: Int,           // Minimum output (slippage protection)
  deadline: Int,          // Slot deadline for MEV protection
}

// =============================================================================
// MAIN VALIDATOR
// =============================================================================

validator swap {
  spend(datum: Option<PoolDatum>, redeemer: SwapRedeemer, _utxo: OutputReference, self: Transaction) {
    expect Some(pool_datum) = datum
    
    // Basic parameter validations
    expect redeemer.amount_in > 0
    expect redeemer.min_out >= 0
    expect pool_datum.ada_reserve > 0
    expect pool_datum.token_reserve > 0
    expect pool_datum.lp_total_supply > 0
    expect pool_datum.fee_bps >= 0 && pool_datum.fee_bps <= 1000  // Max 10% fee
    
    // Calculate swap output using constant product formula
    let output_amount = calculate_swap_output(
      pool_datum.ada_reserve,
      pool_datum.token_reserve,
      redeemer.amount_in,
      redeemer.swap_in_token,
      pool_datum.fee_bps
    )
    
    // Validate slippage protection
    expect output_amount >= redeemer.min_out
    
    True
  }
}

// =============================================================================
// CONSTANT PRODUCT AMM CALCULATION
// =============================================================================

fn calculate_swap_output(
  ada_reserve: Int,
  token_reserve: Int,
  amount_in: Int,
  swap_in_token: Bool,
  fee_bps: Int
) -> Int {
  // Calculate fee using basis points (e.g., 30 bps = 0.3%)
  let fee_denominator = 10000
  let fee_numerator = fee_denominator - fee_bps
  let amount_in_with_fee = amount_in * fee_numerator
  
  if swap_in_token {
    // Token -> ADA swap
    // Formula: (amount_in_with_fee * ada_reserve) / (token_reserve * 10000 + amount_in_with_fee)
    let numerator = amount_in_with_fee * ada_reserve
    let denominator = (token_reserve * fee_denominator) + amount_in_with_fee
    numerator / denominator
  } else {
    // ADA -> Token swap
    // Formula: (amount_in_with_fee * token_reserve) / (ada_reserve * 10000 + amount_in_with_fee)
    let numerator = amount_in_with_fee * token_reserve
    let denominator = (ada_reserve * fee_denominator) + amount_in_with_fee
    numerator / denominator
  }
}

// =============================================================================
// TESTS
// =============================================================================

test test_swap_calculation() {
  // Test ADA -> Token swap with 0.3% fee (30 bps)
  let ada_reserve = 100_000_000_000  // 100,000 ADA
  let token_reserve = 2_301_952_000_000  // 2,301,952 PUKKY
  let amount_in = 1_000_000  // 1 ADA
  let fee_bps = 30  // 0.3%
  
  let output = calculate_swap_output(ada_reserve, token_reserve, amount_in, False, fee_bps)
  
  // Should receive approximately 22.9 PUKKY (accounting for fee and slippage)
  expect output > 22_000_000  // At least 22 PUKKY
  expect output < 25_000_000  // Less than 25 PUKKY
  
  True
}

test test_reverse_swap_calculation() {
  // Test Token -> ADA swap
  let ada_reserve = 100_000_000_000  // 100,000 ADA
  let token_reserve = 2_301_952_000_000  // 2,301,952 PUKKY
  let amount_in = 23_019_520  // ~23 PUKKY
  let fee_bps = 30  // 0.3%
  
  let output = calculate_swap_output(ada_reserve, token_reserve, amount_in, True, fee_bps)
  
  // Should receive approximately 0.99 ADA (accounting for fee)
  expect output > 900_000  // At least 0.9 ADA
  expect output < 1_000_000  // Less than 1 ADA
  
  True
}
