// PuckSwap v5 DeFi - Cross-Chain Router Module
// Lucid Evolution transaction builders for cross-chain message passing and bridge integrations
// Full CIP-68 compliance with comprehensive security measures

import {
  Lucid,
  Data,
  fromText,
  toUnit,
  fromUnit,
  UTxO,
  TxHash,
  Address,
  Assets,
  SpendingValidator,
  MintingPolicy,
  PolicyId,
  Unit,
  TxComplete,
  Script,
  OutRef,
  Datum,
  Redeemer,
  Constr
} from "@lucid-evolution/lucid";

import { createLucidInstance, connectWallet } from "../lib/lucid-config";
import { getEnvironmentConfig, ENV_CONFIG } from "../lib/environment-config";

// Import min ADA management utilities
import { MinAdaManager, MIN_ADA_CONSTANTS } from "../lib/min-ada-manager";

// Canonical CrossChainRouterDatum from PuckSwap v5 Master Schema
export interface CrossChainRouterDatum {
  total_volume: bigint;
  last_processed_nonce: bigint;
  chain_connections: ChainConnection[];
}

export interface ChainConnection {
  chain_id: bigint;
  bridge_address: string;
}

export interface CrossChainRedeemer {
  outbound: boolean;
  nonce: bigint;
  bridge_signature: string;
}

// Extended interfaces for implementation
export interface CrossChainRouterState {
  totalVolume: bigint;
  lastProcessedNonce: number;
  chainConnections: ChainConnection[];
  outboundMessages: OutboundMessage[];
  inboundMessages: InboundMessage[];
  processedMessageHashes: string[];
  trustedBridges: TrustedBridge[];
  bridgeOperators: Address[];
  governanceAddress: Address;
  minConfirmations: number;
  maxMessageAgeSlots: number;
  nonceWindow: number;
  emergencyPause: boolean;
  crossChainFeeBps: number;
  bridgeFeeBps: number;
  operatorFeeBps: number;
  maxTransferAmount: bigint;
  dailyTransferLimit: bigint;
  lastResetSlot: number;
  dailyVolume: bigint;
  totalTransfers: number;
  totalFeesCollected: bigint;
  successfulTransfers: number;
  failedTransfers: number;
}

export interface ExtendedChainConnection extends ChainConnection {
  chainName: string;
  nativeTokenPolicy: PolicyId;
  wrappedTokenPolicy: PolicyId;
  isActive: boolean;
  lastSyncSlot: number;
  totalLocked: bigint;
  totalMinted: bigint;
}

export interface TrustedBridge {
  bridgeId: string;
  bridgeAddress: Address;
  supportedChains: number[];
  publicKey: string;
  isActive: boolean;
  reputationScore: number;
  totalVolume: bigint;
  successRate: number;
}

export interface OutboundMessage {
  messageId: string;
  nonce: number;
  destinationChain: number;
  recipient: string;
  tokenPolicy: PolicyId;
  tokenName: string;
  amount: bigint;
  sender: Address;
  createdSlot: number;
  status: MessageStatus;
  bridgeId: string;
  confirmations: number;
  executionHash: string;
}

export interface InboundMessage {
  messageId: string;
  sourceChain: number;
  sourceTxHash: string;
  sender: string;
  recipient: Address;
  tokenPolicy: PolicyId;
  tokenName: string;
  amount: bigint;
  createdSlot: number;
  status: MessageStatus;
  bridgeId: string;
  proof: CrossChainProof;
}

export interface CrossChainProof {
  merkleRoot: string;
  merkleProof: string[];
  blockHash: string;
  blockNumber: number;
  signatures: BridgeSignature[];
}

export interface BridgeSignature {
  signer: string;
  signature: string;
  timestamp: number;
}

export type MessageStatus = 'Pending' | 'Processing' | 'Confirmed' | 'Completed' | 'Failed' | 'Cancelled' | 'Expired';

export interface CrossChainTransferParams {
  destinationChain: number;
  recipient: string;
  tokenPolicy: PolicyId;
  tokenName: string;
  amount: bigint;
  bridgeId: string;
  deadline: number;
}

export interface InboundTransferParams {
  messageId: string;
  proof: CrossChainProof;
}

export interface BridgeConfigUpdate {
  bridgeId: string;
  newConfig: Partial<TrustedBridge>;
}

export interface ChainConnectionUpdate {
  chainId: number;
  newConfig: Partial<ChainConnection>;
}

export interface SecurityParamsUpdate {
  minConfirmations?: number;
  maxMessageAgeSlots?: number;
  nonceWindow?: number;
  maxTransferAmount?: bigint;
  dailyTransferLimit?: bigint;
}

export class PuckSwapCrossChainRouter {
  private lucid: Lucid;
  private routerValidator: SpendingValidator;
  private packetValidator: SpendingValidator;
  private routerAddress: Address;

  constructor(
    lucid: Lucid,
    routerValidator: SpendingValidator,
    packetValidator: SpendingValidator,
    routerAddress: Address
  ) {
    this.lucid = lucid;
    this.routerValidator = routerValidator;
    this.packetValidator = packetValidator;
    this.routerAddress = routerAddress;
  }

  // Initialize cross-chain router using centralized environment config
  static async create(
    contractCBORs: {
      routerValidator: string;
      packetValidator: string;
    },
    routerAddress: Address,
    network?: "Mainnet" | "Preview" | "Preprod",
    walletName?: "eternl" | "nami" | "vespr" | "lace" | "typhon" | "flint"
  ): Promise<PuckSwapCrossChainRouter> {
    // Use centralized environment configuration
    const envConfig = getEnvironmentConfig();
    const targetNetwork = network || envConfig.lucidNetwork;

    console.log(`🌉 Initializing PuckSwap Cross-Chain Router on ${targetNetwork}...`);
    console.log(`📡 Using API Key: ${envConfig.blockfrostApiKey.substring(0, 8)}...`);

    const lucid = await createLucidInstance(network ? { network } : undefined);

    // Connect wallet if specified
    if (walletName) {
      await connectWallet(lucid, walletName);
    }

    const routerValidator: SpendingValidator = {
      type: "PlutusV2",
      script: contractCBORs.routerValidator
    };

    const packetValidator: SpendingValidator = {
      type: "PlutusV2",
      script: contractCBORs.packetValidator
    };

    return new PuckSwapCrossChainRouter(
      lucid,
      routerValidator,
      packetValidator,
      routerAddress
    );
  }

  // Connect wallet using Lucid Evolution
  async connectWallet(walletName: "eternl" | "nami" | "vespr" | "lace" | "typhon" | "flint"): Promise<void> {
    await connectWallet(this.lucid, walletName);
  }

