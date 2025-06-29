'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { PuckSwapLiquidityBuilder } from '../lucid/liquidity';
// import { PoolMonitor, PoolDatum, PoolEvent } from '../context7/pool_monitor';
import { formatADA, formatToken, formatNumber, formatPercentage } from '../lib/format-utils';
import { getEnvironmentConfig } from '../lib/environment-config';
import { useCardanoWallet } from '../hooks/useCardanoWallet';
import { UnifiedDEX } from '../lib/wallet/UnifiedDEX';
// import { getPuckSwapEnvironmentConfig } from '../config/env';

// Master Schema PoolDatum structure (CIP-68 compliant)
interface PoolDatum {
  ada_reserve: bigint;
  token_reserve: bigint;
  fee_basis_points: number;
  lp_token_policy: string;
  lp_token_name: string;
}

interface LiquidityPosition {
  tokenA: string;
  tokenB: string;
  lpTokens: bigint;
  shareOfPool: number;
  valueUSD: number;
}

interface LiquidityQuote {
  adaAmount: bigint;
  tokenAmount: bigint;
  lpTokensToMint: bigint;
  poolSharePercentage: number;
  priceImpact: number;
}

export default function Liquidity() {
  // Use unified wallet system
  const wallet = useCardanoWallet();

  // State management
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');
  const [adaAmount, setAdaAmount] = useState<string>('');
  const [tokenAmount, setTokenAmount] = useState<string>('');
  const [lpTokenAmount, setLpTokenAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');

  // DEX and pool state
  const [unifiedDEX, setUnifiedDEX] = useState<UnifiedDEX | null>(null);
  const [poolData, setPoolData] = useState<PoolDatum | null>(null);
  // const [poolMonitor, setPoolMonitor] = useState<PoolMonitor | null>(null);
  const [quote, setQuote] = useState<LiquidityQuote | null>(null);
  const [positions, setPositions] = useState<LiquidityPosition[]>([]);
  const [userLPBalance, setUserLPBalance] = useState<bigint>(0n);
  const [autoOptimalRatio, setAutoOptimalRatio] = useState<boolean>(true);

  // Configuration
  const envConfig = getEnvironmentConfig();

  // Initialize liquidity system
  useEffect(() => {
    const initializeLiquidity = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Initialize real pool monitoring
        // await initializePoolMonitoring();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize liquidity system';
        setError(errorMsg);
        console.error('Liquidity initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeLiquidity();
  }, []);

  // Initialize pool monitoring for real mode
  // const initializePoolMonitoring = async () => {
  //   try {
  //     // Load initial pool data from API
  //     await loadPoolData();

  //     // Set up periodic polling for real-time updates
  //     const intervalId = setInterval(async () => {
  //       try {
  //         await loadPoolData();
  //         await refreshUserLPBalance();
  //       } catch (error) {
  //         console.error('Pool data refresh error:', error);
  //       }
  //     }, 10000); // Poll every 10 seconds

  //     // Store interval ID for cleanup
  //     setPoolMonitor({ intervalId } as any);

  //     console.log('✅ Pool monitoring initialized with API polling');
  //   } catch (error) {
  //     console.error('❌ Failed to initialize pool monitoring:', error);
  //     throw error;
  //   }
  // };

  // Load pool data from API
  const loadPoolData = async () => {
    try {
      const response = await fetch('/api/context7/pools/PUCKY-ADA');
      if (!response.ok) {
        throw new Error(`Failed to fetch pool data: ${response.statusText}`);
      }

      const apiResponse = await response.json();

      if (!apiResponse.success) {
        throw new Error(apiResponse.error || 'API request failed');
      }

      const data = apiResponse.data;

      // Transform API data to PoolDatum format
      const poolData: PoolDatum = {
        ada_reserve: BigInt(data.adaReserve || 0),
        token_reserve: BigInt(data.tokenReserve || 0),
        fee_basis_points: data.feeBps || 30,
        lp_token_policy: data.tokenPolicy || '',
        lp_token_name: data.tokenName || 'PUCKY_ADA_LP'
      };

      setPoolData(poolData);
      console.log('✅ Pool data loaded successfully');

    } catch (error) {
      console.error('❌ Pool data loading error:', error);
      throw error;
    }
  };

  // Pool event handlers
  // const handlePoolUpdate = useCallback((event: PoolEvent) => {
  //   if (event.type === 'pool_updated' && event.data.poolDatum) {
  //     setPoolData(event.data.poolDatum);
  //   }
  // }, []);

  // const handleLiquidityEvent = useCallback((event: PoolEvent) => {
  //   console.log('Liquidity event:', event);
  //   // Refresh user LP balance after liquidity events
  //   if (connectedWallet && liquidityBuilder) {
  //     refreshUserLPBalance();
  //   }
  // }, [connectedWallet, liquidityBuilder]);

  // Load pool data (alternative implementation)
  const loadPoolDataFromMonitor = async () => {
    try {
      // if (!poolMonitor) return;

      // // Get current pool state from monitor
      // const poolStates = poolMonitor.getCurrentStates();
      // const poolAddress = envConfig.poolAddress || '';
      // const currentPoolData = poolStates.get(poolAddress);

      // if (currentPoolData) {
      //   setPoolData(currentPoolData);
      // }
    } catch (error) {
      console.error('Failed to load pool data:', error);
      setError('Failed to load pool data');
    }
  };

  // Calculate liquidity quotes
  useEffect(() => {
    if (activeTab === 'add' && adaAmount && tokenAmount && poolData) {
      calculateAddLiquidityQuote();
    } else if (activeTab === 'remove' && lpTokenAmount && poolData) {
      calculateRemoveLiquidityQuote();
    } else {
      setQuote(null);
    }
  }, [adaAmount, tokenAmount, lpTokenAmount, activeTab, poolData, autoOptimalRatio]);

  // Auto-calculate token amount based on pool ratio
  useEffect(() => {
    if (activeTab === 'add' && adaAmount && parseFloat(adaAmount) > 0 && poolData && autoOptimalRatio) {
      calculateOptimalTokenAmount();
    }
  }, [adaAmount, activeTab, poolData, autoOptimalRatio]);

  // Calculate optimal token amount based on pool ratio
  const calculateOptimalTokenAmount = () => {
    if (!poolData || !adaAmount || parseFloat(adaAmount) <= 0) return;

    try {
      const ada = BigInt(Math.floor(parseFloat(adaAmount) * 1_000_000));
      const { ada_reserve, token_reserve } = poolData;

      if (ada_reserve > 0n && token_reserve > 0n) {
        // Calculate proportional token amount
        const optimalTokenAmount = (ada * token_reserve) / ada_reserve;
        setTokenAmount((Number(optimalTokenAmount) / 1_000_000).toFixed(6));
      }
    } catch (error) {
      console.error('Error calculating optimal token amount:', error);
    }
  };

  // Calculate add liquidity quote
  const calculateAddLiquidityQuote = () => {
    if (!poolData || !adaAmount || !tokenAmount) return;

    try {
      const ada = BigInt(Math.floor(parseFloat(adaAmount) * 1_000_000));
      const token = BigInt(Math.floor(parseFloat(tokenAmount) * 1_000_000));

      if (ada <= 0n || token <= 0n) return;

      const { ada_reserve, token_reserve } = poolData;

      let finalAdaAmount = ada;
      let finalTokenAmount = token;

      if (autoOptimalRatio && ada_reserve > 0n && token_reserve > 0n) {
        // Calculate optimal ratio
        const poolRatio = Number(ada_reserve) / Number(token_reserve);
        const inputRatio = Number(ada) / Number(token);

        if (inputRatio > poolRatio) {
          // Too much ADA, adjust ADA down
          finalAdaAmount = BigInt(Math.floor(Number(token) * poolRatio));
        } else {
          // Too much token, adjust token down
          finalTokenAmount = BigInt(Math.floor(Number(ada) / poolRatio));
        }
      }

      // Calculate LP tokens to mint using constant product formula
      let lpTokensToMint: bigint;
      const totalLiquidity = BigInt(Math.floor(Math.sqrt(Number(ada_reserve * token_reserve))));

      if (totalLiquidity === 0n) {
        // First liquidity provision
        lpTokensToMint = BigInt(Math.floor(Math.sqrt(Number(finalAdaAmount * finalTokenAmount))));
      } else {
        // Proportional to existing liquidity
        lpTokensToMint = (finalAdaAmount * totalLiquidity) / ada_reserve;
      }

      // Calculate pool share percentage
      const newTotalLiquidity = totalLiquidity + lpTokensToMint;
      const poolSharePercentage = Number(lpTokensToMint) / Number(newTotalLiquidity) * 100;

      // Calculate price impact
      const priceImpact = Math.abs(
        (Number(finalAdaAmount) / Number(finalTokenAmount)) /
        (Number(ada_reserve) / Number(token_reserve)) - 1
      ) * 100;

      setQuote({
        adaAmount: finalAdaAmount,
        tokenAmount: finalTokenAmount,
        lpTokensToMint,
        poolSharePercentage,
        priceImpact
      });
    } catch (err) {
      console.error('Add liquidity quote calculation error:', err);
      setQuote(null);
    }
  };

  // Calculate remove liquidity quote
  const calculateRemoveLiquidityQuote = () => {
    if (!poolData || !lpTokenAmount) return;

    try {
      const lpTokens = BigInt(Math.floor(parseFloat(lpTokenAmount) * 1_000_000));
      if (lpTokens <= 0n || lpTokens > userLPBalance) return;

      const { ada_reserve, token_reserve } = poolData;
      const totalLiquidity = BigInt(Math.floor(Math.sqrt(Number(ada_reserve * token_reserve))));

      // Calculate proportional amounts
      const adaAmount = (ada_reserve * lpTokens) / totalLiquidity;
      const tokenAmount = (token_reserve * lpTokens) / totalLiquidity;

      // Calculate pool share percentage being removed
      const poolSharePercentage = Number(lpTokens) / Number(totalLiquidity) * 100;

      setQuote({
        adaAmount,
        tokenAmount,
        lpTokensToMint: -lpTokens, // Negative for removal
        poolSharePercentage,
        priceImpact: 0 // No price impact for proportional removal
      });
    } catch (err) {
      console.error('Remove liquidity quote calculation error:', err);
      setQuote(null);
    }
  };

  // Handle wallet connection with real CIP-30 integration
  const handleWalletConnected = async (walletState: ConnectedWalletState) => {
    try {
      setIsLoading(true);
      setError('');

      console.log('🔗 Setting up liquidity builder with connected wallet...');

      // Temporary: Use basic config for MVP (avoiding env.ts import issue)
      const envConfig = {
        contractAddresses: {
          liquidityValidator: 'addr_test1wquuqqd9dlsy5l6dxhq8f3urrng0pea37c9ws8fxlzvegqs8p87l4',
          lpMintingPolicy: 'ad524e5497fdf1f924de936f9f7ec31d460c02267e8acce544a5a09e'
        }
      };

      // Create liquidity builder with deployed contract addresses and connected wallet's Lucid instance
      const builder = new PuckSwapLiquidityBuilder(
        walletState.lucid,
        {
          type: "PlutusV2",
          script: envConfig.contractAddresses.liquidityValidator
        },
        {
          type: "PlutusV2",
          script: envConfig.contractAddresses.lpMintingPolicy
        }
      );

      setLiquidityBuilder(builder);
      setConnectedWallet(walletState);

      console.log('✅ Liquidity builder configured with deployed contracts');
      console.log(`📍 Using liquidity validator: ${envConfig.contractAddresses.liquidityValidator.slice(0, 20)}...`);
      console.log(`🪙 Using LP minting policy: ${envConfig.contractAddresses.lpMintingPolicy.slice(0, 20)}...`);

      // Load user LP balance
      await refreshUserLPBalance();

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to setup liquidity builder';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('❌ Liquidity builder setup failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletDisconnected = () => {
    setConnectedWallet(null);
    setLiquidityBuilder(null);
    setUserLPBalance(0n);
    setTxHash('');
    setError('');
    console.log('🔌 Wallet disconnected, cleared liquidity state');
  };

  // Refresh user LP balance
  const refreshUserLPBalance = async () => {
    if (!liquidityBuilder || !connectedWallet || !poolData) return;

    try {
      const balance = await liquidityBuilder.getUserLPBalance(connectedWallet.address, {
        lpTokenPolicy: poolData.lp_token_policy,
        lpTokenName: poolData.lp_token_name
      } as any);
      setUserLPBalance(balance);
      console.log(`💰 Updated LP balance: ${balance} tokens`);
    } catch (error) {
      console.error('Failed to refresh LP balance:', error);
    }
  };

  // Execute add liquidity
  const handleAddLiquidity = async () => {
    if (!quote || !poolData || !connectedWallet) {
      toast.error('Please connect wallet and enter valid amounts');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');

      // Validate wallet is ready for transactions
      validateWalletForTransaction(connectedWallet);

      if (!liquidityBuilder) {
        throw new Error('Liquidity builder not initialized. Please reconnect wallet.');
      }

      console.log('💧 Executing real liquidity addition...');
      console.log(`📊 Adding: ${quote.adaAmount} ADA + ${quote.tokenAmount} tokens`);
      console.log(`🪙 Expected LP tokens: ${quote.lpTokensToMint}`);

      // Real liquidity addition using deployed contracts
      const result = await liquidityBuilder.addLiquidity({
        poolUtxo: null, // Would be fetched from pool monitor
        adaAmount: quote.adaAmount,
        tokenAmount: quote.tokenAmount,
        minLpTokens: (quote.lpTokensToMint * 95n) / 100n, // 5% slippage tolerance
        autoOptimalRatio: autoOptimalRatio
      });

      setTxHash(result.txHash);
      toast.success(
        `🎉 Liquidity added to Cardano preprod testnet!\nTX: ${result.txHash.slice(0, 12)}...`,
        {
          duration: 10000,
          icon: '✅'
        }
      );

      console.log(`✅ Liquidity addition submitted: ${result.txHash}`);

      // Refresh data after transaction
      setTimeout(() => {
        loadPoolData();
        refreshUserLPBalance();
      }, 5000);

      // Reset form
      setAdaAmount('');
      setTokenAmount('');
      setQuote(null);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to add liquidity';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute remove liquidity
  const handleRemoveLiquidity = async () => {
    if (!quote || !poolData || !connectedWallet) {
      toast.error('Please connect wallet and enter valid LP token amount');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');

      // Validate wallet is ready for transactions
      validateWalletForTransaction(connectedWallet);

      if (!liquidityBuilder) {
        throw new Error('Liquidity builder not initialized. Please reconnect wallet.');
      }

      console.log('🔥 Executing real liquidity removal...');
      console.log(`📊 Removing: ${quote.lpTokensToMint} LP tokens`);
      console.log(`💰 Expected: ${quote.adaAmount} ADA + ${quote.tokenAmount} tokens`);

      // Real liquidity removal using deployed contracts
      const result = await liquidityBuilder.removeLiquidity({
        poolUtxo: null, // Would be fetched from pool monitor
        lpTokenAmount: -quote.lpTokensToMint,
        minAdaOut: (quote.adaAmount * 95n) / 100n, // 5% slippage tolerance
        minTokenOut: (quote.tokenAmount * 95n) / 100n
      });

      setTxHash(result.txHash);
      toast.success(
        `🎉 Liquidity removed from Cardano preprod testnet!\nTX: ${result.txHash.slice(0, 12)}...`,
        {
          duration: 10000,
          icon: '🔥'
        }
      );

      console.log(`✅ Liquidity removal submitted: ${result.txHash}`);

      // Refresh data after transaction
      setTimeout(() => {
        loadPoolData();
        refreshUserLPBalance();
      }, 10000);

      // Reset form
      setLpTokenAmount('');
      setQuote(null);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to remove liquidity';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Utility functions
  const setMaxLPTokens = () => {
    if (userLPBalance > 0n) {
      setLpTokenAmount((Number(userLPBalance) / 1_000_000).toString());
    }
  };

  const clearTransaction = () => {
    setTxHash('');
    setError('');
  };

  const formatBalance = (balance: bigint, decimals: number = 6): string => {
    return (Number(balance) / Math.pow(10, decimals)).toFixed(6);
  };

  // Loading state
  if (isLoading && !poolData) {
    return (
      <div className="terminal-card p-6 max-w-2xl mx-auto">
        <div className="text-center text-terminal-green font-mono">
          <div className="w-8 h-8 border-2 border-terminal-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Loading liquidity protocol...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="terminal-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-terminal text-terminal-green text-glow">
            &gt; PUCKSWAP_LIQUIDITY_TERMINAL_v5.0
          </h2>
        </div>

        {/* Pool Stats */}
        {poolData && (
          <div className="grid grid-cols-3 gap-4 mb-6 text-sm font-mono">
            <div className="terminal-border p-3">
              <div className="text-terminal-amber">ADA Reserve:</div>
              <div className="text-terminal-green">{formatADA(poolData.ada_reserve)}</div>
            </div>
            <div className="terminal-border p-3">
              <div className="text-terminal-amber">PUCKY Reserve:</div>
              <div className="text-terminal-green">{formatToken(poolData.token_reserve, 6, 'PUCKY')}</div>
            </div>
            <div className="terminal-border p-3">
              <div className="text-terminal-amber">Fee:</div>
              <div className="text-terminal-green">{(poolData.fee_basis_points / 100).toFixed(1)}%</div>
            </div>
          </div>
        )}

        {/* User LP Balance */}
        {connectedWallet && (
          <div className="mb-6 p-3 terminal-border">
            <div className="text-terminal-amber font-mono text-sm mb-1">Your LP Balance:</div>
            <div className="text-terminal-green font-mono text-lg">
              {formatToken(userLPBalance, 6)} LP tokens
            </div>
          </div>
        )}

        {/* Real Wallet Connection */}
        <WalletConnection
          onWalletConnected={handleWalletConnected}
          onWalletDisconnected={handleWalletDisconnected}
          connectedWallet={connectedWallet}
          isLoading={isLoading}
        />

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-terminal-bg-light p-1 rounded">
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-2 px-4 rounded font-mono text-sm transition-all ${
              activeTab === 'add'
                ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/30'
                : 'text-terminal-gray hover:text-terminal-green'
            }`}
          >
            ADD_LIQUIDITY
          </button>
          <button
            onClick={() => setActiveTab('remove')}
            className={`flex-1 py-2 px-4 rounded font-mono text-sm transition-all ${
              activeTab === 'remove'
                ? 'bg-terminal-red/20 text-terminal-red border border-terminal-red/30'
                : 'text-terminal-gray hover:text-terminal-red'
            }`}
          >
            REMOVE_LIQUIDITY
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'add' ? (
            <motion.div
              key="add"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Auto Optimal Ratio Toggle */}
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  id="autoOptimal"
                  checked={autoOptimalRatio}
                  onChange={(e) => setAutoOptimalRatio(e.target.checked)}
                  className="terminal-checkbox"
                />
                <label htmlFor="autoOptimal" className="text-terminal-amber font-mono text-sm">
                  Auto-adjust to optimal pool ratio
                </label>
              </div>

              {/* ADA Input */}
              <div className="terminal-border p-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-mono text-terminal-amber">ADA Amount</label>
                  <span className="text-xs font-mono text-terminal-gray">
                    Balance: {connectedWallet ? formatBalance(connectedWallet.balance.ada, 6) : '0'} ADA
                  </span>
                </div>
                <input
                  type="number"
                  value={adaAmount}
                  onChange={(e) => setAdaAmount(e.target.value)}
                  placeholder="0.000000"
                  className="w-full bg-transparent text-terminal-green font-mono text-lg border-none outline-none"
                  step="0.000001"
                  min="0"
                />
              </div>

              {/* Token Input */}
              <div className="terminal-border p-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-mono text-terminal-amber">PUCKY Amount</label>
                  <span className="text-xs font-mono text-terminal-gray">
                    Balance: {connectedWallet ? formatToken(connectedWallet.balance.assets['pucky_policy.PUCKY'] || 0n, 6) : '0'} PUCKY
                  </span>
                </div>
                <input
                  type="number"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  placeholder="0.000000"
                  className="w-full bg-transparent text-terminal-green font-mono text-lg border-none outline-none"
                  step="0.000001"
                  min="0"
                  disabled={autoOptimalRatio}
                />
                {autoOptimalRatio && (
                  <div className="text-xs text-terminal-gray mt-1">
                    Auto-calculated based on pool ratio
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="remove"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* LP Token Input */}
              <div className="terminal-border p-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-mono text-terminal-amber">LP Tokens to Remove</label>
                  <button
                    onClick={setMaxLPTokens}
                    className="text-terminal-green font-mono text-xs hover:text-green-400"
                  >
                    MAX
                  </button>
                </div>
                <input
                  type="number"
                  value={lpTokenAmount}
                  onChange={(e) => setLpTokenAmount(e.target.value)}
                  placeholder="0.000000"
                  className="w-full bg-transparent text-terminal-green font-mono text-lg border-none outline-none"
                  step="0.000001"
                  min="0"
                  max={Number(userLPBalance) / 1_000_000}
                />
                <div className="text-xs text-terminal-gray mt-1">
                  Available: {formatToken(userLPBalance, 6)} LP tokens
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quote Details */}
        {quote && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="terminal-border p-4 space-y-2 text-sm font-mono mt-4"
          >
            <div className="text-terminal-amber mb-2">
              {activeTab === 'add' ? 'Liquidity to Add:' : 'Assets to Receive:'}
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-amber">ADA:</span>
              <span className="text-terminal-green">
                {formatNumber(Number(quote.adaAmount) / 1_000_000, 6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-amber">PUCKY:</span>
              <span className="text-terminal-green">
                {formatNumber(Number(quote.tokenAmount) / 1_000_000, 6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-amber">
                {activeTab === 'add' ? 'LP Tokens to Mint:' : 'LP Tokens to Burn:'}
              </span>
              <span className="text-terminal-green">
                {formatNumber(Number(Math.abs(quote.lpTokensToMint)) / 1_000_000, 6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-amber">Pool Share:</span>
              <span className="text-terminal-green">{quote.poolSharePercentage.toFixed(4)}%</span>
            </div>
            {quote.priceImpact > 0 && (
              <div className="flex justify-between">
                <span className="text-terminal-amber">Price Impact:</span>
                <span className={`${quote.priceImpact > 5 ? 'text-terminal-red' : 'text-terminal-green'}`}>
                  {quote.priceImpact.toFixed(2)}%
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Execute Button */}
        <motion.button
          onClick={activeTab === 'add' ? handleAddLiquidity : handleRemoveLiquidity}
          disabled={!connectedWallet || !quote || isProcessing}
          className="w-full terminal-button py-3 mt-4"
          whileHover={{ scale: connectedWallet && quote && !isProcessing ? 1.02 : 1 }}
          whileTap={{ scale: connectedWallet && quote && !isProcessing ? 0.98 : 1 }}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-terminal-green border-t-transparent rounded-full animate-spin"></div>
              <span>PROCESSING ON PREPROD...</span>
            </div>
          ) : !connectedWallet ? (
            'Connect Wallet'
          ) : !quote ? (
            'Enter Amounts'
          ) : (
            `${activeTab === 'add' ? 'ADD' : 'REMOVE'} LIQUIDITY ON PREPROD`
          )}
        </motion.button>
      </div>

      {/* Transaction Result */}
      <AnimatePresence>
        {txHash && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="terminal-card p-4"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="text-terminal-green font-mono text-sm">
                  ✅ {activeTab === 'add' ? 'Liquidity Added' : 'Liquidity Removed'}
                </div>
                <div className="text-terminal-amber font-mono text-xs mt-1">
                  TX: {txHash.slice(0, 16)}...{txHash.slice(-8)}
                </div>
              </div>
              <button
                onClick={clearTransaction}
                className="text-terminal-red hover:text-red-400 font-mono text-sm"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="terminal-card border-terminal-red p-4"
          >
            <div className="flex justify-between items-center">
              <div className="text-terminal-red font-mono text-sm">❌ {error}</div>
              <button
                onClick={() => setError('')}
                className="text-terminal-red hover:text-red-400 font-mono text-sm"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liquidity Positions */}
      {positions.length > 0 && (
        <div className="terminal-card p-6">
          <h3 className="text-lg font-terminal text-terminal-green text-glow mb-4">
            YOUR_POSITIONS
          </h3>

          <div className="space-y-3">
            {positions.map((position, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="terminal-card p-4 bg-terminal-bg-light"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-mono text-terminal-green">
                      {position.tokenA}/{position.tokenB}
                    </div>
                    <div className="text-sm font-mono text-terminal-gray">
                      LP Tokens: {formatBalance(position.lpTokens, 6)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-terminal-amber">
                      ${position.valueUSD.toFixed(2)}
                    </div>
                    <div className="text-sm font-mono text-terminal-gray">
                      {position.shareOfPool.toFixed(2)}% of pool
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
