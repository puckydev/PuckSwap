// PuckSwap v5 - Liquid Staking Transaction Builder
// Lucid Evolution transaction builders for pADA minting, deposits, withdrawals, and reward syncing
// Full CIP-68 compliance with master schema datum and redeemer structures

import {
  Lucid,
  Data,
  UTxO,
  TxHash,
  Address,
  Assets,
  SpendingValidator,
  MintingPolicy,
  PolicyId,
  Unit,
  TxComplete,
  OutRef,
  Datum,
  Redeemer,
  Constr,
  fromText,
  toText
} from "@lucid-evolution/lucid";

import { createLucidInstance, connectWallet } from "../lib/lucid-config";
import { getEnvironmentConfig, ENV_CONFIG } from "../lib/environment-config";

// Master Schema StakingDatum structure (CIP-68 compliant)
export interface StakingDatum {
  total_staked: bigint;
  total_pADA_minted: bigint;
  stake_pool_id: string;
  last_rewards_sync_slot: bigint;
}

// Master Schema StakingRedeemer structure
export interface StakingRedeemer {
  deposit: bigint | null;
  withdraw: bigint | null;
  sync: boolean;
}

// pADA Minting Redeemer structure
export interface PADAMintingRedeemer {
  mint_for_deposit?: {
    staking_validator_hash: string;
    deposit_amount: bigint;
  };
  burn_for_withdrawal?: {
    staking_validator_hash: string;
    withdrawal_amount: bigint;
  };
}

// Function parameter interfaces
export interface DepositStakingParams {
  adaAmount: bigint;
  minPADAOut: bigint;
  userAddress: Address;
  deadline?: number;
}

export interface WithdrawStakingParams {
  pADAAmount: bigint;
  minADAOut: bigint;
  userAddress: Address;
  deadline?: number;
}

export interface SyncStakingRewardsParams {
  newRewardsSlot: bigint;
  oracleAddress?: Address;
}

// CIP-68 Data Schemas for Lucid Evolution
const StakingDatumSchema = Data.Object({
  total_staked: Data.Integer(),
  total_pADA_minted: Data.Integer(),
  stake_pool_id: Data.Bytes(),
  last_rewards_sync_slot: Data.Integer()
});

const StakingRedeemerSchema = Data.Enum([
  Data.Object({
    deposit: Data.Nullable(Data.Integer()),
    withdraw: Data.Nullable(Data.Integer()),
    sync: Data.Literal(false)
  }),
  Data.Object({
    deposit: Data.Nullable(Data.Integer()),
    withdraw: Data.Nullable(Data.Integer()),
    sync: Data.Literal(true)
  })
]);

const PADAMintingRedeemerSchema = Data.Enum([
  Data.Object({
    mint_for_deposit: Data.Object({
      staking_validator_hash: Data.Bytes(),
      deposit_amount: Data.Integer()
    })
  }),
  Data.Object({
    burn_for_withdrawal: Data.Object({
      staking_validator_hash: Data.Bytes(),
      withdrawal_amount: Data.Integer()
    })
  })
]);

type StakingDatumType = Data.Static<typeof StakingDatumSchema>;
type StakingRedeemerType = Data.Static<typeof StakingRedeemerSchema>;
type PADAMintingRedeemerType = Data.Static<typeof PADAMintingRedeemerSchema>;

/**
 * 1️⃣ DEPOSIT STAKING
 * Connect wallet, locate StakingDatum UTxO, calculate pADA to mint,
 * build transaction with updated datum and pADA minting
 */
