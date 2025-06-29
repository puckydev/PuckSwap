'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { formatNumber, formatADA, formatToken } from '../lib/format-utils';
import {
  validateWalletForTransaction,
  type ConnectedWalletState
} from '../lib/wallet-integration';
import { getPuckSwapEnvironmentConfig } from '../config/env';

// Lazy imports to avoid SSR issues with WASM
let PuckSwapSwapBuilder: any;
let loadContractAddressesAsync: any;
let WalletConnection: any;

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

export default function SwapV5() {
  const [isClient, setIsClient] = useState(false);
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [swapDirection, setSwapDirection] = useState<'ada-to-token' | 'token-to-ada'>('ada-to-token');
  const [inputAmount, setInputAmount] = useState<string>('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWalletState | null>(null);
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [swapBuilder, setSwapBuilder] = useState<any | null>(null);
  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5);
  const [walletConnectionLoaded, setWalletConnectionLoaded] = useState(false);

  // Handle client-side only initialization
  useEffect(() => {
    setIsClient(true);
    
    // Dynamic imports for WASM modules
    const loadModules = async () => {
      try {
        const [swapModule, contractModule, walletModule] = await Promise.all([
          import('../lucid/swap'),
          import('../lucid/utils/contractAddresses'),
          import('./WalletConnection')
        ]);
        
        PuckSwapSwapBuilder = swapModule.PuckSwapSwapBuilder;
        loadContractAddressesAsync = contractModule.loadContractAddressesAsync;
        WalletConnection = walletModule.default;
        
        setWalletConnectionLoaded(true);
      } catch (error) {
        console.error('Failed to load modules:', error);
        setError('Failed to initialize swap components');
      }
    };
    
    if (typeof window !== 'undefined') {
      loadModules();
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      loadPoolData();
    }
  }, [isClient]);

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
      setError('');

      // TODO: Replace with actual pool discovery
      // For now, using hardcoded ADA/PUCKY pool data for testnet
      const poolData: PoolData = {
        adaReserve: BigInt(1000000000000), // 1M ADA
        tokenReserve: BigInt(23019520000000), // 23M PUCKY
        tokenPolicy: '4582f907ce19c519d140253bda452e44fa0b76b24902c4e99a334d78',
        tokenName: '5075636b79', // "Pucky" in hex
        feeBps: 30, // 0.3%
        totalLiquidity: BigInt(1000000000000),
        price: 23.01952,
        poolUtxo: null // Will be fetched from blockchain
      };

      setPoolData(poolData);
      console.log('✅ Pool data loaded for testnet');

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load pool data';
      setError(errorMsg);
      console.error('❌ Pool data loading error:', err);
      toast.error('Failed to load pool data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSwapBuilder = async () => {
    if (!connectedWallet?.lucid || !PuckSwapSwapBuilder || !loadContractAddressesAsync) return;

    try {
      console.log('🔄 Initializing PuckSwap builder...');

      // Load contract addresses
      const deployment = await loadContractAddressesAsync();

      // Create swap builder with real validator
      const builder = new PuckSwapSwapBuilder(
        connectedWallet.lucid,
        {
          type: "PlutusV2",
          script: deployment.addresses.validators.swap
        }
      );

      setSwapBuilder(builder);
      console.log('✅ PuckSwap builder initialized');

    } catch (error) {
      console.error('❌ Failed to initialize swap builder:', error);
      setError('Failed to initialize swap builder');
      toast.error('Failed to initialize swap functionality');
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

  const handleWalletConnected = async (walletState: ConnectedWalletState) => {
    try {
      setIsLoading(true);
      setError('');

      setConnectedWallet(walletState);
      await initializeSwapBuilder();

      toast.success('Wallet connected successfully!');

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to setup swap builder';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('❌ Wallet connection failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletDisconnected = () => {
    setConnectedWallet(null);
    setSwapBuilder(null);
    setTxHash('');
    setError('');
    console.log('🔌 Wallet disconnected');
  };

  const executeSwap = async () => {
    if (!quote || !poolData || !connectedWallet || !swapBuilder) {
      toast.error('Please connect wallet and enter amount');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Validate wallet is ready
      validateWalletForTransaction(connectedWallet);

      console.log('🔄 Executing swap on Cardano preprod testnet...');

      // TODO: Implement actual swap transaction
      // For now, showing the flow
      toast.info('Swap functionality coming soon! Contract addresses are ready.');
      
      // This is where the actual swap would happen:
      // const result = await swapBuilder.executeSwap({
      //   poolUtxo: poolData.poolUtxo,
      //   swapInToken: swapDirection === 'token-to-ada',
      //   amountIn: quote.inputAmount,
      //   minOut: quote.minimumReceived,
      //   slippageTolerance: slippageTolerance
      // });

      // Simulate for now
      const mockTxHash = `testnet_tx_${Date.now()}`;
      setTxHash(mockTxHash);

      toast.success(`Swap would be submitted to preprod testnet!`, {
        duration: 8000
      });

      setInputAmount('');
      setQuote(null);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Swap failed';
      setError(errorMsg);
      toast.error(`Swap failed: ${errorMsg}`);
      console.error('❌ Swap execution failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const switchDirection = () => {
    setSwapDirection(prev => prev === 'ada-to-token' ? 'token-to-ada' : 'ada-to-token');
    setInputAmount('');
    setQuote(null);
  };

  // Show loading state during SSR
  if (!isClient) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-8"></div>
          <div className="space-y-4">
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Swap
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Trade tokens on Cardano preprod testnet
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Wallet Connection */}
      <div className="mb-6">
        {walletConnectionLoaded && WalletConnection ? (
          <WalletConnection
            onWalletConnected={handleWalletConnected}
            onWalletDisconnected={handleWalletDisconnected}
            connectedWallet={connectedWallet}
            isLoading={isLoading}
          />
        ) : (
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse">
            <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded"></div>
          </div>
        )}
      </div>

      {/* Swap Interface */}
      <div className="space-y-4">
        {/* From Token */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">From</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {swapDirection === 'ada-to-token' ? 'ADA' : 'PUCKY'}
            </span>
          </div>
          <input
            type="number"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            placeholder="0.0"
            className="w-full bg-transparent text-2xl font-medium text-gray-900 dark:text-white outline-none"
            disabled={!connectedWallet}
          />
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center">
          <button
            onClick={switchDirection}
            className="p-2 bg-gray-200 dark:bg-gray-600 rounded-full hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            disabled={!connectedWallet}
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* To Token */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">To</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {swapDirection === 'ada-to-token' ? 'PUCKY' : 'ADA'}
            </span>
          </div>
          <div className="text-2xl font-medium text-gray-900 dark:text-white">
            {quote ? formatNumber(Number(quote.outputAmount) / 1_000_000, 6) : '0.0'}
          </div>
        </div>

        {/* Quote Details */}
        {quote && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Price Impact</span>
              <span className={`font-medium ${quote.priceImpact > 5 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                {quote.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Fee</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatNumber(Number(quote.fee) / 1_000_000, 6)} {swapDirection === 'ada-to-token' ? 'ADA' : 'PUCKY'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Min Received</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatNumber(Number(quote.minimumReceived) / 1_000_000, 6)}
              </span>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <button
          onClick={executeSwap}
          disabled={!connectedWallet || !quote || isLoading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 
           !connectedWallet ? 'Connect Wallet' :
           !quote ? 'Enter Amount' : 'Swap'}
        </button>

        {/* Transaction Hash */}
        {txHash && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-400">
              Transaction submitted!
            </p>
            <a
              href={`https://preprod.cardanoscan.io/transaction/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
            >
              {txHash}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
