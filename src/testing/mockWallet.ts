// PuckSwap v5 - Enhanced Mock Wallet for Node.js Testing
// Comprehensive mock wallet implementation for end-to-end testing without browser CIP-30 dependency
// Supports all Lucid Evolution transaction builders and provides realistic wallet simulation
//
// FEATURES:
// - Full CIP-30 wallet API simulation
// - Lucid Evolution integration via lucid.selectWallet.fromAPI()
// - Multi-asset UTxO support for all PuckSwap operations
// - Transaction simulation with realistic fees and state updates
// - Specialized wallet factories for different testing scenarios
// - Global mock environment setup for comprehensive testing
//
// USAGE:
// ```typescript
// import { setupMockWalletWithLucid, createLiquidityProviderWallet } from './mockWallet';
//
// // Basic setup
// const wallet = await setupMockWalletWithLucid(lucid);
//
// // Specialized wallets
// const lpWallet = createLiquidityProviderWallet(1000000000n, 5000000000n);
// await lpWallet.integrateWithLucid(lucid);
// ```

import {
  Lucid,
  TxComplete,
  TxSigned,
  UTxO,
  Assets,
  Address,
  TxHash,
  Data,
  Constr,
  fromText,
  toText,
  C,
  Credential,
  RewardAddress
} from "@lucid-evolution/lucid";

export interface MockWalletConfig {
  address: Address;
  utxos: UTxO[];
  balance: Assets;
  network: "mainnet" | "preprod" | "preview";
  privateKey?: string;
  stakingAddress?: string;
}

export interface MockTransactionResult {
  txHash: TxHash;
  success: boolean;
  error?: string;
  fee?: bigint;
  outputs?: UTxO[];
}

/**
 * Enhanced Mock Wallet for comprehensive testing
 * Simulates real wallet behavior for automated testing scenarios
 */
export class MockWallet {
  private config: MockWalletConfig;
  private isConnected: boolean = false;
  private transactionHistory: MockTransactionResult[] = [];
  private currentSlot: number = 1000000;

  constructor(config: MockWalletConfig) {
    this.config = config;
  }

  // ========== CIP-30 WALLET API SIMULATION ==========

  async enable(): Promise<MockWalletAPI> {
    console.log("🔗 Mock Wallet: Enabling wallet connection");
    this.isConnected = true;
    return new MockWalletAPI(this.config, this);
  }

  isEnabled(): boolean {
    return this.isConnected;
  }

  async getNetworkId(): Promise<number> {
    switch (this.config.network) {
      case "mainnet": return 1;
      case "preprod": return 0;
      case "preview": return 0;
      default: return 0;
    }
  }

  // ========== WALLET STATE MANAGEMENT ==========

  getBalance(): Assets {
    return { ...this.config.balance };
  }

  getUtxos(): UTxO[] {
    return [...this.config.utxos];
  }

  getAddress(): Address {
    return this.config.address;
  }

  getCurrentSlot(): number {
    return this.currentSlot;
  }

  incrementSlot(slots: number = 1): void {
    this.currentSlot += slots;
  }

  // ========== TRANSACTION SIMULATION ==========

  async simulateTransaction(txCbor: string): Promise<MockTransactionResult> {
    try {
      console.log("🔄 Mock Wallet: Simulating transaction execution");
      
      // Generate realistic transaction hash
      const txHash = this.generateTxHash();
      
      // Simulate transaction fee (2-5 ADA)
      const fee = BigInt(Math.floor(Math.random() * 3000000) + 2000000);
      
      // Update wallet state (simplified)
      this.updateWalletState(fee);
      
      const result: MockTransactionResult = {
        txHash,
        success: true,
        fee,
        outputs: []
      };

      this.transactionHistory.push(result);
      this.incrementSlot();
      
      console.log(`✅ Mock Transaction successful: ${txHash}`);
      return result;
      
    } catch (error) {
      const result: MockTransactionResult = {
        txHash: "",
        success: false,
        error: String(error)
      };
      
      this.transactionHistory.push(result);
      console.error(`❌ Mock Transaction failed: ${error}`);
      return result;
    }
  }

