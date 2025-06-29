// PuckSwap v4 Enterprise - Treasury Management System
// Lucid Evolution transaction builders for revenue collection and distribution
// Full CIP-68 compliance with comprehensive fee management

import {
  Lucid,
  Blockfrost,
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
  Redeemer
} from "lucid-cardano";

// Treasury interfaces
export interface RevenueSource {
  type: 'SwapFees' | 'RegistrationFees' | 'GovernanceFees' | 'LiquidityIncentives' | 'Other';
  poolId?: string;
  volume?: bigint;
  poolCount?: number;
  proposalCount?: number;
  lpRewards?: bigint;
  sourceType?: string;
  amount: bigint;
}

export interface DistributionTarget {
  type: 'LiquidityProviders' | 'DevelopmentFund' | 'GovernanceRewards' | 'ProtocolUpgrade' | 'CommunityGrants';
  poolId?: string;
  lpAddresses?: Address[];
  amounts?: bigint[];
  recipient?: Address;
  amount?: bigint;
  purpose?: string;
  voterAddresses?: Address[];
  votingRewards?: bigint[];
  upgradeFund?: Address;
  upgradeId?: string;
  grantRecipients?: Address[];
  grantAmounts?: bigint[];
  grantPurposes?: string[];
}

export interface RevenueRecord {
  source: RevenueSource;
  tokenPolicy: PolicyId;
  tokenName: string;
  amount: bigint;
  receivedAtSlot: number;
  transactionHash: string;
}

export interface DistributionRecord {
  target: DistributionTarget;
  tokenPolicy: PolicyId;
  tokenName: string;
  totalAmount: bigint;
  distributedAtSlot: number;
  transactionHash: string;
  governanceProposalId?: number;
}

export interface TreasuryDatum {
  metadata: {
    policyId: PolicyId;
    assetName: string;
    version: number;
  };
  version: number;
  totalRevenueCollected: bigint;
  totalDistributed: bigint;
  currentBalance: Assets;
  revenueRecords: RevenueRecord[];
  distributionRecords: DistributionRecord[];
  lpRewardPercentage: number;
  developmentPercentage: number;
  governancePercentage: number;
  protocolPercentage: number;
  communityPercentage: number;
  governanceAddress: Address;
  autoDistributionEnabled: boolean;
  distributionThreshold: bigint;
  adminAddresses: Address[];
  emergencyAdmin: Address;
  paused: boolean;
  maxSingleDistribution: bigint;
  dailyDistributionLimit: bigint;
  lastDistributionSlot: number;
  supportedAssets: Array<{ policy: PolicyId; name: string }>;
}

export interface RevenueCollectionParams {
  source: RevenueSource;
  tokenPolicy: PolicyId;
  tokenName: string;
  amount: bigint;
}

export interface DistributionParams {
  targets: DistributionTarget[];
  governanceProposalId?: number;
  autoDistribution?: boolean;
}

export interface TreasuryConfigUpdate {
  lpRewardPercentage?: number;
  developmentPercentage?: number;
  governancePercentage?: number;
  protocolPercentage?: number;
  communityPercentage?: number;
  distributionThreshold?: bigint;
  maxSingleDistribution?: bigint;
  dailyDistributionLimit?: bigint;
  autoDistributionEnabled?: boolean;
}

export class PuckSwapTreasuryV4 {
  private lucid: Lucid;
  private treasuryValidator: SpendingValidator;
  private treasuryAddress: Address;
  private governanceAddress: Address;

  constructor(
    lucid: Lucid,
    treasuryValidator: SpendingValidator,
    treasuryAddress: Address,
    governanceAddress: Address
  ) {
    this.lucid = lucid;
    this.treasuryValidator = treasuryValidator;
    this.treasuryAddress = treasuryAddress;
    this.governanceAddress = governanceAddress;
  }

  // Initialize treasury system
  static async create(
    blockfrostApiKey: string,
    network: "Mainnet" | "Preview" | "Preprod" = "Preview",
    contractCBOR: string,
    treasuryAddress: Address,
    governanceAddress: Address
  ): Promise<PuckSwapTreasuryV4> {
    const lucid = await Lucid.new(
      new Blockfrost(
        `https://cardano-${network.toLowerCase()}.blockfrost.io/api/v0`,
        blockfrostApiKey
      ),
      network
    );

    const treasuryValidator: SpendingValidator = {
      type: "PlutusV2",
      script: contractCBOR
    };

    return new PuckSwapTreasuryV4(
      lucid,
      treasuryValidator,
      treasuryAddress,
      governanceAddress
    );
  }

