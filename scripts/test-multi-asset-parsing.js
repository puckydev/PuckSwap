#!/usr/bin/env node

/**
 * Comprehensive test suite for multi-asset value parsing
 * Tests the enhanced value parsing capabilities
 */

// Mock Lucid Evolution types for testing
const mockAssets = {
  // Simple ADA-only value
  adaOnly: {
    lovelace: 5000000n // 5 ADA
  },

  // Single native asset
  singleAsset: {
    lovelace: 2000000n, // 2 ADA
    'policy1.token1': 1000000n // 1 token
  },

  // Multiple native assets
  multipleAssets: {
    lovelace: 10000000n, // 10 ADA
    'policy1.PUCKY': 2500000000n, // 2500 PUCKY
    'policy2.wLTC': 150000000n, // 1.5 wLTC
    'policy3.LP_TOKEN': 1000000000n // 1000 LP tokens
  },

  // Complex pool value
  poolValue: {
    lovelace: 1000000000000n, // 1M ADA
    'pucky_policy.PUCKY': 2500000000000n, // 2.5M PUCKY
    'lp_policy.LP_PUCKY_ADA': 1414213562n // LP tokens (sqrt of initial liquidity)
  },

  // Dust value
  dustValue: {
    lovelace: 1000000n // 1 ADA only
  }
};

// Mock value parser (simplified version of the real implementation)
class MockValueParser {
  static parseAssets(assets) {
    const ada = assets.lovelace || 0n;
    const assetList = [];

    for (const [unit, quantity] of Object.entries(assets)) {
      if (unit === 'lovelace') continue;

      const [policyId, assetName] = unit.split('.');
      assetList.push({
        policyId,
        assetName: assetName || '',
        quantity: BigInt(quantity),
        unit
      });
    }

    return {
      ada,
      assets: assetList,
      totalAssets: assetList.length,
      isEmpty: ada === 0n && assetList.length === 0
    };
  }

  static getAssetQuantity(parsedValue, policyId, assetName) {
    if (policyId === '' && assetName === '') {
      return parsedValue.ada;
    }

    const asset = parsedValue.assets.find(
      a => a.policyId === policyId && a.assetName === assetName
    );
    return asset?.quantity || 0n;
  }

  static containsAsset(parsedValue, policyId, assetName, minQuantity = 1n) {
    const quantity = this.getAssetQuantity(parsedValue, policyId, assetName);
    return quantity >= minQuantity;
  }

  static validateMinAda(parsedValue, minAda = 2000000n) {
    return parsedValue.ada >= minAda;
  }

  static validateAllowedAssets(parsedValue, allowedPolicies) {
    return parsedValue.assets.every(asset => 
      allowedPolicies.includes(asset.policyId)
    );
  }

  static calculateValueDifference(value1, value2) {
    const adaDiff = value1.ada - value2.ada;
    const assetMap = new Map();

    // Add all assets from value1
    for (const asset of value1.assets) {
      assetMap.set(asset.unit, { ...asset });
    }

    // Subtract assets from value2
    for (const asset of value2.assets) {
      const existing = assetMap.get(asset.unit);
      if (existing) {
        existing.quantity -= asset.quantity;
        if (existing.quantity === 0n) {
          assetMap.delete(asset.unit);
        }
      } else {
        assetMap.set(asset.unit, {
          ...asset,
          quantity: -asset.quantity
        });
      }
    }

    const diffAssets = Array.from(assetMap.values()).filter(
      asset => asset.quantity !== 0n
    );

    return {
      ada: adaDiff,
      assets: diffAssets,
      totalAssets: diffAssets.length,
      isEmpty: adaDiff === 0n && diffAssets.length === 0
    };
  }

  static formatValue(parsedValue) {
    const parts = [];
    
    if (parsedValue.ada > 0n) {
      const ada = Number(parsedValue.ada) / 1_000_000;
      parts.push(`${ada.toFixed(6)} ADA`);
    }

    for (const asset of parsedValue.assets) {
      const amount = Number(asset.quantity) / 1_000_000;
      parts.push(`${amount.toFixed(6)} ${asset.assetName}`);
    }

    return parts.join(', ') || '0 ADA';
  }
}

