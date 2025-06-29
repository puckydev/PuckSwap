import { Lucid } from "@lucid-evolution/lucid";

// CIP-30 wallet types
export type WalletName = "eternl" | "nami" | "vespr" | "lace" | "typhon" | "flint";

export interface WalletInfo {
  name: WalletName;
  displayName: string;
  icon: string;
  isInstalled: boolean;
  isEnabled: boolean;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: {
    ada: bigint;
    assets: Record<string, bigint>;
  };
  walletName: WalletName | null;
}

// Wallet connection events
export type WalletEventType = 'connected' | 'disconnected' | 'balance_changed' | 'address_changed';
export type WalletEventListener = (event: { type: WalletEventType; data?: any }) => void;

export class WalletManager {
  private lucid: Lucid | null = null;
  private state: WalletState = {
    isConnected: false,
    address: null,
    balance: { ada: 0n, assets: {} },
    walletName: null
  };
  private listeners: Set<WalletEventListener> = new Set();

  constructor() {
    // Listen for wallet events if available
    this.setupWalletEventListeners();
  }

  // Get available wallets
  getAvailableWallets(): WalletInfo[] {
    const wallets: WalletInfo[] = [
      {
        name: "eternl",
        displayName: "Eternl",
        icon: "/icons/eternl.svg",
        isInstalled: this.isWalletInstalled("eternl"),
        isEnabled: false
      },
      {
        name: "nami",
        displayName: "Nami",
        icon: "/icons/nami.svg",
        isInstalled: this.isWalletInstalled("nami"),
        isEnabled: false
      },
      {
        name: "vespr",
        displayName: "Vespr",
        icon: "/icons/vespr.svg",
        isInstalled: this.isWalletInstalled("vespr"),
        isEnabled: false
      },
      {
        name: "lace",
        displayName: "Lace",
        icon: "/icons/lace.svg",
        isInstalled: this.isWalletInstalled("lace"),
        isEnabled: false
      },
      {
        name: "typhon",
        displayName: "Typhon",
        icon: "/icons/typhon.svg",
        isInstalled: this.isWalletInstalled("typhon"),
        isEnabled: false
      },
      {
        name: "flint",
        displayName: "Flint",
        icon: "/icons/flint.svg",
        isInstalled: this.isWalletInstalled("flint"),
        isEnabled: false
      }
    ];

    return wallets;
  }

  // Check if wallet is installed
  private isWalletInstalled(walletName: WalletName): boolean {
    if (typeof window === 'undefined') return false;
    
    const walletApi = (window as any).cardano?.[walletName];
    return !!walletApi;
  }

  // Connect to wallet with enhanced error handling and validation
  async connectWallet(walletName: WalletName, lucid: Lucid): Promise<void> {
    try {
      console.log(`🔗 Attempting to connect ${walletName} wallet...`);

      if (!this.isWalletInstalled(walletName)) {
        throw new Error(`${walletName} wallet is not installed`);
      }

      // Enable wallet with validation
      const walletApi = (window as any).cardano[walletName];
      if (!walletApi || typeof walletApi.enable !== 'function') {
        throw new Error(`${walletName} wallet API is not available or corrupted`);
      }

      const api = await walletApi.enable();

      // Validate API object
      if (!api || typeof api.getUtxos !== 'function' || typeof api.getBalance !== 'function') {
        throw new Error(`${walletName} wallet API is incomplete`);
      }

      // Set wallet in Lucid Evolution
      lucid.selectWallet.fromAPI(api);
      this.lucid = lucid;

      // Get wallet address using correct Lucid Evolution API
      console.log(`📍 Getting ${walletName} wallet address...`);
      const address = await lucid.wallet().address();

      if (!address || typeof address !== 'string') {
        throw new Error('Failed to retrieve wallet address');
      }

      // Get wallet UTxOs with retry mechanism
      console.log(`💰 Getting ${walletName} wallet UTxOs...`);
      let utxos;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          utxos = await lucid.wallet().getUtxos();
          break;
        } catch (utxoError) {
          retryCount++;
          console.warn(`⚠️ UTxO fetch attempt ${retryCount} failed:`, utxoError);

          if (retryCount >= maxRetries) {
            throw new Error(`Failed to fetch UTxOs after ${maxRetries} attempts: ${utxoError.message}`);
          }

          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (!Array.isArray(utxos)) {
        console.warn(`⚠️ UTxOs is not an array, got:`, typeof utxos, utxos);
        utxos = [];
      }

      console.log(`📦 Retrieved ${utxos.length} UTxOs from ${walletName} wallet`);

      // Calculate balance with enhanced error handling
      const balance = this.calculateBalance(utxos);

      // Update state
      this.state = {
        isConnected: true,
        address,
        balance,
        walletName
      };

      // Emit connected event with balance
      this.emitEvent('connected', { walletName, address, balance });

      console.log(`✅ Wallet ${walletName} connected successfully`);
      console.log(`   Address: ${address.substring(0, 20)}...`);
      console.log(`   Balance: ${balance.ada} lovelace`);
      console.log(`   Assets: ${Object.keys(balance.assets).length} types`);

    } catch (error) {
      console.error(`❌ Failed to connect ${walletName} wallet:`, error);

      // Reset state on error
      this.state = {
        isConnected: false,
        address: '',
        balance: { ada: 0n, assets: {} },
        walletName: null
      };

      // Emit error event
      this.emitEvent('error', {
        walletName,
        error: error.message
      });

      // Enhance error message for user
      if (error.message.includes('User declined')) {
        throw new Error('Connection cancelled by user');
      } else if (error.message.includes('not installed')) {
        throw new Error(`${walletName} wallet is not installed. Please install it and refresh the page.`);
      } else if (error.message.includes('API is incomplete')) {
        throw new Error(`${walletName} wallet is not properly initialized. Please refresh the page and try again.`);
      } else if (error.message.includes('Failed to fetch UTxOs')) {
        throw new Error('Failed to process wallet balance data. Try disconnecting and reconnecting your wallet.');
      }

      throw error;
    }
  }

