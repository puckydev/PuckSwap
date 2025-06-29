'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { 
  fetchWalletAssets, 
  formatADA, 
  formatTokenAmount,
  WalletBalance 
} from '../lib/wallet-assets';
import { createLucidInstance } from '../lib/lucid-config';

/**
 * Test component for wallet asset detection
 * This component helps verify that real wallet asset detection is working
 */
export default function WalletAssetTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [error, setError] = useState<string>('');

  const testWalletAssets = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('🧪 Testing wallet asset detection...');
      
      // Create Lucid instance
      const lucid = await createLucidInstance();
      
      // Check if wallet is available
      if (!window.cardano) {
        throw new Error('No Cardano wallet detected. Please install Vespr, Eternl, or Lace.');
      }
      
      // Get available wallets
      const availableWallets = Object.keys(window.cardano);
      console.log('🔍 Available wallets:', availableWallets);
      
      if (availableWallets.length === 0) {
        throw new Error('No Cardano wallets found.');
      }
      
      // Try to connect to the first available wallet
      const walletName = availableWallets[0];
      const walletApi = await window.cardano[walletName].enable();
      
      // Set wallet in Lucid
      lucid.selectWallet(walletApi);
      
      console.log(`✅ Connected to ${walletName} wallet`);
      
      // Fetch wallet assets
      const balance = await fetchWalletAssets(lucid);
      setWalletBalance(balance);
      
      toast.success(`🎉 Wallet assets loaded successfully!\nFound ${balance.totalAssets} native tokens + ADA`);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to test wallet assets';
      setError(errorMsg);
      console.error('❌ Wallet asset test failed:', err);
      toast.error(`Test failed: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-gray-900">
        🧪 Wallet Asset Detection Test
      </h2>
      
      <p className="text-gray-600 mb-4">
        This test verifies that PuckSwap can detect and display real wallet assets from your connected Cardano preprod wallet.
      </p>
      
      <button
        onClick={testWalletAssets}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors mb-4"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            Testing Wallet Assets...
          </div>
        ) : (
          'Test Wallet Asset Detection'
        )}
      </button>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="text-red-800 font-medium">Error:</div>
          <div className="text-red-700 text-sm mt-1">{error}</div>
        </div>
      )}
      
      {walletBalance && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-800 mb-3">✅ Wallet Assets Detected:</h3>
          
          {/* ADA Balance */}
          <div className="bg-white rounded p-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-bold">₳</span>
                </div>
                <div>
                  <div className="font-medium">ADA</div>
                  <div className="text-sm text-gray-500">Cardano Native</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">{formatADA(walletBalance.ada)}</div>
                <div className="text-sm text-gray-500">{walletBalance.ada.toString()} lovelace</div>
              </div>
            </div>
          </div>
          
          {/* Native Tokens */}
          {walletBalance.assets.length > 0 ? (
            <div>
              <h4 className="font-medium text-gray-800 mb-2">
                Native Tokens ({walletBalance.totalAssets}):
              </h4>
              <div className="space-y-2">
                {walletBalance.assets.map((asset, index) => (
                  <div key={asset.unit} className="bg-white rounded p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-green-600 font-bold text-xs">
                            {asset.symbol.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{asset.symbol}</div>
                          <div className="text-sm text-gray-500 truncate max-w-48">
                            {asset.assetNameUtf8}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatTokenAmount(asset.amount, asset.decimals)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {asset.decimals > 0 ? `${asset.decimals} decimals` : 'Integer'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-400 font-mono">
                      Policy: {asset.policyId.slice(0, 16)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="text-yellow-800 text-sm">
                ℹ️ No native tokens found in wallet. Only ADA is available for swapping.
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <p><strong>Note:</strong> This test connects to your Cardano preprod wallet and reads your actual asset balances. No transactions are performed.</p>
      </div>
    </div>
  );
}
