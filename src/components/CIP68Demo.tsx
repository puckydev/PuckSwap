'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PoolCIP68Datum, 
  PoolState, 
  PoolConfig, 
  PoolStats,
  CIP68DatumBuilder,
  CIP68_METADATA_KEYS
} from '../lib/cip68-types';
import { CIP68Serializer } from '../lib/cip68-serializer';

// Mock CIP-68 pool data for demonstration
const createMockPoolData = (): PoolCIP68Datum => {
  const poolState: PoolState = {
    ada_reserve: 1000000000000n, // 1M ADA
    token_reserve: 23019520000000000n, // 23.01952M PUCKY (100 ADA = 2,301,952 PUCKY)
    total_lp_supply: 4796158000000n, // sqrt(1M * 23.01952M)
    last_interaction_slot: 12345678,
    pool_nft_name: "PUCKY_ADA_POOL_001"
  };

  const poolConfig: PoolConfig = {
    token_policy: "pucky_policy_id_cip68",
    token_name: "PUCKY",
    lp_token_policy: "lp_policy_id_cip68",
    lp_token_name: "LP_PUCKY_ADA",
    fee_bps: 30, // 0.3%
    protocol_fee_bps: 5, // 0.05%
    creator: "addr1_creator_cip68_demo",
    admin: "addr1_admin_cip68_demo",
    is_paused: false
  };

  const poolStats: PoolStats = {
    total_volume_ada: 75000000000000n, // 75M ADA total volume
    total_volume_token: 187500000000000n, // 187.5M PUCKY total volume
    total_fees_collected: 22500000000n, // 22.5K ADA in fees
    swap_count: 1875,
    liquidity_providers_count: 67,
    created_at_slot: 12000000,
    last_price_ada_per_token: 2500000, // 2.5 PUCKY per ADA (scaled by 1e6)
    price_history_hash: "price_hash_cip68_demo"
  };

  return CIP68DatumBuilder.buildPoolDatum(poolState, poolConfig, poolStats);
};

