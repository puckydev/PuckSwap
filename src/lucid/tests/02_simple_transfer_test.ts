/**
 * PuckSwap v5 - Lucid Evolution Test Suite
 * TEST 02: Simple ADA Transfer Test
 * 
 * This test verifies:
 * ✅ Basic transaction building
 * ✅ ADA transfer functionality
 * ✅ Transaction signing
 * ✅ Fee calculation
 * ✅ UTxO selection
 */

import { Lucid, TxHash, UTxO } from "@lucid-evolution/lucid";
import { createLucidInstance } from "../../lib/lucid-config";

// Test configuration
const TEST_CONFIG = {
  network: "Preprod" as const,
  transferAmount: 2_000_000n, // 2 ADA in lovelace
  testAddress: "addr_test1qpw0djgj0x59ngrjvqthn7enhvruxnsavsw5th63la3mjel3tkc974sr23jmlzgq5zda4gtv8k9cy38756r9y3qgmkqqjz6aa7", // Preprod test address
  timeout: 60000 // 60 seconds
};

async function testTransactionBuilding(lucid: Lucid) {
  console.log("🔧 Testing Transaction Building...");
  
  try {
    // Get wallet address for validation
    const senderAddress = await lucid.wallet.address();
    console.log(`📤 Sender: ${senderAddress.slice(0, 20)}...`);
    console.log(`📥 Receiver: ${TEST_CONFIG.testAddress.slice(0, 20)}...`);
    console.log(`💰 Amount: ${Number(TEST_CONFIG.transferAmount) / 1_000_000} ADA`);
    
    // Build transaction
    const tx = await lucid.newTx()
      .payToAddress(TEST_CONFIG.testAddress, { lovelace: TEST_CONFIG.transferAmount })
      .complete();
    
    console.log("✅ Transaction built successfully");
    console.log(`📊 Transaction size: ${tx.toCBOR().length / 2} bytes`);
    
    // Get transaction details
    const txBody = tx.txComplete.body();
    console.log(`🔢 Inputs: ${txBody.inputs().len()}`);
    console.log(`🎯 Outputs: ${txBody.outputs().len()}`);
    console.log(`💸 Fee: ${Number(txBody.fee()) / 1_000_000} ADA`);
    
    return tx;
  } catch (error) {
    console.error("❌ Transaction building failed:", error);
    throw error;
  }
}

async function testTransactionSigning(tx: any) {
  console.log("\n🔐 Testing Transaction Signing...");
  
  try {
    const signedTx = await tx.sign().complete();
    
    console.log("✅ Transaction signed successfully");
    console.log(`📝 Signed transaction size: ${signedTx.toCBOR().length / 2} bytes`);
    
    // Get transaction hash
    const txHash = signedTx.toHash();
    console.log(`🔗 Transaction Hash: ${txHash}`);
    
    return { signedTx, txHash };
  } catch (error) {
    console.error("❌ Transaction signing failed:", error);
    throw error;
  }
}

async function testUTxOSelection(lucid: Lucid) {
  console.log("\n💎 Testing UTxO Selection...");
  
  try {
    // Get all UTxOs
    const utxos = await lucid.wallet.getUtxos();
    console.log(`📦 Total UTxOs available: ${utxos.length}`);
    
    // Calculate total balance
    let totalBalance = 0n;
    let largestUtxo: UTxO | null = null;
    let largestAmount = 0n;
    
    for (const utxo of utxos) {
      const amount = utxo.assets.lovelace || 0n;
      totalBalance += amount;
      
      if (amount > largestAmount) {
        largestAmount = amount;
        largestUtxo = utxo;
      }
    }
    
    console.log(`💰 Total Balance: ${Number(totalBalance) / 1_000_000} ADA`);
    console.log(`🏆 Largest UTxO: ${Number(largestAmount) / 1_000_000} ADA`);
    
    // Check if we have enough balance
    const requiredAmount = TEST_CONFIG.transferAmount + 1_000_000n; // Transfer + estimated fee
    const hasEnoughBalance = totalBalance >= requiredAmount;
    
    console.log(`✅ Sufficient balance: ${hasEnoughBalance ? 'Yes' : 'No'}`);
    
    if (!hasEnoughBalance) {
      console.log(`⚠️  Required: ${Number(requiredAmount) / 1_000_000} ADA`);
      console.log(`⚠️  Available: ${Number(totalBalance) / 1_000_000} ADA`);
      throw new Error("Insufficient balance for transfer test");
    }
    
    return {
      totalBalance: Number(totalBalance) / 1_000_000,
      utxoCount: utxos.length,
      largestUtxo: Number(largestAmount) / 1_000_000,
      hasEnoughBalance
    };
  } catch (error) {
    console.error("❌ UTxO selection analysis failed:", error);
    throw error;
  }
}