export async function depositStaking(
  stakingValidatorCbor: string,
  pADAMintingPolicyCbor: string,
  stakingAddress: Address,
  params: DepositStakingParams,
  walletName: "eternl" | "nami" | "vespr" | "lace" = "eternl"
): Promise<TxHash> {
  try {
    // Use centralized environment configuration
    const envConfig = getEnvironmentConfig();

    console.log("🏦 Starting ADA deposit for pADA minting...");
    console.log(`🌍 Network: ${envConfig.lucidNetwork}`);
    console.log(`📡 Using API Key: ${envConfig.blockfrostApiKey.substring(0, 8)}...`);

    // Initialize Lucid Evolution
    const lucid = await createLucidInstance();

    // Connect wallet using CIP-30 interface
    await connectWallet(lucid, walletName);
    console.log("✅ Wallet connected successfully");

    // Get user address using correct Lucid Evolution API
    const userAddress = params.userAddress || await lucid.wallet().address();
    console.log(`👤 User address: ${userAddress.slice(0, 20)}...`);

    // Locate staking UTxO at contract address
    const stakingUTxOs = await lucid.utxosAt(stakingAddress);
    if (stakingUTxOs.length === 0) {
      throw new Error("No staking UTxO found at contract address");
    }

    const stakingUTxO = stakingUTxOs[0];
    if (!stakingUTxO.datum) {
      throw new Error("Staking UTxO missing datum");
    }

    console.log(`📍 Found staking UTxO: ${stakingUTxO.txHash}#${stakingUTxO.outputIndex}`);

    // Parse current StakingDatum using CIP-68 serialization
    const currentDatum = Data.from(stakingUTxO.datum, StakingDatumSchema);
    console.log(`📊 Current total staked: ${Number(currentDatum.total_staked) / 1_000_000} ADA`);
    console.log(`🪙 Current total pADA minted: ${Number(currentDatum.total_pADA_minted) / 1_000_000} pADA`);

    // Calculate pADA to mint proportional to total_staked vs total_pADA_minted
    let pADAToMint: bigint;
    if (currentDatum.total_pADA_minted === 0n) {
      // Initial deposit - 1:1 ratio
      pADAToMint = params.adaAmount;
      console.log("🎯 Initial deposit - using 1:1 ratio");
    } else {
      // Calculate proportional amount: (adaAmount * total_pADA_minted) / total_staked
      pADAToMint = (params.adaAmount * currentDatum.total_pADA_minted) / currentDatum.total_staked;
      console.log(`🧮 Calculated pADA to mint: ${Number(pADAToMint) / 1_000_000} pADA`);
    }

    // Validate minimum pADA output
    if (pADAToMint < params.minPADAOut) {
      throw new Error(`Insufficient pADA output: expected ${params.minPADAOut}, got ${pADAToMint}`);
    }

    // Create updated StakingDatum with new totals
    const updatedDatum: StakingDatumType = {
      total_staked: currentDatum.total_staked + params.adaAmount,
      total_pADA_minted: currentDatum.total_pADA_minted + pADAToMint,
      stake_pool_id: currentDatum.stake_pool_id,
      last_rewards_sync_slot: currentDatum.last_rewards_sync_slot
    };

    console.log(`📈 Updated total staked: ${Number(updatedDatum.total_staked) / 1_000_000} ADA`);
    console.log(`📈 Updated total pADA minted: ${Number(updatedDatum.total_pADA_minted) / 1_000_000} pADA`);

    // Create spending validator and minting policy
    const stakingValidator: SpendingValidator = {
      type: "PlutusV2",
      script: stakingValidatorCbor
    };

    const pADAMintingPolicy: MintingPolicy = {
      type: "PlutusV2",
      script: pADAMintingPolicyCbor
    };

    // Create StakingRedeemer for deposit
    const stakingRedeemer: StakingRedeemerType = {
      deposit: params.adaAmount,
      withdraw: null,
      sync: false
    };

    // Create pADA minting redeemer
    const stakingValidatorHash = lucid.utils.validatorToScriptHash(stakingValidator);
    const pADAMintRedeemer: PADAMintingRedeemerType = {
      mint_for_deposit: {
        staking_validator_hash: fromText(stakingValidatorHash),
        deposit_amount: params.adaAmount
      }
    };

    // Calculate pADA policy ID and unit
    const pADAPolicyId = lucid.utils.mintingPolicyToId(pADAMintingPolicy);
    const pADAUnit = pADAPolicyId + fromText("pADA");

    // Build transaction assets
    const stakingOutputAssets: Assets = {
      lovelace: stakingUTxO.assets.lovelace + params.adaAmount,
      ...Object.fromEntries(
        Object.entries(stakingUTxO.assets).filter(([unit]) => unit !== "lovelace")
      )
    };

    // Ensure minimum ADA preservation (2 ADA minimum for contract UTxO)
    const minADARequired = 2_000_000n;
    if (stakingOutputAssets.lovelace < minADARequired) {
      stakingOutputAssets.lovelace = minADARequired;
    }

    console.log(`💰 Staking output ADA: ${Number(stakingOutputAssets.lovelace) / 1_000_000} ADA`);

    // Build and complete transaction
    const tx = await lucid.newTx()
      .collectFrom([stakingUTxO], Data.to(stakingRedeemer, StakingRedeemerSchema))
      .payToContract(
        stakingAddress,
        { inline: Data.to(updatedDatum, StakingDatumSchema) },
        stakingOutputAssets
      )
      .mintAssets(
        { [pADAUnit]: pADAToMint },
        Data.to(pADAMintRedeemer, PADAMintingRedeemerSchema)
      )
      .payToAddress(userAddress, { [pADAUnit]: pADAToMint })
      .attachSpendingValidator(stakingValidator)
      .attachMintingPolicy(pADAMintingPolicy)
      .validTo(Date.now() + (params.deadline || 1200000)) // 20 minute default deadline
      .complete();

    console.log("✅ Transaction built successfully");

    // Sign and submit transaction
    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();

    console.log(`🎉 Deposit transaction submitted: ${txHash}`);
    console.log(`💎 Minted ${Number(pADAToMint) / 1_000_000} pADA for ${Number(params.adaAmount) / 1_000_000} ADA`);

    return txHash;

  } catch (error) {
    console.error("❌ Error in depositStaking:", error);
    throw error;
  }
}