export default function CIP68Demo() {
  const [poolDatum, setPoolDatum] = useState<PoolCIP68Datum | null>(null);
  const [serializedDatum, setSerializedDatum] = useState<string>('');
  const [validationResult, setValidationResult] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<'structure' | 'metadata' | 'serialization' | 'operations'>('structure');

  useEffect(() => {
    const mockData = createMockPoolData();
    setPoolDatum(mockData);
    
    // Test serialization
    try {
      const serialized = JSON.stringify(mockData, (key, value) =>
        typeof value === 'bigint' ? value.toString() + 'n' : value
      );
      setSerializedDatum(serialized);
      setValidationResult(CIP68DatumBuilder.validateCIP68Structure(mockData));
    } catch (error) {
      console.error('Serialization error:', error);
    }
  }, []);

  const simulateSwap = () => {
    if (!poolDatum) return;

    // Simulate a 100 ADA -> PUCKY swap
    const swapAmount = 100000000n; // 100 ADA
    const currentSlot = 12345679;

    // Calculate swap result
    const totalFeeBps = poolDatum.pool_config.fee_bps + poolDatum.pool_config.protocol_fee_bps;
    const feeNumerator = 10000 - totalFeeBps;
    const amountInWithFee = swapAmount * BigInt(feeNumerator);
    
    const numerator = amountInWithFee * poolDatum.pool_state.token_reserve;
    const denominator = (poolDatum.pool_state.ada_reserve * 10000n) + amountInWithFee;
    const outputAmount = numerator / denominator;
    
    const newAdaReserve = poolDatum.pool_state.ada_reserve + swapAmount;
    const newTokenReserve = poolDatum.pool_state.token_reserve - outputAmount;
    const newPrice = Number(newAdaReserve) * 1_000_000 / Number(newTokenReserve);

    const swapResult = {
      is_ada_to_token: true,
      input_amount: swapAmount,
      output_amount: outputAmount,
      fee_amount: swapAmount * BigInt(poolDatum.pool_config.fee_bps) / 10000n,
      protocol_fee_amount: swapAmount * BigInt(poolDatum.pool_config.protocol_fee_bps) / 10000n,
      output_policy: poolDatum.pool_config.token_policy,
      output_name: poolDatum.pool_config.token_name,
      new_ada_reserve: newAdaReserve,
      new_token_reserve: newTokenReserve,
      new_price: newPrice,
      swap_slot: currentSlot
    };

    // Update pool datum
    const updatedDatum = CIP68DatumBuilder.createUpdatedPoolDatum(poolDatum, swapResult);
    setPoolDatum(updatedDatum);

    // Update serialized version
    const newSerialized = JSON.stringify(updatedDatum, (key, value) =>
      typeof value === 'bigint' ? value.toString() + 'n' : value
    );
    setSerializedDatum(newSerialized);
  };

  const resetPool = () => {
    const freshData = createMockPoolData();
    setPoolDatum(freshData);
    const serialized = JSON.stringify(freshData, (key, value) =>
      typeof value === 'bigint' ? value.toString() + 'n' : value
    );
    setSerializedDatum(serialized);
  };

  if (!poolDatum) {
    return (
      <div className="terminal-card p-6 max-w-4xl mx-auto">
        <div className="text-center text-terminal-green font-mono">
          Loading CIP-68 demo...
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-card p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-terminal text-terminal-green text-glow">
          CIP68_STRUCTURED_DATUM_DEMO
        </h2>
        <div className="flex items-center space-x-2">
          <div className="text-xs font-mono text-terminal-amber bg-terminal-amber/10 px-2 py-1 rounded border border-terminal-amber/30">
            CIP-68_COMPLIANT
          </div>
          <div className={`text-xs font-mono px-2 py-1 rounded border ${
            validationResult 
              ? 'text-terminal-green bg-terminal-green/10 border-terminal-green/30'
              : 'text-terminal-red bg-terminal-red/10 border-terminal-red/30'
          }`}>
            {validationResult ? 'VALID' : 'INVALID'}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-6">
        {[
          { id: 'structure', label: 'STRUCTURE', icon: '🏗️' },
          { id: 'metadata', label: 'METADATA', icon: '📋' },
          { id: 'serialization', label: 'SERIALIZATION', icon: '🔄' },
          { id: 'operations', label: 'OPERATIONS', icon: '⚡' }
        ].map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`px-4 py-2 rounded font-mono text-sm transition-all ${
              selectedTab === tab.id
                ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/30'
                : 'bg-terminal-bg-light text-terminal-gray border border-terminal/30 hover:text-terminal-green'
            }`}
          >
            {tab.icon} {tab.label}
          </motion.button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {selectedTab === 'structure' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-mono text-terminal-green">CIP-68 Datum Structure</h3>
            
            {/* Pool State */}
            <div className="p-4 bg-terminal-bg-light rounded border border-terminal/30">
              <h4 className="font-mono text-terminal-amber mb-3">Pool State</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm font-mono">
                <div>
                  <div className="text-terminal-gray">ADA Reserve:</div>
                  <div className="text-terminal-green">
                    {(Number(poolDatum.pool_state.ada_reserve) / 1_000_000).toLocaleString()} ADA
                  </div>
                </div>
                <div>
                  <div className="text-terminal-gray">Token Reserve:</div>
                  <div className="text-terminal-amber">
                    {(Number(poolDatum.pool_state.token_reserve) / 1_000_000).toLocaleString()} PUCKY
                  </div>
                </div>
                <div>
                  <div className="text-terminal-gray">LP Supply:</div>
                  <div className="text-terminal-green">
                    {(Number(poolDatum.pool_state.total_lp_supply) / 1_000_000).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-terminal-gray">Last Interaction:</div>
                  <div className="text-terminal-green">Slot {poolDatum.pool_state.last_interaction_slot}</div>
                </div>
                <div>
                  <div className="text-terminal-gray">Pool NFT:</div>
                  <div className="text-terminal-amber text-xs">{poolDatum.pool_state.pool_nft_name}</div>
                </div>
              </div>
            </div>

            {/* Pool Config */}
            <div className="p-4 bg-terminal-bg-light rounded border border-terminal/30">
              <h4 className="font-mono text-terminal-amber mb-3">Pool Configuration</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm font-mono">
                <div>
                  <div className="text-terminal-gray">Trading Fee:</div>
                  <div className="text-terminal-green">{poolDatum.pool_config.fee_bps / 100}%</div>
                </div>
                <div>
                  <div className="text-terminal-gray">Protocol Fee:</div>
                  <div className="text-terminal-green">{poolDatum.pool_config.protocol_fee_bps / 100}%</div>
                </div>
                <div>
                  <div className="text-terminal-gray">Status:</div>
                  <div className={poolDatum.pool_config.is_paused ? 'text-terminal-red' : 'text-terminal-green'}>
                    {poolDatum.pool_config.is_paused ? 'PAUSED' : 'ACTIVE'}
                  </div>
                </div>
                <div>
                  <div className="text-terminal-gray">Token Policy:</div>
                  <div className="text-terminal-amber text-xs">{poolDatum.pool_config.token_policy}</div>
                </div>
              </div>
            </div>

            {/* Pool Stats */}
            <div className="p-4 bg-terminal-bg-light rounded border border-terminal/30">
              <h4 className="font-mono text-terminal-amber mb-3">Pool Statistics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono">
                <div>
                  <div className="text-terminal-gray">Total Volume ADA:</div>
                  <div className="text-terminal-green">
                    {(Number(poolDatum.pool_stats.total_volume_ada) / 1_000_000).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-terminal-gray">Total Swaps:</div>
                  <div className="text-terminal-green">{poolDatum.pool_stats.swap_count.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-terminal-gray">Fees Collected:</div>
                  <div className="text-terminal-green">
                    {(Number(poolDatum.pool_stats.total_fees_collected) / 1_000_000).toFixed(2)} ADA
                  </div>
                </div>
                <div>
                  <div className="text-terminal-gray">LP Providers:</div>
                  <div className="text-terminal-green">{poolDatum.pool_stats.liquidity_providers_count}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {selectedTab === 'metadata' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-mono text-terminal-green">CIP-68 Metadata</h3>
            <div className="p-4 bg-terminal-bg-light rounded border border-terminal/30">
              <div className="space-y-3 text-sm font-mono">
                {Object.entries(poolDatum.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-terminal-gray">{key}:</span>
                    <span className="text-terminal-green text-right max-w-md truncate">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-xs font-mono text-terminal-gray">
              Version: {poolDatum.version} | Extra: {poolDatum.extra ? 'Present' : 'None'}
            </div>
          </motion.div>
        )}

        {selectedTab === 'serialization' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-mono text-terminal-green">Datum Serialization</h3>
            <div className="p-4 bg-terminal-bg-light rounded border border-terminal/30">
              <div className="text-xs font-mono text-terminal-green max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap break-all">
                  {serializedDatum}
                </pre>
              </div>
            </div>
            <div className="flex justify-between text-sm font-mono">
              <span className="text-terminal-gray">Size: {serializedDatum.length} characters</span>
              <span className={`${validationResult ? 'text-terminal-green' : 'text-terminal-red'}`}>
                {validationResult ? 'Valid CIP-68 Structure' : 'Invalid Structure'}
              </span>
            </div>
          </motion.div>
        )}

        {selectedTab === 'operations' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-mono text-terminal-green">Pool Operations</h3>
            
            <div className="flex space-x-4">
              <motion.button
                onClick={simulateSwap}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="terminal-button px-6 py-3 rounded font-mono"
              >
                SIMULATE_SWAP (100 ADA → PUCKY)
              </motion.button>
              
              <motion.button
                onClick={resetPool}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 rounded font-mono bg-terminal-gray/20 text-terminal-gray border border-terminal-gray/30 hover:text-terminal-green"
              >
                RESET_POOL
              </motion.button>
            </div>

            <div className="p-4 bg-terminal-bg-light rounded border border-terminal/30">
              <h4 className="font-mono text-terminal-amber mb-3">Current Pool Price</h4>
              <div className="text-2xl font-mono text-terminal-green">
                {(Number(poolDatum.pool_state.token_reserve) / Number(poolDatum.pool_state.ada_reserve)).toFixed(6)} PUCKY/ADA
              </div>
              <div className="text-sm font-mono text-terminal-gray mt-1">
                Last Price: {(poolDatum.pool_stats.last_price_ada_per_token / 1_000_000).toFixed(6)} PUCKY/ADA
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Technical Info */}
      <div className="mt-6 p-4 bg-terminal-bg-light rounded border border-terminal/30">
        <h3 className="text-sm font-mono text-terminal-green mb-2">CIP-68 TECHNICAL_DETAILS</h3>
        <div className="text-xs font-mono text-terminal-gray space-y-1">
          <div>• Structured datum with metadata, version, and extensible extra field</div>
          <div>• Comprehensive pool state tracking with reserves and LP supply</div>
          <div>• Detailed configuration including fees and governance addresses</div>
          <div>• Real-time statistics with volume, swap count, and price history</div>
          <div>• Full serialization/deserialization with BigInt support</div>
          <div>• Version compatibility and upgrade path support</div>
        </div>
      </div>
    </div>
  );
}
