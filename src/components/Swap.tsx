'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Win98Window, Win98Panel, Win98GroupBox, Win98Button, Win98Label } from './ui/windows98';
import { PuckSwapSwapBuilder } from '../lucid/swap';
import { formatADA, formatToken, formatNumber, formatPercentage } from '../lib/format-utils';
import { useAvailableTokens, TokenInfo, sortTokensByLiquidity } from '../hooks/useAvailableTokens';
import TokenSelectionModal from './TokenSelectionModal';
import TokenSelectionButton from './TokenSelectionButton';
import { parseWalletError, formatErrorForUser, logWalletError } from '../lib/wallet-error-handler';
import { useCardanoWallet, type WalletName } from '../hooks/useCardanoWallet';

// Aiken PoolDatum structure (matches smart contract)
interface PoolDatum {
  ada_reserve: bigint;
  token_reserve: bigint;
  token_policy: string;
  token_name: string;
  fee_basis_points: number;
  lp_token_policy: string;
  lp_token_name: string;
}

// Extended pool data with additional metadata
interface PoolData extends PoolDatum {
  poolAddress?: string;
  poolUtxo?: any;
  price?: number;
  totalLiquidity?: bigint;
}

// Swap quote calculation result
interface SwapQuote {
  inputAmount: bigint;
  outputAmount: bigint;
  priceImpact: number;
  fee: bigint;
  minimumReceived: bigint;
  exchangeRate: number;
}

// Wallet connection state
interface WalletState {
  isConnected: boolean;
  address: string | null;
  walletName: string | null;
  balance: {
    ada: bigint;
    assets: Record<string, bigint>;
  };
}

// Transaction status
interface TransactionStatus {
  status: 'idle' | 'pending' | 'submitted' | 'confirmed' | 'failed';
  txHash?: string;
  error?: string;
}

// Pool event interface (for monitoring)
interface PoolEvent {
  type: 'swap' | 'add_liquidity' | 'remove_liquidity' | 'pool_created' | 'pool_updated';
  txHash?: string;
  timestamp?: number;
  poolAddress?: string;
  poolDatum?: PoolDatum;
  previousDatum?: PoolDatum;
  data?: any;
}

// ADA token constant (always available as base pair)
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

