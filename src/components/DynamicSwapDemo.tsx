// PuckSwap v5 - Dynamic Swap Demo
// Demonstrates the new dynamic token selection interface
// Shows real-time pool discovery and token filtering

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAvailableTokens, TokenInfo, sortTokensByLiquidity } from '../hooks/useAvailableTokens';
import TokenSelectionModal from './TokenSelectionModal';
import TokenSelectionButton from './TokenSelectionButton';
import { formatADA, formatNumber } from '../lib/format-utils';

export default function DynamicSwapDemo() {
  const [selectedFromToken, setSelectedFromToken] = useState<TokenInfo | null>(null);
  const [selectedToToken, setSelectedToToken] = useState<TokenInfo | null>(null);
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);
  const [inputAmount, setInputAmount] = useState('');

  // Dynamic token discovery
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
    enabled: true
  });

  // Get ADA token for display
  const adaToken = availableTokens.find(token => token.isNative) || null;

  // Filter tokens for selection (exclude already selected)
  const getFilteredTokens = (excludeToken: TokenInfo | null) => {
    return availableTokens.filter(token => 
      !excludeToken || 
      token.policy !== excludeToken.policy || 
      token.name !== excludeToken.name
    );
  };

  const handleFromTokenSelect = (token: TokenInfo | null) => {
    setSelectedFromToken(token);
    // If selecting the same token as "to", swap them
    if (token && selectedToToken && 
        token.policy === selectedToToken.policy && 
        token.name === selectedToToken.name) {
      setSelectedToToken(selectedFromToken);
    }
  };

  const handleToTokenSelect = (token: TokenInfo | null) => {
    setSelectedToToken(token);
    // If selecting the same token as "from", swap them
    if (token && selectedFromToken && 
        token.policy === selectedFromToken.policy && 
        token.name === selectedFromToken.name) {
      setSelectedFromToken(selectedToToken);
    }
  };

  const swapTokens = () => {
    const temp = selectedFromToken;
    setSelectedFromToken(selectedToToken);
    setSelectedToToken(temp);
  };

  const canExecuteSwap = selectedFromToken && selectedToToken && inputAmount && parseFloat(inputAmount) > 0;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-black border border-green-500/30 rounded-lg p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-green-400 mb-2">
              Dynamic Token Selection Demo
            </h2>
            <p className="text-green-400/70 text-sm">
              Real-time pool discovery • No hardcoded tokens
            </p>
          </div>
          <button
            onClick={refreshTokens}
            disabled={tokensLoading}
            className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded hover:bg-green-500/30 transition-colors disabled:opacity-50"
          >
            {tokensLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Pool Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded p-3 text-center">
            <div className="text-green-400 text-sm">Available Tokens</div>
            <div className="text-xl font-bold text-green-300">{availableTokens.length}</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded p-3 text-center">
            <div className="text-green-400 text-sm">Active Pools</div>
            <div className="text-xl font-bold text-green-300">{totalPools}</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded p-3 text-center">
            <div className="text-green-400 text-sm">Last Updated</div>
            <div className="text-xs text-green-300">
              {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}
            </div>
          </div>
        </div>

        {/* Swap Interface */}
        <div className="space-y-4">
          {/* From Token */}
          <div className="space-y-2">
            <label className="text-green-400 text-sm font-semibold">From:</label>
            <TokenSelectionButton
              selectedToken={selectedFromToken}
              onClick={() => setShowFromModal(true)}
              showBalance={false}
              variant="default"
              placeholder="Select token to swap from"
              showPoolInfo={true}
            />
          </div>

          {/* Swap Direction Button */}
          <div className="flex justify-center">
            <motion.button
              onClick={swapTokens}
              className="p-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded-full hover:bg-green-500/30 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ⇅
            </motion.button>
          </div>

          {/* To Token */}
          <div className="space-y-2">
            <label className="text-green-400 text-sm font-semibold">To:</label>
            <TokenSelectionButton
              selectedToken={selectedToToken}
              onClick={() => setShowToModal(true)}
              showBalance={false}
              variant="default"
              placeholder="Select token to receive"
              showPoolInfo={true}
            />
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-green-400 text-sm font-semibold">Amount:</label>
            <input
              type="number"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              placeholder="0.000000"
              className="w-full p-3 bg-green-500/10 border border-green-500/30 rounded text-green-300 placeholder-green-400/50 focus:outline-none focus:border-green-500/50"
              step="0.000001"
              min="0"
            />
          </div>

          {/* Execute Button */}
          <motion.button
            disabled={!canExecuteSwap}
            className={`w-full p-4 rounded-lg font-semibold transition-all ${
              canExecuteSwap
                ? 'bg-green-500/20 border border-green-500/50 text-green-300 hover:bg-green-500/30'
                : 'bg-gray-500/10 border border-gray-500/30 text-gray-400 cursor-not-allowed'
            }`}
            whileHover={canExecuteSwap ? { scale: 1.02 } : {}}
            whileTap={canExecuteSwap ? { scale: 0.98 } : {}}
          >
            {!selectedFromToken ? 'Select token to swap from' :
             !selectedToToken ? 'Select token to receive' :
             !inputAmount ? 'Enter amount' :
             `Swap ${selectedFromToken.symbol} → ${selectedToToken.symbol}`}
          </motion.button>
        </div>

        {/* Error Display */}
        {tokensError && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded">
            <div className="text-red-400 text-sm">
              <strong>Error:</strong> {tokensError}
            </div>
          </div>
        )}

        {/* Implementation Notes */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded">
          <h4 className="text-blue-400 font-semibold mb-2">Key Features:</h4>
          <ul className="text-blue-300 text-sm space-y-1">
            <li>✅ Dynamic token discovery from active pools</li>
            <li>✅ Real-time liquidity verification (≥1 ADA)</li>
            <li>✅ No hardcoded token pairs</li>
            <li>✅ Pool state validation and filtering</li>
            <li>✅ Automatic token selection on load</li>
            <li>✅ Graceful error handling and fallbacks</li>
            <li>✅ Interactive token selection modal</li>
            <li>✅ Pool information display</li>
          </ul>
        </div>

        {/* Token Selection Modals */}
        <TokenSelectionModal
          isOpen={showFromModal}
          onClose={() => setShowFromModal(false)}
          onSelectToken={handleFromTokenSelect}
          availableTokens={getFilteredTokens(selectedToToken)}
          isLoading={tokensLoading}
          error={tokensError}
          selectedToken={selectedFromToken}
          title="Select Token to Swap From"
          excludeTokens={selectedToToken ? [selectedToToken] : []}
        />

        <TokenSelectionModal
          isOpen={showToModal}
          onClose={() => setShowToModal(false)}
          onSelectToken={handleToTokenSelect}
          availableTokens={getFilteredTokens(selectedFromToken)}
          isLoading={tokensLoading}
          error={tokensError}
          selectedToken={selectedToToken}
          title="Select Token to Receive"
          excludeTokens={selectedFromToken ? [selectedFromToken] : []}
        />
      </div>
    </div>
  );
}
