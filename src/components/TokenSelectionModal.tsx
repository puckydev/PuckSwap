// PuckSwap v5 - Token Selection Modal
// Dynamic token selection with real-time pool data and liquidity verification
// Replaces hardcoded token lists with active pool discovery

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ExternalLink, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { TokenInfo, sortTokensByLiquidity } from '../hooks/useAvailableTokens';
import { formatADA, formatNumber } from '../lib/format-utils';

interface TokenSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectToken: (token: TokenInfo | null) => void; // null for ADA
  availableTokens: TokenInfo[];
  isLoading: boolean;
  error: string | null;
  selectedToken?: TokenInfo | null;
  title?: string;
  excludeTokens?: TokenInfo[]; // Tokens to exclude from selection
  onRefresh?: () => void; // Optional refresh function
  lastUpdated?: string | null; // Last update timestamp
}

export default function TokenSelectionModal({
  isOpen,
  onClose,
  onSelectToken,
  availableTokens,
  isLoading,
  error,
  selectedToken,
  title = "Select Token",
  excludeTokens = [],
  onRefresh,
  lastUpdated
}: TokenSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'liquidity' | 'name' | 'price'>('liquidity');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter and sort tokens
  const filteredTokens = useMemo(() => {
    let tokens = [...availableTokens];

    // Exclude specified tokens
    if (excludeTokens.length > 0) {
      tokens = tokens.filter(token =>
        !excludeTokens.some(excluded =>
          excluded.policy === token.policy && excluded.name === token.name
        )
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      tokens = tokens.filter(token => {
        // Search by symbol (most common)
        if (token.symbol.toLowerCase().includes(query)) return true;

        // Search by name
        if (token.name.toLowerCase().includes(query)) return true;

        // Search by policy ID (full or partial)
        if (token.policy.toLowerCase().includes(query)) return true;

        // Search by policy ID without spaces/dots
        if (token.policy.toLowerCase().replace(/[\s.-]/g, '').includes(query.replace(/[\s.-]/g, ''))) return true;

        return false;
      });
    }

    // Apply sorting
    tokens.sort((a, b) => {
      switch (sortBy) {
        case 'liquidity':
          const liquidityA = BigInt(a.totalLiquidity || '0');
          const liquidityB = BigInt(b.totalLiquidity || '0');
          return liquidityB > liquidityA ? 1 : liquidityB < liquidityA ? -1 : 0;

        case 'name':
          return a.symbol.localeCompare(b.symbol);

        case 'price':
          const priceA = Number(a.price || '0');
          const priceB = Number(b.price || '0');
          return priceB - priceA;

        default:
          return 0;
      }
    });

    return tokens;
  }, [availableTokens, excludeTokens, searchQuery, sortBy]);

  // Reset selected index when filtered tokens change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredTokens]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredTokens.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredTokens[selectedIndex]) {
            handleTokenSelect(filteredTokens[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredTokens, selectedIndex]);

  const handleTokenSelect = (token: TokenInfo) => {
    onSelectToken(token.isNative ? null : token);
    onClose();
    setSearchQuery(''); // Reset search
    setSelectedIndex(0); // Reset selection
  };

  const handleClose = () => {
    onClose();
    setSearchQuery(''); // Reset search
    setSelectedIndex(0); // Reset selection
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-black border border-green-500/30 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-green-500/20">
            <div>
              <h3 className="text-lg font-bold text-green-400">{title}</h3>
              {!isLoading && (
                <div className="text-sm text-green-400/70 flex items-center space-x-3">
                  <span>{filteredTokens.length} token{filteredTokens.length !== 1 ? 's' : ''} available</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'liquidity' | 'name' | 'price')}
                    className="bg-green-500/10 border border-green-500/30 rounded text-xs px-2 py-1 text-green-300"
                  >
                    <option value="liquidity">Sort by Liquidity</option>
                    <option value="name">Sort by Name</option>
                    <option value="price">Sort by Price</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="text-green-400/70 hover:text-green-400 transition-colors disabled:opacity-50"
                  title="Refresh token list"
                >
                  <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                </button>
              )}
              <button
                onClick={handleClose}
                className="text-green-400/70 hover:text-green-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-green-500/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400/50" size={16} />
              <input
                type="text"
                placeholder="Search by name, symbol, or policy ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-green-500/10 border border-green-500/30 rounded text-green-300 placeholder-green-400/50 focus:outline-none focus:border-green-500/50"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-green-400 mr-2" size={20} />
                <span className="text-green-400">Loading tokens...</span>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="p-4 m-4 bg-red-500/10 border border-red-500/30 rounded">
                <div className="flex items-center text-red-400 mb-2">
                  <AlertCircle size={16} className="mr-2" />
                  <span className="font-semibold">Error Loading Tokens</span>
                </div>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Token List */}
            {!isLoading && !error && (
              <div className="p-2">
                {filteredTokens.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    {searchQuery ? (
                      <div className="text-green-400/70">
                        No tokens match your search: "{searchQuery}"
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-green-400/70">
                          🏊‍♂️ No liquidity pools found
                        </div>
                        <div className="text-green-400/50 text-sm">
                          Active pools need at least 1 ADA liquidity to appear
                        </div>
                        <div className="text-green-400/50 text-sm">
                          Try creating a pool or check back later
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredTokens.map((token, index) => (
                      <motion.button
                        key={`${token.policy}_${token.name}`}
                        onClick={() => handleTokenSelect(token)}
                        className={`w-full p-3 rounded-lg border transition-all text-left ${
                          selectedToken?.policy === token.policy && selectedToken?.name === token.name
                            ? 'bg-green-500/20 border-green-500/50 text-green-300'
                            : index === selectedIndex
                            ? 'bg-green-500/15 border-green-500/40 text-green-300'
                            : 'bg-green-500/5 border-green-500/20 text-green-400 hover:bg-green-500/10 hover:border-green-500/30'
                        }`}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {/* Token Icon */}
                            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                              {token.icon ? (
                                <img 
                                  src={token.icon} 
                                  alt={token.symbol}
                                  className="w-6 h-6 rounded-full"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span className="text-green-400 font-bold text-sm">
                                  {token.symbol.slice(0, 2)}
                                </span>
                              )}
                            </div>

                            {/* Token Info */}
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold">{token.symbol}</span>
                                {token.isNative && (
                                  <span className="bg-green-500/30 text-green-300 text-xs px-2 py-0.5 rounded">
                                    NATIVE
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-green-400/70">
                                {token.name || 'No name'}
                              </div>
                            </div>
                          </div>

                          {/* Pool Info */}
                          {!token.isNative && (
                            <div className="text-right text-sm">
                              <div className="text-green-300">
                                {formatADA(BigInt(token.adaReserve || '0'))} ADA
                              </div>
                              <div className="text-green-400/70">
                                {formatNumber(
                                  Number(token.tokenReserve || '0') / Math.pow(10, token.decimals),
                                  2
                                )} {token.symbol}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Additional Pool Details */}
                        {!token.isNative && (
                          <div className="mt-2 pt-2 border-t border-green-500/10">
                            <div className="flex justify-between items-center text-xs">
                              <div className="text-green-400/70">
                                Price: {Number(token.price || '0').toFixed(6)} ADA
                              </div>
                              <div className="text-green-400/70">
                                TVL: {formatADA(BigInt(token.totalLiquidity || '0'))}
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-xs mt-1">
                              <div className="text-green-400/50">
                                Decimals: {token.decimals}
                              </div>
                              {token.poolAddress && (
                                <div className="flex items-center text-green-400/50">
                                  <span className="mr-1">Pool</span>
                                  <ExternalLink size={12} />
                                </div>
                              )}
                            </div>
                            {token.policy && (
                              <div className="text-green-400/50 text-xs mt-1 font-mono break-all">
                                {token.policy.slice(0, 20)}...
                              </div>
                            )}
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-green-500/20">
            <div className="text-xs text-green-400/70 text-center space-y-1">
              <div>Showing tokens with active liquidity pools (≥1 ADA)</div>
              {lastUpdated && (
                <div className="text-green-400/50">
                  Last updated: {new Date(lastUpdated).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