  // Disconnect wallet
  async disconnectWallet(): Promise<void> {
    const previousWallet = this.state.walletName;
    
    this.state = {
      isConnected: false,
      address: null,
      balance: { ada: 0n, assets: {} },
      walletName: null
    };
    
    this.lucid = null;

    // Emit disconnected event
    this.emitEvent('disconnected', { walletName: previousWallet });
    
    console.log('Wallet disconnected');
  }

  // Get current wallet state
  getState(): WalletState {
    return { ...this.state };
  }

  // Refresh wallet balance with enhanced error handling
  async refreshBalance(): Promise<void> {
    if (!this.lucid || !this.state.isConnected) {
      throw new Error('No wallet connected');
    }

    try {
      console.log(`🔄 Refreshing ${this.state.walletName} wallet balance...`);

      // Get UTxOs with retry mechanism
      let utxos;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          utxos = await this.lucid.wallet().getUtxos();
          break;
        } catch (utxoError) {
          retryCount++;
          console.warn(`⚠️ Balance refresh attempt ${retryCount} failed:`, utxoError);

          if (retryCount >= maxRetries) {
            throw new Error(`Failed to refresh balance after ${maxRetries} attempts: ${utxoError.message}`);
          }

          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (!Array.isArray(utxos)) {
        console.warn(`⚠️ UTxOs is not an array during refresh, got:`, typeof utxos, utxos);
        utxos = [];
      }

      const newBalance = this.calculateBalance(utxos);

      const balanceChanged =
        newBalance.ada !== this.state.balance.ada ||
        JSON.stringify(newBalance.assets) !== JSON.stringify(this.state.balance.assets);

      this.state.balance = newBalance;

      if (balanceChanged) {
        console.log(`💰 Balance updated: ${newBalance.ada} lovelace, ${Object.keys(newBalance.assets).length} assets`);
        this.emitEvent('balance_changed', { balance: newBalance });
      }
    } catch (error) {
      console.error('❌ Failed to refresh balance:', error);

      // Emit error event
      this.emitEvent('error', {
        walletName: this.state.walletName,
        error: error.message
      });

      throw error;
    }
  }