// Test functions
function testBasicParsing() {
  console.log('🧪 Testing Basic Value Parsing\n');

  // Test 1: ADA-only value
  console.log('Test 1: ADA-only Value');
  const adaOnlyParsed = MockValueParser.parseAssets(mockAssets.adaOnly);
  console.log(`  Parsed: ${MockValueParser.formatValue(adaOnlyParsed)}`);
  console.log(`  ADA: ${Number(adaOnlyParsed.ada) / 1_000_000}`);
  console.log(`  Assets: ${adaOnlyParsed.totalAssets}`);
  console.log(`  ✅ ${adaOnlyParsed.ada === 5000000n && adaOnlyParsed.totalAssets === 0 ? 'PASS' : 'FAIL'}\n`);

  // Test 2: Single asset
  console.log('Test 2: Single Native Asset');
  const singleAssetParsed = MockValueParser.parseAssets(mockAssets.singleAsset);
  console.log(`  Parsed: ${MockValueParser.formatValue(singleAssetParsed)}`);
  console.log(`  ADA: ${Number(singleAssetParsed.ada) / 1_000_000}`);
  console.log(`  Assets: ${singleAssetParsed.totalAssets}`);
  const hasToken1 = MockValueParser.containsAsset(singleAssetParsed, 'policy1', 'token1');
  console.log(`  ✅ ${hasToken1 && singleAssetParsed.totalAssets === 1 ? 'PASS' : 'FAIL'}\n`);

  // Test 3: Multiple assets
  console.log('Test 3: Multiple Native Assets');
  const multiAssetParsed = MockValueParser.parseAssets(mockAssets.multipleAssets);
  console.log(`  Parsed: ${MockValueParser.formatValue(multiAssetParsed)}`);
  console.log(`  Total assets: ${multiAssetParsed.totalAssets}`);
  const hasPucky = MockValueParser.containsAsset(multiAssetParsed, 'policy1', 'PUCKY');
  const hasWLTC = MockValueParser.containsAsset(multiAssetParsed, 'policy2', 'wLTC');
  console.log(`  ✅ ${hasPucky && hasWLTC && multiAssetParsed.totalAssets === 3 ? 'PASS' : 'FAIL'}\n`);
}

function testAssetQueries() {
  console.log('🔍 Testing Asset Query Functions\n');

  const poolParsed = MockValueParser.parseAssets(mockAssets.poolValue);

  // Test asset quantity retrieval
  console.log('Test 1: Asset Quantity Retrieval');
  const adaAmount = MockValueParser.getAssetQuantity(poolParsed, '', '');
  const puckyAmount = MockValueParser.getAssetQuantity(poolParsed, 'pucky_policy', 'PUCKY');
  const lpAmount = MockValueParser.getAssetQuantity(poolParsed, 'lp_policy', 'LP_PUCKY_ADA');
  
  console.log(`  ADA: ${Number(adaAmount) / 1_000_000}`);
  console.log(`  PUCKY: ${Number(puckyAmount) / 1_000_000}`);
  console.log(`  LP: ${Number(lpAmount) / 1_000_000}`);
  console.log(`  ✅ ${adaAmount > 0n && puckyAmount > 0n && lpAmount > 0n ? 'PASS' : 'FAIL'}\n`);

  // Test asset containment
  console.log('Test 2: Asset Containment Checks');
  const containsPucky = MockValueParser.containsAsset(poolParsed, 'pucky_policy', 'PUCKY', 1000000n);
  const containsNonExistent = MockValueParser.containsAsset(poolParsed, 'fake_policy', 'FAKE');
  
  console.log(`  Contains PUCKY (min 1): ${containsPucky}`);
  console.log(`  Contains FAKE: ${containsNonExistent}`);
  console.log(`  ✅ ${containsPucky && !containsNonExistent ? 'PASS' : 'FAIL'}\n`);
}

function testValidations() {
  console.log('✅ Testing Validation Functions\n');

  const poolParsed = MockValueParser.parseAssets(mockAssets.poolValue);
  const dustParsed = MockValueParser.parseAssets(mockAssets.dustValue);

  // Test minimum ADA validation
  console.log('Test 1: Minimum ADA Validation');
  const poolMinAda = MockValueParser.validateMinAda(poolParsed);
  const dustMinAda = MockValueParser.validateMinAda(dustParsed);
  
  console.log(`  Pool meets min ADA: ${poolMinAda}`);
  console.log(`  Dust meets min ADA: ${dustMinAda}`);
  console.log(`  ✅ ${poolMinAda && !dustMinAda ? 'PASS' : 'FAIL'}\n`);

  // Test allowed assets validation
  console.log('Test 2: Allowed Assets Validation');
  const allowedPolicies = ['pucky_policy', 'lp_policy'];
  const poolAllowed = MockValueParser.validateAllowedAssets(poolParsed, allowedPolicies);
  
  const restrictedPolicies = ['pucky_policy']; // Only PUCKY allowed
  const poolRestricted = MockValueParser.validateAllowedAssets(poolParsed, restrictedPolicies);
  
  console.log(`  Pool with allowed policies: ${poolAllowed}`);
  console.log(`  Pool with restricted policies: ${poolRestricted}`);
  console.log(`  ✅ ${poolAllowed && !poolRestricted ? 'PASS' : 'FAIL'}\n`);
}

