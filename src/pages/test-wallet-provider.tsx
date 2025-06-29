/**
 * Test page to isolate wallet provider loading issues
 */

'use client';

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useCardanoWalletClient, type WalletName } from '../hooks/useCardanoWalletClient';

export default function TestWalletProvider() {
  const [logs, setLogs] = useState<string[]>([]);

  const {
    isConnected,
    address,
    balance,
    walletName,
    isLoading,
    error,
    isClient,
    connect,
    disconnect,
    refreshBalance
  } = useCardanoWalletClient();

  useEffect(() => {
    if (isClient) {
      addLog('✅ Client-side hydration complete');
    }
  }, [isClient]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleConnect = async (walletName: WalletName) => {
    try {
      addLog(`🔗 Attempting to connect to ${walletName}...`);
      await connect(walletName);
      addLog(`✅ Successfully connected to ${walletName}`);
    } catch (error) {
      addLog(`❌ Failed to connect to ${walletName}: ${error}`);
    }
  };

  const handleDisconnect = async () => {
    try {
      addLog('🔌 Disconnecting wallet...');
      await disconnect();
      addLog('✅ Wallet disconnected');
    } catch (error) {
      addLog(`❌ Failed to disconnect: ${error}`);
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-900 text-green-400 font-mono p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl mb-4">🔄 Loading Wallet Provider Test...</h1>
          <p className="text-sm text-gray-400">Initializing client-side wallet components...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Wallet Provider Test - PuckSwap</title>
      </Head>

      <div className="min-h-screen bg-gray-900 text-green-400 font-mono p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl mb-6">🧪 Wallet Provider Test</h1>

          {/* Status Section */}
          <div className="bg-gray-800 border border-green-500 rounded-lg p-4 mb-6">
            <h2 className="text-lg mb-3">📊 Current Status</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Connected:</span> 
                <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                  {isConnected ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Loading:</span> 
                <span className={isLoading ? 'text-yellow-400' : 'text-green-400'}>
                  {isLoading ? '🔄 Yes' : '✅ No'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Wallet:</span> 
                <span>{walletName || 'None'}</span>
              </div>
              <div>
                <span className="text-gray-400">Error:</span> 
                <span className={error ? 'text-red-400' : 'text-green-400'}>
                  {error || 'None'}
                </span>
              </div>
            </div>
            
            {address && (
              <div className="mt-3">
                <span className="text-gray-400">Address:</span> 
                <span className="text-blue-400 break-all">{address}</span>
              </div>
            )}
            
            {isConnected && (
              <div className="mt-3">
                <span className="text-gray-400">ADA Balance:</span> 
                <span className="text-yellow-400">{(Number(balance.ada) / 1000000).toFixed(6)} ADA</span>
              </div>
            )}
          </div>

          {/* Controls Section */}
          <div className="bg-gray-800 border border-green-500 rounded-lg p-4 mb-6">
            <h2 className="text-lg mb-3">🎮 Controls</h2>
            
            {!isConnected ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-400 mb-3">Select a wallet to connect:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleConnect('eternl')}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded text-white text-sm"
                  >
                    {isLoading ? '🔄' : '🦋'} Eternl
                  </button>
                  <button
                    onClick={() => handleConnect('nami')}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded text-white text-sm"
                  >
                    {isLoading ? '🔄' : '🌊'} Nami
                  </button>
                  <button
                    onClick={() => handleConnect('vespr')}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded text-white text-sm"
                  >
                    {isLoading ? '🔄' : '🦎'} Vespr
                  </button>
                  <button
                    onClick={() => handleConnect('lace')}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded text-white text-sm"
                  >
                    {isLoading ? '🔄' : '🎭'} Lace
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleDisconnect}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white text-sm mr-2"
                >
                  🔌 Disconnect
                </button>
                <button
                  onClick={refreshBalance}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white text-sm"
                >
                  🔄 Refresh Balance
                </button>
              </div>
            )}
          </div>

          {/* Logs Section */}
          <div className="bg-gray-800 border border-green-500 rounded-lg p-4">
            <h2 className="text-lg mb-3">📝 Debug Logs</h2>
            <div className="bg-black rounded p-3 h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-sm">No logs yet...</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="text-xs mb-1 text-green-300">
                    {log}
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setLogs([])}
              className="mt-2 bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-white text-xs"
            >
              Clear Logs
            </button>
          </div>

          {/* Navigation */}
          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              ← Back to Main App
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
