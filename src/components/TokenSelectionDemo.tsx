// PuckSwap v5 - Token Selection Demo Component
// Demonstrates dynamic token discovery functionality
// Shows available tokens from active liquidity pools

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useAvailableTokens, sortTokensByLiquidity } from '../hooks/useAvailableTokens';
import { formatADA } from '../lib/format-utils';

export default function TokenSelectionDemo() {
  const { 
    tokens, 
    isLoading, 
    error, 
    totalPools, 
    lastUpdated, 
    refresh 
  } = useAvailableTokens({
    minLiquidity: '1000000', // 1 ADA minimum
    refreshInterval: 30000, // 30 seconds
    enabled: true
  });

  const sortedTokens = sortTokensByLiquidity(tokens);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-black border border-green-500/30 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-green-400">
            Dynamic Token Discovery Demo
          </h2>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded hover:bg-green-500/30 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Status Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded p-4">
            <div className="text-green-400 text-sm font-mono">Total Tokens</div>
            <div className="text-2xl font-bold text-green-300">{tokens.length}</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded p-4">
            <div className="text-green-400 text-sm font-mono">Active Pools</div>
            <div className="text-2xl font-bold text-green-300">{totalPools}</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded p-4">
            <div className="text-green-400 text-sm font-mono">Last Updated</div>
            <div className="text-sm text-green-300">
              {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-4 mb-6">
            <div className="text-red-400 text-sm">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && tokens.length === 0 && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-green-400">Discovering available tokens...</div>
          </div>
        )}

        {/* Token List */}
        {!isLoading && tokens.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-green-400 mb-4">
              Available Tokens ({tokens.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedTokens.map((token, index) => (
                <motion.div
                  key={`${token.policy}_${token.name}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 hover:border-green-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-mono text-green-300 font-bold">
                      {token.symbol}
                    </div>
                    {token.isNative && (
                      <div className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded">
                        NATIVE
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-green-400/70 mb-2">
                    {token.name || 'No name'}
                  </div>
                  
                  {!token.isNative && (
                    <>
                      <div className="text-xs text-green-400/50 mb-2 font-mono break-all">
                        {token.policy.slice(0, 20)}...
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-green-400/70">ADA Reserve:</span>
                          <span className="text-green-300">
                            {formatADA(BigInt(token.adaReserve || '0'))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-400/70">Token Reserve:</span>
                          <span className="text-green-300">
                            {(Number(token.tokenReserve || '0') / Math.pow(10, token.decimals)).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-400/70">Price:</span>
                          <span className="text-green-300">
                            {Number(token.price || '0').toFixed(6)} ADA
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && tokens.length === 0 && (
          <div className="text-center py-8">
            <div className="text-green-400/70 mb-4">
              No tokens with active liquidity pools found.
            </div>
            <button
              onClick={refresh}
              className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded hover:bg-green-500/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Implementation Notes */}
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded">
          <h4 className="text-blue-400 font-semibold mb-2">Implementation Notes:</h4>
          <ul className="text-blue-300 text-sm space-y-1">
            <li>• Removed hardcoded PUCKY token from all swap interfaces</li>
            <li>• Implemented dynamic token discovery via pool registry</li>
            <li>• Only shows tokens with active liquidity pools (≥1 ADA)</li>
            <li>• ADA is always available as the base trading pair</li>
            <li>• Real-time updates every 30 seconds</li>
            <li>• Fallback to ADA-only if discovery fails</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