/**
 * 2️⃣ WITHDRAW STAKING
 * Connect wallet, locate staking UTxO, calculate ADA withdrawal amount,
 * build transaction with pADA burning and ADA withdrawal
 */
export async function withdrawStaking(
  stakingValidatorCbor: string,
  pADAMintingPolicyCbor: string,
  stakingAddress: Address,
  params: WithdrawStakingParams,
  walletName: "eternl" | "nami" | "vespr" | "lace" = "eternl"
): Promise<TxHash> {
  try {
    // Use centralized environment configuration
    const envConfig = getEnvironmentConfig();

    console.log("🏧 Starting pADA withdrawal for ADA...");
    console.log(`🌍 Network: ${envConfig.lucidNetwork}`);
    console.log(`📡 Using API Key: ${envConfig.blockfrostApiKey.substring(0, 8)}...`);

    // Initialize Lucid Evolution
    const lucid = await createLucidInstance();

    // Connect wallet using CIP-30 interface
    await connectWallet(lucid, walletName);
    console.log("✅ Wallet connected successfully");

    // Get user address
    const userAddress = params.userAddress || await lucid.wallet.address();
    console.log(`👤 User address: ${userAddress.slice(0, 20)}...`);

    // Locate staking UTxO at contract address
    const stakingUTxOs = await lucid.utxosAt(stakingAddress);
    if (stakingUTxOs.length === 0) {
      throw new Error("No staking UTxO found at contract address");
    }

    const stakingUTxO = stakingUTxOs[0];
    if (!stakingUTxO.datum) {
      throw new Error("Staking UTxO missing datum");
    }

    console.log(`📍 Found staking UTxO: ${stakingUTxO.txHash}#${stakingUTxO.outputIndex}`);

    // Parse current StakingDatum using CIP-68 serialization
    const currentDatum = Data.from(stakingUTxO.datum, StakingDatumSchema);
    console.log(`📊 Current total staked: ${Number(currentDatum.total_staked) / 1_000_000} ADA`);
    console.log(`🪙 Current total pADA minted: ${Number(currentDatum.total_pADA_minted) / 1_000_000} pADA`);

    // Calculate ADA withdrawal amount based on pADA burned
    if (currentDatum.total_pADA_minted === 0n) {
      throw new Error("No pADA tokens in circulation");
    }

    // Calculate proportional ADA: (pADAAmount * total_staked) / total_pADA_minted
    const adaToWithdraw = (params.pADAAmount * currentDatum.total_staked) / currentDatum.total_pADA_minted;
    console.log(`🧮 Calculated ADA to withdraw: ${Number(adaToWithdraw) / 1_000_000} ADA`);

    // Validate minimum ADA output
    if (adaToWithdraw < params.minADAOut) {
      throw new Error(`Insufficient ADA output: expected ${params.minADAOut}, got ${adaToWithdraw}`);
    }

    // Create updated StakingDatum with decreased totals
    const updatedDatum: StakingDatumType = {
      total_staked: currentDatum.total_staked - adaToWithdraw,
      total_pADA_minted: currentDatum.total_pADA_minted - params.pADAAmount,
      stake_pool_id: currentDatum.stake_pool_id,
      last_rewards_sync_slot: currentDatum.last_rewards_sync_slot
    };

    console.log(`📉 Updated total staked: ${Number(updatedDatum.total_staked) / 1_000_000} ADA`);
    console.log(`📉 Updated total pADA minted: ${Number(updatedDatum.total_pADA_minted) / 1_000_000} pADA`);

    // Create spending validator and minting policy
    const stakingValidator: SpendingValidator = {
      type: "PlutusV2",
      script: stakingValidatorCbor
    };

    const pADAMintingPolicy: MintingPolicy = {
      type: "PlutusV2",
      script: pADAMintingPolicyCbor
    };

    // Create StakingRedeemer for withdrawal
    const stakingRedeemer: StakingRedeemerType = {
      deposit: null,
      withdraw: params.pADAAmount,
      sync: false
    };

    // Create pADA burning redeemer
    const stakingValidatorHash = lucid.utils.validatorToScriptHash(stakingValidator);
    const pADABurnRedeemer: PADAMintingRedeemerType = {
      burn_for_withdrawal: {
        staking_validator_hash: fromText(stakingValidatorHash),
        withdrawal_amount: params.pADAAmount
      }
    };

    // Calculate pADA policy ID and unit
    const pADAPolicyId = lucid.utils.mintingPolicyToId(pADAMintingPolicy);
    const pADAUnit = pADAPolicyId + fromText("pADA");

    // Build transaction assets (remove ADA from staking contract)
    const stakingOutputAssets: Assets = {
      lovelace: stakingUTxO.assets.lovelace - adaToWithdraw,
      ...Object.fromEntries(
        Object.entries(stakingUTxO.assets).filter(([unit]) => unit !== "lovelace")
      )
    };

    // Ensure minimum ADA preservation (2 ADA minimum for contract UTxO)
    const minADARequired = 2_000_000n;
    if (stakingOutputAssets.lovelace < minADARequired) {
      stakingOutputAssets.lovelace = minADARequired;
    }

    console.log(`💰 Staking output ADA: ${Number(stakingOutputAssets.lovelace) / 1_000_000} ADA`);

    // Build and complete transaction
    const tx = await lucid.newTx()
      .collectFrom([stakingUTxO], Data.to(stakingRedeemer, StakingRedeemerSchema))
      .payToContract(
        stakingAddress,
        { inline: Data.to(updatedDatum, StakingDatumSchema) },
        stakingOutputAssets
      )
      .mintAssets(
        { [pADAUnit]: -params.pADAAmount }, // Negative for burning
        Data.to(pADABurnRedeemer, PADAMintingRedeemerSchema)
      )
      .payToAddress(userAddress, { lovelace: adaToWithdraw })
      .attachSpendingValidator(stakingValidator)
      .attachMintingPolicy(pADAMintingPolicy)
      .validTo(Date.now() + (params.deadline || 1200000)) // 20 minute default deadline
      .complete();

    console.log("✅ Transaction built successfully");

    // Sign and submit transaction
    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();

    console.log(`🎉 Withdrawal transaction submitted: ${txHash}`);
    console.log(`💰 Withdrew ${Number(adaToWithdraw) / 1_000_000} ADA for ${Number(params.pADAAmount) / 1_000_000} pADA`);

    return txHash;

  } catch (error) {
    console.error("❌ Error in withdrawStaking:", error);
    throw error;
  }
}