  // Safely convert value to BigInt with comprehensive null/undefined handling
  private safeToBigInt(value: any, context?: string): bigint {
    // Handle explicit null/undefined cases
    if (value === undefined || value === null || value === '') {
      console.debug(`safeToBigInt: Converting ${value} to 0n${context ? ` (${context})` : ''}`);
      return 0n;
    }

    // Handle already converted BigInt
    if (typeof value === 'bigint') {
      return value;
    }

    // Handle numeric values
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) {
        console.warn(`safeToBigInt: Invalid number ${value}${context ? ` (${context})` : ''}, converting to 0n`);
        return 0n;
      }
      return BigInt(Math.floor(value));
    }

    // Handle string values
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') {
        console.debug(`safeToBigInt: Converting empty/null string to 0n${context ? ` (${context})` : ''}`);
        return 0n;
      }

      try {
        // Remove any non-numeric characters except minus sign
        const cleaned = trimmed.replace(/[^0-9-]/g, '');
        if (cleaned === '' || cleaned === '-') {
          console.warn(`safeToBigInt: No valid digits in "${value}"${context ? ` (${context})` : ''}, converting to 0n`);
          return 0n;
        }
        return BigInt(cleaned);
      } catch (error) {
        console.warn(`safeToBigInt: Failed to convert "${value}" to BigInt${context ? ` (${context})` : ''}:`, error);
        return 0n;
      }
    }

    // Handle object with toString method
    if (value && typeof value.toString === 'function') {
      try {
        return this.safeToBigInt(value.toString(), context);
      } catch (error) {
        console.warn(`safeToBigInt: Failed to convert object to string${context ? ` (${context})` : ''}:`, error);
        return 0n;
      }
    }

    console.warn(`safeToBigInt: Unexpected value type ${typeof value}${context ? ` (${context})` : ''}:`, value);
    return 0n;
  }

  // Calculate balance from UTxOs with enhanced validation and error handling
  private calculateBalance(utxos: any[]): WalletState['balance'] {
    const balance = { ada: 0n, assets: {} as Record<string, bigint> };

    if (!Array.isArray(utxos)) {
      console.error('calculateBalance: UTxOs is not an array:', utxos);
      return balance;
    }

    console.log(`📊 Calculating balance from ${utxos.length} UTxOs...`);

    for (let i = 0; i < utxos.length; i++) {
      const utxo = utxos[i];

      if (!utxo) {
        console.warn(`calculateBalance: UTxO at index ${i} is null/undefined`);
        continue;
      }

      // Handle different UTxO structures that Lucid Evolution might return
      let assets = utxo.assets;

      // Fallback to other possible structures
      if (!assets && utxo.output?.amount) {
        assets = utxo.output.amount;
      } else if (!assets && utxo.amount) {
        assets = utxo.amount;
      }

      if (!assets || typeof assets !== 'object') {
        console.warn(`calculateBalance: UTxO at index ${i} has no valid assets:`, utxo);
        continue;
      }

      try {
        // Add ADA (lovelace) using safe conversion
        const adaAmount = this.safeToBigInt(assets.lovelace, `UTxO[${i}].lovelace`);
        balance.ada += adaAmount;

        // Add other native assets using safe conversion
        for (const [unit, amount] of Object.entries(assets)) {
          if (unit !== 'lovelace' && amount !== undefined && amount !== null) {
            const assetAmount = this.safeToBigInt(amount, `UTxO[${i}].${unit}`);
            if (assetAmount > 0n) {
              balance.assets[unit] = (balance.assets[unit] || 0n) + assetAmount;
            }
          }
        }
      } catch (error) {
        console.error(`calculateBalance: Error processing UTxO at index ${i}:`, error, utxo);
      }
    }

    console.log(`💰 Calculated balance: ${balance.ada} lovelace, ${Object.keys(balance.assets).length} native assets`);
    return balance;
  }

  // Add event listener
  addEventListener(listener: WalletEventListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Emit event to listeners
  private emitEvent(type: WalletEventType, data?: any): void {
    this.listeners.forEach(listener => {
      try {
        listener({ type, data });
      } catch (error) {
        console.error('Error in wallet event listener:', error);
      }
    });
  }

  // Setup wallet event listeners (for wallet changes)
  private setupWalletEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Listen for account changes
    const checkForAccountChanges = async () => {
      if (!this.lucid || !this.state.isConnected) return;

      try {
        const currentAddress = await this.lucid.wallet.address();
        if (currentAddress !== this.state.address) {
          this.state.address = currentAddress;
          this.emitEvent('address_changed', { address: currentAddress });
        }
      } catch (error) {
        // Wallet might be disconnected
        console.warn('Wallet connection lost:', error);
        await this.disconnectWallet();
      }
    };

    // Check for changes periodically
    setInterval(checkForAccountChanges, 5000);

    // Listen for wallet events if supported
    if ((window as any).cardano) {
      Object.keys((window as any).cardano).forEach(walletName => {
        const wallet = (window as any).cardano[walletName];
        if (wallet.experimental?.on) {
          wallet.experimental.on('accountChange', () => {
            if (this.state.walletName === walletName) {
              checkForAccountChanges();
            }
          });
          
          wallet.experimental.on('disconnect', () => {
            if (this.state.walletName === walletName) {
              this.disconnectWallet();
            }
          });
        }
      });
    }
  }

  // Get Lucid instance (for use in other parts of the app)
  getLucid(): Lucid | null {
    return this.lucid;
  }

  // Check if wallet supports specific features
  async getWalletCapabilities(walletName: WalletName): Promise<any> {
    if (!this.isWalletInstalled(walletName)) {
      return null;
    }

    const walletApi = (window as any).cardano[walletName];
    
    return {
      supportedExtensions: walletApi.supportedExtensions || [],
      apiVersion: walletApi.apiVersion || '0.1.0',
      name: walletApi.name || walletName,
      icon: walletApi.icon || null
    };
  }
}

// Singleton instance
export const walletManager = new WalletManager();
