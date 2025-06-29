'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  WalletBalance, 
  AssetInfo, 
  fetchWalletAssets, 
  formatADA, 
  formatTokenAmount,
  refreshWalletBalance 
} from '../lib/wallet-assets';
import { Lucid } from '@lucid-evolution/lucid';

interface WalletAssetsProps {
  lucid: Lucid | null;
  isConnected: boolean;
  onAssetSelect?: (asset: AssetInfo | null) => void; // null for ADA
  selectedAsset?: AssetInfo | null;
  className?: string;
}

export default function WalletAssets({ 
  lucid, 
  isConnected, 
  onAssetSelect, 
  selectedAsset,
  className = '' 
}: WalletAssetsProps) {
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Load wallet assets when connected
  useEffect(() => {
    if (isConnected && lucid) {
      loadWalletAssets();
    } else {
      setWalletBalance(null);
      setError('');
    }
  }, [isConnected, lucid]);

  const loadWalletAssets = async () => {
    if (!lucid) return;

    try {
      setIsLoading(true);
      setError('');
      
      const balance = await fetchWalletAssets(lucid);
      setWalletBalance(balance);
      
      console.log('✅ Wallet assets loaded successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load wallet assets';
      setError(errorMsg);
      console.error('❌ Failed to load wallet assets:', err);
      toast.error('Failed to load wallet assets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!lucid) return;
    
    try {
      setIsLoading(true);
      const balance = await refreshWalletBalance(lucid);
      setWalletBalance(balance);
      toast.success('Wallet balance refreshed!', { icon: '🔄' });
    } catch (err) {
      toast.error('Failed to refresh balance');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssetClick = (asset: AssetInfo | null) => {
    if (onAssetSelect) {
      onAssetSelect(asset);
    }
  };

  if (!isConnected) {
    return (
      <div className={`p-4 border border-gray-300 rounded-lg bg-gray-50 ${className}`}>
        <div className="text-center text-gray-500">
          <p className="text-sm">Connect wallet to view assets</p>
        </div>
      </div>
    );
  }

  if (isLoading && !walletBalance) {
    return (
      <div className={`p-4 border border-blue-300 rounded-lg bg-blue-50 ${className}`}>
        <div className="text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-blue-700">Loading wallet assets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 border border-red-300 rounded-lg bg-red-50 ${className}`}>
        <div className="text-center">
          <p className="text-sm text-red-700 mb-2">{error}</p>
          <button
            onClick={loadWalletAssets}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!walletBalance) {
    return null;
  }

  return (
    <div className={`border border-gray-300 rounded-lg bg-white ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Wallet Assets</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Refresh balance"
            >
              <div className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}>🔄</div>
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>
      </div>

      {/* ADA Balance */}
      <div className="p-3">
        <motion.div
          onClick={() => handleAssetClick(null)}
          className={`p-3 rounded-lg border cursor-pointer transition-all ${
            selectedAsset === null 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">₳</span>
              </div>
              <div>
                <div className="font-medium text-gray-900">ADA</div>
                <div className="text-xs text-gray-500">Cardano</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-900">
                {formatADA(walletBalance.ada)}
              </div>
              <div className="text-xs text-gray-500">Native</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Native Tokens */}
      {walletBalance.assets.length > 0 && (
        <div className="border-t border-gray-200">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Native Tokens ({walletBalance.totalAssets})
              </span>
            </div>
            
            <AnimatePresence>
              {(isExpanded ? walletBalance.assets : walletBalance.assets.slice(0, 3)).map((asset, index) => (
                <motion.div
                  key={asset.unit}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleAssetClick(asset)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all mb-2 last:mb-0 ${
                    selectedAsset?.unit === asset.unit
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-bold text-xs">
                          {asset.symbol.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{asset.symbol}</div>
                        <div className="text-xs text-gray-500 truncate max-w-32">
                          {asset.metadata?.name || asset.assetNameUtf8}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {formatTokenAmount(asset.amount, asset.decimals)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {asset.decimals > 0 ? `${asset.decimals} decimals` : 'Integer'}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {!isExpanded && walletBalance.assets.length > 3 && (
              <button
                onClick={() => setIsExpanded(true)}
                className="w-full mt-2 p-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
              >
                Show {walletBalance.assets.length - 3} more assets
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {walletBalance.assets.length === 0 && (
        <div className="p-4 border-t border-gray-200">
          <div className="text-center text-gray-500">
            <p className="text-sm">No native tokens found</p>
            <p className="text-xs mt-1">Only ADA is available for swapping</p>
          </div>
        </div>
      )}
    </div>
  );
}