/**
 * 3️⃣ SYNC STAKING REWARDS
 * Build reward synchronization transaction to update last_rewards_sync_slot
 * Allow oracle/admin trigger for reward syncing
 */
export async function syncStakingRewards(
  stakingValidatorCbor: string,
  stakingAddress: Address,
  params: SyncStakingRewardsParams,
  walletName: "eternl" | "nami" | "vespr" | "lace" = "eternl"
): Promise<TxHash> {
  try {
    console.log("🔄 Starting staking rewards synchronization...");

    // Initialize Lucid Evolution
    const lucid = await createLucidInstance();

    // Connect wallet using CIP-30 interface
    await connectWallet(lucid, walletName);
    console.log("✅ Wallet connected successfully");

    // Get user address (oracle/admin)
    const userAddress = params.oracleAddress || await lucid.wallet.address();
    console.log(`👤 Oracle/Admin address: ${userAddress.slice(0, 20)}...`);

    // Locate staking UTxO at contract address
    const stakingUTxOs = await lucid.utxosAt(stakingAddress);
    if (stakingUTxOs.length === 0) {
      throw new Error("No staking UTxO found at contract address");
    }

    const stakingUTxO = stakingUTxOs[0];
    if (!stakingUTxO.datum) {
      throw new Error("Staking UTxO missing datum");
    }

    console.log(`📍 Found staking UTxO: ${stakingUTxO.txHash}#${stakingUTxO.outputIndex}`);

    // Parse current StakingDatum using CIP-68 serialization
    const currentDatum = Data.from(stakingUTxO.datum, StakingDatumSchema);
    console.log(`📊 Current last rewards sync slot: ${currentDatum.last_rewards_sync_slot}`);
    console.log(`🔄 New rewards sync slot: ${params.newRewardsSlot}`);

    // Validate that new slot is greater than current
    if (params.newRewardsSlot <= currentDatum.last_rewards_sync_slot) {
      throw new Error(`New rewards slot must be greater than current: ${params.newRewardsSlot} <= ${currentDatum.last_rewards_sync_slot}`);
    }

    // Create updated StakingDatum with new rewards sync slot
    const updatedDatum: StakingDatumType = {
      total_staked: currentDatum.total_staked,
      total_pADA_minted: currentDatum.total_pADA_minted,
      stake_pool_id: currentDatum.stake_pool_id,
      last_rewards_sync_slot: params.newRewardsSlot
    };

    console.log(`✅ Updated last rewards sync slot: ${updatedDatum.last_rewards_sync_slot}`);

    // Create spending validator
    const stakingValidator: SpendingValidator = {
      type: "PlutusV2",
      script: stakingValidatorCbor
    };

    // Create StakingRedeemer for sync
    const stakingRedeemer: StakingRedeemerType = {
      deposit: null,
      withdraw: null,
      sync: true
    };

    // Build transaction assets (no change in assets for sync)
    const stakingOutputAssets: Assets = { ...stakingUTxO.assets };

    // Ensure minimum ADA preservation (2 ADA minimum for contract UTxO)
    const minADARequired = 2_000_000n;
    if (stakingOutputAssets.lovelace < minADARequired) {
      stakingOutputAssets.lovelace = minADARequired;
    }

    console.log(`💰 Staking output ADA: ${Number(stakingOutputAssets.lovelace) / 1_000_000} ADA`);

    // Build and complete transaction
    const tx = await lucid.newTx()
      .collectFrom([stakingUTxO], Data.to(stakingRedeemer, StakingRedeemerSchema))
      .payToContract(
        stakingAddress,
        { inline: Data.to(updatedDatum, StakingDatumSchema) },
        stakingOutputAssets
      )
      .attachSpendingValidator(stakingValidator)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    console.log("✅ Transaction built successfully");

    // Sign and submit transaction
    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();

    console.log(`🎉 Rewards sync transaction submitted: ${txHash}`);
    console.log(`🔄 Updated rewards sync slot to: ${params.newRewardsSlot}`);

    return txHash;

  } catch (error) {
    console.error("❌ Error in syncStakingRewards:", error);
    throw error;
  }
}

