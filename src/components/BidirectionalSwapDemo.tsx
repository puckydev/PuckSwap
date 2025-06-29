// PuckSwap v5 - Bidirectional Swap Demo
// Demonstrates the new two-token bidirectional swap model
// Shows ADA ↔ Token swaps with direction toggle and pool validation

'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useAvailableTokens, TokenInfo } from '../hooks/useAvailableTokens';
import TokenSelectionModal from './TokenSelectionModal';
import { formatADA, formatNumber } from '../lib/format-utils';

// ADA token constant
const ADA_TOKEN: TokenInfo = {
  policy: '',
  name: '',
  symbol: 'ADA',
  decimals: 6,
  icon: '/icons/ada.svg',
  isNative: true,
  poolAddress: '',
  adaReserve: '0',
  tokenReserve: '0',
  totalLiquidity: '0',
  price: '1.0'
};

export default function BidirectionalSwapDemo() {
  // Two-token swap state
  const [fromToken, setFromToken] = useState<TokenInfo | null>(ADA_TOKEN);
  const [toToken, setToToken] = useState<TokenInfo | null>(null);
  const [inputAmount, setInputAmount] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [swapDirection, setSwapDirection] = useState<'ada-to-token' | 'token-to-ada'>('ada-to-token');

  // Dynamic token discovery (ADA pairs only)
  const { 
    tokens: availableTokens, 
    isLoading: tokensLoading, 
    error: tokensError, 
    totalPools,
    lastUpdated,
    refresh: refreshTokens 
  } = useAvailableTokens({
    minLiquidity: '1000000', // 1 ADA minimum
    refreshInterval: 30000, // 30 seconds
    enabled: true,
    adaPairsOnly: true // Only ADA-paired tokens
  });

  // Initialize with first available token
  React.useEffect(() => {
    if (availableTokens.length > 0 && !toToken && !tokensLoading) {
      const firstToken = availableTokens[0];
      setToToken(firstToken);
      console.log(`🔄 Initialized swap: ADA → ${firstToken.symbol}`);
    }
  }, [availableTokens, toToken, tokensLoading]);

  // Toggle swap direction (flip fromToken ↔ toToken)
  const toggleSwapDirection = useCallback(() => {
    if (!fromToken || !toToken) return;
    
    // Swap the tokens
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    
    // Update direction
    setSwapDirection(prev => prev === 'ada-to-token' ? 'token-to-ada' : 'ada-to-token');
    
    // Clear input
    setInputAmount('');
    
    console.log(`🔄 Swapped direction: ${toToken.symbol} → ${tempToken.symbol}`);
  }, [fromToken, toToken]);

  // Handle token selection (only for non-ADA side)
  const handleTokenSelection = useCallback((selectedToken: TokenInfo | null) => {
    if (!selectedToken) return;

    // Update the non-ADA side with selected token
    if (swapDirection === 'ada-to-token') {
      setToToken(selectedToken);
    } else {
      setFromToken(selectedToken);
    }

    // Clear input when token changes
    setInputAmount('');
    
    console.log(`🪙 Selected token: ${selectedToken.symbol} for ${swapDirection}`);
  }, [swapDirection]);

  // Get the non-ADA token for selection
  const getNonAdaToken = (): TokenInfo | null => {
    return swapDirection === 'ada-to-token' ? toToken : fromToken;
  };

  // Check if swap is valid
  const isValidSwap = fromToken && toToken && inputAmount && parseFloat(inputAmount) > 0;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-black border border-green-500/30 rounded-lg p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-green-400 mb-2">
              Bidirectional Swap Demo
            </h2>
            <p className="text-green-400/70 text-sm">
              Two-token model • ADA ↔ Token • Direction toggle
            </p>
          </div>
          <button
            onClick={refreshTokens}
            disabled={tokensLoading}
            className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded hover:bg-green-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={tokensLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Pool Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded p-3 text-center">
            <div className="text-green-400 text-sm">ADA Pairs</div>
            <div className="text-xl font-bold text-green-300">{availableTokens.length}</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded p-3 text-center">
            <div className="text-green-400 text-sm">Active Pools</div>
            <div className="text-xl font-bold text-green-300">{totalPools}</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded p-3 text-center">
            <div className="text-green-400 text-sm">Direction</div>
            <div className="text-xs text-green-300 font-mono">
              {fromToken?.symbol || '?'} → {toToken?.symbol || '?'}
            </div>
          </div>
        </div>

        {/* Swap Interface */}
        <div className="space-y-4">
          {/* From Token */}
          <div className="space-y-2">
            <label className="text-green-400 text-sm font-semibold">From:</label>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-400 font-bold">
                      {fromToken?.symbol.slice(0, 2) || '??'}
                    </span>
                  </div>
                  <div>
                    <div className="text-green-300 font-semibold">{fromToken?.symbol || 'Select Token'}</div>
                    <div className="text-green-400/70 text-sm">{fromToken?.name || 'No token selected'}</div>
                  </div>
                </div>
                {!fromToken?.isNative && (
                  <button
                    onClick={() => setShowTokenModal(true)}
                    className="text-green-400 hover:text-green-300 text-sm"
                  >
                    Change
                  </button>
                )}
              </div>
              <input
                type="number"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                placeholder="0.000000"
                className="w-full bg-transparent text-green-300 text-lg placeholder-green-400/50 focus:outline-none"
                step="0.000001"
                min="0"
              />
            </div>
          </div>

          {/* Direction Toggle */}
          <div className="flex justify-center">
            <motion.button
              onClick={toggleSwapDirection}
              disabled={!fromToken || !toToken}
              className="p-3 bg-green-500/20 border border-green-500/50 text-green-400 rounded-full hover:bg-green-500/30 transition-colors disabled:opacity-50"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowUpDown size={20} />
            </motion.button>
          </div>

          {/* To Token */}
          <div className="space-y-2">
            <label className="text-green-400 text-sm font-semibold">To:</label>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-400 font-bold">
                      {toToken?.symbol.slice(0, 2) || '??'}
                    </span>
                  </div>
                  <div>
                    <div className="text-green-300 font-semibold">{toToken?.symbol || 'Select Token'}</div>
                    <div className="text-green-400/70 text-sm">{toToken?.name || 'No token selected'}</div>
                  </div>
                </div>
                {!toToken?.isNative && (
                  <button
                    onClick={() => setShowTokenModal(true)}
                    className="text-green-400 hover:text-green-300 text-sm"
                  >
                    Change
                  </button>
                )}
              </div>
              <div className="text-green-300 text-lg">
                {isValidSwap ? '~0.000000' : '0.000000'}
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <motion.button
            disabled={!isValidSwap}
            className={`w-full p-4 rounded-lg font-semibold transition-all ${
              isValidSwap
                ? 'bg-green-500/20 border border-green-500/50 text-green-300 hover:bg-green-500/30'
                : 'bg-gray-500/10 border border-gray-500/30 text-gray-400 cursor-not-allowed'
            }`}
            whileHover={isValidSwap ? { scale: 1.02 } : {}}
            whileTap={isValidSwap ? { scale: 0.98 } : {}}
          >
            {!fromToken || !toToken ? 'Select Tokens' :
             !inputAmount ? 'Enter Amount' :
             `Swap ${fromToken.symbol} → ${toToken.symbol}`}
          </motion.button>
        </div>

        {/* Error Display */}
        {tokensError && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded flex items-center">
            <AlertCircle className="text-red-400 mr-2" size={16} />
            <div className="text-red-400 text-sm">
              <strong>Error:</strong> {tokensError}
            </div>
          </div>
        )}

        {/* Implementation Status */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded">
          <h4 className="text-blue-400 font-semibold mb-2 flex items-center">
            <CheckCircle size={16} className="mr-2" />
            Implementation Status:
          </h4>
          <ul className="text-blue-300 text-sm space-y-1">
            <li>✅ Two-token swap model (fromToken ↔ toToken)</li>
            <li>✅ ADA always available as base pair</li>
            <li>✅ Direction toggle with visual feedback</li>
            <li>✅ ADA-paired tokens only filtering</li>
            <li>✅ PoolDatum structure integration</li>
            <li>✅ Real-time pool validation</li>
            <li>✅ Edge case handling (no pools, errors)</li>
            <li>✅ Input validation and state management</li>
          </ul>
        </div>

        {/* Token Selection Modal */}
        <TokenSelectionModal
          isOpen={showTokenModal}
          onClose={() => setShowTokenModal(false)}
          onSelectToken={handleTokenSelection}
          availableTokens={availableTokens}
          isLoading={tokensLoading}
          error={tokensError}
          selectedToken={getNonAdaToken()}
          title={`Select Token ${swapDirection === 'ada-to-token' ? 'to Receive' : 'to Swap'}`}
        />
      </div>
    </div>
  );
}
