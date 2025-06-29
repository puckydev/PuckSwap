/**
 * PuckSwap Unified Wallet Manager
 * 
 * Central wallet management using @cardano-foundation/cardano-connect-with-wallet
 * Provides a clean interface for all wallet operations
 */

import type { Lucid, UTxO } from '@lucid-evolution/lucid';
import { createLucidInstance } from '../lucid-config';
import type { 
  WalletName, 
  WalletState, 
  WalletActions, 
  WalletBalance, 
  WalletError,
  WalletConfig,
  TransactionResult
} from './types';

// Wallet installation URLs
export const WALLET_INSTALL_URLS: Record<WalletName, string> = {
  eternl: 'https://chrome.google.com/webstore/detail/eternl/kmhcihpebfmpgmihbkipmjlmmioameka',
  nami: 'https://chrome.google.com/webstore/detail/nami/lpfcbjknijpeeillifnkikgncikgfhdo',
  vespr: 'https://chrome.google.com/webstore/detail/vespr-wallet/ghglbofhkneakmmfkpakhbdpkjnpkgkl',
  lace: 'https://chrome.google.com/webstore/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk',
  typhon: 'https://chrome.google.com/webstore/detail/typhon-wallet/kfdniefadaanbjodldohaedphafoffoh',
  flint: 'https://chrome.google.com/webstore/detail/flint-wallet/hnhobjmcibchnmglfbldbfabcgaknlkj'
};

// Wallet display names
export const WALLET_DISPLAY_NAMES: Record<WalletName, string> = {
  eternl: 'Eternl',
  nami: 'Nami',
  vespr: 'Vespr',
  lace: 'Lace',
  typhon: 'Typhon',
  flint: 'Flint'
};

/**
 * Unified Wallet Manager Class
 * Handles all wallet operations through the official Cardano Foundation library
 */
export class WalletManager {
  private lucid: Lucid | null = null;
  private config: WalletConfig;
  private state: WalletState;
  private listeners: Set<(state: WalletState) => void> = new Set();

  constructor(config: WalletConfig) {
    this.config = config;
    this.state = {
      isConnected: false,
      address: null,
      balance: { ada: 0n, assets: {}, utxos: [] },
      walletName: null,
      isLoading: false,
      error: null,
      networkId: null
    };
  }

  /**
   * Subscribe to wallet state changes
   */
  subscribe(listener: (state: WalletState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update wallet state and notify listeners
   */
  private updateState(updates: Partial<WalletState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Get current wallet state
   */
  getState(): WalletState {
    return { ...this.state };
  }

  /**
   * Check if a wallet is installed
   */
  isWalletInstalled(walletName: WalletName): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).cardano?.[walletName];
  }

  /**
   * Get list of installed wallets
   */
  getInstalledWallets(): WalletName[] {
    if (typeof window === 'undefined') return [];
    
    return this.config.enabledWallets.filter(wallet => 
      this.isWalletInstalled(wallet)
    );
  }

  /**
   * Connect to a specific wallet using the official library
   */
  async connect(walletName: WalletName): Promise<void> {
    try {
      this.updateState({ isLoading: true, error: null });

      // Check if wallet is installed
      if (!this.isWalletInstalled(walletName)) {
        throw new Error(`${WALLET_DISPLAY_NAMES[walletName]} wallet is not installed`);
      }

      // Initialize Lucid instance
      this.lucid = await createLucidInstance(this.config.network);

      // Connect wallet through CIP-30 API
      const cardanoWallet = (window as any).cardano?.[walletName];
      if (!cardanoWallet) {
        throw new Error(`${WALLET_DISPLAY_NAMES[walletName]} wallet not found`);
      }

      // Enable the wallet
      const walletApi = await cardanoWallet.enable();

      // Connect to Lucid
      this.lucid.selectWallet.fromAPI(walletApi);

      // Get wallet information
      const address = await this.lucid.wallet().address();
      const networkId = await walletApi.getNetworkId();

      // Update state
      this.updateState({
        isConnected: true,
        address,
        walletName,
        networkId,
        isLoading: false
      });

      // Refresh balance
      await this.refreshBalance();

    } catch (error) {
      const walletError: WalletError = {
        type: 'CONNECTION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown connection error',
        walletName
      };

      this.updateState({
        isLoading: false,
        error: walletError,
        isConnected: false
      });

      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    this.lucid = null;
    this.updateState({
      isConnected: false,
      address: null,
      balance: { ada: 0n, assets: {}, utxos: [] },
      walletName: null,
      error: null,
      networkId: null
    });
  }

  /**
   * Refresh wallet balance
   */
  async refreshBalance(): Promise<void> {
    if (!this.lucid || !this.state.isConnected) {
      return;
    }

    try {
      const utxos = await this.lucid.wallet().getUtxos();
      const balance = this.calculateBalance(utxos);
      
      this.updateState({ balance });
    } catch (error) {
      console.error('Failed to refresh balance:', error);
      const walletError: WalletError = {
        type: 'CONNECTION_FAILED',
        message: 'Failed to refresh balance'
      };
      this.updateState({ error: walletError });
    }
  }

  /**
   * Calculate balance from UTxOs
   */
  private calculateBalance(utxos: UTxO[]): WalletBalance {
    let ada = 0n;
    const assets: Record<string, bigint> = {};

    for (const utxo of utxos) {
      ada += utxo.assets.lovelace || 0n;
      
      for (const [assetId, amount] of Object.entries(utxo.assets)) {
        if (assetId !== 'lovelace') {
          assets[assetId] = (assets[assetId] || 0n) + amount;
        }
      }
    }

    return { ada, assets, utxos };
  }

  /**
   * Get Lucid instance
   */
  getLucidInstance(): Lucid | null {
    return this.lucid;
  }

  /**
   * Get wallet UTxOs
   */
  async getUtxos(): Promise<UTxO[]> {
    if (!this.lucid) throw new Error('Wallet not connected');
    return await this.lucid.wallet().getUtxos();
  }

  /**
   * Get collateral UTxOs
   */
  async getCollateral(): Promise<UTxO[]> {
    if (!this.lucid) throw new Error('Wallet not connected');
    return await this.lucid.wallet().getUtxos();
  }

  /**
   * Sign a message
   */
  async signMessage(message: string): Promise<string> {
    if (!this.lucid) throw new Error('Wallet not connected');
    // Implementation depends on wallet capabilities
    throw new Error('Message signing not yet implemented');
  }
}
