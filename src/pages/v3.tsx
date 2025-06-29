// PuckSwap v3 Main Application Page
// Complete DEX interface with enhanced features and professional design

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { PuckSwapV3 } from '../lib/puckswap-v3';
import { Context7MonitorV3, createContext7MonitorV3 } from '../lib/context7-monitor-v3';
import { SwapV3 } from '../components/SwapV3';
import { LiquidityV3 } from '../components/LiquidityV3';
import { WalletConnect } from '../components/WalletConnect';

// Navigation tabs
type Tab = 'swap' | 'liquidity' | 'about' | 'wallet';

// Wallet connection state
interface WalletState {
  isConnected: boolean;
  address?: string;
  walletName?: string;
  balance?: bigint;
}

// Demo mode configuration
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default function PuckSwapV3Page() {
  // State management
  const [activeTab, setActiveTab] = useState<Tab>('swap');
  const [dex, setDex] = useState<PuckSwapV3 | null>(null);
  const [monitor, setMonitor] = useState<Context7MonitorV3 | null>(null);
  const [walletState, setWalletState] = useState<WalletState>({ isConnected: false });
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'connecting'>('connecting');

  // Initialize PuckSwap v3 and monitoring
  useEffect(() => {
    const initializePuckSwap = async () => {
      try {
        setIsInitializing(true);
        setNetworkStatus('connecting');

        if (DEMO_MODE) {
          // Demo mode - no real blockchain connection
          console.log('Running in demo mode');
          setNetworkStatus('online');
          setIsInitializing(false);
          return;
        }

        // Initialize real PuckSwap v3 instance
        const blockfrostApiKey = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY;
        const network = process.env.NEXT_PUBLIC_NETWORK as "Mainnet" | "Preview" | "Preprod" || "Preview";

        if (!blockfrostApiKey) {
          throw new Error('Blockfrost API key not configured');
        }

        // Contract CBORs (would be loaded from build artifacts)
        const contractCbors = {
          poolValidator: 'placeholder_pool_validator_cbor',
          lpPolicy: 'placeholder_lp_policy_cbor',
          swapValidator: 'placeholder_swap_validator_cbor',
          liquidityValidator: 'placeholder_liquidity_validator_cbor',
          factoryValidator: 'placeholder_factory_validator_cbor'
        };

        // Initialize DEX
        const dexInstance = await PuckSwapV3.create(blockfrostApiKey, contractCbors, network);
        setDex(dexInstance);

        // Initialize monitoring
        const monitorInstance = await createContext7MonitorV3({
          blockfrostApiKey,
          network: network.toLowerCase() as "mainnet" | "preview" | "preprod",
          poolAddresses: [
            'addr1_pool_address_1', // Would be actual pool addresses
            'addr1_pool_address_2'
          ],
          enableWebSocket: true,
          updateInterval: 5000, // 5 seconds
          historicalDataDays: 7
        });
        setMonitor(monitorInstance);

        setNetworkStatus('online');
        toast.success('PuckSwap v3 initialized successfully');

      } catch (error) {
        console.error('Failed to initialize PuckSwap v3:', error);
        setNetworkStatus('offline');
        toast.error('Failed to initialize PuckSwap v3');
      } finally {
        setIsInitializing(false);
      }
    };

    initializePuckSwap();

    // Cleanup on unmount
    return () => {
      if (monitor) {
        monitor.destroy();
      }
    };
  }, []);

  // Handle wallet connection
  const handleWalletConnect = async (walletName: 'eternl' | 'nami' | 'vespr' | 'lace') => {
    try {
      if (!dex) {
        toast.error('DEX not initialized');
        return;
      }

      await dex.connectWallet(walletName);

      // TODO: Implement actual wallet queries using Lucid Evolution
      const address = 'addr1_actual_wallet_address'; // Would get from Lucid
      const balance = 1000000000n; // Would get actual balance

      setWalletState({
        isConnected: true,
        address,
        walletName,
        balance
      });

      toast.success(`Connected to ${walletName}`);
      setShowWalletModal(false);

    } catch (error) {
      console.error('Wallet connection failed:', error);
      toast.error(`Failed to connect to ${walletName}`);
    }
  };

  // Handle wallet disconnect
  const handleWalletDisconnect = () => {
    setWalletState({ isConnected: false });
    toast.success('Wallet disconnected');
  };

  // Tab navigation
  const tabs = [
    { id: 'swap', label: 'SWAP', icon: '⇄' },
    { id: 'liquidity', label: 'LIQUIDITY', icon: '💧' },
    { id: 'about', label: 'ABOUT', icon: 'ℹ️' },
    { id: 'wallet', label: 'WALLET', icon: '🔗' }
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-green-400 font-mono">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,0,0.1),transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(0,255,0,0.03)_50%,transparent_100%)] pointer-events-none animate-pulse" />

      {/* Header */}
      <header className="relative z-10 border-b border-green-500/30 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-lg">🏒</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-green-400">PUCKSWAP</h1>
                <div className="text-xs text-green-400/70">v3.0 • CARDANO DEX</div>
              </div>
            </div>

            {/* Network Status */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  networkStatus === 'online' ? 'bg-green-500' :
                  networkStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  'bg-red-500'
                }`} />
                <span className="text-xs text-green-400/70 uppercase">
                  {networkStatus === 'online' ? (DEMO_MODE ? 'DEMO' : 'ONLINE') :
                   networkStatus === 'connecting' ? 'CONNECTING' : 'OFFLINE'}
                </span>
              </div>

              {/* Wallet Connection */}
              {walletState.isConnected ? (
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-green-400/70">
                    {walletState.address?.slice(0, 8)}...{walletState.address?.slice(-6)}
                  </div>
                  <button
                    onClick={handleWalletDisconnect}
                    className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-xs hover:bg-red-500/30 transition-colors"
                  >
                    DISCONNECT
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowWalletModal(true)}
                  className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-sm font-bold hover:bg-green-500/30 transition-colors"
                >
                  CONNECT WALLET
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {isInitializing && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-4" />
              <div className="text-green-400 font-bold">INITIALIZING PUCKSWAP v3...</div>
              <div className="text-green-400/70 text-sm mt-2">
                {DEMO_MODE ? 'Loading demo environment' : 'Connecting to Cardano network'}
              </div>
            </div>
          </div>
        )}

        {/* Application Interface */}
        {!isInitializing && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Navigation Sidebar */}
            <div className="lg:col-span-1">
              <nav className="bg-black/90 border border-green-500/30 rounded-lg p-4">
                <div className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as Tab)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded transition-colors ${
                        activeTab === tab.id
                          ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                          : 'text-green-400/70 hover:text-green-400 hover:bg-green-500/10'
                      }`}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      <span className="font-bold">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Quick Stats */}
                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded">
                  <h3 className="text-sm font-bold text-green-400 mb-3">QUICK STATS</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-green-400/70">Total TVL</span>
                      <span className="text-green-400">₳2.5M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-400/70">24h Volume</span>
                      <span className="text-green-400">₳150K</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-400/70">Active Pools</span>
                      <span className="text-green-400">12</span>
                    </div>
                  </div>
                </div>
              </nav>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'swap' && (
                    <SwapV3
                      dex={dex}
                      monitor={monitor}
                      isConnected={walletState.isConnected}
                      walletAddress={walletState.address}
                      demoMode={DEMO_MODE}
                    />
                  )}

                  {activeTab === 'liquidity' && (
                    <LiquidityV3
                      dex={dex}
                      monitor={monitor}
                      isConnected={walletState.isConnected}
                      walletAddress={walletState.address}
                      demoMode={DEMO_MODE}
                    />
                  )}

                  {activeTab === 'pools' && (
                    <div className="bg-black/90 border border-green-500/30 rounded-lg p-6">
                      <h2 className="text-xl font-bold text-green-400 mb-4">LIQUIDITY POOLS</h2>
                      <div className="text-green-400/70">Pool management interface coming soon...</div>
                    </div>
                  )}

                  {activeTab === 'analytics' && (
                    <div className="bg-black/90 border border-green-500/30 rounded-lg p-6">
                      <h2 className="text-xl font-bold text-green-400 mb-4">ANALYTICS DASHBOARD</h2>
                      <div className="text-green-400/70">Advanced analytics coming soon...</div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* Wallet Connection Modal */}
      <WalletConnect
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={handleWalletConnect}
        demoMode={false}
      />

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(0, 0, 0, 0.9)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#22c55e',
            fontFamily: 'monospace'
          }
        }}
      />
    </div>
  );
}
