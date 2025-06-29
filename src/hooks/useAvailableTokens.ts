// PuckSwap v5 - Available Tokens Hook
// React hook for dynamically discovering tokens with active liquidity pools
// Replaces hardcoded token lists with real-time pool data

import { useState, useEffect, useCallback } from 'react';

export interface TokenInfo {
  policy: string;
  name: string;
  symbol: string;
  decimals: number;
  icon?: string;
  isNative?: boolean;
  poolAddress?: string;
  adaReserve: string;
  tokenReserve: string;
  totalLiquidity: string;
  price: string;
}

export interface UseAvailableTokensOptions {
  minLiquidity?: string; // Minimum liquidity in lovelace
  refreshInterval?: number; // Auto-refresh interval in ms
  enabled?: boolean; // Whether to fetch tokens
  adaPairsOnly?: boolean; // Only return tokens paired with ADA
}

export interface UseAvailableTokensResult {
  tokens: TokenInfo[];
  isLoading: boolean;
  error: string | null;
  totalPools: number;
  lastUpdated: string | null;
  refresh: () => Promise<void>;
}

export function useAvailableTokens(
  options: UseAvailableTokensOptions = {}
): UseAvailableTokensResult {
  const {
    minLiquidity = '1000000', // 1 ADA default
    refreshInterval = 30000, // 30 seconds default
    enabled = true,
    adaPairsOnly = true // Default to ADA pairs only for bidirectional swaps
  } = options;

  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPools, setTotalPools] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/context7/tokens/available?minLiquidity=${minLiquidity}&adaPairsOnly=${adaPairsOnly}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch available tokens: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      setTokens(data.data.tokens || []);
      setTotalPools(data.data.totalPools || 0);
      setLastUpdated(data.data.lastUpdated || null);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch available tokens';
      setError(errorMessage);
      console.error('Error fetching available tokens:', err);

      // Fallback to ADA only if fetch fails
      setTokens([{
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
      }]);
      setTotalPools(0);
    } finally {
      setIsLoading(false);
    }
  }, [minLiquidity, enabled, adaPairsOnly]);

  // Initial fetch
  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Auto-refresh interval
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    const interval = setInterval(fetchTokens, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchTokens, refreshInterval, enabled]);

  return {
    tokens,
    isLoading,
    error,
    totalPools,
    lastUpdated,
    refresh: fetchTokens
  };
}

// Helper function to get token by policy and name
export function findTokenByPolicy(
  tokens: TokenInfo[],
  policy: string,
  name?: string
): TokenInfo | undefined {
  return tokens.find(token => 
    token.policy === policy && 
    (name === undefined || token.name === name)
  );
}

// Helper function to get ADA token
export function getAdaToken(tokens: TokenInfo[]): TokenInfo | undefined {
  return tokens.find(token => token.isNative && token.symbol === 'ADA');
}

// Helper function to get non-ADA tokens
export function getNativeTokens(tokens: TokenInfo[]): TokenInfo[] {
  return tokens.filter(token => !token.isNative);
}

// Helper function to sort tokens by liquidity
export function sortTokensByLiquidity(tokens: TokenInfo[]): TokenInfo[] {
  return [...tokens].sort((a, b) => {
    // ADA always first
    if (a.isNative) return -1;
    if (b.isNative) return 1;
    
    // Sort by total liquidity (descending)
    const aLiquidity = BigInt(a.totalLiquidity || '0');
    const bLiquidity = BigInt(b.totalLiquidity || '0');
    
    if (aLiquidity > bLiquidity) return -1;
    if (aLiquidity < bLiquidity) return 1;
    
    // Sort by symbol alphabetically as tiebreaker
    return a.symbol.localeCompare(b.symbol);
  });
}
