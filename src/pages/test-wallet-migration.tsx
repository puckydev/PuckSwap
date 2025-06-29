import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { toast, Toaster } from 'react-hot-toast';
import WalletConnectMigrated from '../components/WalletConnectMigrated';
import { useWalletMigration, getCurrentWalletImplementation } from '../lib/wallet-migration';

export default function TestWalletMigration() {
  const [mounted, setMounted] = useState(false);
  const [testResults, setTestResults] = useState<{
    legacy: boolean | null;
    new: boolean | null;
  }>({ legacy: null, new: null });

  const {
    currentImplementation,
    isTransitioning,
    fallbackAvailable,
    migrationProgress,
    lastError,
    switchToLegacy,
    switchToNew,
    resetMigration,
    testImplementation
  } = useWalletMigration();

  useEffect(() => {
    setMounted(true);
    
    // Test both implementations
    const runTests = async () => {
      const legacyTest = await testImplementation('legacy');
      const newTest = await testImplementation('cardano-connect-wallet');
      
      setTestResults({
        legacy: legacyTest,
        new: newTest
      });
    };

    runTests();
  }, [testImplementation]);

  const handleSwitchToLegacy = async () => {
    try {
      await switchToLegacy();
      toast.success('Switched to legacy wallet implementation', {
        icon: '🔄'
      });
    } catch (error) {
      toast.error('Failed to switch to legacy implementation', {
        icon: '❌'
      });
    }
  };

  const handleSwitchToNew = async () => {
    try {
      await switchToNew();
      toast.success('Switched to new wallet implementation', {
        icon: '🚀'
      });
    } catch (error) {
      toast.error('Failed to switch to new implementation', {
        icon: '❌'
      });
    }
  };

  const handleResetMigration = () => {
    resetMigration();
    toast.success('Migration state reset', {
      icon: '🔄'
    });
  };

  const handleWalletConnected = (walletInfo: any) => {
    console.log('Wallet connected:', walletInfo);
    toast.success(`Wallet connected using ${currentImplementation} implementation`, {
      icon: '✅'
    });
  };

  const handleWalletDisconnected = () => {
    console.log('Wallet disconnected');
    toast.success('Wallet disconnected', {
      icon: '👋'
    });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading wallet migration test...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>PuckSwap - Wallet Migration Test</title>
        <meta name="description" content="Test wallet migration between legacy and new implementations" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-center">
            🔄 Wallet Migration Test
          </h1>

          {/* Migration Status */}
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 mb-6">
            <h2 className="text-gray-200 font-semibold text-xl mb-4">
              Migration Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><span className="text-gray-400">Current Implementation:</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    currentImplementation === 'cardano-connect-wallet' 
                      ? 'bg-green-900 text-green-300' 
                      : 'bg-yellow-900 text-yellow-300'
                  }`}>
                    {currentImplementation}
                  </span>
                </p>
                <p><span className="text-gray-400">Fallback Available:</span> 
                  <span className={`ml-2 ${fallbackAvailable ? 'text-green-400' : 'text-red-400'}`}>
                    {fallbackAvailable ? '✅ Yes' : '❌ No'}
                  </span>
                </p>
                <p><span className="text-gray-400">Transitioning:</span> 
                  <span className={`ml-2 ${isTransitioning ? 'text-yellow-400' : 'text-green-400'}`}>
                    {isTransitioning ? '🔄 Yes' : '✅ No'}
                  </span>
                </p>
              </div>
              <div>
                <p><span className="text-gray-400">Legacy Test:</span> 
                  <span className={`ml-2 ${testResults.legacy ? 'text-green-400' : 'text-red-400'}`}>
                    {testResults.legacy === null ? '⏳ Testing...' : testResults.legacy ? '✅ Pass' : '❌ Fail'}
                  </span>
                </p>
                <p><span className="text-gray-400">New Implementation Test:</span> 
                  <span className={`ml-2 ${testResults.new ? 'text-green-400' : 'text-red-400'}`}>
                    {testResults.new === null ? '⏳ Testing...' : testResults.new ? '✅ Pass' : '❌ Fail'}
                  </span>
                </p>
                <p><span className="text-gray-400">Environment:</span> 
                  <span className="ml-2 text-blue-400">
                    {process.env.NODE_ENV || 'development'}
                  </span>
                </p>
              </div>
            </div>

            {/* Migration Progress */}
            {isTransitioning && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Migration Progress</span>
                  <span className="text-sm text-gray-400">{migrationProgress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${migrationProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {lastError && (
              <div className="mt-4 bg-red-900/50 border border-red-500 rounded-lg p-3">
                <p className="text-red-300 text-sm">{lastError}</p>
              </div>
            )}
          </div>

          {/* Migration Controls */}
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 mb-6">
            <h2 className="text-gray-200 font-semibold text-xl mb-4">
              Migration Controls
            </h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleSwitchToLegacy}
                disabled={currentImplementation === 'legacy' || isTransitioning}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition-colors"
              >
                Switch to Legacy
              </button>
              
              <button
                onClick={handleSwitchToNew}
                disabled={currentImplementation === 'cardano-connect-wallet' || isTransitioning}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition-colors"
              >
                Switch to New
              </button>
              
              <button
                onClick={handleResetMigration}
                disabled={isTransitioning}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition-colors"
              >
                Reset Migration
              </button>
            </div>
          </div>

          {/* Wallet Connection Test */}
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 mb-6">
            <h2 className="text-gray-200 font-semibold text-xl mb-4">
              Wallet Connection Test
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              This component automatically uses the current implementation ({currentImplementation})
            </p>
            
            <WalletConnectMigrated
              onWalletConnected={handleWalletConnected}
              onWalletDisconnected={handleWalletDisconnected}
            />
          </div>

          {/* Environment Information */}
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
            <h3 className="text-gray-200 font-semibold mb-4">Environment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
              <div>
                <p><span className="text-gray-300">Browser Environment:</span> {typeof window !== 'undefined' ? '✅ Yes' : '❌ No'}</p>
                <p><span className="text-gray-300">Cardano Object:</span> {typeof window !== 'undefined' && (window as any).cardano ? '✅ Available' : '❌ Not found'}</p>
                <p><span className="text-gray-300">Demo Mode:</span> {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? '✅ Enabled' : '❌ Disabled'}</p>
              </div>
              <div>
                <p><span className="text-gray-300">Network:</span> {process.env.NEXT_PUBLIC_NETWORK || 'Not set'}</p>
                <p><span className="text-gray-300">Use New Wallet:</span> {process.env.NEXT_PUBLIC_USE_CARDANO_CONNECT_WALLET || 'Not set'}</p>
                <p><span className="text-gray-300">Fallback Enabled:</span> {process.env.NEXT_PUBLIC_ENABLE_WALLET_FALLBACK || 'Not set'}</p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 text-center text-gray-400 text-sm">
            <p>This page tests the wallet migration functionality between legacy and new implementations.</p>
            <p>Use the migration controls to switch between implementations and test wallet connections.</p>
          </div>
        </div>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#111111',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      />
    </>
  );
}