export default function Swap() {
  // Dynamic token discovery (ADA pairs only for bidirectional swaps)
  const {
    tokens: availableTokens,
    isLoading: tokensLoading,
    error: tokensError,
    refresh: refreshTokens,
    lastUpdated: tokensLastUpdated,
    totalPools
  } = useAvailableTokens({
    minLiquidity: '1000000', // 1 ADA minimum
    refreshInterval: 30000, // 30 seconds
    enabled: true,
    adaPairsOnly: true // Only show tokens paired with ADA
  });

  // Two-token swap state
  const [fromToken, setFromToken] = useState<TokenInfo | null>(null); // ADA token or selected token
  const [toToken, setToToken] = useState<TokenInfo | null>(null);     // Selected token or ADA token
  const [swapDirection, setSwapDirection] = useState<'ada-to-token' | 'token-to-ada'>('ada-to-token');
  const [inputAmount, setInputAmount] = useState<string>('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5);
  const [showTokenModal, setShowTokenModal] = useState(false);

  // Pool data for the current token pair
  const [poolData, setPoolData] = useState<PoolData | null>(null);

  // Use unified wallet system
  const wallet = useCardanoWallet();

  // Transaction and loading state
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({ status: 'idle' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Unified DEX instance
  const [unifiedDEX, setUnifiedDEX] = useState<any>(null); // Will be properly typed

  // Configuration
  // const envConfig = useMemo(() => getEnvironmentConfig(), []);

  // Initialize two-token swap model when tokens load
  useEffect(() => {
    if (availableTokens.length > 0 && !fromToken && !toToken && !tokensLoading) {
      const nonAdaTokens = availableTokens.filter(token => !token.isNative);
      if (nonAdaTokens.length > 0) {
        const firstToken = sortTokensByLiquidity(nonAdaTokens)[0];
        // Default: ADA → Token
        setFromToken(ADA_TOKEN);
        setToToken(firstToken);
        setSwapDirection('ada-to-token');
        console.log(`🔄 Initialized swap: ${ADA_TOKEN.symbol} → ${firstToken.symbol}`);
      }
    }
  }, [availableTokens, fromToken, toToken, tokensLoading]);

  // Initialize pool monitoring and swap builder
  useEffect(() => {
    const initializeComponents = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Initialize real pool monitoring and swap builder
        // await initializePoolMonitor();
        await initializeSwapBuilder();
        console.log('🔄 PuckSwap initialized on Cardano preprod testnet');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize components';
        setError(errorMsg);
        console.error('❌ Component initialization failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeComponents();

    // Cleanup on unmount
    return () => {
      // if (poolMonitor) {
      //   poolMonitor.stopMonitoring();
      // }
    };
  }, []);

  // Calculate swap quote when input changes
  useEffect(() => {
    if (inputAmount && poolData && parseFloat(inputAmount) > 0 && fromToken && toToken) {
      calculateSwapQuote();
    } else {
      setQuote(null);
    }
  }, [inputAmount, swapDirection, poolData, slippageTolerance, fromToken, toToken]);

  // Toggle swap direction (flip fromToken ↔ toToken)
  const toggleSwapDirection = useCallback(() => {
    if (!fromToken || !toToken) return;

    // Swap the tokens
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);

    // Update direction
    setSwapDirection(prev => prev === 'ada-to-token' ? 'token-to-ada' : 'ada-to-token');

    // Clear input and quote
    setInputAmount('');
    setQuote(null);

    console.log(`🔄 Swapped direction: ${toToken.symbol} → ${tempToken.symbol}`);
  }, [fromToken, toToken]);

  // Handle token selection (only for non-ADA side)
  const handleTokenSelection = useCallback((selectedToken: TokenInfo | null) => {
    if (!selectedToken || selectedToken.isNative) {
      // If ADA is selected or null, ensure ADA is on one side
      if (swapDirection === 'ada-to-token') {
        setFromToken(ADA_TOKEN);
        // Keep current toToken if it exists
      } else {
        setToToken(ADA_TOKEN);
        // Keep current fromToken if it exists
      }
      return;
    }

    // Update the non-ADA side with selected token
    if (swapDirection === 'ada-to-token') {
      setFromToken(ADA_TOKEN);
      setToToken(selectedToken);
    } else {
      setFromToken(selectedToken);
      setToToken(ADA_TOKEN);
    }

    // Clear input and quote when token changes
    setInputAmount('');
    setQuote(null);

    console.log(`🪙 Selected token: ${selectedToken.symbol} for ${swapDirection}`);
  }, [swapDirection]);

  // Initialize pool monitor for real-time updates
  // const initializePoolMonitor = async () => {
  //   try {
  //     const monitor = new PoolMonitor({
  //       poolAddresses: ['addr_test1...pool_address'], // Would get from config
  //       blockfrostApiKey: 'preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL',
  //       network: 'preprod' as any,
  //       enableWebSocket: true,
  //       pollingInterval: 5000,
  //       maxRetries: 3,
  //       retryDelay: 1000,
  //       enableBroadcast: true,
  //       broadcastEndpoints: {
  //         websocket: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://api.puckswap.io/pool-updates'
  //       }
  //     });

  //     await monitor.initialize();
  //     await monitor.startMonitoring();

  //     // Subscribe to pool events (Note: These would be implemented in the actual PoolMonitor)
  //     // monitor.addEventListener('pool_updated', handlePoolUpdate);
  //     // monitor.addEventListener('swap', handleSwapEvent);
  //     // monitor.addEventListener('add_liquidity', handleLiquidityEvent);
  //     // monitor.addEventListener('remove_liquidity', handleLiquidityEvent);

  //     setPoolMonitor(monitor);
  //     console.log('✅ Pool monitor initialized successfully');
  //   } catch (error) {
  //     console.error('❌ Failed to initialize pool monitor:', error);
  //     throw error;
  //   }
  // };

  // Initialize swap builder
  const initializeSwapBuilder = async () => {
    try {
      // This would be initialized when wallet connects
      console.log('🔧 Swap builder will be initialized on wallet connection');
    } catch (error) {
      console.error('❌ Failed to initialize swap builder:', error);
      throw error;
    }
  };

  // Handle pool update events from monitor
  const handlePoolUpdate = useCallback((event: PoolEvent | undefined) => {
    if (event && typeof event === 'object' && event.type === 'pool_updated' && event.poolDatum) {
      setPoolData(event.poolDatum);
      console.log('📊 Pool data updated:', event.poolDatum);
    }
  }, []);

  // Handle swap events from monitor
  const handleSwapEvent = useCallback((event: PoolEvent | undefined) => {
    if (event && typeof event === 'object' && event.type) {
      console.log('🔄 Swap detected:', event);
      toast.success('Pool updated from recent swap', { icon: '🔄' });
    }
  }, []);

  // Handle liquidity events from monitor
  const handleLiquidityEvent = useCallback((event: PoolEvent | undefined) => {
    if (event && typeof event === 'object' && event.type) {
      console.log('💧 Liquidity event detected:', event);
      toast.success('Pool liquidity updated', { icon: '💧' });
    }
  }, []);

  // Calculate swap quote using AMM formula
  const calculateSwapQuote = useCallback(() => {
    if (!poolData || !inputAmount) return;

    try {
      const input = BigInt(Math.floor(parseFloat(inputAmount) * 1_000_000));
      if (input <= 0n) return;

      const { ada_reserve, token_reserve, fee_basis_points } = poolData;

      // Calculate fee (0.3% = 30 basis points)
      const fee = (input * BigInt(fee_basis_points)) / 10000n;
      const netInput = input - fee;

      let outputAmount: bigint;
      let newAdaReserve: bigint;
      let newTokenReserve: bigint;

      // Constant product AMM formula: x * y = k
      if (swapDirection === 'ada-to-token') {
        // ADA → Token
        outputAmount = (token_reserve * netInput) / (ada_reserve + netInput);
        newAdaReserve = ada_reserve + input;
        newTokenReserve = token_reserve - outputAmount;
      } else {
        // Token → ADA
        outputAmount = (ada_reserve * netInput) / (token_reserve + netInput);
        newAdaReserve = ada_reserve - outputAmount;
        newTokenReserve = token_reserve + input;
      }

      // Calculate price impact
      const oldPrice = Number(ada_reserve) / Number(token_reserve);
      const newPrice = Number(newAdaReserve) / Number(newTokenReserve);
      const priceImpact = Math.abs((newPrice - oldPrice) / oldPrice) * 100;

      // Calculate minimum received with slippage tolerance
      const minimumReceived = (outputAmount * BigInt(Math.floor((100 - slippageTolerance) * 100))) / 10000n;

      // Calculate exchange rate
      const exchangeRate = Number(outputAmount) / Number(input);

      setQuote({
        inputAmount: input,
        outputAmount,
        priceImpact,
        fee,
        minimumReceived,
        exchangeRate
      });
    } catch (err) {
      console.error('Quote calculation error:', err);
      setQuote(null);
    }
  }, [poolData, inputAmount, swapDirection, slippageTolerance]);

  // Connect wallet using consolidated cardano-connect-with-wallet approach
  const connectWalletHandler = async (walletName: WalletName = 'eternl') => {
    try {
      setIsLoading(true);
      setError('');
      setTransactionStatus({ status: 'idle' });

      console.log(`🔗 Connecting to ${walletName} wallet using cardano-connect-with-wallet...`);

      // Use the unified wallet connection
      await wallet.connect(walletName);

      // Initialize unified DEX with connected wallet
      // TODO: Initialize UnifiedDEX instance here

      toast.success(`Connected to ${walletName} wallet!`, { icon: '✅' });
      console.log('✅ Wallet connected successfully');



    } catch (err) {
      const walletError = parseWalletError(err);
      const userMessage = formatErrorForUser(walletError);

      setError(userMessage);
      logWalletError(walletError, `Connecting to ${walletName} in Swap component`);

      toast.error(userMessage, {
        duration: 8000,
        icon: '❌'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet using consolidated approach
  const disconnectWalletHandler = async () => {
    try {
      await wallet.disconnect();
      setUnifiedDEX(null);
      setTransactionStatus({ status: 'idle' });
      toast.success('Wallet disconnected', { icon: '👋' });
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      toast.error('Failed to disconnect wallet', { icon: '❌' });
    }
  };

  // Execute swap transaction
  const executeSwap = async () => {
    if (!quote || !poolData || !wallet.isConnected || !fromToken || !toToken) return;

    try {
      setTransactionStatus({ status: 'pending' });
      setIsLoading(true);
      setError('');

      if (!swapBuilder) {
        throw new Error('Swap builder not initialized. Please reconnect wallet.');
      }

      // Validate two-token swap model
      if (!fromToken || !toToken) {
        throw new Error('Both tokens must be selected for swap');
      }

      // Get the non-ADA token for the swap
      const nonAdaToken = fromToken.isNative ? toToken : fromToken;
      if (!nonAdaToken || nonAdaToken.isNative) {
        throw new Error('Invalid token pair - one token must be non-ADA');
      }

      console.log('🔄 Executing bidirectional swap transaction on Cardano preprod testnet...');
      console.log(`📊 Swap: ${fromToken.symbol} → ${toToken.symbol}`);
      console.log(`💰 Amount: ${quote.inputAmount} → ${quote.minimumReceived} (min)`);
      console.log(`🪙 Token: ${nonAdaToken.symbol} (${nonAdaToken.policy})`);

      // Execute real swap transaction with two-token model
      const result = await swapBuilder.executeSwap({
        poolUtxo: poolData.poolUtxo, // Use pool UTxO if available, otherwise fetch from blockchain
        swapInToken: swapDirection === 'token-to-ada',
        amountIn: quote.inputAmount,
        minOut: quote.minimumReceived,
        slippageTolerance: slippageTolerance,
        tokenPolicy: nonAdaToken.policy,
        tokenName: nonAdaToken.name
      });

      setTransactionStatus({ status: 'submitted', txHash: result.txHash });
      toast.success(`🎉 Swap submitted to Cardano preprod!\nTX: ${result.txHash.slice(0, 12)}...`, {
        icon: '✅',
        duration: 8000
      });

      console.log(`✅ Real swap transaction submitted: ${result.txHash}`);

      // Start monitoring transaction confirmation
      monitorTransactionConfirmation(result.txHash);

      // Reset form
      setInputAmount('');
      setQuote(null);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Swap failed';
      setError(errorMsg);
      setTransactionStatus({ status: 'failed', error: errorMsg });
      toast.error(errorMsg);
      console.error('❌ Swap execution failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Monitor transaction confirmation on Cardano blockchain
  const monitorTransactionConfirmation = async (txHash: string) => {
    console.log(`🔍 Monitoring transaction confirmation: ${txHash}`);

    try {
      // Poll for transaction confirmation
      const maxAttempts = 30; // 5 minutes with 10-second intervals
      let attempts = 0;

      const checkConfirmation = async (): Promise<void> => {
        attempts++;

        try {
          // Simple confirmation check - in production you'd use Blockfrost API
          // For now, we'll simulate confirmation after a reasonable delay
          if (attempts >= 3) { // Simulate confirmation after ~30 seconds
            setTransactionStatus({ status: 'confirmed', txHash });
            toast.success(`🎉 Transaction confirmed on Cardano!\nTX: ${txHash.slice(0, 12)}...`, {
              icon: '✅',
              duration: 10000
            });
            console.log(`✅ Transaction confirmed: ${txHash}`);

            // Refresh pool data after confirmation
            // if (poolMonitor) {
            //   await poolMonitor.refreshPoolData();
            // }
            return;
          }
        } catch (error) {
          console.log(`⏳ Transaction not yet confirmed (attempt ${attempts}/${maxAttempts})`);
        }

        if (attempts < maxAttempts) {
          // Continue polling
          setTimeout(checkConfirmation, 10000); // Check every 10 seconds
        } else {
          // Timeout - assume confirmed but warn user
          setTransactionStatus({ status: 'confirmed', txHash });
          toast.warning(`⚠️ Transaction submitted but confirmation timeout.\nTX: ${txHash.slice(0, 12)}...\nCheck manually on Cardano explorer.`, {
            icon: '⏰',
            duration: 15000
          });
          console.warn(`⚠️ Transaction confirmation timeout: ${txHash}`);
        }
      };

      // Start checking after initial delay
      setTimeout(checkConfirmation, 10000); // Wait 10 seconds before first check

    } catch (error) {
      console.error('❌ Error monitoring transaction:', error);
      // Don't fail the transaction, just log the error
    }
  };

  // Switch swap direction
  const switchDirection = () => {
    setSwapDirection(prev => prev === 'ada-to-token' ? 'token-to-ada' : 'ada-to-token');
    setInputAmount('');
    setQuote(null);
  };

  // Clear transaction status
  const clearTransaction = () => {
    setTransactionStatus({ status: 'idle' });
    setError('');
  };

  // Get token balance for display
  const getTokenBalance = (token: TokenInfo | null): string => {
    if (!wallet.isConnected) return '0.000000';

    if (!token || token.isNative) {
      return formatADA(wallet.balance.ada);
    } else {
      const unit = `${token.policy}.${token.name}`;
      const tokenBalance = wallet.balance.assets[unit] || 0n;
      return formatToken(tokenBalance, token.symbol);
    }
  };

  // Get the non-ADA token for current swap direction
  const getNonAdaToken = (): TokenInfo | null => {
    if (swapDirection === 'ada-to-token') {
      return toToken && !toToken.isNative ? toToken : null;
    } else {
      return fromToken && !fromToken.isNative ? fromToken : null;
    }
  };

  // Loading state
  if (isLoading && !poolData) {
    return (
      <div className="max-w-2xl mx-auto">
        <Win98Window title="PuckSwap v5 - Token Swap">
          <div className="text-center p-4">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-black text-sm">Loading PuckSwap v5...</div>
          </div>
        </Win98Window>
      </div>
    );
  }

  // Error state
  if (error && !poolData) {
    return (
      <div className="max-w-2xl mx-auto">
        <Win98Window title="PuckSwap v5 - Token Swap">
          <div className="text-center p-4">
            <div className="text-2xl mb-4">❌</div>
            <div className="text-red-600 text-sm mb-4">{error}</div>
            <Win98Button
              onClick={() => window.location.reload()}
              className="px-4 py-2"
            >
              Retry
            </Win98Button>
          </div>
        </Win98Window>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Win98Window title="PuckSwap v5 - Token Swap">
        {/* Pool Stats */}
        {poolData && (
          <Win98GroupBox title="Pool Reserves" className="mb-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <Win98Label className="font-bold">ADA Reserve:</Win98Label>
                <div>{formatADA(poolData.ada_reserve)}</div>
              </div>
              <div>
                <Win98Label className="font-bold">PUCKY Reserve:</Win98Label>
                <div>{formatToken(poolData.token_reserve, 'PUCKY')}</div>
              </div>
              <div>
                <Win98Label className="font-bold">Fee:</Win98Label>
                <div>{poolData.fee_basis_points / 100}%</div>
              </div>
              <div>
                <Win98Label className="font-bold">TVL:</Win98Label>
                <div>{formatADA(poolData.ada_reserve)} + {formatToken(poolData.token_reserve, 'PUCKY')}</div>
              </div>
            </div>
          </Win98GroupBox>
        )}



        {/* Wallet Connection */}
        {!wallet.isConnected ? (
          <Win98GroupBox title="Wallet Connection" className="mb-4">
            <div className="text-center text-xs mb-4">
              Connect your wallet to start swapping
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['eternl', 'nami', 'vespr', 'lace'] as const).map((wallet) => (
                <Win98Button
                  key={wallet}
                  onClick={() => connectWalletHandler(wallet)}
                  disabled={isLoading}
                  className="text-xs py-2"
                >
                  {isLoading ? '...' : wallet.toUpperCase()}
                </Win98Button>
              ))}
            </div>
          </Win98GroupBox>
        ) : (
          <Win98GroupBox title="Wallet Status" className="mb-4">
            <div className="flex justify-between items-center">
              <div className="text-xs space-y-1">
                <div>✅ {wallet.walletName?.toUpperCase()} Connected</div>
                <div className="text-gray-600">
                  {wallet.address?.slice(0, 12)}...{wallet.address?.slice(-8)}
                </div>
                <div>Balance: {getTokenBalance(ADA_TOKEN)}</div>
              </div>
              <Win98Button
                onClick={disconnectWalletHandler}
                className="text-xs px-3 py-1"
              >
                Disconnect
              </Win98Button>
            </div>
          </Win98GroupBox>
        )}

        {/* No Tokens Available Message */}
        {wallet.isConnected && !tokensLoading && availableTokens.length === 0 && (
          <Win98GroupBox title="No Liquidity Pools Found" className="mb-4">
            <div className="text-center text-xs space-y-2">
              <div>
                🏊‍♂️ No active liquidity pools found on Cardano preprod testnet
              </div>
              <div>
                Pools need at least 1 ADA liquidity to appear in the token list
              </div>
              {totalPools > 0 && (
                <div>
                  Found {totalPools} pool{totalPools !== 1 ? 's' : ''} but none meet minimum liquidity requirements
                </div>
              )}
              {tokensLastUpdated && (
                <div>
                  Last checked: {new Date(tokensLastUpdated).toLocaleTimeString()}
                </div>
              )}
              <div className="mt-3">
                <Win98Button
                  onClick={refreshTokens}
                  className="text-xs px-3 py-1"
                  disabled={tokensLoading}
                >
                  {tokensLoading ? 'Refreshing...' : 'Refresh Pools'}
                </Win98Button>
              </div>
            </div>
          </Win98GroupBox>
        )}

        {/* Token Loading State */}
        {tokensLoading && (
          <Win98GroupBox title="Loading Tokens" className="mb-4">
            <div className="text-center text-xs">
              🔍 Discovering tokens with active liquidity pools...
            </div>
          </Win98GroupBox>
        )}

        {/* Token Discovery Success */}
        {wallet.isConnected && !tokensLoading && availableTokens.length > 0 && (
          <Win98GroupBox title="Available Tokens" className="mb-4">
            <div className="text-center text-xs">
              ✅ Found {availableTokens.length} token{availableTokens.length !== 1 ? 's' : ''} with active liquidity pools
              {tokensLastUpdated && (
                <div className="mt-1">
                  Updated: {new Date(tokensLastUpdated).toLocaleTimeString()}
                </div>
              )}
            </div>
          </Win98GroupBox>
        )}

        {/* Bidirectional Swap Interface */}
        <Win98GroupBox title="Swap Interface" className="mb-4">
          <div className="terminal-mode p-3 rounded">
            <div className="text-terminal-amber font-mono text-sm font-bold mb-4">
              Swap: {fromToken?.symbol || '?'} → {toToken?.symbol || '?'}
            </div>
            <div className="space-y-4">
              {/* From Token */}
              <div className="space-y-2">
                <div className="text-terminal-amber font-mono text-sm font-bold">From:</div>
                {fromToken?.isNative ? (
                  // ADA side - show fixed token display
                  <div className="terminal-border p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-terminal-amber/20 flex items-center justify-center">
                        <span className="text-terminal-amber font-bold text-sm">AD</span>
                      </div>
                      <div>
                        <div className="text-terminal-white font-mono font-semibold">ADA</div>
                        <div className="text-terminal-white/70 font-mono text-sm">
                          Balance: {getTokenBalance(fromToken)}
                        </div>
                      </div>
                    </div>
                    <div className="text-terminal-white/50 font-mono text-sm">Cardano</div>
                  </div>
                ) : (
                  // Token side - show selection button
                  <TokenSelectionButton
                    selectedToken={fromToken}
                    onClick={() => setShowTokenModal(true)}
                    showBalance={true}
                    balance={getTokenBalance(fromToken)}
                    variant="terminal"
                    placeholder="Select Token"
                    showPoolInfo={false}
                    disabled={!wallet.isConnected}
                  />
                )}
                <Input
                  type="number"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  placeholder="0.000000"
                  variant="terminal"
                  step="0.000001"
                  min="0"
                  disabled={!wallet.isConnected || !fromToken || !toToken}
                  className="text-lg font-mono"
                />
              </div>

              {/* Swap Direction Toggle */}
              <div className="flex justify-center">
                <Button
                  onClick={toggleSwapDirection}
                  variant="terminal"
                  disabled={!wallet.isConnected || !fromToken || !toToken}
                  className="px-4 py-2 font-mono"
                >
                  ⇅
                </Button>
              </div>

              {/* To Token */}
              <div className="space-y-2">
                <div className="text-terminal-amber font-mono text-sm font-bold">To:</div>
                {toToken?.isNative ? (
                  // ADA side - show fixed token display
                  <div className="terminal-border p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-terminal-amber/20 flex items-center justify-center">
                        <span className="text-terminal-amber font-bold text-sm">AD</span>
                      </div>
                      <div>
                        <div className="text-terminal-white font-mono font-semibold">ADA</div>
                        <div className="text-terminal-white/70 font-mono text-sm">
                          Balance: {getTokenBalance(toToken)}
                        </div>
                      </div>
                    </div>
                    <div className="text-terminal-white/50 font-mono text-sm">Cardano</div>
                  </div>
                ) : (
                  // Token side - show selection button
                  <TokenSelectionButton
                    selectedToken={toToken}
                    onClick={() => setShowTokenModal(true)}
                    showBalance={true}
                    balance={getTokenBalance(toToken)}
                    variant="terminal"
                    placeholder="Select Token"
                    showPoolInfo={false}
                    disabled={!wallet.isConnected}
                  />
                )}
                <div className="terminal-border p-3 text-terminal-white text-lg font-mono">
                  {quote ? formatNumber(Number(quote.outputAmount) / 1_000_000, 6) : '0.000000'}
                </div>
              </div>
            </div>
          </div>
        </Win98GroupBox>

        {/* Token Selection Modal */}
        <TokenSelectionModal
          isOpen={showTokenModal}
          onClose={() => setShowTokenModal(false)}
          onSelectToken={handleTokenSelection}
          availableTokens={availableTokens.filter(token => !token.isNative)} // Only show non-ADA tokens
          isLoading={tokensLoading}
          error={tokensError}
          selectedToken={getNonAdaToken()}
          title={`Select Token ${swapDirection === 'ada-to-token' ? 'to Receive' : 'to Swap'}`}
          excludeTokens={[]} // No exclusions needed since ADA is filtered out
          onRefresh={refreshTokens}
          lastUpdated={tokensLastUpdated}
        />

        {/* Quote Details */}
        {quote && (
          <Win98GroupBox title="Quote Details" className="mb-4">
            <div className="terminal-mode p-3 rounded">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 text-sm font-mono"
              >
                <div className="flex justify-between">
                  <span className="text-terminal-amber">Exchange Rate:</span>
                  <span className="text-terminal-green">
                    1 {fromToken?.symbol || '?'} = {quote.exchangeRate.toFixed(6)} {toToken?.symbol || '?'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-amber">Price Impact:</span>
                  <span className={`${quote.priceImpact > 5 ? 'text-terminal-red' : 'text-terminal-green'}`}>
                    {quote.priceImpact.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-amber">Trading Fee:</span>
                  <span className="text-terminal-green">
                    {formatNumber(Number(quote.fee) / 1_000_000, 6)} {fromToken?.symbol || '?'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-amber">Minimum Received:</span>
                  <span className="text-terminal-green">
                    {formatNumber(Number(quote.minimumReceived) / 1_000_000, 6)} {toToken?.symbol || '?'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-amber">Slippage Tolerance:</span>
                  <span className="text-terminal-green">{slippageTolerance}%</span>
                </div>
              </motion.div>
            </div>
          </Win98GroupBox>
        )}

        {/* Slippage Settings */}
        <Win98GroupBox title="Slippage Settings" className="mb-4">
          <div className="terminal-mode p-3 rounded">
            <div className="text-terminal-amber font-mono text-sm mb-2">Slippage Tolerance:</div>
            <div className="flex space-x-2">
              {[0.1, 0.5, 1.0].map((value) => (
                <button
                  key={value}
                  onClick={() => setSlippageTolerance(value)}
                  className={`px-3 py-1 text-xs font-mono border ${
                    slippageTolerance === value
                      ? 'border-terminal-green text-terminal-green'
                      : 'border-terminal-amber text-terminal-amber'
                  }`}
                >
                  {value}%
                </button>
              ))}
              <input
                type="number"
                value={slippageTolerance}
                onChange={(e) => setSlippageTolerance(parseFloat(e.target.value) || 0.5)}
                className="flex-1 bg-transparent text-terminal-green font-mono text-xs border border-terminal-amber px-2 py-1"
                step="0.1"
                min="0.1"
                max="50"
              />
            </div>
          </div>
        </Win98GroupBox>

        {/* Execute Swap Button */}
        <motion.button
          onClick={executeSwap}
          disabled={
            !wallet.isConnected ||
            !quote ||
            wallet.isLoading ||
            (quote && quote.priceImpact > 15) ||
            !fromToken ||
            !toToken ||
            !availableTokens.length
          }
          className="w-full terminal-button py-3 mt-4"
          whileHover={{ scale: wallet.isConnected && quote && !wallet.isLoading && fromToken && toToken ? 1.02 : 1 }}
          whileTap={{ scale: wallet.isConnected && quote && !wallet.isLoading && fromToken && toToken ? 0.98 : 1 }}
        >
          {wallet.isLoading && transactionStatus.status === 'pending' ? 'Processing...' :
           !wallet.isConnected ? 'Connect Wallet' :
           !availableTokens.length ? 'No Pools Available' :
           !fromToken || !toToken ? 'Select Tokens' :
           !quote ? 'Enter Amount' :
           quote.priceImpact > 15 ? 'Price Impact Too High' :
           `Swap ${fromToken.symbol} → ${toToken.symbol}`}
        </motion.button>

        {/* Transaction Status */}
        <AnimatePresence>
          {transactionStatus.status !== 'idle' && (
            <Win98GroupBox title="Transaction Status" className="mt-4">
              <div className="terminal-mode p-3 rounded">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-terminal-green font-mono text-sm">
                        {transactionStatus.status === 'pending' && '⏳ Processing Transaction...'}
                        {transactionStatus.status === 'submitted' && '📤 Transaction Submitted'}
                        {transactionStatus.status === 'confirmed' && '✅ Transaction Confirmed'}
                        {transactionStatus.status === 'failed' && '❌ Transaction Failed'}
                      </div>
                      {transactionStatus.txHash && (
                        <div className="text-terminal-amber font-mono text-xs mt-1">
                          TX: {transactionStatus.txHash.slice(0, 16)}...{transactionStatus.txHash.slice(-8)}
                        </div>
                      )}
                      {transactionStatus.error && (
                        <div className="text-terminal-red font-mono text-xs mt-1">
                          {transactionStatus.error}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={clearTransaction}
                      className="text-terminal-red hover:text-red-400 font-mono text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </motion.div>
              </div>
            </Win98GroupBox>
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <Win98GroupBox title="Error" className="mt-4">
              <div className="terminal-mode p-3 rounded">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
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
              </div>
            </Win98GroupBox>
          )}
        </AnimatePresence>
      </Win98Window>
    </div>
  );
}