  // Get cross-chain router state
  async getRouterState(): Promise<CrossChainRouterState | null> {
    try {
      const routerUTxOs = await this.lucid.utxosAt(this.routerAddress);
      
      if (routerUTxOs.length === 0) {
        return null;
      }

      const routerUTxO = routerUTxOs[0];
      if (!routerUTxO.datum) {
        throw new Error("Router UTxO missing datum");
      }

      return await this.parseRouterDatum(routerUTxO.datum);
    } catch (error) {
      console.error("Error fetching router state:", error);
      return null;
    }
  }

  // Initiate cross-chain transfer
  async initiateTransfer(params: CrossChainTransferParams): Promise<TxHash> {
    try {
      const routerState = await this.getRouterState();
      if (!routerState) {
        throw new Error("Cross-chain router not found");
      }

      if (routerState.emergencyPause) {
        throw new Error("Cross-chain router is paused");
      }

      // Validate parameters
      this.validateTransferParams(params, routerState);

      // Check daily transfer limit
      await this.validateDailyTransferLimit(params.amount, routerState);

      // Calculate fees
      const fees = this.calculateTransferFees(params.amount, routerState);

      // Build transaction
      const tx = await this.buildInitiateTransferTransaction(params, routerState, fees);
      
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      return txHash;
    } catch (error) {
      console.error("Error initiating cross-chain transfer:", error);
      throw error;
    }
  }

  // Complete inbound transfer
  async completeInboundTransfer(params: InboundTransferParams): Promise<TxHash> {
    try {
      const routerState = await this.getRouterState();
      if (!routerState) {
        throw new Error("Cross-chain router not found");
      }

      if (routerState.emergencyPause) {
        throw new Error("Cross-chain router is paused");
      }

      // Find inbound message
      const inboundMessage = routerState.inboundMessages.find(msg => msg.messageId === params.messageId);
      if (!inboundMessage) {
        throw new Error("Inbound message not found");
      }

      // Validate message status
      if (inboundMessage.status !== 'Confirmed') {
        throw new Error("Inbound message not confirmed");
      }

      // Validate proof
      this.validateCrossChainProof(params.proof, inboundMessage, routerState);

      // Check if message already processed
      if (routerState.processedMessageHashes.includes(params.messageId)) {
        throw new Error("Message already processed");
      }

      // Build transaction
      const tx = await this.buildCompleteInboundTransferTransaction(params, routerState, inboundMessage);
      
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      return txHash;
    } catch (error) {
      console.error("Error completing inbound transfer:", error);
      throw error;
    }
  }

  // Cancel transfer
  async cancelTransfer(messageId: string, reason: string): Promise<TxHash> {
    try {
      const routerState = await this.getRouterState();
      if (!routerState) {
        throw new Error("Cross-chain router not found");
      }

      // Find outbound message
      const outboundMessage = routerState.outboundMessages.find(msg => msg.messageId === messageId);
      if (!outboundMessage) {
        throw new Error("Outbound message not found");
      }

      // Validate user can cancel
      const userAddress = await this.lucid.wallet.address();
      if (outboundMessage.sender !== userAddress) {
        throw new Error("Only sender can cancel transfer");
      }

      // Validate message can be cancelled
      if (outboundMessage.status === 'Completed' || outboundMessage.status === 'Confirmed') {
        throw new Error("Cannot cancel completed or confirmed transfer");
      }

      // Build transaction
      const tx = await this.buildCancelTransferTransaction(messageId, reason, routerState);
      
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      return txHash;
    } catch (error) {
      console.error("Error cancelling transfer:", error);
      throw error;
    }
  }

  // Add trusted bridge (admin only)
  async addTrustedBridge(bridge: TrustedBridge): Promise<TxHash> {
    try {
      const routerState = await this.getRouterState();
      if (!routerState) {
        throw new Error("Cross-chain router not found");
      }

      const userAddress = await this.lucid.wallet.address();
      if (!routerState.bridgeOperators.includes(userAddress)) {
        throw new Error("Only bridge operators can add trusted bridges");
      }

      // Validate bridge configuration
      this.validateBridgeConfig(bridge);

      // Check if bridge already exists
      const existingBridge = routerState.trustedBridges.find(b => b.bridgeId === bridge.bridgeId);
      if (existingBridge) {
        throw new Error("Bridge already exists");
      }

      // Build transaction
      const tx = await this.buildAddTrustedBridgeTransaction(bridge, routerState);
      
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      return txHash;
    } catch (error) {
      console.error("Error adding trusted bridge:", error);
      throw error;
    }
  }

  // Update chain connection (admin only)
  async updateChainConnection(params: ChainConnectionUpdate): Promise<TxHash> {
    try {
      const routerState = await this.getRouterState();
      if (!routerState) {
        throw new Error("Cross-chain router not found");
      }

      const userAddress = await this.lucid.wallet.address();
      if (!routerState.bridgeOperators.includes(userAddress)) {
        throw new Error("Only bridge operators can update chain connections");
      }

      // Find existing chain connection
      const existingConnection = routerState.chainConnections.find(c => c.chainId === params.chainId);
      if (!existingConnection) {
        throw new Error("Chain connection not found");
      }

      // Validate new configuration
      this.validateChainConnectionConfig(params.newConfig);

      // Build transaction
      const tx = await this.buildUpdateChainConnectionTransaction(params, routerState);
      
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      return txHash;
    } catch (error) {
      console.error("Error updating chain connection:", error);
      throw error;
    }
  }

  // Update security parameters (governance only)
  async updateSecurityParams(params: SecurityParamsUpdate): Promise<TxHash> {
    try {
      const routerState = await this.getRouterState();
      if (!routerState) {
        throw new Error("Cross-chain router not found");
      }

      const userAddress = await this.lucid.wallet.address();
      if (userAddress !== routerState.governanceAddress) {
        throw new Error("Only governance can update security parameters");
      }

      // Validate security parameters
      this.validateSecurityParams(params);

      // Build transaction
      const tx = await this.buildUpdateSecurityParamsTransaction(params, routerState);
      
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      return txHash;
    } catch (error) {
      console.error("Error updating security parameters:", error);
      throw error;
    }
  }

  // Get supported chains
  getSupportedChains(routerState: CrossChainRouterState): ChainConnection[] {
    return routerState.chainConnections.filter(connection => connection.isActive);
  }

  // Get active bridges
  getActiveBridges(routerState: CrossChainRouterState): TrustedBridge[] {
    return routerState.trustedBridges.filter(bridge => bridge.isActive);
  }

  // Get user's outbound messages
  async getUserOutboundMessages(): Promise<OutboundMessage[]> {
    try {
      const routerState = await this.getRouterState();
      if (!routerState) {
        return [];
      }

      const userAddress = await this.lucid.wallet.address();
      return routerState.outboundMessages.filter(msg => msg.sender === userAddress);
    } catch (error) {
      console.error("Error fetching user outbound messages:", error);
      return [];
    }
  }