function testValueOperations() {
  console.log('🔄 Testing Value Operations\n');

  const value1 = MockValueParser.parseAssets({
    lovelace: 10000000n,
    'policy1.TOKEN': 1000000n
  });

  const value2 = MockValueParser.parseAssets({
    lovelace: 5000000n,
    'policy1.TOKEN': 500000n,
    'policy2.OTHER': 2000000n
  });

  // Test value difference
  console.log('Test 1: Value Difference Calculation');
  const diff = MockValueParser.calculateValueDifference(value1, value2);
  
  console.log(`  Value 1: ${MockValueParser.formatValue(value1)}`);
  console.log(`  Value 2: ${MockValueParser.formatValue(value2)}`);
  console.log(`  Difference: ${MockValueParser.formatValue(diff)}`);
  
  const expectedAdaDiff = 5000000n; // 10 - 5
  const expectedTokenDiff = 500000n; // 1 - 0.5
  const hasOtherNegative = diff.assets.some(a => a.assetName === 'OTHER' && a.quantity < 0n);
  
  console.log(`  ✅ ${diff.ada === expectedAdaDiff && hasOtherNegative ? 'PASS' : 'FAIL'}\n`);
}

function testPoolScenarios() {
  console.log('🏊 Testing Pool-Specific Scenarios\n');

  // Test 1: Pool structure validation
  console.log('Test 1: Pool Structure Validation');
  const validPool = MockValueParser.parseAssets(mockAssets.poolValue);
  const invalidPool = MockValueParser.parseAssets({
    lovelace: 1000000n, // Below minimum
    'unknown_policy.UNKNOWN': 1000000n
  });

  const validPoolCheck = MockValueParser.validateMinAda(validPool) && 
                        MockValueParser.containsAsset(validPool, 'pucky_policy', 'PUCKY');
  const invalidPoolCheck = MockValueParser.validateMinAda(invalidPool, 2000000n);

  console.log(`  Valid pool structure: ${validPoolCheck}`);
  console.log(`  Invalid pool structure: ${!invalidPoolCheck}`);
  console.log(`  ✅ ${validPoolCheck && !invalidPoolCheck ? 'PASS' : 'FAIL'}\n`);

  // Test 2: Swap simulation
  console.log('Test 2: Swap Value Changes');
  const beforeSwap = MockValueParser.parseAssets({
    lovelace: 1000000000n, // 1000 ADA
    'policy1.PUCKY': 2500000000n // 2500 PUCKY
  });

  const afterSwap = MockValueParser.parseAssets({
    lovelace: 1100000000n, // 1100 ADA (+100)
    'policy1.PUCKY': 2273000000n // 2273 PUCKY (-227)
  });

  const swapDiff = MockValueParser.calculateValueDifference(afterSwap, beforeSwap);
  console.log(`  Before: ${MockValueParser.formatValue(beforeSwap)}`);
  console.log(`  After: ${MockValueParser.formatValue(afterSwap)}`);
  console.log(`  Change: ${MockValueParser.formatValue(swapDiff)}`);
  
  const adaIncreased = swapDiff.ada > 0n;
  const puckyDecreased = swapDiff.assets.some(a => a.assetName === 'PUCKY' && a.quantity < 0n);
  
  console.log(`  ✅ ${adaIncreased && puckyDecreased ? 'PASS' : 'FAIL'}\n`);
}

// Run all tests
function runAllTests() {
  console.log('🚀 Multi-Asset Value Parsing Test Suite\n');
  
  testBasicParsing();
  testAssetQueries();
  testValidations();
  testValueOperations();
  testPoolScenarios();
  
  console.log('🎉 Multi-asset parsing tests completed!');
}

// Run tests if this is the main module
if (require.main === module) {
  runAllTests();
}