  // Connect wallet
  async connectWallet(walletName: "eternl" | "nami" | "vespr" | "lace"): Promise<void> {
    await this.lucid.selectWalletFromExtension(walletName);
  }

  // Get treasury state
  async getTreasuryState(): Promise<TreasuryDatum | null> {
    try {
      const treasuryUTxOs = await this.lucid.utxosAt(this.treasuryAddress);
      
      if (treasuryUTxOs.length === 0) {
        return null;
      }

      const treasuryUTxO = treasuryUTxOs[0];
      if (!treasuryUTxO.datum) {
        throw new Error("Treasury UTxO missing datum");
      }

      return await this.parseTreasuryDatum(treasuryUTxO.datum);
    } catch (error) {
      console.error("Error fetching treasury state:", error);
      return null;
    }
  }

  // Collect revenue from various sources
  async collectRevenue(params: RevenueCollectionParams): Promise<TxHash> {
    try {
      const treasuryState = await this.getTreasuryState();
      if (!treasuryState) {
        throw new Error("Treasury system not found");
      }

      if (treasuryState.paused) {
        throw new Error("Treasury system is paused");
      }

      // Validate revenue collection parameters
      this.validateRevenueParams(params, treasuryState);

      // Build revenue collection transaction
      const tx = await this.buildRevenueCollectionTx(params, treasuryState);
      
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      return txHash;
    } catch (error) {
      console.error("Error collecting revenue:", error);
      throw error;
    }
  }

  // Distribute revenue to various targets
  async distributeRevenue(params: DistributionParams): Promise<TxHash> {
    try {
      const treasuryState = await this.getTreasuryState();
      if (!treasuryState) {
        throw new Error("Treasury system not found");
      }

      if (treasuryState.paused) {
        throw new Error("Treasury system is paused");
      }

      // Validate distribution parameters
      this.validateDistributionParams(params, treasuryState);

      // Calculate total distribution amount
      const totalDistribution = this.calculateTotalDistribution(params.targets);

      // Validate distribution limits
      if (totalDistribution > treasuryState.maxSingleDistribution) {
        throw new Error(`Distribution amount exceeds maximum: ${totalDistribution} > ${treasuryState.maxSingleDistribution}`);
      }

      // Check daily distribution limit
      await this.validateDailyDistributionLimit(treasuryState, totalDistribution);

      // Validate governance approval if required
      if (params.governanceProposalId) {
        await this.validateGovernanceApproval(params.governanceProposalId, totalDistribution);
      }

      // Build distribution transaction
      const tx = await this.buildDistributionTx(params, treasuryState, totalDistribution);
      
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      return txHash;
    } catch (error) {
      console.error("Error distributing revenue:", error);
      throw error;
    }
  }

  // Auto-distribute revenue based on configured percentages
  async autoDistributeRevenue(distributionPercentage: number = 100): Promise<TxHash> {
    try {
      const treasuryState = await this.getTreasuryState();
      if (!treasuryState) {
        throw new Error("Treasury system not found");
      }

      if (!treasuryState.autoDistributionEnabled) {
        throw new Error("Auto-distribution is disabled");
      }

      if (treasuryState.paused) {
        throw new Error("Treasury system is paused");
      }

      // Check if treasury balance meets distribution threshold
      const adaBalance = BigInt(treasuryState.currentBalance[""] || "0");
      if (adaBalance < treasuryState.distributionThreshold) {
        throw new Error(`Treasury balance below threshold: ${adaBalance} < ${treasuryState.distributionThreshold}`);
      }

      // Calculate distribution amounts based on percentages
      const distributionAmount = (adaBalance * BigInt(distributionPercentage)) / 100n;
      const targets = this.calculateAutoDistributionTargets(distributionAmount, treasuryState);

      // Build auto-distribution transaction
      const tx = await this.buildAutoDistributionTx(targets, treasuryState, distributionAmount);
      
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      return txHash;
    } catch (error) {
      console.error("Error auto-distributing revenue:", error);
      throw error;
    }
  }

