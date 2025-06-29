'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useCardanoWallet, type WalletName } from '../hooks/useCardanoWallet';
import { WALLET_DISPLAY_NAMES, WALLET_INSTALL_URLS } from '../lib/wallet/WalletManager';

export default function WalletConnect() {
  // Use unified wallet system
  const wallet = useCardanoWallet();

  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState<WalletName | null>(null);

  // Available wallets list
  const availableWallets: WalletName[] = ['eternl', 'nami', 'vespr', 'lace', 'typhon', 'flint'];

  // Handle wallet connection state changes
  useEffect(() => {
    if (wallet.isConnected) {
      setIsOpen(false);
      setIsConnecting(null);
    }
  }, [wallet.isConnected]);

  const handleConnect = async (walletName: WalletName) => {
    setIsConnecting(walletName);

    try {
      await wallet.connect(walletName);
      toast.success(`Connected to ${WALLET_DISPLAY_NAMES[walletName]}`, {
        icon: '🔗'
      });
    } catch (error) {
      setIsConnecting(null);
      toast.error(`Failed to connect to ${WALLET_DISPLAY_NAMES[walletName]}`, {
        icon: '❌'
      });
      console.error('Wallet connection error:', error);
    }

  const handleDisconnect = async () => {
    try {
      await wallet.disconnect();
      toast.success('Wallet disconnected', {
        icon: '🔌'
      });
    } catch (error) {
      console.error('Disconnect failed:', error);
      toast.error('Failed to disconnect wallet');
    }
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatBalance = (balance: bigint, decimals: number): string => {
    return (Number(balance) / Math.pow(10, decimals)).toFixed(2);
  };

  if (wallet.isConnected) {
    return (
      <div className="terminal-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-terminal-green/20 rounded-full flex items-center justify-center">
              <span className="text-xs font-mono text-terminal-green">
                {wallet.walletName?.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="font-mono text-terminal-green text-sm">
                {wallet.walletName}
              </div>
              <div className="font-mono text-terminal-gray text-xs">
                {wallet.address ? formatAddress(wallet.address) : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="font-mono text-terminal-amber text-sm">
                {formatBalance(wallet.balance.ada, 6)} ADA
              </div>
              <div className="font-mono text-terminal-gray text-xs">
                ${(Number(wallet.balance.ada) / 1_000_000 * 0.35).toFixed(2)}
              </div>
            </div>
            
            <motion.button
              onClick={handleDisconnect}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3 py-1 text-xs font-mono text-terminal-red border border-terminal-red/30 rounded hover:bg-terminal-red/10 transition-all"
            >
              DISCONNECT
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="terminal-button px-6 py-3 rounded font-mono"
      >
        CONNECT_WALLET
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="terminal-card p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-terminal text-terminal-green text-glow">
                  CONNECT_WALLET
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-terminal-gray hover:text-terminal-red transition-colors"
                >
                  ✕
                </button>
              </div>



              <div className="space-y-3">
                {availableWallets.map((walletName) => {
                  const isInstalled = typeof window !== 'undefined' && !!(window as any).cardano?.[walletName];
                  return (
                    <motion.button
                      key={walletName}
                      onClick={() => handleConnect(walletName)}
                      disabled={!isInstalled || isConnecting === walletName}
                      whileHover={{ scale: isInstalled ? 1.02 : 1 }}
                      whileTap={{ scale: isInstalled ? 0.98 : 1 }}
                      className={`w-full p-4 rounded border transition-all flex items-center justify-between ${
                        isInstalled
                          ? 'border-terminal-green/30 hover:border-terminal-green/60 hover:bg-terminal-green/10'
                          : 'border-terminal-gray/30 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-terminal-green/20 rounded-full flex items-center justify-center">
                          <span className="text-xs font-mono text-terminal-green">
                            {WALLET_DISPLAY_NAMES[walletName].slice(0, 2)}
                          </span>
                        </div>
                        <div className="text-left">
                          <div className="font-mono text-terminal-green">
                            {WALLET_DISPLAY_NAMES[walletName]}
                          </div>
                          <div className="text-xs font-mono text-terminal-gray">
                            {isInstalled ? 'Available' : 'Not Installed'}
                          </div>
                        </div>
                      </div>

                      {isConnecting === walletName && (
                        <div className="w-4 h-4 border-2 border-terminal-green border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-6 p-3 bg-terminal-bg-light rounded border border-terminal/30">
                <p className="text-xs font-mono text-terminal-gray text-center">
                  By connecting a wallet, you agree to PuckSwap's Terms of Service
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