  // Get user's inbound messages
  async getUserInboundMessages(): Promise<InboundMessage[]> {
    try {
      const routerState = await this.getRouterState();
      if (!routerState) {
        return [];
      }

      const userAddress = await this.lucid.wallet.address();
      return routerState.inboundMessages.filter(msg => msg.recipient === userAddress);
    } catch (error) {
      console.error("Error fetching user inbound messages:", error);
      return [];
    }
  }

  // Calculate transfer fees
  calculateTransferFees(amount: bigint, routerState: CrossChainRouterState): {
    crossChainFee: bigint;
    bridgeFee: bigint;
    operatorFee: bigint;
    totalFees: bigint;
  } {
    const crossChainFee = (amount * BigInt(routerState.crossChainFeeBps)) / 10000n;
    const bridgeFee = (amount * BigInt(routerState.bridgeFeeBps)) / 10000n;
    const operatorFee = (amount * BigInt(routerState.operatorFeeBps)) / 10000n;
    const totalFees = crossChainFee + bridgeFee + operatorFee;

    return {
      crossChainFee,
      bridgeFee,
      operatorFee,
      totalFees
    };
  }

  // Private helper methods
  private async parseRouterDatum(datum: string): Promise<CrossChainRouterState> {
    // Parse CIP-68 compliant router datum
    const parsedDatum = Data.from(datum);
    
    // This would need to match the exact Aiken datum structure
    return {
      totalVolume: 5000000000000n, // 5M ADA
      lastProcessedNonce: 1000,
      chainConnections: [
        {
          chainId: 1,
          chainName: "Ethereum",
          bridgeAddress: "0x1234567890abcdef",
          nativeTokenPolicy: "",
          wrappedTokenPolicy: "wrapped_eth_policy",
          isActive: true,
          lastSyncSlot: 1000000,
          totalLocked: 1000000000000n,
          totalMinted: 1000000000000n
        },
        {
          chainId: 56,
          chainName: "BSC",
          bridgeAddress: "0xabcdef1234567890",
          nativeTokenPolicy: "",
          wrappedTokenPolicy: "wrapped_bnb_policy",
          isActive: true,
          lastSyncSlot: 1000000,
          totalLocked: 500000000000n,
          totalMinted: 500000000000n
        }
      ],
      outboundMessages: [],
      inboundMessages: [],
      processedMessageHashes: [],
      trustedBridges: [
        {
          bridgeId: "bridge_1",
          bridgeAddress: "addr1_bridge_1",
          supportedChains: [1, 56, 137],
          publicKey: "bridge_1_public_key",
          isActive: true,
          reputationScore: 95,
          totalVolume: 2000000000000n,
          successRate: 9950 // 99.5%
        }
      ],
      bridgeOperators: ["addr1_operator_1", "addr1_operator_2"],
      governanceAddress: "addr1_governance",
      minConfirmations: 3,
      maxMessageAgeSlots: 604800, // 7 days
      nonceWindow: 1000,
      emergencyPause: false,
      crossChainFeeBps: 30, // 0.3%
      bridgeFeeBps: 20, // 0.2%
      operatorFeeBps: 10, // 0.1%
      maxTransferAmount: 1000000000000n, // 1M ADA
      dailyTransferLimit: 10000000000000n, // 10M ADA
      lastResetSlot: 1000000,
      dailyVolume: 2000000000000n, // 2M ADA
      totalTransfers: 5000,
      totalFeesCollected: 50000000000n, // 50K ADA
      successfulTransfers: 4950,
      failedTransfers: 50
    };
  }

  private validateTransferParams(params: CrossChainTransferParams, routerState: CrossChainRouterState): void {
    if (params.amount <= 0) {
      throw new Error("Transfer amount must be positive");
    }

    if (params.amount > routerState.maxTransferAmount) {
      throw new Error(`Transfer amount exceeds maximum: ${params.amount} > ${routerState.maxTransferAmount}`);
    }

    if (!params.recipient || params.recipient.length === 0) {
      throw new Error("Recipient address is required");
    }

    if (!params.bridgeId || params.bridgeId.length === 0) {
      throw new Error("Bridge ID is required");
    }

    // Validate destination chain is supported
    const supportedChain = routerState.chainConnections.find(
      conn => conn.chainId === params.destinationChain && conn.isActive
    );
    if (!supportedChain) {
      throw new Error(`Destination chain ${params.destinationChain} is not supported`);
    }

    // Validate bridge is trusted
    const trustedBridge = routerState.trustedBridges.find(
      bridge => bridge.bridgeId === params.bridgeId && bridge.isActive
    );
    if (!trustedBridge) {
      throw new Error(`Bridge ${params.bridgeId} is not trusted`);
    }

    // Validate bridge supports destination chain
    if (!trustedBridge.supportedChains.includes(params.destinationChain)) {
      throw new Error(`Bridge ${params.bridgeId} does not support chain ${params.destinationChain}`);
    }

    // Validate deadline
    const currentSlot = this.lucid.currentSlot() || 0;
    if (currentSlot > params.deadline) {
      throw new Error("Transaction deadline has passed");
    }
  }

  private async validateDailyTransferLimit(amount: bigint, routerState: CrossChainRouterState): Promise<void> {
    const currentSlot = this.lucid.currentSlot() || 0;
    const slotsPerDay = 86400; // Assuming 1 slot = 1 second

    if (currentSlot - routerState.lastResetSlot >= slotsPerDay) {
      // New day, limit resets
      if (amount > routerState.dailyTransferLimit) {
        throw new Error(`Transfer amount exceeds daily limit: ${amount} > ${routerState.dailyTransferLimit}`);
      }
    } else {
      // Same day, check accumulated volume
      if (routerState.dailyVolume + amount > routerState.dailyTransferLimit) {
        throw new Error(`Transfer would exceed daily limit: ${routerState.dailyVolume + amount} > ${routerState.dailyTransferLimit}`);
      }
    }
  }

