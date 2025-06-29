// PuckSwap v3 Liquidity Management - Enhanced with Professional DEX Features
// Comprehensive liquidity provision and withdrawal with optimal ratio calculations

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { PuckSwapV3, LiquidityParamsV3, TransactionResultV3 } from '../lib/puckswap-v3';
import { Context7MonitorV3, PoolStatsV3 } from '../lib/context7-monitor-v3';
import { formatADA, formatToken, formatPrice, formatPercentage } from '../lib/format-utils';

// Liquidity operation types
type LiquidityOperation = 'add' | 'remove';

// Token interface
interface Token {
  policy: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUrl?: string;
}

// Component props
interface LiquidityV3Props {
  dex: PuckSwapV3 | null;
  monitor: Context7MonitorV3 | null;
  isConnected: boolean;
  walletAddress?: string;
  demoMode?: boolean;
}

// LP position interface
interface LPPosition {
  poolId: string;
  tokenA: Token;
  tokenB: Token;
  lpTokens: bigint;
  adaValue: bigint;
  tokenValue: bigint;
  shareOfPool: number;
  impermanentLoss: number;
  feesEarned: bigint;
}

export const LiquidityV3: React.FC<LiquidityV3Props> = ({
  dex,
  monitor,
  isConnected,
  walletAddress,
  demoMode = false
}) => {
  // State management
  const [operation, setOperation] = useState<LiquidityOperation>('add');
  const [selectedPool, setSelectedPool] = useState<string>('');
  const [adaAmount, setAdaAmount] = useState<string>('');
  const [tokenAmount, setTokenAmount] = useState<string>('');
  const [lpTokensToRemove, setLpTokensToRemove] = useState<string>('');
  const [removePercentage, setRemovePercentage] = useState<number>(25);
  const [autoOptimalRatio, setAutoOptimalRatio] = useState<boolean>(true);
  const [slippageTolerance, setSlippageTolerance] = useState<number>(50); // 0.5%
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [poolStats, setPoolStats] = useState<PoolStatsV3 | null>(null);
  const [lpPositions, setLpPositions] = useState<LPPosition[]>([]);
  const [showPoolSelector, setShowPoolSelector] = useState<boolean>(false);

  // Available pools (now using dynamic discovery - would be loaded from pool registry)
  const availablePools = useMemo(() => [
    {
      id: 'ada_dynamic',
      tokenA: { policy: '', name: '', symbol: 'ADA', decimals: 6, logoUrl: '/tokens/ada.png' },
      tokenB: { policy: 'dynamic', name: 'DYNAMIC', symbol: 'DYNAMIC', decimals: 6, logoUrl: '/tokens/dynamic.png' }
    }
  ], []);

  // Initialize default pool
  useEffect(() => {
    if (!selectedPool && availablePools.length > 0) {
      setSelectedPool(availablePools[0].id);
    }
  }, [availablePools, selectedPool]);

  // Monitor pool stats
  useEffect(() => {
    if (!monitor || !selectedPool) return;

    const handlePoolUpdate = (stats: PoolStatsV3) => {
      if (stats.poolId === selectedPool) {
        setPoolStats(stats);
      }
    };

    monitor.onPoolStateUpdate(handlePoolUpdate);

    return () => {
      monitor.removePoolStateListener(handlePoolUpdate);
    };
  }, [monitor, selectedPool]);

  // Load LP positions (mock data for demo)
  useEffect(() => {
    if (demoMode) {
      setLpPositions([
        {
          poolId: 'ada_pucky',
          tokenA: availablePools[0].tokenA,
          tokenB: availablePools[0].tokenB,
          lpTokens: 1000000000n,
          adaValue: 500000000n,
          tokenValue: 1250000000n,
          shareOfPool: 0.05,
          impermanentLoss: -2.3,
          feesEarned: 5000000n
        }
      ]);
    }
  }, [demoMode, availablePools]);

  // Calculate optimal token amount based on ADA input
  const calculateOptimalTokenAmount = useCallback(() => {
    if (!adaAmount || !poolStats || !autoOptimalRatio) return;

    try {
      const adaInput = parseFloat(adaAmount);
      const ratio = Number(poolStats.tokenReserve) / Number(poolStats.adaReserve);
      const optimalTokenAmount = adaInput * ratio;
      setTokenAmount(optimalTokenAmount.toFixed(6));
    } catch (error) {
      console.error('Error calculating optimal ratio:', error);
    }
  }, [adaAmount, poolStats, autoOptimalRatio]);

  // Calculate optimal ADA amount based on token input
  const calculateOptimalAdaAmount = useCallback(() => {
    if (!tokenAmount || !poolStats || !autoOptimalRatio) return;

    try {
      const tokenInput = parseFloat(tokenAmount);
      const ratio = Number(poolStats.adaReserve) / Number(poolStats.tokenReserve);
      const optimalAdaAmount = tokenInput * ratio;
      setAdaAmount(optimalAdaAmount.toFixed(6));
    } catch (error) {
      console.error('Error calculating optimal ratio:', error);
    }
  }, [tokenAmount, poolStats, autoOptimalRatio]);

  // Debounced optimal ratio calculations
  useEffect(() => {
    if (autoOptimalRatio) {
      const timer = setTimeout(calculateOptimalTokenAmount, 300);
      return () => clearTimeout(timer);
    }
  }, [calculateOptimalTokenAmount, autoOptimalRatio]);

  // Calculate LP tokens to receive
  const calculateLPTokensToReceive = useMemo(() => {
    if (!adaAmount || !tokenAmount || !poolStats) return '0';

    try {
      const adaInput = BigInt(Math.floor(parseFloat(adaAmount) * 1000000));
      const tokenInput = BigInt(Math.floor(parseFloat(tokenAmount) * 1000000));

      if (poolStats.totalLiquidity === 0n) {
        // Initial liquidity
        const lpTokens = BigInt(Math.floor(Math.sqrt(Number(adaInput) * Number(tokenInput))));
        return (Number(lpTokens) / 1000000).toFixed(6);
      } else {
        // Proportional liquidity
        const adaLPTokens = (adaInput * poolStats.totalLiquidity) / poolStats.adaReserve;
        const tokenLPTokens = (tokenInput * poolStats.totalLiquidity) / poolStats.tokenReserve;
        const lpTokens = adaLPTokens < tokenLPTokens ? adaLPTokens : tokenLPTokens;
        return (Number(lpTokens) / 1000000).toFixed(6);
      }
    } catch (error) {
      return '0';
    }
  }, [adaAmount, tokenAmount, poolStats]);

  // Calculate removal amounts based on percentage
  const calculateRemovalAmounts = useMemo(() => {
    const position = lpPositions.find(p => p.poolId === selectedPool);
    if (!position) return { ada: '0', token: '0' };

    const adaAmount = (Number(position.adaValue) * removePercentage / 100) / 1000000;
    const tokenAmount = (Number(position.tokenValue) * removePercentage / 100) / 1000000;

    return {
      ada: adaAmount.toFixed(6),
      token: tokenAmount.toFixed(6)
    };
  }, [lpPositions, selectedPool, removePercentage]);

  // Handle add liquidity
  const handleAddLiquidity = async () => {
    if (!dex || !adaAmount || !tokenAmount) {
      toast.error('Please enter both ADA and token amounts');
      return;
    }

    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);

    try {
      const pool = availablePools.find(p => p.id === selectedPool);
      if (!pool) throw new Error('Pool not found');

      const adaAmountBigInt = BigInt(Math.floor(parseFloat(adaAmount) * Math.pow(10, pool.tokenA.decimals)));
      const tokenAmountBigInt = BigInt(Math.floor(parseFloat(tokenAmount) * Math.pow(10, pool.tokenB.decimals)));

      const liquidityParams: LiquidityParamsV3 = {
        adaAmount: adaAmountBigInt,
        tokenAmount: tokenAmountBigInt,
        minLPTokens: BigInt(Math.floor(parseFloat(calculateLPTokensToReceive) * 0.95 * 1000000)), // 5% slippage
        slippageTolerance,
        autoOptimalRatio,
        userAddress: walletAddress
      };

      let result: TransactionResultV3;

      if (demoMode) {
        // Demo mode - simulate transaction
        await new Promise(resolve => setTimeout(resolve, 2000));
        result = {
          txHash: `demo_liquidity_tx_${Date.now()}`,
          success: true,
          timestamp: Date.now()
        };
      } else {
        result = await dex.addLiquidity(liquidityParams);
      }

      if (result.success) {
        toast.success(`Liquidity added successfully! TX: ${result.txHash.slice(0, 8)}...`);
        setAdaAmount('');
        setTokenAmount('');
      } else {
        toast.error(`Failed to add liquidity: ${result.error}`);
      }
    } catch (error) {
      console.error('Add liquidity error:', error);
      toast.error('Failed to add liquidity. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle remove liquidity
  const handleRemoveLiquidity = async () => {
    if (!dex || !lpTokensToRemove) {
      toast.error('Please enter LP tokens amount');
      return;
    }

    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);

    try {
      const pool = availablePools.find(p => p.id === selectedPool);
      if (!pool) throw new Error('Pool not found');

      const lpTokensBigInt = BigInt(Math.floor(parseFloat(lpTokensToRemove) * 1000000));
      const removalAmounts = calculateRemovalAmounts;
      const minADAOut = BigInt(Math.floor(parseFloat(removalAmounts.ada) * 0.95 * 1000000)); // 5% slippage
      const minTokenOut = BigInt(Math.floor(parseFloat(removalAmounts.token) * 0.95 * 1000000));

      let result: TransactionResultV3;

      if (demoMode) {
        // Demo mode - simulate transaction
        await new Promise(resolve => setTimeout(resolve, 2000));
        result = {
          txHash: `demo_remove_liquidity_tx_${Date.now()}`,
          success: true,
          timestamp: Date.now()
        };
      } else {
        result = await dex.removeLiquidity(
          lpTokensBigInt,
          minADAOut,
          minTokenOut,
          pool.tokenB.policy,
          pool.tokenB.name,
          slippageTolerance
        );
      }

      if (result.success) {
        toast.success(`Liquidity removed successfully! TX: ${result.txHash.slice(0, 8)}...`);
        setLpTokensToRemove('');
        setRemovePercentage(25);
      } else {
        toast.error(`Failed to remove liquidity: ${result.error}`);
      }
    } catch (error) {
      console.error('Remove liquidity error:', error);
      toast.error('Failed to remove liquidity. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedPoolData = availablePools.find(p => p.id === selectedPool);
  const currentPosition = lpPositions.find(p => p.poolId === selectedPool);

  return (
    <div className="bg-black/90 border border-green-500/30 rounded-lg p-6 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-green-400">LIQUIDITY MANAGEMENT</h2>
        <div className="flex items-center space-x-2">
          {demoMode && (
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded border border-yellow-500/30">
              DEMO MODE
            </span>
          )}
        </div>
      </div>

      {/* Operation Selector */}
      <div className="flex mb-6 bg-black/50 border border-green-500/30 rounded p-1">
        <button
          onClick={() => setOperation('add')}
          className={`flex-1 py-2 px-4 rounded text-sm font-bold transition-colors ${
            operation === 'add'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'text-green-400/70 hover:text-green-400'
          }`}
        >
          ADD LIQUIDITY
        </button>
        <button
          onClick={() => setOperation('remove')}
          className={`flex-1 py-2 px-4 rounded text-sm font-bold transition-colors ${
            operation === 'remove'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'text-green-400/70 hover:text-green-400'
          }`}
        >
          REMOVE LIQUIDITY
        </button>
      </div>

      {/* Pool Selector */}
      <div className="mb-6">
        <label className="block text-sm text-green-400/70 mb-2">POOL</label>
        <button
          onClick={() => setShowPoolSelector(true)}
          className="w-full flex items-center justify-between p-4 bg-black/50 border border-green-500/30 rounded hover:bg-green-500/10 transition-colors"
        >
          {selectedPoolData ? (
            <div className="flex items-center space-x-3">
              <div className="flex -space-x-2">
                <img src={selectedPoolData.tokenA.logoUrl} alt={selectedPoolData.tokenA.symbol} className="w-8 h-8 rounded-full border-2 border-black" />
                <img src={selectedPoolData.tokenB.logoUrl} alt={selectedPoolData.tokenB.symbol} className="w-8 h-8 rounded-full border-2 border-black" />
              </div>
              <span className="text-green-400 font-bold">
                {selectedPoolData.tokenA.symbol}/{selectedPoolData.tokenB.symbol}
              </span>
            </div>
          ) : (
            <span className="text-green-400/70">Select Pool</span>
          )}
          <span className="text-green-400">▼</span>
        </button>
      </div>

      {/* Add Liquidity Form */}
      {operation === 'add' && (
        <div className="space-y-6">
          {/* Auto Optimal Ratio Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-green-400/70 text-sm">Auto Optimal Ratio</span>
            <button
              onClick={() => setAutoOptimalRatio(!autoOptimalRatio)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                autoOptimalRatio ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  autoOptimalRatio ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* ADA Input */}
          <div>
            <label className="block text-sm text-green-400/70 mb-2">ADA AMOUNT</label>
            <div className="bg-black/50 border border-green-500/30 rounded p-4">
              <div className="flex items-center justify-between">
                <input
                  type="number"
                  placeholder="0.0"
                  value={adaAmount}
                  onChange={(e) => {
                    setAdaAmount(e.target.value);
                    if (!autoOptimalRatio) calculateOptimalTokenAmount();
                  }}
                  className="flex-1 bg-transparent text-2xl text-green-400 placeholder-green-400/30 outline-none"
                />
                <div className="flex items-center space-x-2">
                  <img src="/tokens/ada.png" alt="ADA" className="w-6 h-6" />
                  <span className="text-green-400 font-bold">ADA</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-green-400/70">
                Balance: {formatADA(1000000000n)}
              </div>
            </div>
          </div>

          {/* Token Input */}
          <div>
            <label className="block text-sm text-green-400/70 mb-2">
              {selectedPoolData?.tokenB.symbol.toUpperCase()} AMOUNT
            </label>
            <div className="bg-black/50 border border-green-500/30 rounded p-4">
              <div className="flex items-center justify-between">
                <input
                  type="number"
                  placeholder="0.0"
                  value={tokenAmount}
                  onChange={(e) => {
                    setTokenAmount(e.target.value);
                    if (!autoOptimalRatio) calculateOptimalAdaAmount();
                  }}
                  className="flex-1 bg-transparent text-2xl text-green-400 placeholder-green-400/30 outline-none"
                />
                <div className="flex items-center space-x-2">
                  {selectedPoolData?.tokenB.logoUrl && (
                    <img src={selectedPoolData.tokenB.logoUrl} alt={selectedPoolData.tokenB.symbol} className="w-6 h-6" />
                  )}
                  <span className="text-green-400 font-bold">{selectedPoolData?.tokenB.symbol}</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-green-400/70">
                Balance: {formatToken(2500000000n, selectedPoolData?.tokenB.decimals || 6)}
              </div>
            </div>
          </div>

          {/* LP Tokens to Receive */}
          {adaAmount && tokenAmount && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded">
              <div className="flex justify-between items-center">
                <span className="text-green-400/70">LP Tokens to Receive</span>
                <span className="text-green-400 font-bold">{calculateLPTokensToReceive}</span>
              </div>
              {poolStats && (
                <div className="mt-2 text-xs text-green-400/70">
                  Share of Pool: {((parseFloat(calculateLPTokensToReceive) / (Number(poolStats.totalLiquidity) / 1000000)) * 100).toFixed(4)}%
                </div>
              )}
            </div>
          )}

          {/* Add Liquidity Button */}
          <button
            onClick={handleAddLiquidity}
            disabled={!adaAmount || !tokenAmount || isProcessing || !isConnected}
            className={`w-full py-4 rounded font-bold text-lg transition-all ${
              !adaAmount || !tokenAmount || isProcessing || !isConnected
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {!isConnected
              ? 'Connect Wallet'
              : isProcessing
              ? 'Adding Liquidity...'
              : !adaAmount || !tokenAmount
              ? 'Enter Amounts'
              : 'Add Liquidity'
            }
          </button>
        </div>
      )}

      {/* Remove Liquidity Form */}
      {operation === 'remove' && (
        <div className="space-y-6">
          {/* Current Position */}
          {currentPosition && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded">
              <h3 className="text-sm font-bold text-green-400 mb-3">YOUR POSITION</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-green-400/70">LP Tokens</div>
                  <div className="text-green-400 font-bold">{formatToken(currentPosition.lpTokens, 6)}</div>
                </div>
                <div>
                  <div className="text-green-400/70">Share of Pool</div>
                  <div className="text-green-400 font-bold">{formatPercentage(currentPosition.shareOfPool)}</div>
                </div>
                <div>
                  <div className="text-green-400/70">ADA Value</div>
                  <div className="text-green-400 font-bold">{formatADA(currentPosition.adaValue)}</div>
                </div>
                <div>
                  <div className="text-green-400/70">Token Value</div>
                  <div className="text-green-400 font-bold">{formatToken(currentPosition.tokenValue, selectedPoolData?.tokenB.decimals || 6)}</div>
                </div>
                <div>
                  <div className="text-green-400/70">Fees Earned</div>
                  <div className="text-green-400 font-bold">{formatADA(currentPosition.feesEarned)}</div>
                </div>
                <div>
                  <div className="text-green-400/70">Impermanent Loss</div>
                  <div className={`font-bold ${currentPosition.impermanentLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercentage(currentPosition.impermanentLoss / 100)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Removal Percentage Selector */}
          <div>
            <label className="block text-sm text-green-400/70 mb-2">AMOUNT TO REMOVE</label>
            <div className="flex space-x-2 mb-4">
              {[25, 50, 75, 100].map((percentage) => (
                <button
                  key={percentage}
                  onClick={() => {
                    setRemovePercentage(percentage);
                    if (currentPosition) {
                      const lpAmount = (Number(currentPosition.lpTokens) * percentage / 100) / 1000000;
                      setLpTokensToRemove(lpAmount.toFixed(6));
                    }
                  }}
                  className={`flex-1 py-2 px-3 text-sm rounded border transition-colors ${
                    removePercentage === percentage
                      ? 'bg-green-500/20 border-green-500 text-green-400'
                      : 'border-green-500/30 text-green-400/70 hover:border-green-500/50'
                  }`}
                >
                  {percentage}%
                </button>
              ))}
            </div>

            <div className="bg-black/50 border border-green-500/30 rounded p-4">
              <input
                type="number"
                placeholder="LP Tokens to remove"
                value={lpTokensToRemove}
                onChange={(e) => setLpTokensToRemove(e.target.value)}
                className="w-full bg-transparent text-xl text-green-400 placeholder-green-400/30 outline-none"
              />
            </div>
          </div>

          {/* Expected Output */}
          {lpTokensToRemove && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded">
              <h3 className="text-sm font-bold text-green-400 mb-3">YOU WILL RECEIVE</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-green-400/70">ADA</span>
                  <span className="text-green-400 font-bold">{calculateRemovalAmounts.ada}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-400/70">{selectedPoolData?.tokenB.symbol}</span>
                  <span className="text-green-400 font-bold">{calculateRemovalAmounts.token}</span>
                </div>
              </div>
            </div>
          )}

          {/* Remove Liquidity Button */}
          <button
            onClick={handleRemoveLiquidity}
            disabled={!lpTokensToRemove || isProcessing || !isConnected || !currentPosition}
            className={`w-full py-4 rounded font-bold text-lg transition-all ${
              !lpTokensToRemove || isProcessing || !isConnected || !currentPosition
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {!isConnected
              ? 'Connect Wallet'
              : !currentPosition
              ? 'No Position Found'
              : isProcessing
              ? 'Removing Liquidity...'
              : !lpTokensToRemove
              ? 'Enter Amount'
              : 'Remove Liquidity'
            }
          </button>
        </div>
      )}

      {/* Pool Statistics */}
      {poolStats && (
        <div className="mt-6 p-4 bg-black/50 border border-green-500/30 rounded">
          <h3 className="text-sm font-bold text-green-400 mb-3">POOL STATISTICS</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-green-400/70">Total Liquidity</div>
              <div className="text-green-400 font-bold">{formatADA(poolStats.tvl)}</div>
            </div>
            <div>
              <div className="text-green-400/70">24h Volume</div>
              <div className="text-green-400 font-bold">{formatADA(poolStats.volume24h)}</div>
            </div>
            <div>
              <div className="text-green-400/70">24h Fees</div>
              <div className="text-green-400 font-bold">{formatADA(poolStats.fees24h)}</div>
            </div>
            <div>
              <div className="text-green-400/70">APR</div>
              <div className="text-green-400 font-bold">{formatPercentage(poolStats.apr / 100)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Pool Selector Modal */}
      <AnimatePresence>
        {showPoolSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setShowPoolSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black border border-green-500/30 rounded-lg p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-green-400 mb-4">SELECT POOL</h3>
              <div className="space-y-2">
                {availablePools.map((pool) => (
                  <button
                    key={pool.id}
                    onClick={() => {
                      setSelectedPool(pool.id);
                      setShowPoolSelector(false);
                    }}
                    className="w-full flex items-center space-x-3 p-3 bg-green-500/10 border border-green-500/30 rounded hover:bg-green-500/20 transition-colors"
                  >
                    <div className="flex -space-x-2">
                      <img src={pool.tokenA.logoUrl} alt={pool.tokenA.symbol} className="w-8 h-8 rounded-full border-2 border-black" />
                      <img src={pool.tokenB.logoUrl} alt={pool.tokenB.symbol} className="w-8 h-8 rounded-full border-2 border-black" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-green-400 font-bold">
                        {pool.tokenA.symbol}/{pool.tokenB.symbol}
                      </div>
                      <div className="text-green-400/70 text-xs">
                        {pool.tokenA.name} / {pool.tokenB.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