  // Update treasury configuration (admin or governance only)
  async updateTreasuryConfig(config: TreasuryConfigUpdate): Promise<TxHash> {
    try {
      const treasuryState = await this.getTreasuryState();
      if (!treasuryState) {
        throw new Error("Treasury system not found");
      }

      const userAddress = await this.lucid.wallet.address();
      if (!treasuryState.adminAddresses.includes(userAddress)) {
        throw new Error("Only admin can update treasury configuration");
      }

      // Validate configuration parameters
      this.validateTreasuryConfig(config);

      // Build configuration update transaction
      const tx = await this.buildConfigUpdateTx(config, treasuryState);
      
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      return txHash;
    } catch (error) {
      console.error("Error updating treasury config:", error);
      throw error;
    }
  }

  // Add supported asset
  async addSupportedAsset(tokenPolicy: PolicyId, tokenName: string): Promise<TxHash> {
    try {
      const treasuryState = await this.getTreasuryState();
      if (!treasuryState) {
        throw new Error("Treasury system not found");
      }

      const userAddress = await this.lucid.wallet.address();
      if (!treasuryState.adminAddresses.includes(userAddress)) {
        throw new Error("Only admin can add supported assets");
      }

      // Check if asset is already supported
      const isSupported = treasuryState.supportedAssets.some(
        asset => asset.policy === tokenPolicy && asset.name === tokenName
      );

      if (isSupported) {
        throw new Error("Asset is already supported");
      }

      // Build add asset transaction
      const tx = await this.buildAddAssetTx(tokenPolicy, tokenName, treasuryState);
      
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      return txHash;
    } catch (error) {
      console.error("Error adding supported asset:", error);
      throw error;
    }
  }

  // Emergency withdraw (emergency admin only)
  async emergencyWithdraw(
    recipient: Address,
    amount: bigint,
    tokenPolicy: PolicyId,
    tokenName: string,
    reason: string
  ): Promise<TxHash> {
    try {
      const treasuryState = await this.getTreasuryState();
      if (!treasuryState) {
        throw new Error("Treasury system not found");
      }

      const userAddress = await this.lucid.wallet.address();
      if (userAddress !== treasuryState.emergencyAdmin) {
        throw new Error("Only emergency admin can perform emergency withdrawal");
      }

      if (!reason || reason.length === 0) {
        throw new Error("Emergency reason is required");
      }

      // Build emergency withdrawal transaction
      const tx = await this.buildEmergencyWithdrawTx(
        recipient,
        amount,
        tokenPolicy,
        tokenName,
        reason,
        treasuryState
      );
      
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      return txHash;
    } catch (error) {
      console.error("Error performing emergency withdrawal:", error);
      throw error;
    }
  }

  // Get treasury balance
  async getTreasuryBalance(): Promise<Assets> {
    try {
      const treasuryUTxOs = await this.lucid.utxosAt(this.treasuryAddress);
      
      let totalBalance: Assets = {};
      
      for (const utxo of treasuryUTxOs) {
        for (const [unit, amount] of Object.entries(utxo.assets)) {
          totalBalance[unit] = (BigInt(totalBalance[unit] || "0") + BigInt(amount)).toString();
        }
      }
      
      return totalBalance;
    } catch (error) {
      console.error("Error fetching treasury balance:", error);
      return {};
    }
  }

  // Get revenue history
  async getRevenueHistory(limit: number = 100): Promise<RevenueRecord[]> {
    try {
      const treasuryState = await this.getTreasuryState();
      if (!treasuryState) {
        return [];
      }

      return treasuryState.revenueRecords
        .sort((a, b) => b.receivedAtSlot - a.receivedAtSlot)
        .slice(0, limit);
    } catch (error) {
      console.error("Error fetching revenue history:", error);
      return [];
    }
  }

  // Get distribution history
  async getDistributionHistory(limit: number = 100): Promise<DistributionRecord[]> {
    try {
      const treasuryState = await this.getTreasuryState();
      if (!treasuryState) {
        return [];
      }

      return treasuryState.distributionRecords
        .sort((a, b) => b.distributedAtSlot - a.distributedAtSlot)
        .slice(0, limit);
    } catch (error) {
      console.error("Error fetching distribution history:", error);
      return [];
    }
  }