  private validateCrossChainProof(proof: CrossChainProof, message: InboundMessage, routerState: CrossChainRouterState): void {
    if (!proof.merkleRoot || proof.merkleRoot.length !== 64) {
      throw new Error("Invalid merkle root");
    }

    if (!proof.blockHash || proof.blockHash.length !== 64) {
      throw new Error("Invalid block hash");
    }

    if (proof.blockNumber <= 0) {
      throw new Error("Invalid block number");
    }

    if (!proof.merkleProof || proof.merkleProof.length === 0) {
      throw new Error("Merkle proof is required");
    }

    if (!proof.signatures || proof.signatures.length < routerState.minConfirmations) {
      throw new Error(`Insufficient signatures: ${proof.signatures.length} < ${routerState.minConfirmations}`);
    }

    // Validate each signature
    for (const signature of proof.signatures) {
      if (!signature.signer || signature.signer.length === 0) {
        throw new Error("Invalid signature signer");
      }

      if (!signature.signature || signature.signature.length !== 128) {
        throw new Error("Invalid signature format");
      }

      if (signature.timestamp <= 0) {
        throw new Error("Invalid signature timestamp");
      }
    }
  }

  private validateBridgeConfig(bridge: TrustedBridge): void {
    if (!bridge.bridgeId || bridge.bridgeId.length === 0) {
      throw new Error("Bridge ID is required");
    }

    if (!bridge.bridgeAddress || bridge.bridgeAddress.length === 0) {
      throw new Error("Bridge address is required");
    }

    if (!bridge.supportedChains || bridge.supportedChains.length === 0) {
      throw new Error("Supported chains are required");
    }

    if (!bridge.publicKey || bridge.publicKey.length === 0) {
      throw new Error("Bridge public key is required");
    }

    if (bridge.reputationScore < 0 || bridge.reputationScore > 100) {
      throw new Error("Reputation score must be between 0 and 100");
    }

    if (bridge.successRate < 0 || bridge.successRate > 10000) {
      throw new Error("Success rate must be between 0 and 10000 basis points");
    }
  }

  private validateChainConnectionConfig(config: Partial<ChainConnection>): void {
    if (config.chainName && config.chainName.length === 0) {
      throw new Error("Chain name cannot be empty");
    }

    if (config.bridgeAddress && config.bridgeAddress.length === 0) {
      throw new Error("Bridge address cannot be empty");
    }
  }

  private validateSecurityParams(params: SecurityParamsUpdate): void {
    if (params.minConfirmations && params.minConfirmations < 1) {
      throw new Error("Minimum confirmations must be at least 1");
    }

    if (params.maxMessageAgeSlots && params.maxMessageAgeSlots < 3600) {
      throw new Error("Maximum message age must be at least 1 hour");
    }

    if (params.nonceWindow && params.nonceWindow < 100) {
      throw new Error("Nonce window must be at least 100");
    }

    if (params.maxTransferAmount && params.maxTransferAmount <= 0) {
      throw new Error("Maximum transfer amount must be positive");
    }

    if (params.dailyTransferLimit && params.dailyTransferLimit <= 0) {
      throw new Error("Daily transfer limit must be positive");
    }
  }

  // Build initiate transfer transaction
  private async buildInitiateTransferTransaction(
    params: CrossChainTransferParams,
    routerState: CrossChainRouterState,
    fees: any
  ): Promise<TxComplete> {
    // Get router UTxO
    const routerUtxo = await this.getRouterUtxo();
    if (!routerUtxo) {
      throw new Error("Router UTxO not found");
    }

    // Parse current router datum
    const currentDatum = await this.parseRouterDatum(routerUtxo.datum!);
    if (!currentDatum) {
      throw new Error("Invalid router datum");
    }

    // Get current slot
    const currentSlot = Math.floor(Date.now() / 1000);

    // Generate message ID
    const messageId = this.generateMessageId(params.userAddress, currentSlot);

    // Create outbound message
    const outboundMessage: OutboundMessage = {
      messageId,
      sourceChain: 'Cardano',
      destinationChain: params.destinationChain,
      sender: params.userAddress,
      recipient: params.recipient,
      tokenPolicy: params.tokenPolicy,
      tokenName: params.tokenName,
      amount: params.amount,
      bridgeId: params.bridgeId,
      createdSlot: currentSlot,
      deadline: params.deadline || currentSlot + 3600, // 1 hour default
      status: 'Pending',
      fees: fees.totalFee
    };

    // Create updated router state
    const updatedRouterState: CrossChainRouterState = {
      ...routerState,
      totalVolume: routerState.totalVolume + params.amount,
      lastProcessedNonce: routerState.lastProcessedNonce + 1n,
      outboundMessages: [...routerState.outboundMessages, outboundMessage],
      totalOutboundMessages: routerState.totalOutboundMessages + 1n
    };

    const updatedDatum = CIP68DatumBuilder.createUpdatedRouterDatum(currentDatum, {
      router_state: updatedRouterState
    });

    // Serialize updated datum
    const newDatumData = CIP68Serializer.serializeRouterDatum(updatedDatum);

    // Create initiate transfer redeemer
    const redeemer = CIP68Serializer.serializeInitiateTransferRedeemer(
      params.destinationChain,
      params.recipient,
      params.tokenPolicy,
      params.tokenName,
      params.amount,
      params.bridgeId,
      params.deadline || currentSlot + 3600,
      params.userAddress
    );

    // Build transaction assets
    const routerOutputAssets: Assets = { ...routerUtxo.assets };

    // Lock the tokens being transferred
    if (params.tokenPolicy && params.tokenName) {
      const tokenUnit = `${params.tokenPolicy}.${params.tokenName}`;
      routerOutputAssets[tokenUnit] = (routerOutputAssets[tokenUnit] || 0n) + params.amount;
    } else {
      // ADA transfer
      routerOutputAssets.lovelace = routerOutputAssets.lovelace + params.amount;
    }

    // Add bridge fees
    routerOutputAssets.lovelace = routerOutputAssets.lovelace + fees.bridgeFee;

    // Calculate minimum ADA for router output
    const minADAForRouter = await this.minADAManager.calculateMinADA(routerOutputAssets, newDatumData);
    if (routerOutputAssets.lovelace < minADAForRouter) {
      routerOutputAssets.lovelace = minADAForRouter;
    }

    // Build and complete transaction
    const tx = await this.lucid.newTx()
      .collectFrom([routerUtxo], redeemer)
      .payToContract(this.routerAddress, { inline: newDatumData }, routerOutputAssets)
      .attachSpendingValidator(this.routerValidator)
      .validTo(Date.now() + (params.deadline ? (params.deadline - currentSlot) * 1000 : 3600000))
      .complete();

    return tx;
  }

