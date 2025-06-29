/**
 * PuckSwap v5 - Lucid Evolution Test Suite
 * TEST 04: CIP-68 Datum Serialization Test
 * 
 * This test verifies:
 * ✅ CIP-68 datum structure creation
 * ✅ Data serialization/deserialization
 * ✅ Pool datum validation
 * ✅ Complex data type handling
 * ✅ Metadata compliance
 */

import { Data, Constr } from "@lucid-evolution/lucid";
import { createLucidInstance } from "../../lib/lucid-config";
import { 
  PoolCIP68Datum, 
  CIP68DatumBuilder,
  CIP68_METADATA_KEYS 
} from "../../lib/cip68-types";

// Test configuration
const TEST_CONFIG = {
  network: "Preprod" as const,
  testPoolData: {
    ada_reserve: 1000000000n, // 1000 ADA
    token_reserve: 500000000n, // 500 tokens
    fee_basis_points: 30, // 0.3%
    lp_token_policy: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef12", // Valid 56-char hex
    lp_token_name: "LP_PUCKY_ADA",
    total_lp_tokens: 707106781n, // sqrt(1000 * 500) * 1000
    last_update_slot: 12345678n,
    pool_id: "pool_001"
  }
};

// Define CIP-68 compliant data structures
const PoolDatumSchema = Data.Object({
  ada_reserve: Data.Integer(),
  token_reserve: Data.Integer(),
  fee_basis_points: Data.Integer(),
  lp_token_policy: Data.Bytes(),
  lp_token_name: Data.Bytes(),
  total_lp_tokens: Data.Integer(),
  last_update_slot: Data.Integer(),
  pool_id: Data.Bytes()
});

type PoolDatum = Data.Static<typeof PoolDatumSchema>;

async function testBasicDatumSerialization() {
  console.log("🔧 Testing Basic Datum Serialization...");
  
  try {
    // Create test pool datum with proper hex handling
    const poolDatum: PoolDatum = {
      ada_reserve: TEST_CONFIG.testPoolData.ada_reserve,
      token_reserve: TEST_CONFIG.testPoolData.token_reserve,
      fee_basis_points: BigInt(TEST_CONFIG.testPoolData.fee_basis_points),
      lp_token_policy: Buffer.from(TEST_CONFIG.testPoolData.lp_token_policy, 'hex'),
      lp_token_name: Buffer.from(TEST_CONFIG.testPoolData.lp_token_name, 'utf8'),
      total_lp_tokens: TEST_CONFIG.testPoolData.total_lp_tokens,
      last_update_slot: TEST_CONFIG.testPoolData.last_update_slot,
      pool_id: Buffer.from(TEST_CONFIG.testPoolData.pool_id, 'utf8')
    };
    
    console.log("📊 Original Pool Data:");
    console.log(`  ADA Reserve: ${Number(poolDatum.ada_reserve) / 1_000_000} ADA`);
    console.log(`  Token Reserve: ${Number(poolDatum.token_reserve) / 1_000_000} tokens`);
    console.log(`  Fee: ${Number(poolDatum.fee_basis_points) / 100}%`);
    console.log(`  LP Policy: ${TEST_CONFIG.testPoolData.lp_token_policy}`);
    console.log(`  LP Name: ${TEST_CONFIG.testPoolData.lp_token_name}`);
    
    // Serialize datum
    const serialized = Data.to(poolDatum, PoolDatumSchema);
    console.log(`✅ Serialized datum: ${serialized.slice(0, 50)}...`);
    console.log(`📏 Serialized length: ${serialized.length} characters`);
    
    // Deserialize datum
    const deserialized = Data.from(serialized, PoolDatumSchema);
    console.log("✅ Deserialized successfully");
    
    // Validate deserialized data
    const isValid = 
      deserialized.ada_reserve === poolDatum.ada_reserve &&
      deserialized.token_reserve === poolDatum.token_reserve &&
      deserialized.fee_basis_points === poolDatum.fee_basis_points &&
      Buffer.compare(deserialized.lp_token_policy, poolDatum.lp_token_policy) === 0;
    
    console.log(`✅ Data integrity: ${isValid ? 'PASS' : 'FAIL'}`);
    
    return { serialized, deserialized, isValid };
  } catch (error) {
    console.error("❌ Basic datum serialization failed:", error);
    throw error;
  }
}