  private generateTxHash(): TxHash {
    const randomBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private updateWalletState(fee: bigint): void {
    // Deduct transaction fee from ADA balance
    if (this.config.balance.lovelace && this.config.balance.lovelace >= fee) {
      this.config.balance.lovelace -= fee;
    }
  }

  // ========== TRANSACTION HISTORY ==========

  getTransactionHistory(): MockTransactionResult[] {
    return [...this.transactionHistory];
  }

  getLastTransaction(): MockTransactionResult | null {
    return this.transactionHistory.length > 0 
      ? this.transactionHistory[this.transactionHistory.length - 1]
      : null;
  }

  clearTransactionHistory(): void {
    this.transactionHistory = [];
  }

  // ========== LUCID EVOLUTION INTEGRATION ==========

  /**
   * Get Lucid Evolution compatible wallet interface
   * This method returns a wallet object that can be used with lucid.selectWallet.fromAPI()
   */
  getLucidWalletInterface(): MockLucidWallet {
    return new MockLucidWallet(this.config, this);
  }

  /**
   * Integrate with Lucid Evolution instance
   * This method sets up the mock wallet to work with Lucid Evolution
   */
  async integrateWithLucid(lucid: Lucid): Promise<void> {
    console.log("🔗 Mock Wallet: Integrating with Lucid Evolution");

    // Create mock CIP-30 API
    const mockAPI = await this.enable();

    // Set the wallet in Lucid Evolution
    await lucid.selectWallet.fromAPI(mockAPI);

    console.log("✅ Mock wallet successfully integrated with Lucid Evolution");
  }
}

/**
 * Mock CIP-30 Wallet API Implementation
 */
export class MockWalletAPI {
  private config: MockWalletConfig;
  private wallet: MockWallet;

  constructor(config: MockWalletConfig, wallet: MockWallet) {
    this.config = config;
    this.wallet = wallet;
  }

  async getUsedAddresses(): Promise<string[]> {
    return [this.config.address];
  }

  async getUnusedAddresses(): Promise<string[]> {
    return [this.config.address];
  }

  async getChangeAddress(): Promise<string> {
    return this.config.address;
  }

  async getRewardAddresses(): Promise<string[]> {
    return this.config.stakingAddress ? [this.config.stakingAddress] : [];
  }

  async getBalance(): Promise<string> {
    // Return CBOR-encoded value for CIP-30 compatibility
    try {
      const balanceMap = new Map();
      for (const [unit, amount] of Object.entries(this.config.balance)) {
        balanceMap.set(unit, amount);
      }
      
      // Simplified CBOR encoding
      return this.encodeToCbor(this.config.balance);
    } catch (error) {
      console.error("Failed to encode balance:", error);
      return "a0"; // Empty map in CBOR
    }
  }

  async getUtxos(): Promise<string[]> {
    // Return CBOR-encoded UTxOs for CIP-30 compatibility
    return this.config.utxos.map(utxo => this.encodeToCbor(utxo));
  }

  async getCollateral(): Promise<string[]> {
    // Return collateral UTxOs (typically 5 ADA UTxOs)
    const collateralUtxos = this.config.utxos.filter(utxo =>
      utxo.assets.lovelace >= 5000000n && Object.keys(utxo.assets).length === 1
    ).slice(0, 3); // Return up to 3 collateral UTxOs

    return collateralUtxos.map(utxo => this.encodeToCbor(utxo));
  }

  async signTx(tx: string, partialSign?: boolean): Promise<string> {
    console.log("✍️ Mock Wallet: Signing transaction");
    
    // Generate mock witness set
    const mockWitness = {
      vkey_witnesses: [{
        vkey: this.config.privateKey || "0".repeat(64),
        signature: this.generateSignature()
      }]
    };
    
    return this.encodeToCbor(mockWitness);
  }

  async signData(addr: string, payload: string): Promise<{ signature: string; key: string }> {
    console.log("✍️ Mock Wallet: Signing data");
    return {
      signature: this.generateSignature(),
      key: this.config.privateKey || "0".repeat(64)
    };
  }