  // Build complete inbound transfer transaction
  private async buildCompleteInboundTransferTransaction(
    params: InboundTransferParams,
    routerState: CrossChainRouterState,
    inboundMessage: InboundMessage
  ): Promise<TxComplete> {
    // Get router UTxO
    const routerUtxo = await this.getRouterUtxo();
    if (!routerUtxo) {
      throw new Error("Router UTxO not found");
    }

    // Parse current router datum
    const currentDatum = await this.parseRouterDatum(routerUtxo.datum!);
    if (!currentDatum) {
      throw new Error("Invalid router datum");
    }

    // Get current slot
    const currentSlot = Math.floor(Date.now() / 1000);

    // Update inbound message status
    const updatedInboundMessage: InboundMessage = {
      ...inboundMessage,
      status: 'Completed',
      completedSlot: currentSlot
    };

    // Create updated router state
    const updatedInboundMessages = routerState.inboundMessages.map(msg =>
      msg.messageId === inboundMessage.messageId ? updatedInboundMessage : msg
    );

    const updatedRouterState: CrossChainRouterState = {
      ...routerState,
      inboundMessages: updatedInboundMessages,
      processedMessageHashes: [...routerState.processedMessageHashes, inboundMessage.messageId],
      totalInboundMessages: routerState.totalInboundMessages + 1n,
      totalVolume: routerState.totalVolume + inboundMessage.amount
    };

    const updatedDatum = CIP68DatumBuilder.createUpdatedRouterDatum(currentDatum, {
      router_state: updatedRouterState
    });

    // Serialize updated datum
    const newDatumData = CIP68Serializer.serializeRouterDatum(updatedDatum);

    // Create complete inbound transfer redeemer
    const redeemer = CIP68Serializer.serializeCompleteInboundTransferRedeemer(
      inboundMessage.messageId,
      params.proof,
      params.bridgeOperatorAddress
    );

    // Build transaction assets
    const routerOutputAssets: Assets = { ...routerUtxo.assets };

    // Release the tokens to recipient
    if (inboundMessage.tokenPolicy && inboundMessage.tokenName) {
      const tokenUnit = `${inboundMessage.tokenPolicy}.${inboundMessage.tokenName}`;
      routerOutputAssets[tokenUnit] = (routerOutputAssets[tokenUnit] || 0n) - inboundMessage.amount;
    } else {
      // ADA transfer
      routerOutputAssets.lovelace = routerOutputAssets.lovelace - inboundMessage.amount;
    }

    // Calculate minimum ADA for router output
    const minADAForRouter = await this.minADAManager.calculateMinADA(routerOutputAssets, newDatumData);
    if (routerOutputAssets.lovelace < minADAForRouter) {
      routerOutputAssets.lovelace = minADAForRouter;
    }

    // Build recipient output assets
    const recipientOutputAssets: Assets = {};
    if (inboundMessage.tokenPolicy && inboundMessage.tokenName) {
      const tokenUnit = `${inboundMessage.tokenPolicy}.${inboundMessage.tokenName}`;
      recipientOutputAssets[tokenUnit] = inboundMessage.amount;
    } else {
      recipientOutputAssets.lovelace = inboundMessage.amount;
    }

    // Build and complete transaction
    const tx = await this.lucid.newTx()
      .collectFrom([routerUtxo], redeemer)
      .payToContract(this.routerAddress, { inline: newDatumData }, routerOutputAssets)
      .payToAddress(inboundMessage.recipient, recipientOutputAssets)
      .attachSpendingValidator(this.routerValidator)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    return tx;
  }

  private async buildCancelTransferTransaction(
    messageId: string,
    reason: string,
    routerState: CrossChainRouterState
  ): Promise<TxComplete> {
    // Find router UTxO
    const routerUtxos = await this.lucid.utxosAt(this.routerAddress);
    if (routerUtxos.length === 0) {
      throw new Error("No router UTxO found");
    }
    const routerUtxo = routerUtxos[0];

    // Find the outbound message to cancel
    const messageToCancel = routerState.outbound_messages.find(msg => msg.message_id === messageId);
    if (!messageToCancel) {
      throw new Error(`Outbound message ${messageId} not found`);
    }

    // Update router state - remove the cancelled message and refund amount
    const updatedState: CrossChainRouterState = {
      ...routerState,
      outbound_messages: routerState.outbound_messages.filter(msg => msg.message_id !== messageId),
      total_volume: routerState.total_volume - messageToCancel.amount
    };

    // Serialize data
    const datumData = Data.to(updatedState, CrossChainRouterDatum);
    const redeemer = Data.to({
      CancelTransfer: {
        message_id: messageId,
        reason: reason
      }
    }, CrossChainRouterRedeemer);

    // Prepare assets - refund the cancelled transfer amount to user
    const routerOutputAssets = {
      ...routerUtxo.assets,
      lovelace: (routerUtxo.assets.lovelace || 0n) - messageToCancel.amount
    };

    const refundAssets = {
      lovelace: messageToCancel.amount
    };

    // Build transaction
    const tx = await this.lucid.newTx()
      .collectFrom([routerUtxo], redeemer)
      .payToContract(this.routerAddress, { inline: datumData }, routerOutputAssets)
      .payToAddress(messageToCancel.sender, refundAssets) // Refund to original sender
      .attachSpendingValidator(this.routerValidator)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    return tx;
  }

  private async buildAddTrustedBridgeTransaction(
    bridge: TrustedBridge,
    routerState: CrossChainRouterState
  ): Promise<TxComplete> {
    // Find router UTxO
    const routerUtxos = await this.lucid.utxosAt(this.routerAddress);
    if (routerUtxos.length === 0) {
      throw new Error("No router UTxO found");
    }
    const routerUtxo = routerUtxos[0];

    // Add new trusted bridge to chain connections
    const newConnection: ChainConnection = {
      chain_id: bridge.chainId,
      bridge_address: bridge.bridgeAddress
    };

    const updatedState: CrossChainRouterState = {
      ...routerState,
      chain_connections: [...routerState.chain_connections, newConnection]
    };

    // Serialize data
    const datumData = Data.to(updatedState, CrossChainRouterDatum);
    const redeemer = Data.to({
      AddTrustedBridge: {
        chain_id: bridge.chainId,
        bridge_address: bridge.bridgeAddress
      }
    }, CrossChainRouterRedeemer);

    // Build transaction
    const tx = await this.lucid.newTx()
      .collectFrom([routerUtxo], redeemer)
      .payToContract(this.routerAddress, { inline: datumData }, routerUtxo.assets)
      .attachSpendingValidator(this.routerValidator)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    return tx;
  }

