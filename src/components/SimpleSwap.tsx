'use client';

import React, { useState, useEffect } from 'react';
import { CorePuckSwapDEX, PoolState, SwapParams } from '../lib/core-dex';
import { Win98Window, Win98Panel, Win98GroupBox, Win98Label } from './ui/windows98';
import { Button } from './ui/button';
import { Input } from './ui/input';

export default function SimpleSwap() {
  const [dex, setDex] = useState<CorePuckSwapDEX | null>(null);
  const [poolState, setPoolState] = useState<PoolState | null>(null);
  const [inputAmount, setInputAmount] = useState<string>('');
  const [outputAmount, setOutputAmount] = useState<string>('');
  const [priceImpact, setPriceImpact] = useState<number>(0);
  const [isAdaToToken, setIsAdaToToken] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Mock token for testing
  const MOCK_TOKEN = {
    policy: 'mock_policy_id',
    name: 'PUCKY'
  };

  // Initialize DEX
  useEffect(() => {
    const initDEX = async () => {
      try {
        // Real DEX initialization
        const dexInstance = await CorePuckSwapDEX.create(
          process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || '',
          process.env.NEXT_PUBLIC_NETWORK as any
        );
        setDex(dexInstance);

        // Load pool state
        const state = await dexInstance.getPoolState(MOCK_TOKEN.policy, MOCK_TOKEN.name);
        setPoolState(state);

        console.log('🔄 Simple DEX initialized on Cardano preprod testnet');
      } catch (err) {
        setError('Failed to initialize DEX: ' + (err as Error).message);
      }
    };

    initDEX();
  }, []);

  // Calculate output amount when input changes
  useEffect(() => {
    if (!poolState || !inputAmount || parseFloat(inputAmount) <= 0) {
      setOutputAmount('');
      setPriceImpact(0);
      return;
    }

    try {
      const inputAmountBigInt = BigInt(Math.floor(parseFloat(inputAmount) * 1_000_000));
      
      // Use our core calculation function
      const { outputAmount: outputBigInt, priceImpact: impact } = calculateSwapOutput(
        poolState,
        inputAmountBigInt,
        isAdaToToken
      );

      setOutputAmount((Number(outputBigInt) / 1_000_000).toFixed(6));
      setPriceImpact(impact);
    } catch (err) {
      setError('Calculation error: ' + (err as Error).message);
    }
  }, [inputAmount, isAdaToToken, poolState]);

  // Core calculation function (matches our Aiken implementation)
  const calculateSwapOutput = (
    poolState: PoolState,
    inputAmount: bigint,
    isAdaToToken: boolean
  ): { outputAmount: bigint; priceImpact: number } => {
    const { ada_reserve, token_reserve, fee_bps } = poolState;
    
    // Calculate fee
    const feeAmount = inputAmount * BigInt(fee_bps) / 10000n;
    const inputAfterFee = inputAmount - feeAmount;

    let outputAmount: bigint;
    let priceImpact: number;

    if (isAdaToToken) {
      // ADA -> Token swap: (x + dx) * (y - dy) = x * y
      const newAdaReserve = ada_reserve + inputAfterFee;
      outputAmount = token_reserve * inputAfterFee / newAdaReserve;
      
      // Price impact calculation
      const oldPrice = Number(token_reserve) / Number(ada_reserve);
      const newTokenReserve = token_reserve - outputAmount;
      const newPrice = Number(newTokenReserve) / Number(newAdaReserve);
      priceImpact = Math.abs((newPrice - oldPrice) / oldPrice) * 100;
    } else {
      // Token -> ADA swap
      const newTokenReserve = token_reserve + inputAfterFee;
      outputAmount = ada_reserve * inputAfterFee / newTokenReserve;
      
      // Price impact calculation
      const oldPrice = Number(ada_reserve) / Number(token_reserve);
      const newAdaReserve = ada_reserve - outputAmount;
      const newPrice = Number(newAdaReserve) / Number(newTokenReserve);
      priceImpact = Math.abs((newPrice - oldPrice) / oldPrice) * 100;
    }

    return { outputAmount, priceImpact };
  };

  const handleSwap = async () => {
    if (!poolState || !inputAmount || !outputAmount) {
      setError('Please enter valid amounts');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (!dex) {
        throw new Error('DEX not initialized. Please refresh the page.');
      }

      console.log('🔄 Executing real swap transaction...');

      // Real swap execution
      const swapParams: SwapParams = {
        inputAmount: BigInt(Math.floor(parseFloat(inputAmount) * 1_000_000)),
        minOutput: BigInt(Math.floor(parseFloat(outputAmount) * 0.99 * 1_000_000)), // 1% slippage
        isAdaToToken
      };

      const txHash = await dex.executeSwap(MOCK_TOKEN.policy, MOCK_TOKEN.name, swapParams);

      alert(`🎉 Swap submitted to Cardano preprod testnet!\nTransaction: ${txHash.slice(0, 12)}...`);
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
    setIsAdaToToken(!isAdaToToken);
    setInputAmount(outputAmount);
    setOutputAmount(inputAmount);
  };

  if (!poolState) {
    return (
      <div className="max-w-md mx-auto">
        <Win98Window title="PuckSwap - Simple Swap" className="w-full">
          <div className="text-center p-4">
            <div className="text-xs">Loading pool state...</div>
            {error && <div className="text-xs text-win98-red mt-2">{error}</div>}
          </div>
        </Win98Window>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Win98Window title="PuckSwap - Simple Swap" className="w-full">
        {/* Pool Info Panel */}
        <Win98GroupBox title="Pool Information" className="mb-4">
          <div className="space-y-1">
            <div className="text-xs">
              <span className="font-bold">ADA Reserve:</span> {(Number(poolState.ada_reserve) / 1_000_000).toFixed(2)} ADA
            </div>
            <div className="text-xs">
              <span className="font-bold">PUCKY Reserve:</span> {(Number(poolState.token_reserve) / 1_000_000).toFixed(2)} PUCKY
            </div>
          </div>
        </Win98GroupBox>

        {/* Terminal Swap Interface */}
        <Win98GroupBox title="Swap Interface" className="mb-4">
          <div className="terminal-mode p-3 rounded">
            {/* Input */}
            <div className="mb-4">
              <Win98Label isTerminal={true} className="mb-2 block">
                From: {isAdaToToken ? 'ADA' : 'PUCKY'}
              </Win98Label>
              <Input
                type="number"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                placeholder="0.000000"
                variant="terminal"
                step="0.000001"
              />
            </div>

            {/* Switch Button */}
            <div className="flex justify-center mb-4">
              <Button
                onClick={handleTokenSwitch}
                variant="terminal"
                className="w-10 h-10 flex items-center justify-center"
              >
                ⇅
              </Button>
            </div>

            {/* Output */}
            <div className="mb-4">
              <Win98Label isTerminal={true} className="mb-2 block">
                To: {isAdaToToken ? 'PUCKY' : 'ADA'}
              </Win98Label>
              <Input
                type="number"
                value={outputAmount}
                readOnly
                placeholder="0.000000"
                variant="terminal"
                className="opacity-75"
              />
            </div>
          </div>
        </Win98GroupBox>

        {/* Price Impact */}
        {priceImpact > 0 && (
          <Win98Panel className="mb-4">
            <div className="text-xs">
              <span className="font-bold">Price Impact:</span>{' '}
              <span className={priceImpact > 5 ? 'text-win98-red font-bold' : 'text-win98-green'}>
                {priceImpact.toFixed(2)}%
              </span>
            </div>
          </Win98Panel>
        )}

        {/* Error Display */}
        {error && (
          <Win98Panel className="mb-4 bg-red-100 border-red-300">
            <div className="text-xs text-win98-red">{error}</div>
          </Win98Panel>
        )}

        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          disabled={!inputAmount || !outputAmount || isLoading}
          variant="win98-primary"
          className="w-full h-12 text-sm font-bold"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>PROCESSING...</span>
            </div>
          ) : (
            'EXECUTE SWAP'
          )}
        </Button>
      </Win98Window>
    </div>
  );
}
