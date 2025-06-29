/**
 * PuckSwap Unified Wallet Types
 * 
 * Consolidated type definitions for wallet integration using
 * @cardano-foundation/cardano-connect-with-wallet
 */

import type { Lucid, UTxO, Assets } from '@lucid-evolution/lucid';

// Supported wallet names
export type WalletName = "eternl" | "nami" | "vespr" | "lace" | "typhon" | "flint";

// Wallet connection state
export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: WalletBalance;
  walletName: WalletName | null;
  isLoading: boolean;
  error: WalletError | null;
  networkId: number | null;
}

// Wallet balance information
export interface WalletBalance {
  ada: bigint;
  assets: Record<string, bigint>;
  utxos: UTxO[];
}

// Wallet error types
export interface WalletError {
  type: 'CONNECTION_FAILED' | 'NOT_INSTALLED' | 'NETWORK_MISMATCH' | 'TRANSACTION_FAILED' | 'INSUFFICIENT_FUNDS' | 'USER_REJECTED';
  message: string;
  walletName?: string;
  details?: any;
}

// Wallet actions interface
export interface WalletActions {
  connect: (walletName: WalletName) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  getLucidInstance: () => Promise<Lucid | null>;
  getUtxos: () => Promise<UTxO[]>;
  getCollateral: () => Promise<UTxO[]>;
}

// Combined wallet interface
export interface PuckSwapWallet extends WalletState, WalletActions {}

// Transaction building parameters
export interface SwapParams {
  fromAsset: string;
  toAsset: string;
  amount: bigint;
  slippageTolerance: number;
  poolId?: string;
}

export interface LiquidityParams {
  assetA: string;
  assetB: string;
  amountA: bigint;
  amountB: bigint;
  poolId?: string;
}

// Pool data structure
export interface PoolDatum {
  pool_nft_policy: string;
  pool_nft_name: string;
  token_policy: string;
  token_name: string;
  ada_reserve: bigint;
  token_reserve: bigint;
  lp_total_supply: bigint;
  fee_bps: bigint;
}

// Wallet configuration
export interface WalletConfig {
  network: 'mainnet' | 'preprod' | 'preview';
  blockfrostApiKey: string;
  enabledWallets: WalletName[];
  autoConnect?: boolean;
}

// Transaction result
export interface TransactionResult {
  txHash: string;
  success: boolean;
  error?: string;
}

// Wallet installation info
export interface WalletInstallInfo {
  name: WalletName;
  displayName: string;
  icon: string;
  installUrl: string;
  isInstalled: boolean;
}