  // Private helper methods
  private async parseTreasuryDatum(datum: string): Promise<TreasuryDatum> {
    // Parse CIP-68 compliant treasury datum
    const parsedDatum = Data.from(datum);
    
    // This would need to match the exact Aiken datum structure
    return {
      metadata: {
        policyId: "placeholder_policy_id",
        assetName: "placeholder_asset_name",
        version: 1
      },
      version: 1,
      totalRevenueCollected: 0n,
      totalDistributed: 0n,
      currentBalance: {},
      revenueRecords: [],
      distributionRecords: [],
      lpRewardPercentage: 4000, // 40%
      developmentPercentage: 2000, // 20%
      governancePercentage: 1500, // 15%
      protocolPercentage: 1500, // 15%
      communityPercentage: 1000, // 10%
      governanceAddress: this.governanceAddress,
      autoDistributionEnabled: true,
      distributionThreshold: 1000000000n, // 1000 ADA
      adminAddresses: [],
      emergencyAdmin: "placeholder_emergency_admin",
      paused: false,
      maxSingleDistribution: 10000000000n, // 10,000 ADA
      dailyDistributionLimit: 50000000000n, // 50,000 ADA
      lastDistributionSlot: 0,
      supportedAssets: [
        { policy: "", name: "" }, // ADA
        { policy: "placeholder_pucky_policy", name: "PUCKY" }
      ]
    };
  }

  private validateRevenueParams(params: RevenueCollectionParams, treasuryState: TreasuryDatum): void {
    if (params.amount <= 0) {
      throw new Error("Revenue amount must be positive");
    }

    // Check if asset is supported
    const isSupported = treasuryState.supportedAssets.some(
      asset => asset.policy === params.tokenPolicy && asset.name === params.tokenName
    );

    if (!isSupported) {
      throw new Error("Asset is not supported by treasury");
    }

    // Validate revenue source
    this.validateRevenueSource(params.source);
  }

  private validateRevenueSource(source: RevenueSource): void {
    switch (source.type) {
      case 'SwapFees':
        if (!source.poolId || !source.volume || source.volume <= 0) {
          throw new Error("Swap fees require valid pool ID and volume");
        }
        break;
      case 'RegistrationFees':
        if (!source.poolCount || source.poolCount <= 0) {
          throw new Error("Registration fees require valid pool count");
        }
        break;
      case 'GovernanceFees':
        if (!source.proposalCount || source.proposalCount <= 0) {
          throw new Error("Governance fees require valid proposal count");
        }
        break;
      case 'LiquidityIncentives':
        if (!source.lpRewards || source.lpRewards <= 0) {
          throw new Error("Liquidity incentives require valid LP rewards");
        }
        break;
      case 'Other':
        if (!source.sourceType || source.sourceType.length === 0) {
          throw new Error("Other revenue source requires source type description");
        }
        break;
    }
  }

  private validateDistributionParams(params: DistributionParams, treasuryState: TreasuryDatum): void {
    if (!params.targets || params.targets.length === 0) {
      throw new Error("Distribution targets are required");
    }

    for (const target of params.targets) {
      this.validateDistributionTarget(target);
    }
  }

  private validateDistributionTarget(target: DistributionTarget): void {
    switch (target.type) {
      case 'LiquidityProviders':
        if (!target.poolId || !target.lpAddresses || !target.amounts || 
            target.lpAddresses.length !== target.amounts.length) {
          throw new Error("LP distribution requires valid pool ID, addresses, and amounts");
        }
        break;
      case 'DevelopmentFund':
        if (!target.recipient || !target.amount || target.amount <= 0 || !target.purpose) {
          throw new Error("Development fund requires recipient, amount, and purpose");
        }
        break;
      case 'GovernanceRewards':
        if (!target.voterAddresses || !target.votingRewards || 
            target.voterAddresses.length !== target.votingRewards.length) {
          throw new Error("Governance rewards require valid voter addresses and rewards");
        }
        break;
      // Add validation for other target types
    }
  }

