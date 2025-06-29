#!/usr/bin/env node

/**
 * Test script to verify PuckSwap V2 calculations match Aiken implementation
 * Tests the exact same formula used in the smart contract
 */

// V2 AMM calculation (matches Aiken exactly)
function getAmountOutV2(amountIn, reserveIn, reserveOut) {
  // Uniswap-style fee: 0.3% = 997/1000 after fee
  const feeNumerator = 997n;
  const feeDenominator = 1000n;

  const amountInWithFee = BigInt(amountIn) * feeNumerator;
  const numerator = amountInWithFee * BigInt(reserveOut);
  const denominator = (BigInt(reserveIn) * feeDenominator) + amountInWithFee;

  return numerator / denominator;
}

// Test V2 calculations
function runV2Tests() {
  console.log('🧪 Testing PuckSwap V2 AMM Calculations (Aiken-compatible)\n');

  // Test 1: ADA -> Token swap
  console.log('Test 1: ADA → Token Swap (V2)');
  const adaReserve = 1000n * 1_000_000n; // 1000 ADA
  const tokenReserve = 2500n * 1_000_000n; // 2500 tokens (2.5 tokens per ADA)
  const adaInput = 100n * 1_000_000n; // 100 ADA

  const tokenOutput = getAmountOutV2(adaInput, adaReserve, tokenReserve);
  
  console.log(`  Input: ${Number(adaInput) / 1_000_000} ADA`);
  console.log(`  Output: ${Number(tokenOutput) / 1_000_000} tokens`);
  console.log(`  Rate: ${Number(tokenOutput) / Number(adaInput)} tokens per ADA`);
  
  // Verify constant product (approximately)
  const newAdaReserve = adaReserve + adaInput;
  const newTokenReserve = tokenReserve - tokenOutput;
  const originalProduct = adaReserve * tokenReserve;
  const newProduct = newAdaReserve * newTokenReserve;
  const productDiff = Number(newProduct - originalProduct) / Number(originalProduct);
  
  console.log(`  Product difference: ${(productDiff * 100).toFixed(4)}%`);
  console.log(`  ✅ ${Math.abs(productDiff) < 0.01 ? 'PASS' : 'FAIL'} - Product maintained\n`);

  // Test 2: Token -> ADA swap
  console.log('Test 2: Token → ADA Swap (V2)');
  const tokenInput = 250n * 1_000_000n; // 250 tokens
  
  const adaOutput = getAmountOutV2(tokenInput, tokenReserve, adaReserve);
  
  console.log(`  Input: ${Number(tokenInput) / 1_000_000} tokens`);
  console.log(`  Output: ${Number(adaOutput) / 1_000_000} ADA`);
  console.log(`  Rate: ${Number(adaOutput) / Number(tokenInput)} ADA per token`);
  
  const newTokenReserve2 = tokenReserve + tokenInput;
  const newAdaReserve2 = adaReserve - adaOutput;
  const newProduct2 = newAdaReserve2 * newTokenReserve2;
  const productDiff2 = Number(newProduct2 - originalProduct) / Number(originalProduct);
  
  console.log(`  Product difference: ${(productDiff2 * 100).toFixed(4)}%`);
  console.log(`  ✅ ${Math.abs(productDiff2) < 0.01 ? 'PASS' : 'FAIL'} - Product maintained\n`);

  // Test 3: Fee verification
  console.log('Test 3: Fee Calculation Verification');
  
  // Calculate without fee for comparison
  const noFeeOutput = (BigInt(adaInput) * tokenReserve) / (adaReserve + BigInt(adaInput));
  const withFeeOutput = tokenOutput;
  const feeImpact = Number(noFeeOutput - withFeeOutput) / Number(noFeeOutput) * 100;
  
  console.log(`  Without fee: ${Number(noFeeOutput) / 1_000_000} tokens`);
  console.log(`  With 0.3% fee: ${Number(withFeeOutput) / 1_000_000} tokens`);
  console.log(`  Fee impact: ${feeImpact.toFixed(2)}%`);
  console.log(`  ✅ ${feeImpact > 0.25 && feeImpact < 0.35 ? 'PASS' : 'FAIL'} - Fee approximately 0.3%\n`);

  // Test 4: Large swap price impact
  console.log('Test 4: Large Swap Price Impact');
  
  const largeSwap = 500n * 1_000_000n; // 500 ADA (50% of pool)
  const largeOutput = getAmountOutV2(largeSwap, adaReserve, tokenReserve);
  
  const originalPrice = Number(tokenReserve) / Number(adaReserve);
  const newAdaAfterLarge = adaReserve + largeSwap;
  const newTokenAfterLarge = tokenReserve - largeOutput;
  const newPrice = Number(newTokenAfterLarge) / Number(newAdaAfterLarge);
  const priceImpact = Math.abs((newPrice - originalPrice) / originalPrice) * 100;
  
  console.log(`  Large swap: ${Number(largeSwap) / 1_000_000} ADA`);
  console.log(`  Output: ${Number(largeOutput) / 1_000_000} tokens`);
  console.log(`  Price impact: ${priceImpact.toFixed(2)}%`);
  console.log(`  ✅ ${priceImpact > 10 ? 'PASS' : 'FAIL'} - Large swaps have significant impact\n`);

  // Test 5: Edge cases
  console.log('Test 5: Edge Cases');
  
  // Very small swap
  const tinySwap = 1000n; // 0.001 ADA
  const tinyOutput = getAmountOutV2(tinySwap, adaReserve, tokenReserve);
  console.log(`  Tiny swap (0.001 ADA): ${Number(tinyOutput)} lovelace output`);
  console.log(`  ✅ ${tinyOutput > 0n ? 'PASS' : 'FAIL'} - Tiny swaps work`);
  
  // Zero swap
  const zeroOutput = getAmountOutV2(0, adaReserve, tokenReserve);
  console.log(`  Zero swap: ${Number(zeroOutput)} output`);
  console.log(`  ✅ ${zeroOutput === 0n ? 'PASS' : 'FAIL'} - Zero input gives zero output\n`);

  console.log('🎉 PuckSwap V2 calculation tests completed!');
}

