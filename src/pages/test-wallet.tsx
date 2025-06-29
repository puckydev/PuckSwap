import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { toast, Toaster } from 'react-hot-toast';
import {
  detectAvailableWallets,
  connectToWallet,
  disconnectWallet,
  formatWalletAddress,
  formatADA,
  type ConnectedWalletState,
  type WalletInfo
} from '../lib/wallet-integration';

export default function TestWallet() {
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWalletState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Set mounted state to prevent hydration mismatch
    setMounted(true);

    // Detect wallets on component mount
    try {
      const wallets = detectAvailableWallets();
      setAvailableWallets(wallets);
      console.log('🔍 Detected wallets:', wallets);
    } catch (err) {
      console.error('❌ Error detecting wallets:', err);
      setError(err instanceof Error ? err.message : 'Failed to detect wallets');
    }
  }, []);

  const handleWalletConnect = async (walletName: string) => {
    try {
      setIsLoading(true);
      setError('');
      console.log(`🔗 Attempting to connect to ${walletName}...`);

      const walletState = await connectToWallet(walletName);
      setConnectedWallet(walletState);

      toast.success(`✅ Connected to ${walletName}!`, {
        duration: 4000,
      });

      console.log('✅ Wallet connected:', walletState);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect wallet';
      console.error('❌ Wallet connection failed:', err);
      setError(errorMsg);
      toast.error(errorMsg, {
        duration: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletDisconnect = () => {
    try {
      disconnectWallet();
      setConnectedWallet(null);
      setError('');
      toast.success('Wallet disconnected', {
        duration: 3000,
      });
      console.log('🔌 Wallet disconnected');
    } catch (err) {
      console.error('❌ Error disconnecting wallet:', err);
    }
  };

  const installedWallets = availableWallets.filter(w => w.isInstalled);

  return (
    <>
      <Head>
        <title>PuckSwap - Wallet Connection Test</title>
        <meta name="description" content="Test CIP-30 wallet connection functionality" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-center">
            🧪 Wallet Connection Test
          </h1>

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
              <h3 className="text-red-400 font-semibold mb-2">Error</h3>
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Connected Wallet Display */}
          {connectedWallet ? (
            <div className="bg-green-900/50 border border-green-500 rounded-lg p-6 mb-6">
              <h2 className="text-green-400 font-semibold text-xl mb-4">
                ✅ Wallet Connected
              </h2>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-400">Wallet:</span> {connectedWallet.walletName}</p>
                <p><span className="text-gray-400">Address:</span> {formatWalletAddress(connectedWallet.address)}</p>
                <p><span className="text-gray-400">Balance:</span> {formatADA(connectedWallet.balance.ada)}</p>
                <p><span className="text-gray-400">UTxOs:</span> {connectedWallet.utxos.length}</p>
                <p><span className="text-gray-400">Lucid:</span> {connectedWallet.lucid ? '✅ Available' : '❌ Not loaded'}</p>
              </div>
              <button
                onClick={handleWalletDisconnect}
                className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold transition-colors"
              >
                Disconnect Wallet
              </button>
            </div>
          ) : (
            /* Wallet Selection */
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 mb-6">
              <h2 className="text-gray-200 font-semibold text-xl mb-4">
                Select Wallet to Connect
              </h2>

              {installedWallets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-yellow-400 mb-4">No Cardano wallets detected</p>
                  <p className="text-gray-400 text-sm">
                    Please install a Cardano wallet extension:
                  </p>
                  <p className="text-gray-400 text-sm">
                    Eternl, Nami, Vespr, Lace, Typhon, or Flint
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {installedWallets.map((wallet) => (
                    <button
                      key={wallet.name}
                      onClick={() => handleWalletConnect(wallet.name)}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed
                               p-4 rounded-lg font-semibold transition-colors flex flex-col items-center space-y-2"
                    >
                      <span className="text-2xl">{wallet.icon}</span>
                      <span>{wallet.displayName}</span>
                      {isLoading && <span className="text-xs">Connecting...</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Debug Information */}
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
            <h3 className="text-gray-200 font-semibold mb-4">Debug Information</h3>
            <div className="space-y-2 text-sm text-gray-400">
              {mounted ? (
                <>
                  <p><span className="text-gray-300">Browser Environment:</span> {typeof window !== 'undefined' ? '✅ Yes' : '❌ No'}</p>
                  <p><span className="text-gray-300">Cardano Object:</span> {typeof window !== 'undefined' && (window as any).cardano ? '✅ Available' : '❌ Not found'}</p>
                  <p><span className="text-gray-300">Total Wallets:</span> {availableWallets.length}</p>
                  <p><span className="text-gray-300">Installed Wallets:</span> {installedWallets.length}</p>
                  <p><span className="text-gray-300">Loading State:</span> {isLoading ? '🔄 Loading' : '✅ Ready'}</p>
                </>
              ) : (
                <p className="text-gray-500">🔄 Loading debug information...</p>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 text-center text-gray-400 text-sm">
            <p>This page tests the CIP-30 wallet connection functionality.</p>
            <p>If you see "require is not defined" errors, they should be fixed now.</p>
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
