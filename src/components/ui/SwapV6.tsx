'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { ArrowUpDown, Settings, Info, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  detectAvailableWallets,
  connectToWallet,
  disconnectWallet,
  formatWalletAddress,
  type ConnectedWalletState
} from '@/lib/wallet-integration';

interface PoolData {
  adaReserve: bigint;
  tokenReserve: bigint;
  tokenPolicy: string;
  tokenName: string;
  feeBps: number;
  totalLiquidity: bigint;
  price: number;
  poolUtxo?: any;
}

interface SwapQuote {
  inputAmount: bigint;
  outputAmount: bigint;
  priceImpact: number;
  fee: bigint;
  minimumReceived: bigint;
}

interface SwapV6Props {
  connectedWallet?: ConnectedWalletState | null;
  onWalletConnect?: (wallet: ConnectedWalletState) => void;
  onWalletDisconnect?: () => void;
}

export default function SwapV6({
  connectedWallet,
  onWalletConnect,
  onWalletDisconnect
}: SwapV6Props) {
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [swapDirection, setSwapDirection] = useState<'ada-to-token' | 'token-to-ada'>('ada-to-token');
  const [inputAmount, setInputAmount] = useState<string>('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5);
  const [availableWallets, setAvailableWallets] = useState<any[]>([]);
  const [showWalletSelector, setShowWalletSelector] = useState(false);

  // Mock pool data for demo
  const mockPoolData: PoolData = {
    adaReserve: 1000000000000n, // 1M ADA
    tokenReserve: 23019520000000000n, // 23.01952M PUCKY (100 ADA = 2,301,952 PUCKY)
    tokenPolicy: 'a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef01',
    tokenName: 'PUCKY',
    feeBps: 30, // 0.3%
    totalLiquidity: 4796158000000n,
    price: 23019.52, // 23,019.52 PUCKY per ADA
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
    loadPoolData();
    loadAvailableWallets();
  }, []);

  const loadAvailableWallets = async () => {
    try {
      const wallets = await detectAvailableWallets();
      setAvailableWallets(wallets.filter(w => w.isInstalled));
    } catch (error) {
      console.error('Failed to detect wallets:', error);
    }
  };

  useEffect(() => {
    if (inputAmount && poolData) {
      calculateQuote();
    } else {
      setQuote(null);
    }
  }, [inputAmount, swapDirection, poolData, slippageTolerance]);

  const loadPoolData = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with real pool data fetching from Context7/Blockfrost
      // For now, use mock data until real pool monitoring is implemented
      setPoolData(mockPoolData);
    } catch (err) {
      setError('Failed to load pool data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateQuote = () => {
    if (!poolData || !inputAmount) return;

    try {
      const input = BigInt(Math.floor(parseFloat(inputAmount) * 1_000_000));
      if (input <= 0n) return;

      const { adaReserve, tokenReserve, feeBps } = poolData;
      
      // Calculate fee
      const fee = (input * BigInt(feeBps)) / 10000n;
      const netInput = input - fee;
      
      let outputAmount: bigint;
      let newAdaReserve: bigint;
      let newTokenReserve: bigint;
      
      if (swapDirection === 'ada-to-token') {
        outputAmount = (tokenReserve * netInput) / (adaReserve + netInput);
        newAdaReserve = adaReserve + input;
        newTokenReserve = tokenReserve - outputAmount;
      } else {
        outputAmount = (adaReserve * netInput) / (tokenReserve + netInput);
        newAdaReserve = adaReserve - outputAmount;
        newTokenReserve = tokenReserve + input;
      }
      
      // Calculate price impact
      const oldPrice = Number(adaReserve) / Number(tokenReserve);
      const newPrice = Number(newAdaReserve) / Number(newTokenReserve);
      const priceImpact = Math.abs((newPrice - oldPrice) / oldPrice) * 100;
      
      // Calculate minimum received with slippage tolerance
      const minimumReceived = (outputAmount * BigInt(Math.floor((100 - slippageTolerance) * 10))) / 1000n;
      
      setQuote({
        inputAmount: input,
        outputAmount,
        priceImpact,
        fee,
        minimumReceived
      });
    } catch (err) {
      console.error('Quote calculation error:', err);
      setQuote(null);
    }
  };

  const handleWalletConnect = async (walletName: string) => {
    try {
      setIsLoading(true);
      setError('');

      const walletState = await connectToWallet(walletName);
      onWalletConnect?.(walletState);
      setShowWalletSelector(false);

      toast('Wallet connected successfully!', {
        icon: '✅',
        style: {
          background: '#333',
          color: '#fff',
        }
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletDisconnect = () => {
    disconnectWallet();
    onWalletDisconnect?.();
    toast('Wallet disconnected', {
      icon: '🔌',
      style: {
        background: '#333',
        color: '#fff',
      }
    });
  };

  const executeSwap = async () => {
    if (!quote || !poolData || !connectedWallet) return;

    try {
      setIsLoading(true);
      setError('');

      // TODO: Implement real swap transaction using Lucid Evolution
      // This is a placeholder - real implementation would use PuckSwapSwapBuilder
      console.log('🔄 Executing real swap transaction on Cardano preprod testnet...');
      console.log(`📊 Swap: ${quote.inputAmount} → ${quote.outputAmount}`);

      // For now, throw an error to indicate this needs real implementation
      throw new Error('SwapV6 component needs real transaction implementation. Use SwapV5 component instead.');

      setInputAmount('');
      setQuote(null);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Swap failed';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const switchDirection = () => {
    setSwapDirection(prev => prev === 'ada-to-token' ? 'token-to-ada' : 'ada-to-token');
    setInputAmount('');
    setQuote(null);
  };

  const clearTransaction = () => {
    setTxHash('');
    setError('');
  };

  if (!poolData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            {isLoading ? 'Loading pool data...' : 'Pool data unavailable'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Swap</CardTitle>
              <CardDescription>
                Trade tokens instantly
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>

        </CardHeader>
      </Card>



      {/* Main Swap Card */}
      <Card>
        <CardContent className="p-6 space-y-4">


          {/* From Token */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">From</Label>
            <div className="relative">
              <Input
                type="number"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                placeholder="0.0"
                className="pr-20 text-lg h-12"
                step="0.000001"
                min="0"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Badge variant="secondary">
                  {swapDirection === 'ada-to-token' ? 'ADA' : poolData.tokenName}
                </Badge>
              </div>
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className="flex justify-center">
            <Button
              onClick={switchDirection}
              variant="outline"
              size="icon"
              className="rounded-full"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          {/* To Token */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">To</Label>
            <div className="relative">
              <div className="flex h-12 w-full rounded-2xl border border-input bg-muted px-3 py-2 text-lg items-center justify-between">
                <span className="text-muted-foreground">
                  {quote ? (Number(quote.outputAmount) / 1_000_000).toFixed(6) : '0.0'}
                </span>
                <Badge variant="secondary">
                  {swapDirection === 'ada-to-token' ? poolData.tokenName : 'ADA'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Quote Details */}
          {quote && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 p-4 bg-muted/50 rounded-2xl"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Price Impact</span>
                <span className={cn(
                  "font-medium",
                  quote.priceImpact > 5 ? "text-destructive" : "text-foreground"
                )}>
                  {quote.priceImpact.toFixed(2)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Trading Fee</span>
                <span className="font-medium">
                  {(Number(quote.fee) / 1_000_000).toFixed(6)} {swapDirection === 'ada-to-token' ? 'ADA' : poolData.tokenName}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Minimum Received</span>
                <span className="font-medium">
                  {(Number(quote.minimumReceived) / 1_000_000).toFixed(6)} {swapDirection === 'ada-to-token' ? poolData.tokenName : 'ADA'}
                </span>
              </div>

              {quote.priceImpact > 5 && (
                <div className="flex items-center space-x-2 text-sm text-destructive">
                  <Info className="h-4 w-4" />
                  <span>High price impact warning</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Action Section */}
          {!connectedWallet ? (
            <div className="space-y-3">
              {!showWalletSelector ? (
                <Button
                  onClick={() => setShowWalletSelector(true)}
                  disabled={isLoading || availableWallets.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : availableWallets.length === 0 ? (
                    'No Wallets Detected'
                  ) : (
                    'Connect Wallet'
                  )}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Select Wallet</span>
                    <Button
                      onClick={() => setShowWalletSelector(false)}
                      variant="ghost"
                      size="sm"
                    >
                      ✕
                    </Button>
                  </div>
                  {availableWallets.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      <div>No Cardano wallets detected</div>
                      <div className="text-xs mt-1">
                        Please install Eternl, Vespr, Lace, or another CIP-30 wallet
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableWallets.map((wallet) => (
                        <Button
                          key={wallet.name}
                          onClick={() => handleWalletConnect(wallet.name)}
                          disabled={isLoading}
                          variant="outline"
                          className="w-full justify-start"
                        >
                          <div className="flex items-center space-x-3">
                            {wallet.icon.startsWith('/') ? (
                              <img
                                src={wallet.icon}
                                alt={wallet.displayName}
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <span className="text-lg">{wallet.icon}</span>
                            )}
                            <span>{wallet.displayName}</span>
                            {wallet.isInstalled && (
                              <Badge variant="secondary" className="ml-auto text-xs">
                                Installed
                              </Badge>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Token Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Token Pair</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={swapDirection === 'ada-to-token' ? 'default' : 'outline'}
                    onClick={() => setSwapDirection('ada-to-token')}
                    className="text-sm"
                  >
                    ADA → PUCKY
                  </Button>
                  <Button
                    variant={swapDirection === 'token-to-ada' ? 'default' : 'outline'}
                    onClick={() => setSwapDirection('token-to-ada')}
                    className="text-sm"
                  >
                    PUCKY → ADA
                  </Button>
                </div>
              </div>

              {/* Execute Swap Button */}
              <Button
                onClick={executeSwap}
                disabled={isLoading || !quote || (quote && quote.priceImpact > 15)}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : !quote ? (
                  'Enter Amount'
                ) : quote.priceImpact > 15 ? (
                  'Price Impact Too High'
                ) : (
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4" />
                    <span>Swap</span>
                  </div>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Result */}
      <AnimatePresence>
        {txHash && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Transaction Submitted</span>
                  </div>
                  <Button
                    onClick={clearTransaction}
                    variant="ghost"
                    size="sm"
                  >
                    ✕
                  </Button>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  TX: {txHash.slice(0, 16)}...{txHash.slice(-8)}
                </div>
              </CardContent>
            </Card>
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
          >
            <Card className="border-destructive">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-destructive">
                    <Info className="h-4 w-4" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                  <Button
                    onClick={() => setError('')}
                    variant="ghost"
                    size="sm"
                  >
                    ✕
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