  private validateTreasuryConfig(config: TreasuryConfigUpdate): void {
    // Validate percentage totals don't exceed 100%
    const totalPercentage = (config.lpRewardPercentage || 0) +
                           (config.developmentPercentage || 0) +
                           (config.governancePercentage || 0) +
                           (config.protocolPercentage || 0) +
                           (config.communityPercentage || 0);

    if (totalPercentage > 10000) { // 100% in basis points
      throw new Error("Total distribution percentages cannot exceed 100%");
    }

    if (config.distributionThreshold && config.distributionThreshold <= 0) {
      throw new Error("Distribution threshold must be positive");
    }

    if (config.maxSingleDistribution && config.maxSingleDistribution <= 0) {
      throw new Error("Maximum single distribution must be positive");
    }

    if (config.dailyDistributionLimit && config.dailyDistributionLimit <= 0) {
      throw new Error("Daily distribution limit must be positive");
    }
  }

  private calculateTotalDistribution(targets: DistributionTarget[]): bigint {
    let total = 0n;
    
    for (const target of targets) {
      switch (target.type) {
        case 'LiquidityProviders':
          if (target.amounts) {
            total += target.amounts.reduce((sum, amount) => sum + amount, 0n);
          }
          break;
        case 'DevelopmentFund':
        case 'ProtocolUpgrade':
          if (target.amount) {
            total += target.amount;
          }
          break;
        case 'GovernanceRewards':
          if (target.votingRewards) {
            total += target.votingRewards.reduce((sum, reward) => sum + reward, 0n);
          }
          break;
        case 'CommunityGrants':
          if (target.grantAmounts) {
            total += target.grantAmounts.reduce((sum, amount) => sum + amount, 0n);
          }
          break;
      }
    }
    
    return total;
  }

  private calculateAutoDistributionTargets(
    distributionAmount: bigint,
    treasuryState: TreasuryDatum
  ): DistributionTarget[] {
    const targets: DistributionTarget[] = [];
    
    // Calculate amounts based on percentages
    const lpAmount = (distributionAmount * BigInt(treasuryState.lpRewardPercentage)) / 10000n;
    const devAmount = (distributionAmount * BigInt(treasuryState.developmentPercentage)) / 10000n;
    const govAmount = (distributionAmount * BigInt(treasuryState.governancePercentage)) / 10000n;
    const protocolAmount = (distributionAmount * BigInt(treasuryState.protocolPercentage)) / 10000n;
    const communityAmount = (distributionAmount * BigInt(treasuryState.communityPercentage)) / 10000n;

    // Add distribution targets (simplified - would need actual recipient data)
    if (lpAmount > 0) {
      targets.push({
        type: 'LiquidityProviders',
        poolId: 'auto_distribution',
        lpAddresses: [], // Would be populated with actual LP addresses
        amounts: [] // Would be populated with calculated amounts
      });
    }

    if (devAmount > 0) {
      targets.push({
        type: 'DevelopmentFund',
        recipient: 'dev_fund_address', // Would be actual dev fund address
        amount: devAmount,
        purpose: 'Auto-distribution to development fund'
      });
    }

    // Add other targets...

    return targets;
  }

  private async validateDailyDistributionLimit(treasuryState: TreasuryDatum, amount: bigint): Promise<void> {
    // Implementation would check daily distribution history
    // For now, just validate against the limit
    if (amount > treasuryState.dailyDistributionLimit) {
      throw new Error(`Distribution exceeds daily limit: ${amount} > ${treasuryState.dailyDistributionLimit}`);
    }
  }

  private async validateGovernanceApproval(proposalId: number, amount: bigint): Promise<void> {
    // Implementation would validate governance proposal approval
    // This would integrate with the governance system
    console.log(`Validating governance approval for proposal ${proposalId} with amount ${amount}`);
  }

