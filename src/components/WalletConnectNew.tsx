/**
 * PuckSwap New Wallet Connection Component
 * 
 * Uses @cardano-foundation/cardano-connect-with-wallet library
 * Provides enhanced wallet connection with official Cardano Foundation support
 */

'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useCardanoWallet, type WalletName } from '../hooks/useCardanoWallet';

// Dynamically import to avoid SSR issues
const DynamicConnectWalletList = dynamic(
  () => import('@cardano-foundation/cardano-connect-with-wallet').then(mod => mod.ConnectWalletList),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
        <span className="ml-2 text-green-400 font-mono text-sm">Loading wallets...</span>
      </div>
    )
  }
);

const DynamicConnectWalletButton = dynamic(
  () => import('@cardano-foundation/cardano-connect-with-wallet').then(mod => mod.ConnectWalletButton),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-12 bg-gray-800 rounded-lg animate-pulse"></div>
    )
  }
);

interface WalletConnectNewProps {
  onWalletConnected?: (walletInfo: {
    walletName: WalletName;
    address: string;
    balance: { ada: bigint; assets: Record<string, bigint> };
  }) => void;
  onWalletDisconnected?: () => void;
  className?: string;
}

export default function WalletConnectNew({
  onWalletConnected,
  onWalletDisconnected,
  className = ''
}: WalletConnectNewProps) {
  const {
    isConnected,
    address,
    balance,
    walletName,
    isLoading,
    error,
    connect,
    disconnect,
    refreshBalance
  } = useCardanoWallet();

  const [isOpen, setIsOpen] = useState(false);
  const [isDemoMode] = useState(process.env.NEXT_PUBLIC_DEMO_MODE === 'true');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle wallet connection success
  const handleWalletConnect = async (selectedWalletName: string) => {
    try {
      console.log(`🔗 Connecting to ${selectedWalletName} using cardano-connect-with-wallet...`);
      
      await connect(selectedWalletName as WalletName);
      
      setIsOpen(false);
      
      toast.success(`Successfully connected to ${selectedWalletName}!`, {
        icon: '✅',
        duration: 3000
      });

      // Notify parent component
      if (onWalletConnected && address && walletName) {
        onWalletConnected({
          walletName,
          address,
          balance
        });
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('User declined')) {
        toast.error('Connection cancelled by user', { icon: '🚫' });
      } else if (errorMessage.includes('not installed')) {
        toast.error(`${selectedWalletName} wallet is not installed`, { icon: '❌' });
      } else {
        toast.error(`Failed to connect to ${selectedWalletName}`, { icon: '❌' });
      }
    }
  };

  // Handle wallet disconnection
  const handleWalletDisconnect = async () => {
    try {
      await disconnect();
      
      toast.success('Wallet disconnected', { icon: '👋' });
      
      // Notify parent component
      if (onWalletDisconnected) {
        onWalletDisconnected();
      }
    } catch (error) {
      console.error('Wallet disconnection failed:', error);
      toast.error('Failed to disconnect wallet', { icon: '❌' });
    }
  };

  // Format ADA balance for display
  const formatADABalance = (lovelace: bigint): string => {
    const ada = Number(lovelace) / 1_000_000;
    return ada.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };

  // Format address for display
  const formatAddress = (addr: string): string => {
    if (!addr) return '';
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  // Custom CSS for PuckSwap styling
  const puckSwapWalletStyles = `
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 12px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 1px solid #0f3460;
    transition: all 0.3s ease;
    
    &:hover {
      border-color: #e94560;
      box-shadow: 0 4px 20px rgba(233, 69, 96, 0.3);
      transform: translateY(-2px);
    }
    
    & > span {
      padding: 12px 20px;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    & img {
      width: 24px;
      height: 24px;
      border-radius: 4px;
    }
  `;

  // Show loading state during SSR
  if (!isClient) {
    return (
      <div className={`wallet-connect-loading ${className}`}>
        <div className="w-full h-12 bg-gray-800 rounded-xl animate-pulse flex items-center justify-center">
          <span className="text-green-400 font-mono text-sm">Loading wallet connection...</span>
        </div>
      </div>
    );
  }

  if (isDemoMode) {
    return (
      <div className={`wallet-connect-demo ${className}`}>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg">
          <p className="text-sm">
            🚧 Demo Mode: Wallet connection is simulated
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`wallet-connect-new ${className}`}>
      {!isConnected ? (
        <div className="wallet-connection-interface">
          <motion.button
            onClick={() => setIsOpen(true)}
            className="connect-wallet-trigger bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Connecting...
              </span>
            ) : (
              'Connect Wallet'
            )}
          </motion.button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                onClick={() => setIsOpen(false)}
              >
                <motion.div
                  className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                  initial={{ y: 50 }}
                  animate={{ y: 0 }}
                  exit={{ y: 50 }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Connect Wallet</h2>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  <div className="wallet-list-container">
                    <DynamicConnectWalletList
                      borderRadius={12}
                      gap={12}
                      primaryColor="#0538AF"
                      onConnect={handleWalletConnect}
                      customCSS={puckSwapWalletStyles}
                    />
                  </div>

                  {error && (
                    <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                      <p className="text-sm">{error}</p>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="wallet-connected-interface">
          <motion.div
            className="connected-wallet-info bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div className="wallet-details">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {walletName?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 capitalize">{walletName}</p>
                    <p className="text-sm text-gray-600">{formatAddress(address || '')}</p>
                  </div>
                </div>
                
                <div className="balance-info">
                  <p className="text-sm text-gray-700">
                    Balance: <span className="font-mono font-semibold">{formatADABalance(balance.ada)} ADA</span>
                  </p>
                  {Object.keys(balance.assets).length > 0 && (
                    <p className="text-xs text-gray-500">
                      + {Object.keys(balance.assets).length} native asset(s)
                    </p>
                  )}
                </div>
              </div>

              <div className="wallet-actions flex gap-2">
                <button
                  onClick={refreshBalance}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  disabled={isLoading}
                  title="Refresh Balance"
                >
                  <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                
                <button
                  onClick={handleWalletDisconnect}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  title="Disconnect Wallet"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