/**
 * UTILITY FUNCTIONS
 * Helper functions for staking operations
 */

// Get current StakingDatum from contract address
export async function getStakingDatum(
  stakingAddress: Address,
  walletName: "eternl" | "nami" | "vespr" | "lace" = "eternl"
): Promise<StakingDatum | null> {
  try {
    const lucid = await createLucidInstance();
    await connectWallet(lucid, walletName);

    const stakingUTxOs = await lucid.utxosAt(stakingAddress);
    if (stakingUTxOs.length === 0) {
      return null;
    }

    const stakingUTxO = stakingUTxOs[0];
    if (!stakingUTxO.datum) {
      return null;
    }

    const datum = Data.from(stakingUTxO.datum, StakingDatumSchema);
    return {
      total_staked: datum.total_staked,
      total_pADA_minted: datum.total_pADA_minted,
      stake_pool_id: toText(datum.stake_pool_id),
      last_rewards_sync_slot: datum.last_rewards_sync_slot
    };
  } catch (error) {
    console.error("Error getting staking datum:", error);
    return null;
  }
}

// Get user's pADA balance
export async function getUserPADABalance(
  pADAMintingPolicyCbor: string,
  walletName: "eternl" | "nami" | "vespr" | "lace" = "eternl"
): Promise<bigint> {
  try {
    const lucid = await createLucidInstance();
    await connectWallet(lucid, walletName);

    const pADAMintingPolicy: MintingPolicy = {
      type: "PlutusV2",
      script: pADAMintingPolicyCbor
    };

    const pADAPolicyId = lucid.utils.mintingPolicyToId(pADAMintingPolicy);
    const pADAUnit = pADAPolicyId + fromText("pADA");

    const userUTxOs = await lucid.wallet().getUtxos();
    let totalPADA = 0n;

    for (const utxo of userUTxOs) {
      if (utxo.assets[pADAUnit]) {
        totalPADA += BigInt(utxo.assets[pADAUnit]);
      }
    }

    return totalPADA;
  } catch (error) {
    console.error("Error getting user pADA balance:", error);
    return 0n;
  }
}

