// PuckSwap v5 - Governance Transaction Builder
// Lucid Evolution transaction builders for DAO governance operations
// Full CIP-68 compliance with canonical master schema datum structures

import {
  Lucid,
  Data,
  UTxO,
  TxHash,
  Address,
  Assets,
  SpendingValidator,
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

// Canonical GovernanceAction from PuckSwap v5 Master Schema
export interface GovernanceAction {
  type: 'UpdateFee' | 'TreasuryPayout';
  parameters: {
    new_fee?: number;
    payout_value?: Assets;
  };
}

// Canonical Proposal from PuckSwap v5 Master Schema
export interface Proposal {
  proposal_id: number;
  action: GovernanceAction;
  votes_for: number;
  votes_against: number;
  executed: boolean;
}

// Canonical GovernanceDatum from PuckSwap v5 Master Schema
export interface GovernanceDatum {
  proposals: Proposal[];
}

// Canonical GovernanceRedeemer from PuckSwap v5 Master Schema
export interface GovernanceRedeemer {
  type: 'SubmitProposal' | 'CastVote' | 'ExecuteProposal';
  proposal?: Proposal;
  proposal_id?: number;
  vote_for?: boolean;
}

// Proposal creation parameters
export interface ProposalCreationParams {
  action: GovernanceAction;
  proposal_id: number;
}

// Voting parameters
export interface VotingParams {
  proposal_id: number;
  vote: 'for' | 'against';
}

// Governance transaction result
export interface GovernanceTransactionResult {
  txHash: TxHash;
  proposal_id?: number;
  action: 'SubmitProposal' | 'CastVote' | 'ExecuteProposal';
  details: any;
}

/**
 * Serialize GovernanceDatum according to canonical master schema
 */
function serializeGovernanceDatum(datum: GovernanceDatum): Data {
  const proposals = datum.proposals.map(proposal =>
    new Constr(0, [
      BigInt(proposal.proposal_id),
      serializeGovernanceAction(proposal.action),
      BigInt(proposal.votes_for),
      BigInt(proposal.votes_against),
      proposal.executed ? 1n : 0n
    ])
  );

  return Data.to(new Constr(0, [
    new Constr(0, proposals)
  ]));
}

/**
 * Serialize GovernanceAction according to canonical master schema
 */
function serializeGovernanceAction(action: GovernanceAction): Data {
  switch (action.type) {
    case 'UpdateFee':
      return new Constr(0, [BigInt(action.parameters.new_fee || 0)]);
    case 'TreasuryPayout':
      // Simplified payout value serialization
      const lovelaceAmount = action.parameters.payout_value?.lovelace || 0n;
      return new Constr(1, [lovelaceAmount]);
    default:
      throw new Error(`Unsupported governance action: ${action.type}`);
  }
}

/**
 * Serialize GovernanceRedeemer according to canonical master schema
 */
function serializeGovernanceRedeemer(redeemer: GovernanceRedeemer): Data {
  switch (redeemer.type) {
    case 'SubmitProposal':
      if (!redeemer.proposal) throw new Error("Proposal required for SubmitProposal redeemer");
      return Data.to(new Constr(0, [
        new Constr(0, [
          BigInt(redeemer.proposal.proposal_id),
          serializeGovernanceAction(redeemer.proposal.action),
          BigInt(redeemer.proposal.votes_for),
          BigInt(redeemer.proposal.votes_against),
          redeemer.proposal.executed ? 1n : 0n
        ])
      ]));
    case 'CastVote':
      if (redeemer.proposal_id === undefined || redeemer.vote_for === undefined) {
        throw new Error("proposal_id and vote_for required for CastVote redeemer");
      }
      return Data.to(new Constr(1, [
        BigInt(redeemer.proposal_id),
        redeemer.vote_for ? 1n : 0n
      ]));
    case 'ExecuteProposal':
      if (redeemer.proposal_id === undefined) {
        throw new Error("proposal_id required for ExecuteProposal redeemer");
      }
      return Data.to(new Constr(2, [
        BigInt(redeemer.proposal_id)
      ]));
    default:
      throw new Error(`Unsupported redeemer type: ${redeemer.type}`);
  }
}

/**
 * Parse GovernanceDatum from UTxO datum
 */
function parseGovernanceDatum(datum: Datum): GovernanceDatum | null {
  try {
    if (typeof datum === 'string') {
      const parsedDatum = Data.from(datum);
      return parseGovernanceDatumFromData(parsedDatum);
    }
    return null;
  } catch (error) {
    console.error("Error parsing governance datum:", error);
    return null;
  }
}

/**
 * Parse GovernanceDatum from Data structure
 */
function parseGovernanceDatumFromData(data: Data): GovernanceDatum {
  // Expecting Constr(0, [proposals_list])
  if (data instanceof Constr && data.index === 0 && data.fields.length === 1) {
    const proposalsList = data.fields[0];

    if (proposalsList instanceof Constr && proposalsList.index === 0) {
      const proposals: Proposal[] = proposalsList.fields.map((proposalData: any) => {
        if (proposalData instanceof Constr && proposalData.index === 0 && proposalData.fields.length === 5) {
          return {
            proposal_id: Number(proposalData.fields[0]),
            action: parseGovernanceActionFromData(proposalData.fields[1]),
            votes_for: Number(proposalData.fields[2]),
            votes_against: Number(proposalData.fields[3]),
            executed: proposalData.fields[4] === 1n
          };
        }
        throw new Error("Invalid proposal structure");
      });

      return { proposals };
    }
  }

  throw new Error("Invalid governance datum structure");
}

/**
 * Parse GovernanceAction from Data structure
 */
function parseGovernanceActionFromData(data: Data): GovernanceAction {
  if (data instanceof Constr) {
    switch (data.index) {
      case 0: // UpdateFee
        return {
          type: 'UpdateFee',
          parameters: { new_fee: Number(data.fields[0]) }
        };
      case 1: // TreasuryPayout
        return {
          type: 'TreasuryPayout',
          parameters: { payout_value: { lovelace: data.fields[0] as bigint } }
        };
      default:
        throw new Error(`Unknown governance action index: ${data.index}`);
    }
  }
  throw new Error("Invalid governance action structure");
}

/**
 * 1️⃣ proposeGovernance - Submit a new governance proposal
 *
 * @param params - Proposal creation parameters
 * @param governanceValidatorCbor - Governance validator CBOR hex
 * @param governanceAddress - Governance contract address
 * @param network - Cardano network (optional, defaults to Preprod)
 * @param walletName - Wallet to connect (optional)
 * @returns Transaction result with proposal details
 */
export async function proposeGovernance(
  params: ProposalCreationParams,
  governanceValidatorCbor: string,
  governanceAddress: Address,
  network?: "Mainnet" | "Preview" | "Preprod",
  walletName?: "eternl" | "nami" | "vespr" | "lace" | "typhon" | "flint"
): Promise<GovernanceTransactionResult> {
  // Use centralized environment configuration
  const envConfig = getEnvironmentConfig();
  const targetNetwork = network || envConfig.lucidNetwork;

  console.log(`🏛️ Initializing Governance Proposal on ${targetNetwork}...`);
  console.log(`📡 Using API Key: ${envConfig.blockfrostApiKey.substring(0, 8)}...`);

  // Connect wallet using Lucid Evolution's CIP-30 interface
  const lucid = await createLucidInstance(network ? { network } : undefined);

  if (walletName) {
    await connectWallet(lucid, walletName);
  }

  if (!lucid.wallet) {
    throw new Error("Wallet not connected. Please connect a wallet first.");
  }

  // Get governance UTxO
  const utxos = await lucid.utxosAt(governanceAddress);
  const governanceUtxo = utxos.find(utxo => utxo.datum);

  if (!governanceUtxo) {
    throw new Error("Governance UTxO not found at address");
  }

  // Parse current governance datum
  const currentDatum = parseGovernanceDatum(governanceUtxo.datum!);
  if (!currentDatum) {
    throw new Error("Invalid governance datum");
  }

  // Create new proposal with initialized vote counts
  const newProposal: Proposal = {
    proposal_id: params.proposal_id,
    action: params.action,
    votes_for: 0,
    votes_against: 0,
    executed: false
  };

  // Update GovernanceDatum to include new proposal
  const updatedDatum: GovernanceDatum = {
    proposals: [...currentDatum.proposals, newProposal]
  };

  // Serialize datum using Lucid Evolution's enhanced CIP-68 serialization
  const newDatumData = serializeGovernanceDatum(updatedDatum);

  // Create governance validator
  const governanceValidator: SpendingValidator = {
    type: "PlutusV2",
    script: governanceValidatorCbor
  };

  // Create redeemer for proposal submission
  const redeemer: GovernanceRedeemer = {
    type: 'SubmitProposal',
    proposal: newProposal
  };
  const redeemerData = serializeGovernanceRedeemer(redeemer);

  // Build transaction to submit new governance proposal
  const tx = await lucid.newTx()
    .collectFrom([governanceUtxo], redeemerData)
    .payToContract(governanceAddress, { inline: newDatumData }, governanceUtxo.assets)
    .attachSpendingValidator(governanceValidator)
    .validTo(Date.now() + 1200000) // 20 minute deadline
    .complete();

  // Sign and submit transaction
  const signedTx = await tx.sign().complete();
  const txHash = await signedTx.submit();

  return {
    txHash,
    proposal_id: params.proposal_id,
    action: 'SubmitProposal',
    details: {
      proposal: newProposal,
      action: params.action
    }
  };
}

/**
 * 2️⃣ voteOnProposal - Cast a vote on an existing governance proposal
 *
 * @param params - Voting parameters
 * @param governanceValidatorCbor - Governance validator CBOR hex
 * @param governanceAddress - Governance contract address
 * @param network - Cardano network (optional, defaults to Preprod)
 * @param walletName - Wallet to connect (optional)
 * @returns Transaction result with vote details
 */
export async function voteOnProposal(
  params: VotingParams,
  governanceValidatorCbor: string,
  governanceAddress: Address,
  network?: "Mainnet" | "Preview" | "Preprod",
  walletName?: "eternl" | "nami" | "vespr" | "lace" | "typhon" | "flint"
): Promise<GovernanceTransactionResult> {
  // Connect wallet using Lucid Evolution's CIP-30 interface
  const lucid = await createLucidInstance(network ? { network } : undefined);

  if (walletName) {
    await connectWallet(lucid, walletName);
  }

  if (!lucid.wallet) {
    throw new Error("Wallet not connected. Please connect a wallet first.");
  }

  // Get user address
  const userAddress = await lucid.wallet.address();

  // Locate GovernanceDatum UTxO and parse datum
  const utxos = await lucid.utxosAt(governanceAddress);
  const governanceUtxo = utxos.find(utxo => utxo.datum);

  if (!governanceUtxo) {
    throw new Error("Governance UTxO not found at address");
  }

  // Parse current governance datum
  const currentDatum = parseGovernanceDatum(governanceUtxo.datum!);
  if (!currentDatum) {
    throw new Error("Invalid governance datum");
  }

  // Validate that proposal_id exists
  const proposalIndex = currentDatum.proposals.findIndex(p => p.proposal_id === params.proposal_id);
  if (proposalIndex === -1) {
    throw new Error(`Proposal with ID ${params.proposal_id} not found`);
  }

  const proposal = currentDatum.proposals[proposalIndex];

  // Validate that proposal is not yet executed
  if (proposal.executed) {
    throw new Error(`Proposal ${params.proposal_id} has already been executed`);
  }

  // Note: Voter eligibility validation is assumed to be handled by off-chain frontend
  // In production, this would include checking governance token holdings, etc.

  // Update proposal vote tally in GovernanceDatum
  const updatedProposal: Proposal = {
    ...proposal,
    votes_for: proposal.votes_for + (params.vote === 'for' ? 1 : 0),
    votes_against: proposal.votes_against + (params.vote === 'against' ? 1 : 0)
  };

  // Create updated proposals array
  const updatedProposals = [...currentDatum.proposals];
  updatedProposals[proposalIndex] = updatedProposal;

  // Build transaction to update vote tally in GovernanceDatum
  const updatedDatum: GovernanceDatum = {
    proposals: updatedProposals
  };

  // Serialize datum using Lucid Evolution's enhanced CIP-68 serialization
  const newDatumData = serializeGovernanceDatum(updatedDatum);

  // Create governance validator
  const governanceValidator: SpendingValidator = {
    type: "PlutusV2",
    script: governanceValidatorCbor
  };

  // Create redeemer for voting
  const redeemer: GovernanceRedeemer = {
    type: 'CastVote',
    proposal_id: params.proposal_id,
    vote_for: params.vote === 'for'
  };
  const redeemerData = serializeGovernanceRedeemer(redeemer);

  // Build and complete transaction
  const tx = await lucid.newTx()
    .collectFrom([governanceUtxo], redeemerData)
    .payToContract(governanceAddress, { inline: newDatumData }, governanceUtxo.assets)
    .attachSpendingValidator(governanceValidator)
    .validTo(Date.now() + 1200000) // 20 minute deadline
    .complete();

  // Handle serialization, signing, and submission
  const signedTx = await tx.sign().complete();
  const txHash = await signedTx.submit();

  return {
    txHash,
    proposal_id: params.proposal_id,
    action: 'CastVote',
    details: {
      vote: params.vote,
      voter: userAddress,
      updated_votes_for: updatedProposal.votes_for,
      updated_votes_against: updatedProposal.votes_against
    }
  };
}






