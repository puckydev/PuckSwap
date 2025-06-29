/**
 * PuckSwap Unified Wallet Provider Wrapper
 *
 * Production-ready wallet context using @cardano-foundation/cardano-connect-with-wallet
 * Simplified implementation without demo mode or complex fallbacks
 */

'use client';

import React, { ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import CardanoProvider to avoid SSR issues
const CardanoProvider = dynamic(
  () => import('@cardano-foundation/cardano-connect-with-wallet')
    .then(mod => mod.CardanoProvider),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        <span className="ml-2 text-green-400 font-mono">Loading wallet provider...</span>
      </div>
    )
  }
);

interface WalletProviderWrapperProps {
  children: ReactNode;
}

export default function WalletProviderWrapper({ children }: WalletProviderWrapperProps) {
  // Get network configuration from environment
  const network = process.env.NEXT_PUBLIC_NETWORK || 'preprod';

  // Configure cardano-connect-with-wallet for PuckSwap
  const walletConfig = {
    // Network configuration
    network: network.toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet',

    // Supported wallets for PuckSwap
    supportedWallets: [
      'eternl',
      'vespr',
      'lace',
      'nami',
      'typhon',
      'flint'
    ],

    // Auto-connect configuration
    autoConnect: false, // Let user choose when to connect

    // Error handling configuration
    throwErrors: false,
    verbose: process.env.NODE_ENV === 'development'
  };

  return (
    <CardanoProvider {...walletConfig}>
      <div className="wallet-provider-wrapper">
        {children}
      </div>
    </CardanoProvider>
  );
}

/**
 * Higher-order component for wallet-dependent components
 */
export function withWalletProvider<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WalletProviderHOC(props: P) {
    return (
      <WalletProviderWrapper>
        <Component {...props} />
      </WalletProviderWrapper>
    );
  };
}