async function testFeeEstimation(lucid: Lucid) {
  console.log("\n💸 Testing Fee Estimation...");
  
  try {
    // Build a test transaction to estimate fees
    const tx = await lucid.newTx()
      .payToAddress(TEST_CONFIG.testAddress, { lovelace: TEST_CONFIG.transferAmount })
      .complete();
    
    const txBody = tx.txComplete.body();
    const estimatedFee = Number(txBody.fee()) / 1_000_000;
    
    console.log(`📊 Estimated Fee: ${estimatedFee} ADA`);
    console.log(`📏 Transaction Size: ${tx.toCBOR().length / 2} bytes`);
    console.log(`💹 Fee Rate: ${(estimatedFee * 1_000_000 / (tx.toCBOR().length / 2)).toFixed(2)} lovelace/byte`);
    
    // Validate fee is reasonable (between 0.1 and 2 ADA)
    const isReasonableFee = estimatedFee >= 0.1 && estimatedFee <= 2.0;
    console.log(`✅ Fee is reasonable: ${isReasonableFee ? 'Yes' : 'No'}`);
    
    if (!isReasonableFee) {
      console.log(`⚠️  Fee seems ${estimatedFee < 0.1 ? 'too low' : 'too high'}`);
    }
    
    return {
      fee: estimatedFee,
      size: tx.toCBOR().length / 2,
      feeRate: estimatedFee * 1_000_000 / (tx.toCBOR().length / 2),
      isReasonable: isReasonableFee
    };
  } catch (error) {
    console.error("❌ Fee estimation failed:", error);
    throw error;
  }
}

async function testTransactionSubmission(signedTx: any, txHash: TxHash, dryRun: boolean = true) {
  console.log("\n📡 Testing Transaction Submission...");
  
  if (dryRun) {
    console.log("🧪 DRY RUN MODE - Transaction will NOT be submitted to the network");
    console.log(`✅ Transaction ready for submission: ${txHash}`);
    console.log("💡 To actually submit, set dryRun=false");
    return { submitted: false, txHash, dryRun: true };
  }
  
  try {
    console.log("🚀 Submitting transaction to network...");
    const submittedTxHash = await signedTx.submit();
    
    console.log(`✅ Transaction submitted successfully!`);
    console.log(`🔗 Transaction Hash: ${submittedTxHash}`);
    console.log(`🌐 View on CardanoScan: https://preprod.cardanoscan.io/transaction/${submittedTxHash}`);
    
    return { submitted: true, txHash: submittedTxHash, dryRun: false };
  } catch (error) {
    console.error("❌ Transaction submission failed:", error);
    throw error;
  }
}

async function runSimpleTransferTest(dryRun: boolean = true) {
  console.log("🚀 PuckSwap v5 - Simple ADA Transfer Test\n");
  console.log("=" .repeat(50));
  
  if (dryRun) {
    console.log("🧪 RUNNING IN DRY RUN MODE - No actual transactions will be submitted\n");
  }
  
  try {
    // Step 1: Initialize Lucid
    console.log("🔧 Initializing Lucid Evolution...");
    const lucid = await createLucidInstance({ network: TEST_CONFIG.network });
    console.log("✅ Lucid Evolution initialized");
    
    // Step 2: Check if wallet is connected
    try {
      const address = await lucid.wallet.address();
      console.log(`✅ Wallet connected: ${address.slice(0, 20)}...`);
    } catch (error) {
      console.log("❌ No wallet connected. Please run wallet connection test first.");
      throw new Error("Wallet not connected");
    }
    
    // Step 3: Analyze UTxOs
    const utxoInfo = await testUTxOSelection(lucid);
    
    // Step 4: Estimate fees
    const feeInfo = await testFeeEstimation(lucid);
    
    // Step 5: Build transaction
    const tx = await testTransactionBuilding(lucid);
    
    // Step 6: Sign transaction
    const { signedTx, txHash } = await testTransactionSigning(tx);
    
    // Step 7: Submit transaction (or dry run)
    const submissionResult = await testTransactionSubmission(signedTx, txHash, dryRun);
    
    // Test Summary
    console.log("\n🎉 Test Summary:");
    console.log("=" .repeat(30));
    console.log(`✅ UTxO Analysis: ${utxoInfo.utxoCount} UTxOs, ${utxoInfo.totalBalance} ADA`);
    console.log(`✅ Fee Estimation: ${feeInfo.fee} ADA`);
    console.log(`✅ Transaction Built: ${feeInfo.size} bytes`);
    console.log(`✅ Transaction Signed: ${txHash.slice(0, 16)}...`);
    console.log(`✅ Submission: ${submissionResult.submitted ? 'Completed' : 'Dry Run'}`);
    
    console.log("\n✅ Simple transfer test completed successfully!");
    
    return {
      success: true,
      txHash,
      submitted: submissionResult.submitted,
      fee: feeInfo.fee,
      size: feeInfo.size
    };
    
  } catch (error) {
    console.error("\n❌ Simple transfer test failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
if (require.main === module) {
  // Default to dry run mode for safety
  const dryRun = process.argv.includes('--submit') ? false : true;
  runSimpleTransferTest(dryRun);
}

export { runSimpleTransferTest, testTransactionBuilding, testTransactionSigning };
