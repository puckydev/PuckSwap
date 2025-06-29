/**
 * PuckSwap v5 - Real Wallet Connection Component
 * 
 * Production-ready CIP-30 wallet detection and connection interface
 * Replaces all demo wallet functionality
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
// DEPRECATED: This component uses the old wallet integration
// Use the unified wallet system instead:
// - src/hooks/useCardanoWallet.ts
// - src/components/WalletConnect.tsx (updated version)

// Temporary placeholder types to prevent compilation errors
type WalletInfo = { name: string; displayName: string; isInstalled: boolean };
type ConnectedWalletState = { isConnected: boolean; address: string; balance: any };
import {
  parseWalletError,
  formatErrorForUser,
  logWalletError
} from '../lib/wallet-error-handler';

interface WalletConnectionProps {
  onWalletConnected: (walletState: ConnectedWalletState) => void;
  onWalletDisconnected: () => void;
  connectedWallet: ConnectedWalletState | null;
  isLoading?: boolean;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({
  onWalletConnected,
  onWalletDisconnected,
  connectedWallet,
  isLoading = false
}) => {
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    // DEPRECATED: This component is deprecated
    // Use the unified wallet system instead
    console.warn('WalletConnection.tsx is deprecated. Use the unified wallet system.');
    setAvailableWallets([]);
  }, []);

  const handleWalletConnect = async (walletName: string) => {
    try {
      setConnecting(walletName);
      console.log(`🔗 Attempting to connect to ${walletName}...`);

      // DEPRECATED: Use unified wallet system
      throw new Error('This component is deprecated. Use the unified wallet system.');
      
      onWalletConnected(walletState);
      setShowWalletSelector(false);
      
      toast.success(`✅ Connected to ${walletName}!`, {
        duration: 4000,
        icon: '🔗'
      });

    } catch (error) {
      const walletError = parseWalletError(error);
      const userMessage = formatErrorForUser(walletError);

      logWalletError(walletError, `Connecting to ${walletName}`);

      toast.error(userMessage, {
        duration: 8000,
        icon: '❌'
      });
    } finally {
      setConnecting(null);
    }
  };

  const handleWalletDisconnect = () => {
    // DEPRECATED: Use unified wallet system
    console.warn('This component is deprecated. Use the unified wallet system.');
    onWalletDisconnected();
    toast.success('Wallet disconnected', {
      duration: 3000,
      icon: '🔌'
    });
  };

  const installedWallets = availableWallets.filter(wallet => wallet.isInstalled);

  if (connectedWallet) {
    return (
      <div className="mb-6 p-4 terminal-border bg-terminal-bg/50">
        <div className="flex items-center justify-between mb-3">
          <div className="text-terminal-green font-mono text-sm">
            ✅ Wallet Connected: {connectedWallet.walletName}
          </div>
          <button
            onClick={handleWalletDisconnect}
            className="text-terminal-red hover:text-terminal-amber transition-colors text-xs"
            disabled={isLoading}
          >
            Disconnect
          </button>
        </div>
        
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-terminal-amber">Address:</span>
            <span className="text-terminal-green">
              {formatWalletAddress(connectedWallet.address)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-amber">Balance:</span>
            <span className="text-terminal-green">
              {formatADA(connectedWallet.balance.ada)}
            </span>
          </div>
          {Object.keys(connectedWallet.balance.assets).length > 0 && (
            <div className="flex justify-between">
              <span className="text-terminal-amber">Assets:</span>
              <span className="text-terminal-green">
                {Object.keys(connectedWallet.balance.assets).length} tokens
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {!showWalletSelector ? (
        <motion.button
          onClick={() => setShowWalletSelector(true)}
          disabled={isLoading || installedWallets.length === 0}
          className="w-full terminal-button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? 'Loading...' : 
           installedWallets.length === 0 ? 'No Wallets Detected' :
           'Connect Wallet'}
        </motion.button>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="terminal-border p-4 bg-terminal-bg/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-terminal-green font-mono text-sm">Select Wallet</h3>
              <button
                onClick={() => setShowWalletSelector(false)}
                className="text-terminal-red hover:text-terminal-amber transition-colors"
              >
                ✕
              </button>
            </div>

            {installedWallets.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-terminal-amber mb-2">No Cardano wallets detected</div>
                <div className="text-terminal-green text-xs">
                  Please install a Cardano wallet extension:
                </div>
                <div className="text-terminal-green text-xs mt-1">
                  Eternl, Nami, Vespr, Lace, Typhon, or Flint
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {installedWallets.map((wallet) => (
                  <motion.button
                    key={wallet.name}
                    onClick={() => handleWalletConnect(wallet.name)}
                    disabled={connecting !== null}
                    className="w-full p-3 terminal-border hover:bg-terminal-green/10 
                             transition-colors flex items-center justify-between"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{wallet.icon}</span>
                      <span className="text-terminal-green font-mono">
                        {wallet.displayName}
                      </span>
                    </div>
                    
                    {connecting === wallet.name ? (
                      <div className="text-terminal-amber text-xs">Connecting...</div>
                    ) : (
                      <div className="text-terminal-green text-xs">→</div>
                    )}
                  </motion.button>
                ))}
              </div>
            )}

            <div className="mt-4 text-xs text-terminal-amber font-mono">
              💡 Make sure your wallet is set to Cardano preprod testnet
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default WalletConnection;
