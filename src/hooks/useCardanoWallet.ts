/**
 * PuckSwap Unified Cardano Wallet Hook
 *
 * Production-ready wallet integration using @cardano-foundation/cardano-connect-with-wallet
 * Provides a clean, unified interface for all wallet operations
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createLucidInstance } from '../lib/lucid-config';
import type { Lucid } from '@lucid-evolution/lucid';
import { WalletManager } from '../lib/wallet/WalletManager';
import { createErrorFromException } from '../lib/wallet/errors';
import type {
  WalletName,
  WalletState,
  WalletActions,
  PuckSwapWallet,
  WalletConfig
} from '../lib/wallet/types';

// Dynamic import to avoid SSR issues
let useCardano: any = null;
let CardanoProvider: any = null;

if (typeof window !== 'undefined') {
  import('@cardano-foundation/cardano-connect-with-wallet').then(module => {
    useCardano = module.useCardano;
    CardanoProvider = module.CardanoProvider;
    console.log('✅ cardano-connect-with-wallet loaded successfully');
  }).catch(error => {
    console.warn('⚠️ Failed to load cardano-connect-with-wallet:', error);
    useCardano = null;
    CardanoProvider = null;
  });
}

// Re-export types from unified wallet system
export type { WalletName, WalletState, WalletActions, PuckSwapWallet } from '../lib/wallet/types';

// Backward compatibility aliases
export type PuckSwapWalletState = WalletState;
export type PuckSwapWalletActions = WalletActions;

/**
 * Main PuckSwap wallet hook
 * Provides unified wallet functionality using the official Cardano Foundation library
 */
export const useCardanoWallet = (): PuckSwapWallet => {
  // Track client-side hydration
  const [isClient, setIsClient] = useState(false);

  // Wallet manager instance
  const walletManager = useMemo(() => {
    if (!isClient) return null;

    const config: WalletConfig = {
      network: (process.env.NEXT_PUBLIC_NETWORK as any) || 'preprod',
      blockfrostApiKey: process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || '',
      enabledWallets: ['eternl', 'nami', 'vespr', 'lace', 'typhon', 'flint'],
      autoConnect: false
    };

    return new WalletManager(config);
  }, [isClient]);

  // Wallet state
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: { ada: 0n, assets: {}, utxos: [] },
    walletName: null,
    isLoading: false,
    error: null,
    networkId: null
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Subscribe to wallet manager state changes
  useEffect(() => {
    if (!walletManager) return;

    const unsubscribe = walletManager.subscribe((newState) => {
      setWalletState(newState);
    });

    // Initialize with current state
    setWalletState(walletManager.getState());

    return unsubscribe;
  }, [walletManager]);

  // Early return for SSR - provide safe defaults
  if (!isClient || !walletManager) {
    return {
      ...walletState,
      connect: async () => {},
      disconnect: async () => {},
      refreshBalance: async () => {},
      signMessage: async () => '',
      getLucidInstance: async () => null,
      getUtxos: async () => [],
      getCollateral: async () => []
    };
  }

  // Wallet actions using the wallet manager
  const connect = useCallback(async (walletName: WalletName): Promise<void> => {
    if (!walletManager) {
      throw new Error('Wallet manager not initialized');
    }

    try {
      await walletManager.connect(walletName);
    } catch (error) {
      const enhancedError = createErrorFromException(error, walletName);
      console.error('Wallet connection failed:', enhancedError);
      throw error;
    }
  }, [walletManager]);

  const disconnect = useCallback(async (): Promise<void> => {
    if (!walletManager) return;
    await walletManager.disconnect();
  }, [walletManager]);

  const refreshBalance = useCallback(async (): Promise<void> => {
    if (!walletManager) return;
    await walletManager.refreshBalance();
  }, [walletManager]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!walletManager) {
      throw new Error('Wallet manager not initialized');
    }
    return await walletManager.signMessage(message);
  }, [walletManager]);

  const getLucidInstance = useCallback(async (): Promise<Lucid | null> => {
    if (!walletManager) return null;
    return walletManager.getLucidInstance();
  }, [walletManager]);

  const getUtxos = useCallback(async () => {
    if (!walletManager) return [];
    return await walletManager.getUtxos();
  }, [walletManager]);

  const getCollateral = useCallback(async () => {
    if (!walletManager) return [];
    return await walletManager.getCollateral();
  }, [walletManager]);

  // Return the unified wallet interface
  return {
    // State from wallet manager
    ...walletState,

    // Actions
    connect,
    disconnect,
    refreshBalance,
    signMessage,
    getLucidInstance,
    getUtxos,
    getCollateral
  };
};
