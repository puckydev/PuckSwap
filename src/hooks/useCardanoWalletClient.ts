/**
 * Client-only Cardano Wallet Hook
 *
 * This hook is designed to avoid SSR/hydration issues by only running on the client side
 */

import { useState, useEffect, useCallback } from 'react';
// Note: browser-extension-guard has been removed in favor of unified wallet system

// Extend window type for Cardano wallets
declare global {
  interface Window {
    cardano?: {
      [key: string]: {
        enable: () => Promise<{
          getUsedAddresses: () => Promise<string[]>;
          getUnusedAddresses: () => Promise<string[]>;
          getBalance: () => Promise<string>;
          getUtxos: () => Promise<any[]>;
        }>;
        isEnabled: () => Promise<boolean>;
        name: string;
        icon: string;
      };
    };
  }
}

// Types
export type WalletName = "eternl" | "nami" | "vespr" | "lace" | "typhon" | "flint";

export interface ClientWalletState {
  isConnected: boolean;
  address: string | null;
  balance: {
    ada: bigint;
    assets: Record<string, bigint>;
  };
  walletName: WalletName | null;
  isLoading: boolean;
  error: string | null;
  isClient: boolean;
}

export interface ClientWalletActions {
  connect: (walletName: WalletName) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

/**
 * Client-only wallet hook that avoids SSR issues
 */
export const useCardanoWalletClient = (): ClientWalletState & ClientWalletActions => {
  // Track client-side hydration
  const [isClient, setIsClient] = useState(false);
  
  // Wallet state
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<{ ada: bigint; assets: Record<string, bigint> }>({
    ada: 0n,
    assets: {}
  });
  const [walletName, setWalletName] = useState<WalletName | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize client-side only
  useEffect(() => {
    if (isBrowserSafe()) {
      setIsClient(true);
    }
  }, []);

  // Connect to wallet
  const connect = useCallback(async (selectedWalletName: WalletName): Promise<void> => {
    if (!isClient) {
      console.warn('Cannot connect wallet during SSR');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check if wallet is available
      if (!window.cardano || !window.cardano[selectedWalletName]) {
        throw new Error(`${selectedWalletName} wallet is not installed`);
      }

      // Enable wallet
      const api = await window.cardano[selectedWalletName].enable();
      
      // Get address
      const addresses = await api.getUsedAddresses();
      if (addresses.length === 0) {
        const unusedAddresses = await api.getUnusedAddresses();
        if (unusedAddresses.length === 0) {
          throw new Error('No addresses found in wallet');
        }
        setAddress(unusedAddresses[0]);
      } else {
        setAddress(addresses[0]);
      }

      // Get balance
      const balanceValue = await api.getBalance();
      const adaBalance = BigInt(balanceValue);

      setBalance({
        ada: adaBalance,
        assets: {} // TODO: Parse native assets
      });

      setWalletName(selectedWalletName);
      setIsConnected(true);

      console.log(`✅ Connected to ${selectedWalletName} wallet`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Wallet connection failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isClient]);

  // Disconnect wallet
  const disconnect = useCallback(async (): Promise<void> => {
    setIsConnected(false);
    setAddress(null);
    setBalance({ ada: 0n, assets: {} });
    setWalletName(null);
    setError(null);
    console.log('✅ Wallet disconnected');
  }, []);

  // Refresh balance
  const refreshBalance = useCallback(async (): Promise<void> => {
    if (!isConnected || !walletName || !isClient) {
      return;
    }

    try {
      setIsLoading(true);
      
      const api = await window.cardano[walletName].enable();
      const balanceValue = await api.getBalance();
      const adaBalance = BigInt(balanceValue);

      setBalance(prev => ({
        ...prev,
        ada: adaBalance
      }));

      console.log('✅ Balance refreshed');
    } catch (err) {
      console.error('Failed to refresh balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh balance');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, walletName, isClient]);

  return {
    // State
    isConnected,
    address,
    balance,
    walletName,
    isLoading,
    error,
    isClient,
    
    // Actions
    connect,
    disconnect,
    refreshBalance
  };
};

// Default export
export default useCardanoWalletClient;