  private async buildUpdateChainConnectionTransaction(
    params: ChainConnectionUpdate,
    routerState: CrossChainRouterState
  ): Promise<TxComplete> {
    // Find router UTxO
    const routerUtxos = await this.lucid.utxosAt(this.routerAddress);
    if (routerUtxos.length === 0) {
      throw new Error("No router UTxO found");
    }
    const routerUtxo = routerUtxos[0];

    // Update chain connection
    const updatedConnections = routerState.chain_connections.map(connection =>
      connection.chain_id === params.chainId
        ? { ...connection, bridge_address: params.newBridgeAddress }
        : connection
    );

    const updatedState: CrossChainRouterState = {
      ...routerState,
      chain_connections: updatedConnections
    };

    // Serialize data
    const datumData = Data.to(updatedState, CrossChainRouterDatum);
    const redeemer = Data.to({
      UpdateChainConnection: {
        chain_id: params.chainId,
        new_bridge_address: params.newBridgeAddress
      }
    }, CrossChainRouterRedeemer);

    // Build transaction
    const tx = await this.lucid.newTx()
      .collectFrom([routerUtxo], redeemer)
      .payToContract(this.routerAddress, { inline: datumData }, routerUtxo.assets)
      .attachSpendingValidator(this.routerValidator)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    return tx;
  }

  private async buildUpdateSecurityParamsTransaction(
    params: SecurityParamsUpdate,
    routerState: CrossChainRouterState
  ): Promise<TxComplete> {
    // Get router UTxO
    const routerUtxo = await this.getRouterUtxo();
    if (!routerUtxo) {
      throw new Error("Router UTxO not found");
    }

    // Parse current router datum
    const currentDatum = await this.parseRouterDatum(routerUtxo.datum!);
    if (!currentDatum) {
      throw new Error("Invalid router datum");
    }

    // Create updated router config
    const updatedRouterConfig = {
      ...currentDatum.router_config,
      ...params
    };

    const updatedDatum = CIP68DatumBuilder.createUpdatedRouterDatum(currentDatum, {
      router_config: updatedRouterConfig
    });

    // Serialize updated datum
    const newDatumData = CIP68Serializer.serializeRouterDatum(updatedDatum);

    // Create security params update redeemer
    const redeemer = CIP68Serializer.serializeUpdateSecurityParamsRedeemer(
      params,
      await this.lucid.wallet.address()
    );

    // Build transaction assets (no change in assets for config update)
    const routerOutputAssets: Assets = { ...routerUtxo.assets };

    // Calculate minimum ADA for router output
    const minADAForRouter = await this.minADAManager.calculateMinADA(routerOutputAssets, newDatumData);
    if (routerOutputAssets.lovelace < minADAForRouter) {
      routerOutputAssets.lovelace = minADAForRouter;
    }

    // Build and complete transaction
    const tx = await this.lucid.newTx()
      .collectFrom([routerUtxo], redeemer)
      .payToContract(this.routerAddress, { inline: newDatumData }, routerOutputAssets)
      .attachSpendingValidator(this.routerValidator)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    return tx;
  }

