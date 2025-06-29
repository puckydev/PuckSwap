'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { PuckSwapV2, PoolState, SwapParams } from '../lib/puckswap-v2';
import { createPoolMonitor, PuckSwapPoolMonitor } from '../lib/pool-monitor-v2';

export default function SwapV2() {
  const [dex, setDex] = useState<PuckSwapV2 | null>(null);
  const [monitor, setMonitor] = useState<PuckSwapPoolMonitor | null>(null);
  const [poolState, setPoolState] = useState<PoolState | null>(null);
  const [inputAmount, setInputAmount] = useState<string>('');
  const [outputAmount, setOutputAmount] = useState<string>('');
  const [priceImpact, setPriceImpact] = useState<number>(0);
  const [swapInToken, setSwapInToken] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Mock token for testing
  const MOCK_TOKEN = {
    policy: 'mock_policy_id_v2',
    name: 'PUCKY'
  };

  // Initialize DEX and monitoring
  useEffect(() => {
    const initializeV2 = async () => {
      try {
        // Real initialization
        const dexInstance = await PuckSwapV2.create(
          process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || '',
          'placeholder_swap_validator_cbor', // Would load from artifacts
          process.env.NEXT_PUBLIC_NETWORK as any
        );
        setDex(dexInstance);
        console.log('🔄 PuckSwap V2 initialized on Cardano preprod testnet');

        // Initialize pool monitoring
        const monitorInstance = await createPoolMonitor(
          process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || '',
          process.env.NEXT_PUBLIC_NETWORK as any
        );
        setMonitor(monitorInstance);

        // Subscribe to pool updates
        const poolAddress = dexInstance.getPoolAddress();
        await monitorInstance.subscribeToPool(poolAddress, MOCK_TOKEN.policy, MOCK_TOKEN.name);

        // Listen for pool state changes
        monitorInstance.addPoolStateListener(MOCK_TOKEN.policy, MOCK_TOKEN.name, (newState) => {
          setPoolState(newState);
          toast.success('Pool state updated!', { icon: '🔄' });
        });

        // Get initial pool state
        const state = await dexInstance.getPoolState(MOCK_TOKEN.policy, MOCK_TOKEN.name);
        setPoolState(state);
      } catch (err) {
        setError('Failed to initialize DEX V2: ' + (err as Error).message);
      }
    };

    initializeV2();

    // Cleanup on unmount
    return () => {
      if (monitor) {
        monitor.destroy();
      }
    };
  }, []);

  // Calculate output when input changes
  useEffect(() => {
    if (!poolState || !inputAmount || parseFloat(inputAmount) <= 0) {
      setOutputAmount('');
      setPriceImpact(0);
      return;
    }

    try {
      const amountIn = BigInt(Math.floor(parseFloat(inputAmount) * 1_000_000));
      
      const swapParams: SwapParams = {
        swapInToken,
        amountIn,
        minOut: 0n // Will be calculated
      };

      // Use V2 calculation (matches Aiken exactly)
      const { outputAmount: outputBigInt, priceImpact: impact } = calculateSwapOutputV2(
        poolState,
        swapParams
      );

      setOutputAmount((Number(outputBigInt) / 1_000_000).toFixed(6));
      setPriceImpact(impact);
    } catch (err) {
      setError('Calculation error: ' + (err as Error).message);
    }
  }, [inputAmount, swapInToken, poolState]);

  // V2 calculation function (matches Aiken exactly)
  const calculateSwapOutputV2 = (
    poolState: PoolState,
    swapParams: SwapParams
  ): { outputAmount: bigint; priceImpact: number } => {
    const { adaReserve, tokenReserve } = poolState;
    const { swapInToken, amountIn } = swapParams;

    // Uniswap-style fee: 0.3% = 997/1000 after fee (matches Aiken)
    const feeNumerator = 997n;
    const feeDenominator = 1000n;
    const amountInWithFee = amountIn * feeNumerator;

    let outputAmount: bigint;
    let newAdaReserve: bigint;
    let newTokenReserve: bigint;

    if (swapInToken) {
      // Token -> ADA swap
      const numerator = amountInWithFee * adaReserve;
      const denominator = (tokenReserve * feeDenominator) + amountInWithFee;
      outputAmount = numerator / denominator;
      
      newAdaReserve = adaReserve - outputAmount;
      newTokenReserve = tokenReserve + amountIn;
    } else {
      // ADA -> Token swap
      const numerator = amountInWithFee * tokenReserve;
      const denominator = (adaReserve * feeDenominator) + amountInWithFee;
      outputAmount = numerator / denominator;
      
      newAdaReserve = adaReserve + amountIn;
      newTokenReserve = tokenReserve - outputAmount;
    }

    // Calculate price impact
    const oldPrice = Number(tokenReserve) / Number(adaReserve);
    const newPrice = Number(newTokenReserve) / Number(newAdaReserve);
    const priceImpact = Math.abs((newPrice - oldPrice) / oldPrice) * 100;

    return { outputAmount, priceImpact };
  };

  const handleConnectWallet = async () => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      setIsConnected(true);
      toast.success('Connected to demo wallet', { icon: '🔗' });
      return;
    }

    if (!dex) {
      setError('DEX not initialized');
      return;
    }

    try {
      await dex.connectWallet('eternl'); // Default to Eternl
      setIsConnected(true);
      toast.success('Wallet connected!', { icon: '🔗' });
    } catch (err) {
      setError('Failed to connect wallet: ' + (err as Error).message);
    }
  };

  const handleSwap = async () => {
    if (!poolState || !inputAmount || !outputAmount) {
      setError('Please enter valid amounts');
      return;
    }

    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (!dex) {
        throw new Error('DEX not initialized. Please refresh the page.');
      }

      console.log('🔄 Executing real swap transaction on Cardano preprod testnet...');

      // Real swap execution
      const swapParams: SwapParams = {
        swapInToken,
        amountIn: BigInt(Math.floor(parseFloat(inputAmount) * 1_000_000)),
        minOut: BigInt(Math.floor(parseFloat(outputAmount) * 0.99 * 1_000_000)) // 1% slippage
      };

      const txHash = await dex.executeSwap(MOCK_TOKEN.policy, MOCK_TOKEN.name, swapParams);

      toast.success(`🎉 Swap submitted to Cardano preprod testnet!\nTX: ${txHash.slice(0, 12)}...`, {
        duration: 10000,
        icon: '✅'
      });

      console.log(`✅ Swap transaction submitted: ${txHash}`);

      // Reset form
      setInputAmount('');
      setOutputAmount('');
      setPriceImpact(0);
    } catch (err) {
      setError('Swap failed: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenSwitch = () => {
    setSwapInToken(!swapInToken);
    setInputAmount(outputAmount);
    setOutputAmount(inputAmount);
  };

  if (!poolState) {
    return (
      <div className="terminal-card p-6 max-w-md mx-auto">
        <div className="text-center">
          <div className="text-terminal-green font-mono">Loading PuckSwap V2...</div>
          {error && <div className="text-terminal-red font-mono mt-2">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-card p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-terminal text-terminal-green text-glow">
          PUCKSWAP_V2
        </h2>
        <div className="text-xs font-mono text-terminal-amber bg-terminal-amber/10 px-2 py-1 rounded border border-terminal-amber/30">
          AMM_PROTOCOL
        </div>
      </div>

      {/* Pool Info */}
      <div className="mb-4 p-3 bg-terminal-bg-light rounded border border-terminal/30">
        <div className="text-xs font-mono text-terminal-gray mb-1">Pool Reserves:</div>
        <div className="flex justify-between text-sm font-mono">
          <span className="text-terminal-green">
            {(Number(poolState.adaReserve) / 1_000_000).toFixed(2)} ADA
          </span>
          <span className="text-terminal-amber">
            {(Number(poolState.tokenReserve) / 1_000_000).toFixed(2)} PUCKY
          </span>
        </div>
        <div className="text-xs font-mono text-terminal-gray mt-1">
          Price: {poolState.price.toFixed(4)} PUCKY/ADA
        </div>
      </div>

      {/* Wallet Connection */}
      {!isConnected && (
        <div className="mb-4">
          <button
            onClick={handleConnectWallet}
            className="w-full terminal-button py-3 rounded font-mono"
          >
            CONNECT_WALLET
          </button>
        </div>
      )}

      {/* Input */}
      <div className="mb-4">
        <label className="text-sm font-mono text-terminal-green mb-2 block">
          From: {swapInToken ? 'PUCKY' : 'ADA'}
        </label>
        <input
          type="number"
          value={inputAmount}
          onChange={(e) => setInputAmount(e.target.value)}
          placeholder="0.000000"
          className="w-full terminal-input p-3 rounded font-mono"
          step="0.000001"
          disabled={!isConnected}
        />
      </div>

      {/* Switch Button */}
      <div className="flex justify-center mb-4">
        <motion.button
          onClick={handleTokenSwitch}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-10 h-10 terminal-button rounded-full flex items-center justify-center"
          disabled={!isConnected}
        >
          ⇅
        </motion.button>
      </div>

      {/* Output */}
      <div className="mb-4">
        <label className="text-sm font-mono text-terminal-green mb-2 block">
          To: {swapInToken ? 'ADA' : 'PUCKY'}
        </label>
        <input
          type="number"
          value={outputAmount}
          readOnly
          placeholder="0.000000"
          className="w-full terminal-input p-3 rounded font-mono bg-terminal-bg/50"
        />
      </div>

      {/* Price Impact */}
      {priceImpact > 0 && (
        <div className="mb-4 p-3 bg-terminal-bg-light rounded border border-terminal/30">
          <div className="flex justify-between text-sm font-mono">
            <span className="text-terminal-gray">Price Impact:</span>
            <span className={`${priceImpact > 5 ? 'text-terminal-red' : 'text-terminal-green'}`}>
              {priceImpact.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between text-sm font-mono">
            <span className="text-terminal-gray">Fee:</span>
            <span className="text-terminal-green">0.30%</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-terminal-red/10 border border-terminal-red/30 rounded">
          <div className="text-sm font-mono text-terminal-red">{error}</div>
        </div>
      )}

      {/* Swap Button */}
      <motion.button
        onClick={handleSwap}
        disabled={!inputAmount || !outputAmount || isLoading || !isConnected}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`w-full py-4 rounded font-mono text-lg transition-all duration-300 ${
          !inputAmount || !outputAmount || isLoading || !isConnected
            ? 'bg-terminal-gray/20 text-terminal-gray border border-terminal-gray/30 cursor-not-allowed'
            : 'terminal-button text-glow'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-terminal-green border-t-transparent rounded-full animate-spin"></div>
            <span>PROCESSING...</span>
          </div>
        ) : (
          'EXECUTE_SWAP_V2'
        )}
      </motion.button>
    </div>
  );
}