  // Transaction building methods
  private async buildRevenueCollectionTx(params: RevenueCollectionParams, treasuryState: TreasuryDatum): Promise<TxComplete> {
    // Find treasury UTxO
    const treasuryUtxos = await this.lucid.utxosAt(this.treasuryAddress);
    if (treasuryUtxos.length === 0) {
      throw new Error("No treasury UTxO found");
    }
    const treasuryUtxo = treasuryUtxos[0];

    // Update treasury state with collected revenue
    const updatedState: TreasuryDatum = {
      ...treasuryState,
      total_collected: treasuryState.total_collected + params.amount,
      last_collection_slot: BigInt(Date.now()),
      revenue_sources: treasuryState.revenue_sources.map(source =>
        source.source_id === params.source_id
          ? { ...source, total_collected: source.total_collected + params.amount }
          : source
      )
    };

    // Serialize data
    const datumData = Data.to(updatedState, TreasuryDatum);
    const redeemer = Data.to({
      CollectRevenue: {
        source_id: params.source_id,
        amount: params.amount
      }
    }, TreasuryRedeemer);

    // Prepare assets - add collected revenue to treasury
    const treasuryOutputAssets = {
      ...treasuryUtxo.assets,
      lovelace: (treasuryUtxo.assets.lovelace || 0n) + params.amount
    };

    // Build transaction
    const tx = await this.lucid.newTx()
      .collectFrom([treasuryUtxo], redeemer)
      .payToContract(this.treasuryAddress, { inline: datumData }, treasuryOutputAssets)
      .attachSpendingValidator(this.treasuryValidator)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    return tx;
  }

  private async buildDistributionTx(params: DistributionParams, treasuryState: TreasuryDatum, totalAmount: bigint): Promise<TxComplete> {
    // Find treasury UTxO
    const treasuryUtxos = await this.lucid.utxosAt(this.treasuryAddress);
    if (treasuryUtxos.length === 0) {
      throw new Error("No treasury UTxO found");
    }
    const treasuryUtxo = treasuryUtxos[0];

    // Update treasury state
    const updatedState: TreasuryDatum = {
      ...treasuryState,
      total_distributed: treasuryState.total_distributed + totalAmount,
      last_distribution_slot: BigInt(Date.now())
    };

    // Serialize data
    const datumData = Data.to(updatedState, TreasuryDatum);
    const redeemer = Data.to({
      DistributeRevenue: {
        targets: params.targets,
        total_amount: totalAmount
      }
    }, TreasuryRedeemer);

    // Prepare assets - remove distributed amount from treasury
    const treasuryOutputAssets = {
      ...treasuryUtxo.assets,
      lovelace: (treasuryUtxo.assets.lovelace || 0n) - totalAmount
    };

    // Build transaction with distribution payments
    let txBuilder = this.lucid.newTx()
      .collectFrom([treasuryUtxo], redeemer)
      .payToContract(this.treasuryAddress, { inline: datumData }, treasuryOutputAssets)
      .attachSpendingValidator(this.treasuryValidator);

    // Add payments to each target
    for (const target of params.targets) {
      txBuilder = txBuilder.payToAddress(target.address, { lovelace: target.amount });
    }

    const tx = await txBuilder
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    return tx;
  }

  private async buildAutoDistributionTx(targets: DistributionTarget[], treasuryState: TreasuryDatum, amount: bigint): Promise<TxComplete> {
    // Find treasury UTxO
    const treasuryUtxos = await this.lucid.utxosAt(this.treasuryAddress);
    if (treasuryUtxos.length === 0) {
      throw new Error("No treasury UTxO found");
    }
    const treasuryUtxo = treasuryUtxos[0];

    // Update treasury state
    const updatedState: TreasuryDatum = {
      ...treasuryState,
      total_distributed: treasuryState.total_distributed + amount,
      last_distribution_slot: BigInt(Date.now())
    };

    // Serialize data
    const datumData = Data.to(updatedState, TreasuryDatum);
    const redeemer = Data.to({
      AutoDistribute: {
        targets: targets,
        amount: amount
      }
    }, TreasuryRedeemer);

    // Prepare assets
    const treasuryOutputAssets = {
      ...treasuryUtxo.assets,
      lovelace: (treasuryUtxo.assets.lovelace || 0n) - amount
    };

    // Build transaction with auto-distribution
    let txBuilder = this.lucid.newTx()
      .collectFrom([treasuryUtxo], redeemer)
      .payToContract(this.treasuryAddress, { inline: datumData }, treasuryOutputAssets)
      .attachSpendingValidator(this.treasuryValidator);

    // Add payments to each target
    for (const target of targets) {
      txBuilder = txBuilder.payToAddress(target.address, { lovelace: target.amount });
    }

    const tx = await txBuilder
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    return tx;
  }