  async submitTx(tx: string): Promise<string> {
    console.log("📤 Mock Wallet: Submitting transaction");
    const result = await this.wallet.simulateTransaction(tx);
    
    if (!result.success) {
      throw new Error(result.error || "Transaction submission failed");
    }
    
    return result.txHash;
  }

  private generateSignature(): string {
    const signature = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      signature[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(signature, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private encodeToCbor(data: any): string {
    // Simplified CBOR encoding for testing
    try {
      return "82" + Buffer.from(JSON.stringify(data)).toString('hex');
    } catch (error) {
      return "a0"; // Empty map fallback
    }
  }
}

/**
 * Mock Lucid Evolution Wallet Interface
 * This class implements the wallet interface that Lucid Evolution expects
 */
export class MockLucidWallet {
  private config: MockWalletConfig;
  private mockWallet: MockWallet;

  constructor(config: MockWalletConfig, mockWallet: MockWallet) {
    this.config = config;
    this.mockWallet = mockWallet;
  }

  async address(): Promise<Address> {
    return this.config.address;
  }

  async rewardAddress(): Promise<RewardAddress | null> {
    return this.config.stakingAddress || null;
  }

  async getUtxos(): Promise<UTxO[]> {
    return [...this.config.utxos];
  }

  async getUtxosCore(): Promise<UTxO[]> {
    return [...this.config.utxos];
  }

  async getDelegation(): Promise<{ poolId: string | null; rewards: bigint }> {
    return {
      poolId: null, // Not delegated in mock
      rewards: 0n
    };
  }

  async signTx(tx: TxComplete): Promise<TxSigned> {
    console.log("✍️ Mock Lucid Wallet: Signing transaction");
    const txCbor = tx.toCBOR();
    return new MockTxSigned(txCbor + "_signed", this.mockWallet);
  }

  async signMessage(address: Address, payload: string): Promise<{ signature: string; key: string }> {
    console.log("✍️ Mock Lucid Wallet: Signing message");
    return {
      signature: this.generateSignature(),
      key: this.config.privateKey || "0".repeat(64)
    };
  }

  async submitTx(tx: TxSigned): Promise<TxHash> {
    console.log("📤 Mock Lucid Wallet: Submitting transaction");
    const result = await this.mockWallet.simulateTransaction(tx.toCBOR());

    if (!result.success) {
      throw new Error(result.error || "Transaction submission failed");
    }

    return result.txHash;
  }

  private generateSignature(): string {
    const signature = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      signature[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(signature, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

/**
 * Mock Transaction Classes for Lucid Evolution compatibility
 */
export class MockTxComplete implements TxComplete {
  private txCbor: string;
  private wallet: MockWallet;

  constructor(txCbor: string, wallet: MockWallet) {
    this.txCbor = txCbor;
    this.wallet = wallet;
  }

  async sign(): Promise<TxSigned> {
    console.log("✍️ Mock: Signing transaction");
    return new MockTxSigned(this.txCbor + "_signed", this.wallet);
  }

  async complete(): Promise<TxComplete> {
    console.log("🔄 Mock: Completing transaction");
    return this;
  }

  toString(): string {
    return this.txCbor;
  }

  toCBOR(): string {
    return this.txCbor;
  }
}

export class MockTxSigned implements TxSigned {
  private txCbor: string;
  private wallet: MockWallet;

  constructor(txCbor: string, wallet: MockWallet) {
    this.txCbor = txCbor;
    this.wallet = wallet;
  }

  async submit(): Promise<TxHash> {
    console.log("📤 Mock: Submitting transaction");
    const result = await this.wallet.simulateTransaction(this.txCbor);
    
    if (!result.success) {
      throw new Error(result.error || "Transaction submission failed");
    }
    
    return result.txHash;
  }

  async complete(): Promise<TxSigned> {
    console.log("✅ Mock: Completing signed transaction");
    return this;
  }

  toString(): string {
    return this.txCbor;
  }

  toCBOR(): string {
    return this.txCbor;
  }
}

// ========== FACTORY FUNCTIONS ==========

/**
 * Create a comprehensive mock wallet environment for testing
 */
export function createMockWalletEnvironment(
  network: "mainnet" | "preprod" | "preview" = "preprod",
  customConfig?: Partial<MockWalletConfig>
): MockWalletConfig {
  const mockAddress = network === "mainnet"
    ? "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp"
    : "addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwqcusw0e";

  const stakingAddress = network === "mainnet"
    ? "stake1ux2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp"
    : "stake_test1uz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwqcusw0e";

  const defaultConfig: MockWalletConfig = {
    address: mockAddress,
    network,
    stakingAddress,
    privateKey: "ed25519_sk1" + "0".repeat(60),
    balance: {
      lovelace: 1000000000n, // 1000 ADA
      "c6e65ba7878b2f8ea0ad39287d3e2fd256dc5c4160fc19bdf4c4d87e7365636b79": 115097600000000n, // 5000 PUCKY tokens (adjusted for new price ratio)
      "mock_lp_policy.PUCKY_ADA_LP": 1000000n, // 1 LP token
    },
    utxos: [
      {
        txHash: "mock_utxo_1_" + Math.random().toString(36).substr(2, 16),
        outputIndex: 0,
        address: mockAddress,
        assets: {
          lovelace: 500000000n, // 500 ADA
        },
        datum: null,
        datumHash: null,
        scriptRef: null
      },
      {
        txHash: "mock_utxo_2_" + Math.random().toString(36).substr(2, 16),
        outputIndex: 0,
        address: mockAddress,
        assets: {
          lovelace: 300000000n, // 300 ADA
          "c6e65ba7878b2f8ea0ad39287d3e2fd256dc5c4160fc19bdf4c4d87e7365636b79": 3000000000n, // 3000 PUCKY
        },
        datum: null,
        datumHash: null,
        scriptRef: null
      },
      {
        txHash: "mock_utxo_3_" + Math.random().toString(36).substr(2, 16),
        outputIndex: 0,
        address: mockAddress,
        assets: {
          lovelace: 200000000n, // 200 ADA
          "c6e65ba7878b2f8ea0ad39287d3e2fd256dc5c4160fc19bdf4c4d87e7365636b79": 2000000000n, // 2000 PUCKY
          "mock_lp_policy.PUCKY_ADA_LP": 1000000n, // 1 LP token
        },
        datum: null,
        datumHash: null,
        scriptRef: null
      }
    ]
  };

  return { ...defaultConfig, ...customConfig };
}

/**
 * Create a mock wallet instance with optional configuration
 */
export function createMockWallet(config?: Partial<MockWalletConfig>): MockWallet {
  const defaultConfig = createMockWalletEnvironment();
  const finalConfig = { ...defaultConfig, ...config };
  return new MockWallet(finalConfig);
}

/**
 * Create a mock wallet with specific token balances for testing
 */
export function createMockWalletWithTokens(
  adaAmount: bigint,
  tokenAmounts: Record<string, bigint>,
  network: "mainnet" | "preprod" | "preview" = "preprod"
): MockWallet {
  const baseConfig = createMockWalletEnvironment(network);

  // Update balance
  baseConfig.balance = {
    lovelace: adaAmount,
    ...tokenAmounts
  };

  // Create UTxOs with the specified balances
  const utxos: UTxO[] = [];
  let utxoIndex = 0;

  // ADA UTxO
  if (adaAmount > 0n) {
    utxos.push({
      txHash: "mock_ada_utxo_" + Math.random().toString(36).substr(2, 16),
      outputIndex: utxoIndex++,
      address: baseConfig.address,
      assets: { lovelace: adaAmount },
      datum: null,
      datumHash: null,
      scriptRef: null
    });
  }

  // Token UTxOs
  for (const [unit, amount] of Object.entries(tokenAmounts)) {
    if (amount > 0n) {
      utxos.push({
        txHash: "mock_token_utxo_" + Math.random().toString(36).substr(2, 16),
        outputIndex: utxoIndex++,
        address: baseConfig.address,
        assets: {
          lovelace: 2000000n, // Min ADA
          [unit]: amount
        },
        datum: null,
        datumHash: null,
        scriptRef: null
      });
    }
  }

  baseConfig.utxos = utxos;
  return new MockWallet(baseConfig);
}

/**
 * Create multiple mock wallets for multi-user testing scenarios
 */
export function createMockWalletPool(
  count: number,
  network: "mainnet" | "preprod" | "preview" = "preprod"
): MockWallet[] {
  const wallets: MockWallet[] = [];

  for (let i = 0; i < count; i++) {
    const config = createMockWalletEnvironment(network, {
      privateKey: `ed25519_sk1${i.toString().padStart(59, '0')}`
    });
    wallets.push(new MockWallet(config));
  }

  return wallets;
}

/**
 * Create a mock wallet specifically for liquidity provision testing
 */
export function createLiquidityProviderWallet(
  adaAmount: bigint = 1000000000n, // 1000 ADA
  tokenAmount: bigint = 5000000000n, // 5000 PUCKY
  network: "mainnet" | "preprod" | "preview" = "preprod"
): MockWallet {
  const tokenUnit = "c6e65ba7878b2f8ea0ad39287d3e2fd256dc5c4160fc19bdf4c4d87e7365636b79"; // PUCKY token

  return createMockWalletWithTokens(adaAmount, {
    [tokenUnit]: tokenAmount
  }, network);
}

/**
 * Create a mock wallet specifically for governance testing
 */
export function createGovernanceWallet(
  adaAmount: bigint = 500000000n, // 500 ADA
  network: "mainnet" | "preprod" | "preview" = "preprod"
): MockWallet {
  return createMockWalletWithTokens(adaAmount, {}, network);
}

/**
 * Create a mock wallet specifically for staking testing
 */
export function createStakingWallet(
  adaAmount: bigint = 2000000000n, // 2000 ADA
  pADAAmount: bigint = 1000000000n, // 1000 pADA
  network: "mainnet" | "preprod" | "preview" = "preprod"
): MockWallet {
  const pADAUnit = "mock_pADA_policy.pADA"; // Mock pADA token

  return createMockWalletWithTokens(adaAmount, {
    [pADAUnit]: pADAAmount
  }, network);
}

/**
 * Create a mock wallet specifically for cross-chain testing
 */
export function createCrossChainWallet(
  adaAmount: bigint = 1500000000n, // 1500 ADA
  bridgeTokenAmount: bigint = 1000000000n, // 1000 bridge tokens
  network: "mainnet" | "preprod" | "preview" = "preprod"
): MockWallet {
  const bridgeTokenUnit = "mock_bridge_policy.BRIDGE"; // Mock bridge token

  return createMockWalletWithTokens(adaAmount, {
    [bridgeTokenUnit]: bridgeTokenAmount
  }, network);
}

// ========== GLOBAL MOCK WALLET MANAGEMENT ==========

let globalMockWallet: MockWallet | null = null;

export function setGlobalMockWallet(wallet: MockWallet): void {
  globalMockWallet = wallet;
  console.log("🌍 Global mock wallet set for testing");
}

export function getGlobalMockWallet(): MockWallet | null {
  return globalMockWallet;
}

export function clearGlobalMockWallet(): void {
  globalMockWallet = null;
  console.log("🧹 Global mock wallet cleared");
}

/**
 * Setup mock cardano window object for browser environment simulation
 */
export function setupMockCardanoWindow(): void {
  if (typeof window !== 'undefined') {
    (window as any).cardano = {
      vespr: createMockWallet(),
      eternl: createMockWallet(),
      lace: createMockWallet(),
      nami: createMockWallet(),
      typhon: createMockWallet(),
      flint: createMockWallet(),
      gerowallet: createMockWallet(),
    };
    console.log("🌐 Mock cardano window object setup complete");
  }
}

/**
 * Utility to check if we're in a mock environment
 */
export function isMockEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' ||
         process.env.MOCK_WALLET === 'true' ||
         process.env.PUCKSWAP_MOCK_MODE === 'true';
}

// ========== EXAMPLE USAGE ==========

/**
 * Example function demonstrating how to use the mock wallet with Lucid Evolution
 * This can be used as a reference for setting up tests
 */
export async function exampleMockWalletUsage(lucid: Lucid): Promise<void> {
  console.log("📚 Mock Wallet Usage Example");

  // 1. Create and setup a basic mock wallet
  const wallet = await setupMockWalletWithLucid(lucid);
  console.log(`✅ Wallet Address: ${wallet.getAddress()}`);
  console.log(`💰 Wallet Balance: ${JSON.stringify(wallet.getBalance(), null, 2)}`);

  // 2. Get wallet UTxOs (compatible with Lucid Evolution)
  const utxos = wallet.getUtxos();
  console.log(`📦 Available UTxOs: ${utxos.length}`);

  // 3. Simulate a transaction
  const mockTxResult = await wallet.simulateTransaction("mock_tx_cbor");
  console.log(`🔄 Transaction Result: ${mockTxResult.success ? 'Success' : 'Failed'}`);
  console.log(`🆔 Transaction Hash: ${mockTxResult.txHash}`);

  // 4. Check transaction history
  const history = wallet.getTransactionHistory();
  console.log(`📜 Transaction History: ${history.length} transactions`);

  console.log("✅ Mock wallet example completed successfully");
}

/**
 * Initialize mock environment for testing
 */
export function initializeMockEnvironment(): MockWallet {
  const wallet = createMockWallet();
  setGlobalMockWallet(wallet);
  setupMockCardanoWindow();
  console.log("🚀 Mock environment initialized for PuckSwap v5 testing");
  return wallet;
}

/**
 * Setup mock wallet with Lucid Evolution for testing
 * This is the main function to use when setting up tests
 */
export async function setupMockWalletWithLucid(
  lucid: Lucid,
  config?: Partial<MockWalletConfig>
): Promise<MockWallet> {
  console.log("🔧 Setting up mock wallet with Lucid Evolution...");

  const wallet = createMockWallet(config);
  await wallet.integrateWithLucid(lucid);

  console.log("✅ Mock wallet setup complete");
  return wallet;
}

/**
 * Create a comprehensive test environment with multiple wallets
 */
export async function createTestEnvironment(
  lucid: Lucid,
  walletCount: number = 3,
  network: "mainnet" | "preprod" | "preview" = "preprod"
): Promise<{
  wallets: MockWallet[];
  liquidityProvider: MockWallet;
  governance: MockWallet;
  staking: MockWallet;
  crossChain: MockWallet;
}> {
  console.log("🏗️ Creating comprehensive test environment...");

  const wallets = createMockWalletPool(walletCount, network);
  const liquidityProvider = createLiquidityProviderWallet(1000000000n, 5000000000n, network);
  const governance = createGovernanceWallet(500000000n, network);
  const staking = createStakingWallet(2000000000n, 1000000000n, network);
  const crossChain = createCrossChainWallet(1500000000n, 1000000000n, network);

  // Integrate all wallets with Lucid (note: only one can be active at a time)
  console.log("🔗 Integrating primary wallet with Lucid...");
  await wallets[0].integrateWithLucid(lucid);

  console.log("✅ Test environment created successfully");

  return {
    wallets,
    liquidityProvider,
    governance,
    staking,
    crossChain
  };
}

// Export everything for easy access
export default {
  MockWallet,
  MockWalletAPI,
  MockLucidWallet,
  MockTxComplete,
  MockTxSigned,
  createMockWalletEnvironment,
  createMockWallet,
  createMockWalletWithTokens,
  createMockWalletPool,
  createLiquidityProviderWallet,
  createGovernanceWallet,
  createStakingWallet,
  createCrossChainWallet,
  setupMockCardanoWindow,
  setupMockWalletWithLucid,
  createTestEnvironment,
  exampleMockWalletUsage,
  isMockEnvironment,
  initializeMockEnvironment,
  setGlobalMockWallet,
  getGlobalMockWallet,
  clearGlobalMockWallet
};
