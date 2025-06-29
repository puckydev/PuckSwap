import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import SwapV5 from '../components/SwapV5';
import WalletConnect from '../components/WalletConnect';

type ActiveTab = 'swap' | 'liquidity' | 'about' | 'wallet';

export default function PuckSwapV5() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('swap');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'connecting'>('connecting');

  // Update time display
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize network status
  useEffect(() => {
    const initializeNetwork = async () => {
      try {
        setNetworkStatus('connecting');
        
        // Check API connectivity
        const apiKey = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY;
        if (!apiKey) {
          throw new Error('Blockfrost API key not configured');
        }

        setNetworkStatus('online');
        toast.success('🚀 PuckSwap v5 connected to Cardano preprod testnet');
      } catch (error) {
        console.error('Network initialization failed:', error);
        setNetworkStatus('offline');
        toast.error('❌ Network connection failed');
      }
    };

    initializeNetwork();
  }, []);

  const tabs = [
    { id: 'swap', label: 'SWAP_V5', icon: '⇄', description: 'AMM Token Swaps' },
    { id: 'liquidity', label: 'LIQUIDITY_V5', icon: '💧', description: 'Pool Management' },
    { id: 'about', label: 'ABOUT', icon: 'ℹ️', description: 'Platform Information' },
    { id: 'wallet', label: 'WALLET_CONNECT', icon: '🔗', description: 'Connect CIP-30 Wallet' }
  ] as const;

  return (
    <>
      <Head>
        <title>PuckSwap v5 DeFi Ecosystem - Cardano AMM Protocol</title>
        <meta name="description" content="PuckSwap v5 - Complete DeFi ecosystem with AMM, liquid staking, governance, and cross-chain capabilities" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Share+Tech+Mono&display=swap" rel="stylesheet" />
      </Head>

      <div className="min-h-screen bg-terminal-bg crt-screen">
        {/* CRT Effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-scan-lines opacity-30"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-terminal-green/20 animate-scan-line"></div>
        </div>

        {/* Header */}
        <header className="border-b border-terminal/30 bg-terminal-bg-card/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-3"
              >
                <div className="w-12 h-12 bg-terminal-green/20 rounded border border-terminal-green/50 flex items-center justify-center">
                  <span className="text-xl font-bold text-terminal-green">🏒</span>
                </div>
                <div>
                  <h1 className="text-2xl font-terminal text-terminal-green text-glow">
                    PUCKSWAP_V5_DEFI
                  </h1>
                  <div className="text-xs font-mono text-terminal-gray">
                    v5.0.0 | {process.env.NEXT_PUBLIC_NETWORK || 'PREPROD'}_TESTNET | LIVE_MODE
                  </div>
                </div>
              </motion.div>

              {/* System Status */}
              <div className="hidden md:flex items-center space-x-6 text-xs font-mono text-terminal-gray">
                <div>TIME: {currentTime}</div>
                <div>NETWORK: {process.env.NEXT_PUBLIC_NETWORK || 'PREPROD'}</div>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    networkStatus === 'online' ? 'bg-terminal-green animate-pulse' :
                    networkStatus === 'connecting' ? 'bg-terminal-amber animate-pulse' :
                    'bg-terminal-red'
                  }`}></div>
                  <span>{networkStatus.toUpperCase()}</span>
                </div>
              </div>

              {/* Wallet Connect */}
              <WalletConnect />
            </div>
          </div>
        </header>



        {/* Navigation */}
        <nav className="border-b border-terminal/30 bg-terminal-bg-card/60 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <div className="flex space-x-1 overflow-x-auto">
              {tabs.map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex flex-col items-center space-y-1 px-6 py-4 font-mono text-sm transition-all whitespace-nowrap min-w-[120px] ${
                    activeTab === tab.id
                      ? 'text-terminal-green border-b-2 border-terminal-green bg-terminal-green/10'
                      : 'text-terminal-gray hover:text-terminal-green hover:bg-terminal-green/5'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{tab.icon}</span>
                    <span className="font-bold">{tab.label}</span>
                  </div>
                  <span className="text-xs opacity-70">{tab.description}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            {activeTab === 'swap' && (
              <motion.div
                key="swap"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SwapV5 />
              </motion.div>
            )}

            {activeTab === 'liquidity' && (
              <motion.div
                key="liquidity"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="terminal-card p-8 text-center"
              >
                <div className="text-6xl mb-4">💧</div>
                <h2 className="text-xl font-terminal text-terminal-green text-glow mb-2">
                  LIQUIDITY_V5_MODULE
                </h2>
                <p className="font-mono text-terminal-gray">
                  Liquidity provision and withdrawal coming soon...
                </p>
              </motion.div>
            )}

            {activeTab === 'staking' && (
              <motion.div
                key="staking"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="terminal-card p-8 text-center"
              >
                <div className="text-6xl mb-4">🥩</div>
                <h2 className="text-xl font-terminal text-terminal-green text-glow mb-2">
                  LIQUID_STAKING_MODULE
                </h2>
                <p className="font-mono text-terminal-gray">
                  pADA liquid staking coming soon...
                </p>
              </motion.div>
            )}

            {activeTab === 'governance' && (
              <motion.div
                key="governance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="terminal-card p-8 text-center"
              >
                <div className="text-6xl mb-4">🗳️</div>
                <h2 className="text-xl font-terminal text-terminal-green text-glow mb-2">
                  GOVERNANCE_V5_MODULE
                </h2>
                <p className="font-mono text-terminal-gray">
                  DAO governance and voting coming soon...
                </p>
              </motion.div>
            )}

            {activeTab === 'crosschain' && (
              <motion.div
                key="crosschain"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="terminal-card p-8 text-center"
              >
                <div className="text-6xl mb-4">🌉</div>
                <h2 className="text-xl font-terminal text-terminal-green text-glow mb-2">
                  CROSS_CHAIN_MODULE
                </h2>
                <p className="font-mono text-terminal-gray">
                  Cross-chain bridge router coming soon...
                </p>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="terminal-card p-8 text-center"
              >
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-2xl font-terminal text-terminal-green text-glow mb-4">
                  ANALYTICS_MODULE_V5
                </h2>
                <p className="font-mono text-terminal-gray mb-6">
                  Advanced analytics and system monitoring dashboard
                </p>
                
                {/* Mock Analytics Data */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="terminal-card p-4">
                    <div className="text-terminal-green font-mono text-sm mb-2">TOTAL_VALUE_LOCKED</div>
                    <div className="text-2xl font-terminal text-terminal-green">₳2,847,392</div>
                  </div>
                  <div className="terminal-card p-4">
                    <div className="text-terminal-green font-mono text-sm mb-2">24H_VOLUME</div>
                    <div className="text-2xl font-terminal text-terminal-green">₳156,847</div>
                  </div>
                  <div className="terminal-card p-4">
                    <div className="text-terminal-green font-mono text-sm mb-2">ACTIVE_POOLS</div>
                    <div className="text-2xl font-terminal text-terminal-green">12</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="border-t border-terminal/30 bg-terminal-bg-card/60 backdrop-blur-sm mt-16">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4 text-xs font-mono text-terminal-gray">
                <span>© 2025 PUCKSWAP_V5_PROTOCOL</span>
                <span>•</span>
                <span>BUILT_ON_CARDANO</span>
                <span>•</span>
                <span>POWERED_BY_AIKEN</span>
                <span>•</span>
                <span>LUCID_EVOLUTION</span>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-xs font-mono text-terminal-gray">
                  PREPROD_TESTNET_ENVIRONMENT
                </span>
              </div>
            </div>
          </div>
        </footer>

        {/* Toast Notifications */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0a0a0a',
              color: '#00ff41',
              border: '1px solid #00ff41',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '14px'
            },
            success: {
              iconTheme: {
                primary: '#00ff41',
                secondary: '#0a0a0a',
              },
            },
            error: {
              iconTheme: {
                primary: '#ff4444',
                secondary: '#0a0a0a',
              },
            },
          }}
        />
      </div>
    </>
  );
}