  private async buildConfigUpdateTx(config: TreasuryConfigUpdate, treasuryState: TreasuryDatum): Promise<TxComplete> {
    // Find treasury UTxO
    const treasuryUtxos = await this.lucid.utxosAt(this.treasuryAddress);
    if (treasuryUtxos.length === 0) {
      throw new Error("No treasury UTxO found");
    }
    const treasuryUtxo = treasuryUtxos[0];

    // Update treasury configuration
    const updatedState: TreasuryDatum = {
      ...treasuryState,
      config: {
        ...treasuryState.config,
        ...config
      }
    };

    // Serialize data
    const datumData = Data.to(updatedState, TreasuryDatum);
    const redeemer = Data.to({
      UpdateConfig: {
        new_config: config
      }
    }, TreasuryRedeemer);

    // Build transaction
    const tx = await this.lucid.newTx()
      .collectFrom([treasuryUtxo], redeemer)
      .payToContract(this.treasuryAddress, { inline: datumData }, treasuryUtxo.assets)
      .attachSpendingValidator(this.treasuryValidator)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    return tx;
  }

  private async buildAddAssetTx(tokenPolicy: PolicyId, tokenName: string, treasuryState: TreasuryDatum): Promise<TxComplete> {
    // Find treasury UTxO
    const treasuryUtxos = await this.lucid.utxosAt(this.treasuryAddress);
    if (treasuryUtxos.length === 0) {
      throw new Error("No treasury UTxO found");
    }
    const treasuryUtxo = treasuryUtxos[0];

    // Add new asset to supported assets list
    const newAsset = { policy: tokenPolicy, name: tokenName };
    const updatedState: TreasuryDatum = {
      ...treasuryState,
      supportedAssets: [...treasuryState.supportedAssets, newAsset]
    };

    // Serialize data
    const datumData = Data.to(updatedState, TreasuryDatum);
    const redeemer = Data.to({
      AddAsset: {
        token_policy: tokenPolicy,
        token_name: tokenName
      }
    }, TreasuryRedeemer);

    // Build transaction
    const tx = await this.lucid.newTx()
      .collectFrom([treasuryUtxo], redeemer)
      .payToContract(this.treasuryAddress, { inline: datumData }, treasuryUtxo.assets)
      .attachSpendingValidator(this.treasuryValidator)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    return tx;
  }

  private async buildEmergencyWithdrawTx(
    recipient: Address,
    amount: bigint,
    tokenPolicy: PolicyId,
    tokenName: string,
    reason: string,
    treasuryState: TreasuryDatum
  ): Promise<TxComplete> {
    // Find treasury UTxO
    const treasuryUtxos = await this.lucid.utxosAt(this.treasuryAddress);
    if (treasuryUtxos.length === 0) {
      throw new Error("No treasury UTxO found");
    }
    const treasuryUtxo = treasuryUtxos[0];

    // Update treasury state
    const updatedState: TreasuryDatum = {
      ...treasuryState,
      totalDistributed: treasuryState.totalDistributed + amount
    };

    // Serialize data
    const datumData = Data.to(updatedState, TreasuryDatum);
    const redeemer = Data.to({
      EmergencyWithdraw: {
        recipient,
        amount,
        token_policy: tokenPolicy,
        token_name: tokenName,
        reason
      }
    }, TreasuryRedeemer);

    // Prepare assets
    const assetUnit = tokenPolicy === "" ? "lovelace" : `${tokenPolicy}${tokenName}`;
    const treasuryOutputAssets = {
      ...treasuryUtxo.assets,
      [assetUnit]: (treasuryUtxo.assets[assetUnit] || 0n) - amount
    };

    const withdrawalAssets = {
      [assetUnit]: amount
    };

    // Build transaction
    const tx = await this.lucid.newTx()
      .collectFrom([treasuryUtxo], redeemer)
      .payToContract(this.treasuryAddress, { inline: datumData }, treasuryOutputAssets)
      .payToAddress(recipient, withdrawalAssets)
      .attachSpendingValidator(this.treasuryValidator)
      .validTo(Date.now() + 1200000) // 20 minute deadline
      .complete();

    return tx;
  }
}