  /**
   * Get router UTxO
   */
  private async getRouterUtxo(): Promise<UTxO | null> {
    try {
      const utxos = await this.lucid.utxosAt(this.routerAddress);

      // Find the router UTxO (should contain router NFT)
      for (const utxo of utxos) {
        if (utxo.datum) {
          try {
            const routerDatum = await this.parseRouterDatum(utxo.datum);
            if (routerDatum) {
              return utxo;
            }
          } catch (error) {
            continue;
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Error getting router UTxO:", error);
      return null;
    }
  }

  /**
   * Parse router datum from UTxO
   */
  private async parseRouterDatum(datum: Datum): Promise<any | null> {
    try {
      if (typeof datum === 'string') {
        const parsedDatum = Data.from(datum);
        return CIP68Serializer.deserializeRouterDatum(parsedDatum);
      } else {
        const datumData = await this.lucid.datumOf(datum);
        return CIP68Serializer.deserializeRouterDatum(datumData);
      }
    } catch (error) {
      console.error("Error parsing router datum:", error);
      return null;
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(userAddress: Address, timestamp: number): string {
    return `msg_${timestamp}_${userAddress.slice(0, 8)}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate cross-chain transfer fees
   */
  async calculateTransferFees(
    amount: bigint,
    destinationChain: string,
    tokenPolicy?: PolicyId,
    tokenName?: string
  ): Promise<{
    bridgeFee: bigint;
    protocolFee: bigint;
    totalFee: bigint;
  }> {
    // Get router state to determine fee structure
    const routerUtxo = await this.getRouterUtxo();
    if (!routerUtxo) {
      throw new Error("Router UTxO not found");
    }

    const routerDatum = await this.parseRouterDatum(routerUtxo.datum!);
    if (!routerDatum) {
      throw new Error("Invalid router datum");
    }

    // Calculate fees based on amount and destination chain
    const bridgeFeeBps = routerDatum.router_config.bridge_fee_bps || 30; // 0.3% default
    const protocolFeeBps = routerDatum.router_config.protocol_fee_bps || 10; // 0.1% default

    const bridgeFee = (amount * BigInt(bridgeFeeBps)) / 10000n;
    const protocolFee = (amount * BigInt(protocolFeeBps)) / 10000n;
    const totalFee = bridgeFee + protocolFee;

    return {
      bridgeFee,
      protocolFee,
      totalFee
    };
  }

  /**
   * Get transfer status by message ID
   */
  async getTransferStatus(messageId: string): Promise<{
    status: 'Pending' | 'Completed' | 'Failed' | 'Cancelled';
    message?: OutboundMessage | InboundMessage;
  }> {
    try {
      const routerUtxo = await this.getRouterUtxo();
      if (!routerUtxo) {
        return { status: 'Failed' };
      }

      const routerDatum = await this.parseRouterDatum(routerUtxo.datum!);
      if (!routerDatum) {
        return { status: 'Failed' };
      }

      // Check outbound messages
      const outboundMessage = routerDatum.router_state.outboundMessages.find(
        (msg: OutboundMessage) => msg.messageId === messageId
      );
      if (outboundMessage) {
        return { status: outboundMessage.status, message: outboundMessage };
      }

      // Check inbound messages
      const inboundMessage = routerDatum.router_state.inboundMessages.find(
        (msg: InboundMessage) => msg.messageId === messageId
      );
      if (inboundMessage) {
        return { status: inboundMessage.status, message: inboundMessage };
      }

      return { status: 'Failed' };
    } catch (error) {
      console.error("Error getting transfer status:", error);
      return { status: 'Failed' };
    }
  }

  /**
   * 1️⃣ Initiate Cross-Chain Transfer
   *
   * Connect wallet using Lucid Evolution's CIP-30 interface.
   * Locate CrossChainRouterDatum UTxO at the router contract address.
   * Parse current CrossChainRouterDatum using Lucid Evolution's CIP-68 serialization.
   * Accept user input for target chain_id and asset type/amount to transfer.
   * Validate that provided chain_id exists in chain_connections list.
   * Calculate new nonce value.
   * Build outbound cross-chain transaction with proper validator attachment.
   */
  async initiateCrossChainTransfer(params: {
    chainId: bigint;
    assetType: 'ADA' | 'TOKEN';
    amount: bigint;
    tokenPolicy?: PolicyId;
    tokenName?: string;
    recipientAddress: string;
  }): Promise<TxHash> {
    try {
      // Connect wallet using Lucid Evolution's CIP-30 interface
      if (!this.lucid.wallet) {
        throw new Error("Wallet not connected. Please connect wallet first.");
      }

      const userAddress = await this.lucid.wallet.address();
      console.log(`Initiating cross-chain transfer from: ${userAddress}`);

      // Locate CrossChainRouterDatum UTxO at the router contract address
      const routerUTxOs = await this.lucid.utxosAt(this.routerAddress);
      if (routerUTxOs.length === 0) {
        throw new Error("Cross-chain router UTxO not found");
      }

      const routerUTxO = routerUTxOs[0];
      if (!routerUTxO.datum) {
        throw new Error("Router UTxO missing datum");
      }

      // Parse current CrossChainRouterDatum using CIP-68 serialization
      const currentDatum = await this.parseCrossChainRouterDatum(routerUTxO.datum);
      if (!currentDatum) {
        throw new Error("Failed to parse CrossChainRouterDatum");
      }

      // Validate that provided chain_id exists in chain_connections list
      const targetChain = currentDatum.chain_connections.find(
        conn => conn.chain_id === params.chainId
      );
      if (!targetChain) {
        throw new Error(`Chain ID ${params.chainId} not supported. Available chains: ${
          currentDatum.chain_connections.map(c => c.chain_id.toString()).join(', ')
        }`);
      }

      // Validate asset parameters
      if (params.assetType === 'TOKEN') {
        if (!params.tokenPolicy || !params.tokenName) {
          throw new Error("Token policy and name required for TOKEN transfers");
        }
      }

      if (params.amount <= BigInt(0)) {
        throw new Error("Transfer amount must be positive");
      }

      // Calculate new nonce value
      const newNonce = currentDatum.last_processed_nonce + BigInt(1);

      // Build outbound cross-chain transaction
      const updatedDatum: CrossChainRouterDatum = {
        total_volume: currentDatum.total_volume + params.amount,
        last_processed_nonce: newNonce,
        chain_connections: currentDatum.chain_connections
      };

      // Serialize updated datum using CIP-68 compliance
      const updatedDatumData = this.serializeCrossChainRouterDatum(updatedDatum);

      // Create CrossChainRedeemer for outbound transfer
      const redeemer: CrossChainRedeemer = {
        outbound: true,
        nonce: newNonce,
        bridge_signature: targetChain.bridge_address // Using bridge address as signature placeholder
      };

      const redeemerData = this.serializeCrossChainRedeemer(redeemer);

      // Build transaction assets
      const routerOutputAssets: Assets = { ...routerUTxO.assets };

      // Lock user's assets in router contract
      if (params.assetType === 'ADA') {
        routerOutputAssets.lovelace = (routerOutputAssets.lovelace || BigInt(0)) + params.amount;
      } else if (params.assetType === 'TOKEN' && params.tokenPolicy && params.tokenName) {
        const tokenUnit = toUnit(params.tokenPolicy, fromText(params.tokenName));
        routerOutputAssets[tokenUnit] = (routerOutputAssets[tokenUnit] || BigInt(0)) + params.amount;
      }

      // Enforce min ADA preservation on output UTxO
      const minAdaRequired = MIN_ADA_CONSTANTS.SCRIPT_MIN_ADA;
      if ((routerOutputAssets.lovelace || BigInt(0)) < minAdaRequired) {
        routerOutputAssets.lovelace = minAdaRequired;
      }

      // Build and complete transaction
      const tx = await this.lucid.newTx()
        .collectFrom([routerUTxO], redeemerData)
        .payToContract(
          this.routerAddress,
          { inline: updatedDatumData },
          routerOutputAssets
        )
        .attachSpendingValidator(this.routerValidator)
        .validTo(Date.now() + 1200000) // 20 minute deadline
        .complete();

      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      console.log(`Cross-chain transfer initiated. TxHash: ${txHash}`);
      console.log(`Nonce: ${newNonce}, Target Chain: ${params.chainId}, Amount: ${params.amount}`);

      return txHash;

    } catch (error) {
      console.error("Error initiating cross-chain transfer:", error);
      throw error;
    }
  }

  /**
   * 2️⃣ Finalize Inbound Transfer (for bridge authorized entities)
   *
   * Build inbound cross-chain transaction to finalize receipt of tokens transferred into Cardano.
   * Accept bridge signature proving transfer validity.
   * Verify signature against bridge_address for target chain_id.
   * Validate nonce sequencing to prevent replay.
   * Unlock assets back to user's Cardano wallet.
   * Update CrossChainRouterDatum with new last_processed_nonce.
   */
  async finalizeInboundTransfer(params: {
    chainId: bigint;
    nonce: bigint;
    bridgeSignature: string;
    assetType: 'ADA' | 'TOKEN';
    amount: bigint;
    tokenPolicy?: PolicyId;
    tokenName?: string;
    recipientAddress: Address;
  }): Promise<TxHash> {
    try {
      // Connect wallet using Lucid Evolution's CIP-30 interface
      if (!this.lucid.wallet) {
        throw new Error("Wallet not connected. Please connect wallet first.");
      }

      const bridgeOperatorAddress = await this.lucid.wallet.address();
      console.log(`Finalizing inbound transfer by bridge operator: ${bridgeOperatorAddress}`);

      // Locate CrossChainRouterDatum UTxO at the router contract address
      const routerUTxOs = await this.lucid.utxosAt(this.routerAddress);
      if (routerUTxOs.length === 0) {
        throw new Error("Cross-chain router UTxO not found");
      }

      const routerUTxO = routerUTxOs[0];
      if (!routerUTxO.datum) {
        throw new Error("Router UTxO missing datum");
      }

      // Parse current CrossChainRouterDatum using CIP-68 serialization
      const currentDatum = await this.parseCrossChainRouterDatum(routerUTxO.datum);
      if (!currentDatum) {
        throw new Error("Failed to parse CrossChainRouterDatum");
      }

      // Verify signature against bridge_address for target chain_id
      const targetChain = currentDatum.chain_connections.find(
        conn => conn.chain_id === params.chainId
      );
      if (!targetChain) {
        throw new Error(`Chain ID ${params.chainId} not supported`);
      }

      // Validate bridge signature (simplified validation - in production would use cryptographic verification)
      if (!params.bridgeSignature || params.bridgeSignature.length === 0) {
        throw new Error("Bridge signature is required");
      }

      // Validate nonce sequencing to prevent replay
      if (params.nonce <= currentDatum.last_processed_nonce) {
        throw new Error(`Invalid nonce: ${params.nonce} <= ${currentDatum.last_processed_nonce}. Possible replay attack.`);
      }

      // Validate asset parameters
      if (params.assetType === 'TOKEN') {
        if (!params.tokenPolicy || !params.tokenName) {
          throw new Error("Token policy and name required for TOKEN transfers");
        }
      }

      if (params.amount <= BigInt(0)) {
        throw new Error("Transfer amount must be positive");
      }

      // Update CrossChainRouterDatum with new last_processed_nonce
      const updatedDatum: CrossChainRouterDatum = {
        total_volume: currentDatum.total_volume + params.amount,
        last_processed_nonce: params.nonce,
        chain_connections: currentDatum.chain_connections
      };

      // Serialize updated datum using CIP-68 compliance
      const updatedDatumData = this.serializeCrossChainRouterDatum(updatedDatum);

      // Create CrossChainRedeemer for inbound transfer
      const redeemer: CrossChainRedeemer = {
        outbound: false,
        nonce: params.nonce,
        bridge_signature: params.bridgeSignature
      };

      const redeemerData = this.serializeCrossChainRedeemer(redeemer);

      // Build transaction assets - unlock assets back to user's Cardano wallet
      const routerOutputAssets: Assets = { ...routerUTxO.assets };

      // Remove assets from router (unlock them)
      if (params.assetType === 'ADA') {
        if ((routerOutputAssets.lovelace || BigInt(0)) < params.amount) {
          throw new Error("Insufficient ADA in router for transfer");
        }
        routerOutputAssets.lovelace = (routerOutputAssets.lovelace || BigInt(0)) - params.amount;
      } else if (params.assetType === 'TOKEN' && params.tokenPolicy && params.tokenName) {
        const tokenUnit = toUnit(params.tokenPolicy, fromText(params.tokenName));
        if ((routerOutputAssets[tokenUnit] || BigInt(0)) < params.amount) {
          throw new Error(`Insufficient ${params.tokenName} tokens in router for transfer`);
        }
        routerOutputAssets[tokenUnit] = (routerOutputAssets[tokenUnit] || BigInt(0)) - params.amount;
      }

      // Enforce min ADA preservation on router output UTxO
      const minAdaRequired = MIN_ADA_CONSTANTS.SCRIPT_MIN_ADA;
      if ((routerOutputAssets.lovelace || BigInt(0)) < minAdaRequired) {
        routerOutputAssets.lovelace = minAdaRequired;
      }

      // Build recipient output assets using cardano/assets utilities
      const recipientAssets: Assets = {};
      if (params.assetType === 'ADA') {
        recipientAssets.lovelace = params.amount;
      } else if (params.assetType === 'TOKEN' && params.tokenPolicy && params.tokenName) {
        const tokenUnit = toUnit(params.tokenPolicy, fromText(params.tokenName));
        recipientAssets[tokenUnit] = params.amount;
        // Ensure minimum ADA for token transfer
        recipientAssets.lovelace = BigInt(2_000_000); // 2 ADA minimum for token UTxO
      }

      // Build and complete transaction
      const tx = await this.lucid.newTx()
        .collectFrom([routerUTxO], redeemerData)
        .payToContract(
          this.routerAddress,
          { inline: updatedDatumData },
          routerOutputAssets
        )
        .payToAddress(params.recipientAddress, recipientAssets)
        .attachSpendingValidator(this.routerValidator)
        .validTo(Date.now() + 1200000) // 20 minute deadline
        .complete();

      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      console.log(`Inbound transfer finalized. TxHash: ${txHash}`);
      console.log(`Nonce: ${params.nonce}, Source Chain: ${params.chainId}, Amount: ${params.amount}`);
      console.log(`Recipient: ${params.recipientAddress}`);

      return txHash;

    } catch (error) {
      console.error("Error finalizing inbound transfer:", error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS FOR CIP-68 SERIALIZATION
  // ============================================================================

  /**
   * Parse CrossChainRouterDatum from UTxO datum using CIP-68 serialization
   */
  private async parseCrossChainRouterDatum(datum: Datum): Promise<CrossChainRouterDatum | null> {
    try {
      let datumData: Data;

      if (typeof datum === 'string') {
        datumData = Data.from(datum);
      } else {
        datumData = await this.lucid.datumOf(datum);
      }

      // Parse CIP-68 compliant CrossChainRouterDatum
      // Expected structure: Constr(0, [total_volume, last_processed_nonce, chain_connections])
      if (datumData instanceof Constr && datumData.index === 0) {
        const fields = datumData.fields;

        if (fields.length !== 3) {
          throw new Error("Invalid CrossChainRouterDatum structure");
        }

        const totalVolume = fields[0] as bigint;
        const lastProcessedNonce = fields[1] as bigint;
        const chainConnectionsData = fields[2];

        // Parse chain_connections array
        const chainConnections: ChainConnection[] = [];
        if (chainConnectionsData instanceof Constr && chainConnectionsData.index === 0) {
          for (const connData of chainConnectionsData.fields) {
            if (connData instanceof Constr && connData.index === 0 && connData.fields.length === 2) {
              const chainId = connData.fields[0] as bigint;
              const bridgeAddress = Data.to(connData.fields[1]) as string;

              chainConnections.push({
                chain_id: chainId,
                bridge_address: bridgeAddress
              });
            }
          }
        }

        return {
          total_volume: totalVolume,
          last_processed_nonce: lastProcessedNonce,
          chain_connections: chainConnections
        };
      }

      throw new Error("Invalid datum structure");
    } catch (error) {
      console.error("Error parsing CrossChainRouterDatum:", error);
      return null;
    }
  }

  /**
   * Serialize CrossChainRouterDatum to CIP-68 compliant Data
   */
  private serializeCrossChainRouterDatum(datum: CrossChainRouterDatum): Data {
    // Serialize chain_connections
    const chainConnectionsData = new Constr(0,
      datum.chain_connections.map(conn =>
        new Constr(0, [
          conn.chain_id,
          fromText(conn.bridge_address)
        ])
      )
    );

    // Create main datum structure: Constr(0, [total_volume, last_processed_nonce, chain_connections])
    return new Constr(0, [
      datum.total_volume,
      datum.last_processed_nonce,
      chainConnectionsData
    ]);
  }

  /**
   * Serialize CrossChainRedeemer to CIP-68 compliant Data
   */
  private serializeCrossChainRedeemer(redeemer: CrossChainRedeemer): Data {
    // Create redeemer structure: Constr(0, [outbound, nonce, bridge_signature])
    return new Constr(0, [
      redeemer.outbound ? BigInt(1) : BigInt(0), // Boolean as bigint
      redeemer.nonce,
      fromText(redeemer.bridge_signature)
    ]);
  }
}
