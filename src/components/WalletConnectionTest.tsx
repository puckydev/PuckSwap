'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Button } from './ui/button';
import { createLucidInstance, connectWallet } from '../lib/lucid-config';
import { parseWalletError, formatErrorForUser, logWalletError, safeToBigInt } from '../lib/wallet-error-handler';

interface WalletTestState {
  isConnected: boolean;
  address: string | null;
  balance: { ada: bigint; assets: Record<string, bigint> };
  walletName: string | null;
}

export default function WalletConnectionTest() {
  const [walletState, setWalletState] = useState<WalletTestState>({
    isConnected: false,
    address: null,
    balance: { ada: 0n, assets: {} },
    walletName: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testWalletConnection = async (walletName: 'eternl' | 'nami' | 'vespr' | 'lace') => {
    try {
      setIsLoading(true);
      addTestResult(`🔗 Testing connection to ${walletName}...`);

      // Test Lucid instance creation
      addTestResult('📦 Creating Lucid instance...');
      const lucid = await createLucidInstance();
      addTestResult('✅ Lucid instance created successfully');

      // Test wallet connection
      addTestResult(`🔌 Connecting to ${walletName} wallet...`);
      await connectWallet(lucid, walletName);
      addTestResult('✅ Wallet connected successfully');

      // Test address retrieval
      addTestResult('📍 Getting wallet address...');
      const address = await lucid.wallet().address();
      addTestResult(`✅ Address retrieved: ${address.slice(0, 20)}...`);

      // Test UTxO retrieval
      addTestResult('📦 Getting wallet UTxOs...');
      const utxos = await lucid.wallet().getUtxos();
      addTestResult(`✅ Found ${utxos.length} UTxOs`);

      // Test balance calculation with safe conversion
      addTestResult('💰 Calculating balances with safe BigInt conversion...');
      let adaBalance = 0n;
      const assetBalances: Record<string, bigint> = {};

      for (const utxo of utxos) {
        if (!utxo?.assets) {
          addTestResult('⚠️ Found UTxO with no assets property');
          continue;
        }

        // Test safe ADA conversion
        const lovelaceAmount = utxo.assets.lovelace;
        addTestResult(`🔍 Processing lovelace: ${typeof lovelaceAmount} = ${lovelaceAmount}`);
        adaBalance += safeToBigInt(lovelaceAmount, 'lovelace');

        // Test safe asset conversion
        for (const [unit, amount] of Object.entries(utxo.assets)) {
          if (unit !== 'lovelace') {
            addTestResult(`🔍 Processing ${unit}: ${typeof amount} = ${amount}`);
            assetBalances[unit] = (assetBalances[unit] || 0n) + safeToBigInt(amount, unit);
          }
        }
      }

      addTestResult(`✅ Balance calculation completed: ${Number(adaBalance) / 1_000_000} ADA`);
      addTestResult(`✅ Found ${Object.keys(assetBalances).length} different native tokens`);

      // Update state
      setWalletState({
        isConnected: true,
        address,
        balance: { ada: adaBalance, assets: assetBalances },
        walletName
      });

      toast.success(`✅ ${walletName} wallet connected successfully!`, {
        duration: 4000,
        icon: '🎉'
      });

    } catch (err) {
      const walletError = parseWalletError(err);
      const userMessage = formatErrorForUser(walletError);
      
      addTestResult(`❌ Error: ${walletError.type} - ${walletError.message}`);
      logWalletError(walletError, `Testing ${walletName} connection`);
      
      toast.error(userMessage, {
        duration: 8000,
        icon: '❌'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWalletState({
      isConnected: false,
      address: null,
      balance: { ada: 0n, assets: {} },
      walletName: null
    });
    addTestResult('🔌 Wallet disconnected');
    toast.success('Wallet disconnected');
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg"
    >
      <h2 className="text-2xl font-bold mb-6 text-center">
        🧪 Wallet Connection Test Suite
      </h2>

      {!walletState.isConnected ? (
        <div className="space-y-4">
          <p className="text-gray-600 text-center">
            Test wallet connection with enhanced error handling and BigInt safety
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['eternl', 'nami', 'vespr', 'lace'] as const).map((wallet) => (
              <Button
                key={wallet}
                onClick={() => testWalletConnection(wallet)}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? '...' : `Test ${wallet.toUpperCase()}`}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">
              ✅ Connected to {walletState.walletName?.toUpperCase()}
            </h3>
            <p className="text-sm text-green-700">
              <strong>Address:</strong> {walletState.address?.slice(0, 20)}...{walletState.address?.slice(-8)}
            </p>
            <p className="text-sm text-green-700">
              <strong>ADA Balance:</strong> {(Number(walletState.balance.ada) / 1_000_000).toFixed(6)} ADA
            </p>
            <p className="text-sm text-green-700">
              <strong>Native Tokens:</strong> {Object.keys(walletState.balance.assets).length}
            </p>
          </div>
          
          <Button onClick={disconnectWallet} variant="outline" className="w-full">
            Disconnect Wallet
          </Button>
        </div>
      )}

      {/* Test Results */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Test Results</h3>
          <Button onClick={clearTestResults} variant="outline" size="sm">
            Clear Results
          </Button>
        </div>
        
        <div className="bg-gray-50 border rounded-lg p-4 max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500 text-center">No test results yet</p>
          ) : (
            <div className="space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono">
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <p><strong>Note:</strong> This test component helps debug wallet connection issues, particularly the "Cannot convert undefined to a BigInt" error.</p>
        <p>Check the test results and browser console for detailed information.</p>
      </div>
    </motion.div>
  );
}
