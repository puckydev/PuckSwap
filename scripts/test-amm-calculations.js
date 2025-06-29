#!/usr/bin/env node

/**
 * Simple test script to verify our AMM calculations
 * This tests the core constant product formula implementation
 */

// AMM calculation function (matches our Aiken and TypeScript implementations)
function calculateSwapOutput(adaReserve, tokenReserve, inputAmount, feeBps, isAdaToToken) {
  // Calculate fee
  const feeAmount = Math.floor(inputAmount * feeBps / 10000);
  const inputAfterFee = inputAmount - feeAmount;

  let outputAmount;
  let newAdaReserve;
  let newTokenReserve;

  if (isAdaToToken) {
    // ADA -> Token swap
    newAdaReserve = adaReserve + inputAfterFee;
    outputAmount = Math.floor(tokenReserve * inputAfterFee / newAdaReserve);
    newTokenReserve = tokenReserve - outputAmount;
  } else {
    // Token -> ADA swap
    newTokenReserve = tokenReserve + inputAfterFee;
    outputAmount = Math.floor(adaReserve * inputAfterFee / newTokenReserve);
    newAdaReserve = adaReserve - outputAmount;
  }

  return { outputAmount, newAdaReserve, newTokenReserve };
}

// Test cases
function runTests() {
  console.log('🧪 Testing PuckSwap AMM Calculations\n');

  // Test 1: Basic ADA to Token swap
  console.log('Test 1: ADA → Token Swap');
  const adaReserve = 1000 * 1_000_000; // 1000 ADA
  const tokenReserve = 2000 * 1_000_000; // 2000 tokens
  const inputAmount = 100 * 1_000_000; // 100 ADA
  const feeBps = 30; // 0.3%

  const result1 = calculateSwapOutput(adaReserve, tokenReserve, inputAmount, feeBps, true);
  
  console.log(`  Input: ${inputAmount / 1_000_000} ADA`);
  console.log(`  Output: ${result1.outputAmount / 1_000_000} tokens`);
  console.log(`  New ADA Reserve: ${result1.newAdaReserve / 1_000_000}`);
  console.log(`  New Token Reserve: ${result1.newTokenReserve / 1_000_000}`);
  
  // Verify constant product (approximately)
  const originalProduct = adaReserve * tokenReserve;
  const newProduct = result1.newAdaReserve * result1.newTokenReserve;
  const productDiff = Math.abs(newProduct - originalProduct) / originalProduct;
  
  console.log(`  Product difference: ${(productDiff * 100).toFixed(4)}%`);
  console.log(`  ✅ ${productDiff < 0.01 ? 'PASS' : 'FAIL'} - Product maintained\n`);

  // Test 2: Token to ADA swap
  console.log('Test 2: Token → ADA Swap');
  const tokenInput = 200 * 1_000_000; // 200 tokens
  
  const result2 = calculateSwapOutput(adaReserve, tokenReserve, tokenInput, feeBps, false);
  
  console.log(`  Input: ${tokenInput / 1_000_000} tokens`);
  console.log(`  Output: ${result2.outputAmount / 1_000_000} ADA`);
  console.log(`  New ADA Reserve: ${result2.newAdaReserve / 1_000_000}`);
  console.log(`  New Token Reserve: ${result2.newTokenReserve / 1_000_000}`);
  
  const newProduct2 = result2.newAdaReserve * result2.newTokenReserve;
  const productDiff2 = Math.abs(newProduct2 - originalProduct) / originalProduct;
  
  console.log(`  Product difference: ${(productDiff2 * 100).toFixed(4)}%`);
  console.log(`  ✅ ${productDiff2 < 0.01 ? 'PASS' : 'FAIL'} - Product maintained\n`);

  // Test 3: Price impact calculation
  console.log('Test 3: Price Impact Analysis');
  
  const smallSwap = calculateSwapOutput(adaReserve, tokenReserve, 10 * 1_000_000, feeBps, true);
  const largeSwap = calculateSwapOutput(adaReserve, tokenReserve, 500 * 1_000_000, feeBps, true);
  
  // Calculate price impact
  const originalPrice = tokenReserve / adaReserve; // tokens per ADA
  const smallSwapPrice = smallSwap.newTokenReserve / smallSwap.newAdaReserve;
  const largeSwapPrice = largeSwap.newTokenReserve / largeSwap.newAdaReserve;
  
  const smallImpact = Math.abs((smallSwapPrice - originalPrice) / originalPrice) * 100;
  const largeImpact = Math.abs((largeSwapPrice - originalPrice) / originalPrice) * 100;
  
  console.log(`  Small swap (10 ADA): ${smallImpact.toFixed(2)}% price impact`);
  console.log(`  Large swap (500 ADA): ${largeImpact.toFixed(2)}% price impact`);
  console.log(`  ✅ ${largeImpact > smallImpact ? 'PASS' : 'FAIL'} - Larger swaps have higher impact\n`);

  // Test 4: Fee calculation
  console.log('Test 4: Fee Calculation');
  
  const noFeeResult = calculateSwapOutput(adaReserve, tokenReserve, inputAmount, 0, true);
  const withFeeResult = calculateSwapOutput(adaReserve, tokenReserve, inputAmount, feeBps, true);
  
  const feeImpact = (noFeeResult.outputAmount - withFeeResult.outputAmount) / noFeeResult.outputAmount * 100;
  
  console.log(`  Without fee: ${noFeeResult.outputAmount / 1_000_000} tokens`);
  console.log(`  With 0.3% fee: ${withFeeResult.outputAmount / 1_000_000} tokens`);
  console.log(`  Fee impact: ${feeImpact.toFixed(2)}%`);
  console.log(`  ✅ ${feeImpact > 0 && feeImpact < 1 ? 'PASS' : 'FAIL'} - Fee reduces output appropriately\n`);

  // Test 5: Edge cases
  console.log('Test 5: Edge Cases');
  
  // Zero input
  const zeroResult = calculateSwapOutput(adaReserve, tokenReserve, 0, feeBps, true);
  console.log(`  Zero input result: ${zeroResult.outputAmount} (should be 0)`);
  console.log(`  ✅ ${zeroResult.outputAmount === 0 ? 'PASS' : 'FAIL'} - Zero input gives zero output`);
  
  // Very small input
  const tinyResult = calculateSwapOutput(adaReserve, tokenReserve, 1, feeBps, true);
  console.log(`  Tiny input (1 lovelace): ${tinyResult.outputAmount}`);
  console.log(`  ✅ ${tinyResult.outputAmount >= 0 ? 'PASS' : 'FAIL'} - Tiny input handled gracefully\n`);

  console.log('🎉 AMM calculation tests completed!');
}