// Compare V1 vs V2 calculations
function compareV1V2() {
  console.log('\n🔄 Comparing V1 vs V2 Calculations\n');

  // V1 calculation (original)
  function calculateV1(amountIn, reserveIn, reserveOut, feeBps = 30) {
    const feeAmount = Number(amountIn) * feeBps / 10000;
    const inputAfterFee = Number(amountIn) - feeAmount;
    const numerator = inputAfterFee * Number(reserveOut);
    const denominator = Number(reserveIn) + inputAfterFee;
    return Math.floor(numerator / denominator);
  }

  const adaReserve = 1000 * 1_000_000;
  const tokenReserve = 2500 * 1_000_000;
  const inputAmount = 100 * 1_000_000;

  const v1Output = calculateV1(inputAmount, adaReserve, tokenReserve);
  const v2Output = Number(getAmountOutV2(inputAmount, adaReserve, tokenReserve));

  console.log(`V1 Output: ${v1Output / 1_000_000} tokens`);
  console.log(`V2 Output: ${v2Output / 1_000_000} tokens`);
  console.log(`Difference: ${Math.abs(v1Output - v2Output) / 1_000_000} tokens`);
  
  // V2 should give slightly less due to different fee calculation
  console.log(`✅ ${v2Output < v1Output ? 'PASS' : 'FAIL'} - V2 has more conservative fee calculation\n`);
}

// Test precision with large numbers
function testPrecision() {
  console.log('🔢 Testing Precision with Large Numbers\n');

  // Large pool
  const largeAdaReserve = 10_000_000n * 1_000_000n; // 10M ADA
  const largeTokenReserve = 25_000_000n * 1_000_000n; // 25M tokens
  const largeInput = 1_000_000n * 1_000_000n; // 1M ADA

  const largeOutput = getAmountOutV2(largeInput, largeAdaReserve, largeTokenReserve);
  
  console.log(`Large pool test:`);
  console.log(`  Input: ${Number(largeInput) / 1_000_000} ADA`);
  console.log(`  Output: ${Number(largeOutput) / 1_000_000} tokens`);
  console.log(`  ✅ ${largeOutput > 0n ? 'PASS' : 'FAIL'} - Large numbers handled correctly\n`);
}

// Run all tests
if (require.main === module) {
  runV2Tests();
  compareV1V2();
  testPrecision();
}
