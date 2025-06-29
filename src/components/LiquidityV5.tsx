'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { PuckSwapLiquidityBuilder } from '../lucid/liquidity';
import { formatNumber, formatADA, formatToken } from '../lib/format-utils';

interface PoolData {
  adaReserve: bigint;
  tokenReserve: bigint;
  tokenPolicy: string;
  tokenName: string;
  feeBps: number;
  totalLiquidity: bigint;
  lpTokenPolicy: string;
  lpTokenName: string;
  poolUtxo?: any;
}

interface LiquidityQuote {
  adaAmount: bigint;
  tokenAmount: bigint;
  lpTokensToMint: bigint;
  poolSharePercentage: number;
}

export default function LiquidityV5() {
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [adaAmount, setAdaAmount] = useState<string>('');
  const [tokenAmount, setTokenAmount] = useState<string>('');
  const [lpTokenAmount, setLpTokenAmount] = useState<string>('');
  const [quote, setQuote] = useState<LiquidityQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [liquidityBuilder, setLiquidityBuilder] = useState<PuckSwapLiquidityBuilder | null>(null);
  const [userLPBalance, setUserLPBalance] = useState<bigint>(0n);
  const [autoOptimalRatio, setAutoOptimalRatio] = useState<boolean>(true);
  const [isDemoMode] = useState(process.env.NEXT_PUBLIC_DEMO_MODE === 'true');

  // Mock pool data for demo
  const mockPoolData: PoolData = {
    adaReserve: 1000000000000n, // 1M ADA
    tokenReserve: 23019520000000000n, // 23.01952M PUCKY (100 ADA = 2,301,952 PUCKY)
    tokenPolicy: 'a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef01',
    tokenName: 'PUCKY',
    feeBps: 30, // 0.3%
    totalLiquidity: 4796158000000n,
    lpTokenPolicy: 'lp_policy_id',
    lpTokenName: 'PUCKY_ADA_LP',
    poolUtxo: {
      txHash: 'mock_tx_hash',
      outputIndex: 0,
      assets: {
        lovelace: 1000000000000n,
        'a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef01.PUCKY': 23019520000000000n
      },
      address: 'addr_test1...',
      datum: 'mock_datum'
    }
  };

  useEffect(() => {
    if (isDemoMode) {
      setPoolData(mockPoolData);
      setUserLPBalance(50000000000n); // 50K LP tokens for demo
    } else {
      loadPoolData();
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (mode === 'add' && adaAmount && tokenAmount && poolData) {
      calculateAddLiquidityQuote();
    } else if (mode === 'remove' && lpTokenAmount && poolData) {
      calculateRemoveLiquidityQuote();
    } else {
      setQuote(null);
    }
  }, [adaAmount, tokenAmount, lpTokenAmount, mode, poolData, autoOptimalRatio]);

  const loadPoolData = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement Context7 pool data fetching
      setPoolData(mockPoolData);
      
      if (walletConnected && liquidityBuilder) {
        const balance = await liquidityBuilder.getUserLPBalance(walletAddress, {
          lpTokenPolicy: mockPoolData.lpTokenPolicy,
          lpTokenName: mockPoolData.lpTokenName
        } as any);
        setUserLPBalance(balance);
      }
    } catch (err) {
      setError('Failed to load pool data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAddLiquidityQuote = () => {
    if (!poolData || !adaAmount || !tokenAmount) return;

    try {
      const ada = BigInt(Math.floor(parseFloat(adaAmount) * 1_000_000));
      const token = BigInt(Math.floor(parseFloat(tokenAmount) * 1_000_000));
      
      if (ada <= 0n || token <= 0n) return;

      const { adaReserve, tokenReserve, totalLiquidity } = poolData;
      
      let finalAdaAmount = ada;
      let finalTokenAmount = token;
      
      if (autoOptimalRatio && adaReserve > 0n && tokenReserve > 0n) {
        // Calculate optimal ratio
        const poolRatio = Number(adaReserve) / Number(tokenReserve);
        const inputRatio = Number(ada) / Number(token);
        
        if (inputRatio > poolRatio) {
          // Too much ADA, adjust ADA down
          finalAdaAmount = BigInt(Math.floor(Number(token) * poolRatio));
        } else {
          // Too much token, adjust token down
          finalTokenAmount = BigInt(Math.floor(Number(ada) / poolRatio));
        }
      }
      
      // Calculate LP tokens to mint
      let lpTokensToMint: bigint;
      if (totalLiquidity === 0n) {
        // First liquidity provision
        lpTokensToMint = BigInt(Math.floor(Math.sqrt(Number(finalAdaAmount * finalTokenAmount))));
      } else {
        // Proportional to existing liquidity
        lpTokensToMint = (finalAdaAmount * totalLiquidity) / adaReserve;
      }
      
      // Calculate pool share percentage
      const newTotalLiquidity = totalLiquidity + lpTokensToMint;
      const poolSharePercentage = Number(lpTokensToMint) / Number(newTotalLiquidity) * 100;
      
      setQuote({
        adaAmount: finalAdaAmount,
        tokenAmount: finalTokenAmount,
        lpTokensToMint,
        poolSharePercentage
      });
    } catch (err) {
      console.error('Add liquidity quote calculation error:', err);
      setQuote(null);
    }
  };

  const calculateRemoveLiquidityQuote = () => {
    if (!poolData || !lpTokenAmount) return;

    try {
      const lpTokens = BigInt(Math.floor(parseFloat(lpTokenAmount) * 1_000_000));
      if (lpTokens <= 0n || lpTokens > userLPBalance) return;

      const { adaReserve, tokenReserve, totalLiquidity } = poolData;
      
      // Calculate proportional amounts
      const adaAmount = (adaReserve * lpTokens) / totalLiquidity;
      const tokenAmount = (tokenReserve * lpTokens) / totalLiquidity;
      
      // Calculate pool share percentage being removed
      const poolSharePercentage = Number(lpTokens) / Number(totalLiquidity) * 100;
      
      setQuote({
        adaAmount,
        tokenAmount,
        lpTokensToMint: -lpTokens, // Negative for removal
        poolSharePercentage
      });
    } catch (err) {
      console.error('Remove liquidity quote calculation error:', err);
      setQuote(null);
    }
  };

  const connectWallet = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      if (isDemoMode) {
        setWalletConnected(true);
        setWalletAddress('addr_test1...demo_address');
        toast.success('Demo wallet connected!');
      } else {
        const builder = await PuckSwapLiquidityBuilder.create(
          process.env.NEXT_PUBLIC_POOL_VALIDATOR_CBOR || 'mock_cbor',
          process.env.NEXT_PUBLIC_LIQUIDITY_VALIDATOR_CBOR || 'mock_cbor',
          process.env.NEXT_PUBLIC_LP_MINTING_POLICY_CBOR || 'mock_cbor',
          "Preprod",
          "eternl"
        );
        
        setLiquidityBuilder(builder);
        setWalletConnected(true);
        setWalletAddress('addr_test1...real_address');
        toast.success('Wallet connected successfully!');
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const executeLiquidityOperation = async () => {
    if (!quote || !poolData || !walletConnected) return;

    try {
      setIsLoading(true);
      setError('');
      
      if (isDemoMode) {
        // Demo mode simulation
        await new Promise(resolve => setTimeout(resolve, 2000));
        const mockTxHash = `demo_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setTxHash(mockTxHash);
        toast.success(`Demo ${mode} liquidity completed!`, { icon: mode === 'add' ? '💧' : '🔥' });
      } else if (liquidityBuilder) {
        let result;
        
        if (mode === 'add') {
          result = await liquidityBuilder.addLiquidity({
            poolUtxo: poolData.poolUtxo,
            adaAmount: quote.adaAmount,
            tokenAmount: quote.tokenAmount,
            minLpTokens: (quote.lpTokensToMint * 95n) / 100n, // 5% slippage
            autoOptimalRatio: autoOptimalRatio
          });
        } else {
          result = await liquidityBuilder.removeLiquidity({
            poolUtxo: poolData.poolUtxo,
            lpTokenAmount: -quote.lpTokensToMint,
            minAdaOut: (quote.adaAmount * 95n) / 100n, // 5% slippage
            minTokenOut: (quote.tokenAmount * 95n) / 100n
          });
        }
        
        setTxHash(result.txHash);
        toast.success(`${mode === 'add' ? 'Add' : 'Remove'} liquidity completed! TX: ${result.txHash.slice(0, 8)}...`, { 
          icon: mode === 'add' ? '✅' : '🔥' 
        });
        
        // Refresh pool data and user balance
        setTimeout(() => loadPoolData(), 5000);
      }
      
      // Clear inputs
      setAdaAmount('');
      setTokenAmount('');
      setLpTokenAmount('');
      setQuote(null);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : `${mode === 'add' ? 'Add' : 'Remove'} liquidity failed`;
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const setMaxLPTokens = () => {
    if (userLPBalance > 0n) {
      setLpTokenAmount((Number(userLPBalance) / 1_000_000).toString());
    }
  };

  const clearTransaction = () => {
    setTxHash('');
    setError('');
  };

  if (!poolData) {
    return (
      <div className="terminal-card p-6 max-w-2xl mx-auto">
        <div className="text-center text-terminal-green font-mono">
          {isLoading ? 'Loading pool data...' : 'Pool data unavailable'}
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-card p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="terminal-header mb-6">
        <h2 className="text-xl font-bold text-terminal-green font-mono">
          &gt; PUCKSWAP_LIQUIDITY_TERMINAL_v5.0
        </h2>
        <div className="text-sm text-terminal-amber font-mono mt-2">
          Pool: {poolData.tokenName}/ADA | Fee: {poolData.feeBps / 100}% | 
          Total LP: {formatToken(poolData.totalLiquidity, poolData.lpTokenName)}
        </div>
        {isDemoMode && (
          <div className="text-xs text-terminal-red font-mono mt-1">
            [DEMO MODE - No real transactions]
          </div>
        )}
      </div>

      {/* Pool Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-sm font-mono">
        <div className="terminal-border p-3">
          <div className="text-terminal-amber">ADA Reserve:</div>
          <div className="text-terminal-green">{formatADA(poolData.adaReserve)}</div>
        </div>
        <div className="terminal-border p-3">
          <div className="text-terminal-amber">{poolData.tokenName} Reserve:</div>
          <div className="text-terminal-green">{formatToken(poolData.tokenReserve, poolData.tokenName)}</div>
        </div>
        <div className="terminal-border p-3">
          <div className="text-terminal-amber">Your LP Balance:</div>
          <div className="text-terminal-green">{formatToken(userLPBalance, poolData.lpTokenName)}</div>
        </div>
      </div>

      {/* Wallet Connection */}
      {!walletConnected ? (
        <motion.button
          onClick={connectWallet}
          disabled={isLoading}
          className="w-full terminal-button mb-6"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </motion.button>
      ) : (
        <div className="mb-6 p-3 terminal-border">
          <div className="text-terminal-green font-mono text-sm">
            ✅ Wallet Connected: {walletAddress.slice(0, 12)}...{walletAddress.slice(-8)}
          </div>
        </div>
      )}

      {/* Mode Selection */}
      <div className="flex mb-6">
        <button
          onClick={() => setMode('add')}
          className={`flex-1 py-2 px-4 font-mono text-sm border-r ${
            mode === 'add' 
              ? 'bg-terminal-green text-black' 
              : 'text-terminal-green border-terminal-green'
          }`}
        >
          Add Liquidity
        </button>
        <button
          onClick={() => setMode('remove')}
          className={`flex-1 py-2 px-4 font-mono text-sm ${
            mode === 'remove' 
              ? 'bg-terminal-red text-black' 
              : 'text-terminal-red border-terminal-red'
          }`}
        >
          Remove Liquidity
        </button>
      </div>

      {/* Liquidity Interface */}
      <div className="space-y-4">
        {mode === 'add' ? (
          <>
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
                Auto-adjust to optimal ratio
              </label>
            </div>

            {/* ADA Amount */}
            <div className="terminal-border p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-terminal-amber font-mono text-sm">ADA Amount:</span>
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

            {/* Token Amount */}
            <div className="terminal-border p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-terminal-amber font-mono text-sm">{poolData.tokenName} Amount:</span>
              </div>
              <input
                type="number"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                placeholder="0.000000"
                className="w-full bg-transparent text-terminal-green font-mono text-lg border-none outline-none"
                step="0.000001"
                min="0"
              />
            </div>
          </>
        ) : (
          <>
            {/* LP Token Amount */}
            <div className="terminal-border p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-terminal-amber font-mono text-sm">LP Tokens to Remove:</span>
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
            </div>
          </>
        )}

        {/* Quote Details */}
        {quote && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="terminal-border p-4 space-y-2 text-sm font-mono"
          >
            <div className="text-terminal-amber mb-2">
              {mode === 'add' ? 'Liquidity to Add:' : 'Assets to Receive:'}
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-amber">ADA:</span>
              <span className="text-terminal-green">
                {formatNumber(Number(quote.adaAmount) / 1_000_000, 6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-amber">{poolData.tokenName}:</span>
              <span className="text-terminal-green">
                {formatNumber(Number(quote.tokenAmount) / 1_000_000, 6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-amber">
                {mode === 'add' ? 'LP Tokens to Mint:' : 'LP Tokens to Burn:'}
              </span>
              <span className="text-terminal-green">
                {formatNumber(Number(Math.abs(quote.lpTokensToMint)) / 1_000_000, 6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-amber">Pool Share:</span>
              <span className="text-terminal-green">{quote.poolSharePercentage.toFixed(4)}%</span>
            </div>
          </motion.div>
        )}

        {/* Execute Button */}
        <motion.button
          onClick={executeLiquidityOperation}
          disabled={!walletConnected || !quote || isLoading}
          className="w-full terminal-button py-3"
          whileHover={{ scale: walletConnected && quote && !isLoading ? 1.02 : 1 }}
          whileTap={{ scale: walletConnected && quote && !isLoading ? 0.98 : 1 }}
        >
          {isLoading ? 'Processing...' : 
           !walletConnected ? 'Connect Wallet' :
           !quote ? 'Enter Amounts' :
           `${mode === 'add' ? 'Add' : 'Remove'} Liquidity`}
        </motion.button>
      </div>

      {/* Transaction Result */}
      <AnimatePresence>
        {txHash && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-6 terminal-border p-4"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="text-terminal-green font-mono text-sm">
                  ✅ {mode === 'add' ? 'Liquidity Added' : 'Liquidity Removed'}
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
            className="mt-6 terminal-border border-terminal-red p-4"
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
    </div>
  );
}