// Calculate current exchange rate (pADA to ADA)
export function calculateExchangeRate(stakingDatum: StakingDatum): number {
  if (stakingDatum.total_pADA_minted === 0n) {
    return 1.0; // Initial 1:1 ratio
  }

  return Number(stakingDatum.total_staked) / Number(stakingDatum.total_pADA_minted);
}

// Calculate pADA to mint for a given ADA amount
export function calculatePADAToMint(adaAmount: bigint, stakingDatum: StakingDatum): bigint {
  if (stakingDatum.total_pADA_minted === 0n) {
    // Initial deposit - 1:1 ratio
    return adaAmount;
  } else {
    // Calculate proportional amount: (adaAmount * total_pADA_minted) / total_staked
    return (adaAmount * stakingDatum.total_pADA_minted) / stakingDatum.total_staked;
  }
}

// Calculate ADA to withdraw for a given pADA amount
export function calculateADAToWithdraw(pADAAmount: bigint, stakingDatum: StakingDatum): bigint {
  if (stakingDatum.total_pADA_minted === 0n) {
    return 0n;
  } else {
    // Calculate proportional amount: (pADAAmount * total_staked) / total_pADA_minted
    return (pADAAmount * stakingDatum.total_staked) / stakingDatum.total_pADA_minted;
  }
}