// LP token calculation test
function testLPTokenCalculation() {
  console.log('\n💧 Testing LP Token Calculations\n');

  function calculateLPTokens(adaReserve, tokenReserve, adaAmount, tokenAmount, totalLPSupply) {
    if (totalLPSupply === 0) {
      // Initial liquidity: geometric mean
      return Math.floor(Math.sqrt(adaAmount * tokenAmount));
    } else {
      // Proportional liquidity
      const adaRatio = Math.floor(adaAmount * totalLPSupply / adaReserve);
      const tokenRatio = Math.floor(tokenAmount * totalLPSupply / tokenReserve);
      return Math.min(adaRatio, tokenRatio);
    }
  }

  // Test initial liquidity
  const initialLP = calculateLPTokens(0, 0, 1000 * 1_000_000, 2000 * 1_000_000, 0);
  console.log(`Initial LP tokens: ${initialLP / 1_000_000} (for 1000 ADA + 2000 tokens)`);
  
  // Test proportional liquidity
  const proportionalLP = calculateLPTokens(
    1000 * 1_000_000, 2000 * 1_000_000, // existing reserves
    100 * 1_000_000, 200 * 1_000_000,   // new amounts (10% of reserves)
    initialLP                            // total LP supply
  );
  
  const expectedProportion = initialLP * 0.1; // Should be 10% of total supply
  console.log(`Proportional LP tokens: ${proportionalLP / 1_000_000}`);
  console.log(`Expected (10% of supply): ${expectedProportion / 1_000_000}`);
  console.log(`✅ ${Math.abs(proportionalLP - expectedProportion) < 1000 ? 'PASS' : 'FAIL'} - Proportional calculation correct\n`);
}

// Run all tests
if (require.main === module) {
  runTests();
  testLPTokenCalculation();
}