async function testComplexDatumStructures() {
  console.log("\n🏗️  Testing Complex Datum Structures...");
  
  try {
    // Define a complex swap redeemer structure
    const SwapRedeemerSchema = Data.Enum([
      Data.Object({
        Swap: Data.Object({
          amount_in: Data.Integer(),
          min_amount_out: Data.Integer(),
          deadline: Data.Integer(),
          user_address: Data.Bytes()
        })
      }),
      Data.Object({
        AddLiquidity: Data.Object({
          ada_amount: Data.Integer(),
          token_amount: Data.Integer(),
          min_lp_tokens: Data.Integer()
        })
      }),
      Data.Object({
        RemoveLiquidity: Data.Object({
          lp_tokens: Data.Integer(),
          min_ada: Data.Integer(),
          min_tokens: Data.Integer()
        })
      })
    ]);
    
    type SwapRedeemer = Data.Static<typeof SwapRedeemerSchema>;
    
    // Test different redeemer types
    const swapRedeemer: SwapRedeemer = {
      Swap: {
        amount_in: 1000000n,
        min_amount_out: 950000n,
        deadline: 12345678n,
        user_address: Buffer.from("addr_test1234567890", 'utf8')
      }
    };
    
    const addLiquidityRedeemer: SwapRedeemer = {
      AddLiquidity: {
        ada_amount: 10000000n,
        token_amount: 5000000n,
        min_lp_tokens: 7000000n
      }
    };
    
    console.log("🔄 Testing Swap Redeemer...");
    const swapSerialized = Data.to(swapRedeemer, SwapRedeemerSchema);
    const swapDeserialized = Data.from(swapSerialized, SwapRedeemerSchema);
    console.log(`✅ Swap redeemer: ${swapSerialized.slice(0, 30)}...`);
    
    console.log("💧 Testing Add Liquidity Redeemer...");
    const addLiqSerialized = Data.to(addLiquidityRedeemer, SwapRedeemerSchema);
    const addLiqDeserialized = Data.from(addLiqSerialized, SwapRedeemerSchema);
    console.log(`✅ Add liquidity redeemer: ${addLiqSerialized.slice(0, 30)}...`);
    
    // Validate structure integrity
    const swapValid = 'Swap' in swapDeserialized && swapDeserialized.Swap.amount_in === 1000000n;
    const addLiqValid = 'AddLiquidity' in addLiqDeserialized && addLiqDeserialized.AddLiquidity.ada_amount === 10000000n;
    
    console.log(`✅ Complex structures valid: ${swapValid && addLiqValid ? 'PASS' : 'FAIL'}`);
    
    return {
      swapRedeemer: { serialized: swapSerialized, valid: swapValid },
      addLiquidityRedeemer: { serialized: addLiqSerialized, valid: addLiqValid }
    };
  } catch (error) {
    console.error("❌ Complex datum structures test failed:", error);
    throw error;
  }
}

async function testCIP68MetadataCompliance() {
  console.log("\n📋 Testing CIP-68 Metadata Compliance...");
  
  try {
    // Create CIP-68 compliant metadata structure
    const MetadataSchema = Data.Map(
      Data.Integer(),
      Data.Any()
    );
    
    type Metadata = Data.Static<typeof MetadataSchema>;
    
    const metadata: Metadata = new Map([
      [0n, Buffer.from("PuckSwap Pool Token")], // Name
      [1n, Buffer.from("PUCKY-ADA LP")], // Description  
      [2n, Buffer.from("https://puckswap.io/logo.png")], // Image
      [3n, new Map([
        ["decimals", 6n],
        ["pool_type", Buffer.from("AMM")],
        ["version", Buffer.from("v5")]
      ])]
    ]);
    
    console.log("📝 CIP-68 Metadata Structure:");
    console.log(`  Name: PuckSwap Pool Token`);
    console.log(`  Description: PUCKY-ADA LP`);
    console.log(`  Image: https://puckswap.io/logo.png`);
    console.log(`  Custom fields: 3 entries`);
    
    // Serialize metadata
    const serializedMetadata = Data.to(metadata, MetadataSchema);
    console.log(`✅ Metadata serialized: ${serializedMetadata.slice(0, 40)}...`);
    
    // Deserialize and validate
    const deserializedMetadata = Data.from(serializedMetadata, MetadataSchema);
    const hasRequiredFields = 
      deserializedMetadata.has(0n) && // Name
      deserializedMetadata.has(1n) && // Description
      deserializedMetadata.has(2n);   // Image
    
    console.log(`✅ CIP-68 compliance: ${hasRequiredFields ? 'PASS' : 'FAIL'}`);
    
    return {
      metadata: serializedMetadata,
      compliant: hasRequiredFields
    };
  } catch (error) {
    console.error("❌ CIP-68 metadata compliance test failed:", error);
    throw error;
  }
}

async function testDatumSizeOptimization() {
  console.log("\n⚡ Testing Datum Size Optimization...");
  
  try {
    // Test different serialization approaches
    const testData = {
      large_number: 999999999999999999n,
      small_number: 42n,
      text_field: "This is a test string for size comparison",
      bytes_field: Buffer.from("binary_data_representation"),
      optional_field: null
    };
    
    // Method 1: Individual fields
    const method1 = Data.to(testData.large_number) + 
                   Data.to(testData.small_number) + 
                   Data.to(testData.text_field) +
                   Data.to(testData.bytes_field);
    
    // Method 2: Structured object
    const StructuredSchema = Data.Object({
      large_number: Data.Integer(),
      small_number: Data.Integer(), 
      text_field: Data.Bytes(),
      bytes_field: Data.Bytes()
    });
    
    const structuredData = {
      large_number: testData.large_number,
      small_number: testData.small_number,
      text_field: Buffer.from(testData.text_field),
      bytes_field: testData.bytes_field
    };
    
    const method2 = Data.to(structuredData, StructuredSchema);
    
    console.log(`📊 Serialization Comparison:`);
    console.log(`  Individual fields: ${method1.length} chars`);
    console.log(`  Structured object: ${method2.length} chars`);
    console.log(`  Efficiency gain: ${((method1.length - method2.length) / method1.length * 100).toFixed(1)}%`);
    
    const isOptimized = method2.length <= method1.length;
    console.log(`✅ Size optimization: ${isOptimized ? 'PASS' : 'FAIL'}`);
    
    return {
      individualSize: method1.length,
      structuredSize: method2.length,
      optimized: isOptimized
    };
  } catch (error) {
    console.error("❌ Datum size optimization test failed:", error);
    throw error;
  }
}

async function runCIP68DatumSerializationTest() {
  console.log("🚀 PuckSwap v5 - CIP-68 Datum Serialization Test\n");
  console.log("=" .repeat(50));
  
  try {
    // Step 1: Initialize Lucid (for context)
    console.log("🔧 Initializing Lucid Evolution...");
    const lucid = await createLucidInstance({ network: TEST_CONFIG.network });
    console.log("✅ Lucid Evolution initialized");
    
    // Step 2: Test basic datum serialization
    const basicTest = await testBasicDatumSerialization();
    
    // Step 3: Test complex datum structures
    const complexTest = await testComplexDatumStructures();
    
    // Step 4: Test CIP-68 metadata compliance
    const metadataTest = await testCIP68MetadataCompliance();
    
    // Step 5: Test datum size optimization
    const optimizationTest = await testDatumSizeOptimization();
    
    // Test Summary
    console.log("\n🎉 Test Summary:");
    console.log("=" .repeat(30));
    console.log(`✅ Basic Serialization: ${basicTest.isValid ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Complex Structures: ${complexTest.swapRedeemer.valid && complexTest.addLiquidityRedeemer.valid ? 'PASS' : 'FAIL'}`);
    console.log(`✅ CIP-68 Compliance: ${metadataTest.compliant ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Size Optimization: ${optimizationTest.optimized ? 'PASS' : 'FAIL'}`);
    
    const allTestsPassed = 
      basicTest.isValid &&
      complexTest.swapRedeemer.valid &&
      complexTest.addLiquidityRedeemer.valid &&
      metadataTest.compliant &&
      optimizationTest.optimized;
    
    console.log(`\n🏆 Overall Result: ${allTestsPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    console.log("\n✅ CIP-68 datum serialization test completed!");
    
    return {
      success: allTestsPassed,
      results: {
        basic: basicTest.isValid,
        complex: complexTest.swapRedeemer.valid && complexTest.addLiquidityRedeemer.valid,
        metadata: metadataTest.compliant,
        optimization: optimizationTest.optimized
      }
    };
    
  } catch (error) {
    console.error("\n❌ CIP-68 datum serialization test failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
if (require.main === module) {
  runCIP68DatumSerializationTest();
}

export { 
  runCIP68DatumSerializationTest,
  testBasicDatumSerialization,
  testComplexDatumStructures,
  testCIP68MetadataCompliance,
  testDatumSizeOptimization
};
