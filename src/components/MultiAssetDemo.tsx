'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ValueParser, ParsedValue, Asset } from '../lib/value-parser';

// Mock UTxO data for demonstration
const mockUtxos = {
  simpleWallet: {
    assets: {
      lovelace: 15000000n, // 15 ADA
      'policy1.PUCKY': 345292800000000n, // 15,000 PUCKY (15 ADA worth at new price ratio)
      'policy2.wLTC': 250000000n // 2.5 wLTC
    }
  },
  complexPool: {
    assets: {
      lovelace: 1000000000000n, // 1M ADA
      'pucky_policy.PUCKY': 23019520000000000n, // 23.01952M PUCKY (100 ADA = 2,301,952 PUCKY)
      'lp_policy.LP_PUCKY_ADA': 4796158000000n, // LP tokens
      'fee_policy.PROTOCOL_FEE': 1000000n // Protocol fees
    }
  },
  dustUtxo: {
    assets: {
      lovelace: 1200000n // 1.2 ADA (below 2 ADA minimum)
    }
  }
};

export default function MultiAssetDemo() {
  const [selectedUtxo, setSelectedUtxo] = useState<string>('simpleWallet');
  const [parsedValue, setParsedValue] = useState<ParsedValue | null>(null);
  const [filterPolicy, setFilterPolicy] = useState<string>('');
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);

  // Parse selected UTxO
  useEffect(() => {
    const utxo = mockUtxos[selectedUtxo as keyof typeof mockUtxos];
    if (utxo) {
      const parsed = ValueParser.parseAssets(utxo.assets);
      setParsedValue(parsed);
    }
  }, [selectedUtxo]);

  // Filter assets by policy
  useEffect(() => {
    if (parsedValue && filterPolicy) {
      const filtered = ValueParser.filterAssets(parsedValue, { policyId: filterPolicy });
      setFilteredAssets(filtered);
    } else {
      setFilteredAssets(parsedValue?.assets || []);
    }
  }, [parsedValue, filterPolicy]);

  const handleAssetAnalysis = () => {
    if (!parsedValue) return;

    // Demonstrate various analysis functions
    const analyses = {
      hasMinAda: ValueParser.validateMinAda(parsedValue),
      isDust: ValueParser.isDustValue(parsedValue),
      largestAsset: ValueParser.getLargestAsset(parsedValue),
      totalAssets: parsedValue.totalAssets,
      allowedPolicies: ValueParser.validateAllowedAssets(parsedValue, ['policy1', 'pucky_policy', 'lp_policy'])
    };

    alert(`Asset Analysis:
- Meets min ADA: ${analyses.hasMinAda}
- Is dust: ${analyses.isDust}
- Total assets: ${analyses.totalAssets}
- Largest asset: ${analyses.largestAsset?.assetName || 'None'}
- Allowed policies: ${analyses.allowedPolicies}`);
  };

  const demonstrateValueOperations = () => {
    const value1 = ValueParser.parseAssets({
      lovelace: 10000000n,
      'policy1.TOKEN_A': 1000000n
    });

    const value2 = ValueParser.parseAssets({
      lovelace: 5000000n,
      'policy1.TOKEN_A': 500000n,
      'policy2.TOKEN_B': 2000000n
    });

    const merged = ValueParser.mergeValues([value1, value2]);
    const difference = ValueParser.calculateValueDifference(value1, value2);

    alert(`Value Operations Demo:

Value 1: ${ValueParser.formatValue(value1)}
Value 2: ${ValueParser.formatValue(value2)}

Merged: ${ValueParser.formatValue(merged)}
Difference (1-2): ${ValueParser.formatValue(difference)}`);
  };

  if (!parsedValue) {
    return (
      <div className="terminal-card p-6 max-w-2xl mx-auto">
        <div className="text-center text-terminal-green font-mono">
          Loading multi-asset demo...
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-card p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-terminal text-terminal-green text-glow">
          MULTI_ASSET_PARSER_DEMO
        </h2>
        <div className="text-xs font-mono text-terminal-amber bg-terminal-amber/10 px-2 py-1 rounded border border-terminal-amber/30">
          ENHANCED_VALUE_PARSING
        </div>
      </div>

      {/* UTxO Selection */}
      <div className="mb-6">
        <label className="text-sm font-mono text-terminal-green mb-2 block">
          SELECT_UTXO_TYPE:
        </label>
        <div className="flex space-x-2">
          {Object.keys(mockUtxos).map((utxoType) => (
            <motion.button
              key={utxoType}
              onClick={() => setSelectedUtxo(utxoType)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-4 py-2 rounded font-mono text-sm transition-all ${
                selectedUtxo === utxoType
                  ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/30'
                  : 'bg-terminal-bg-light text-terminal-gray border border-terminal/30 hover:text-terminal-green'
              }`}
            >
              {utxoType.toUpperCase()}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Parsed Value Overview */}
      <div className="mb-6 p-4 bg-terminal-bg-light rounded border border-terminal/30">
        <h3 className="text-lg font-mono text-terminal-green mb-3">PARSED_VALUE_OVERVIEW</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono">
          <div>
            <div className="text-terminal-gray">ADA:</div>
            <div className="text-terminal-green">
              {(Number(parsedValue.ada) / 1_000_000).toFixed(6)}
            </div>
          </div>
          <div>
            <div className="text-terminal-gray">Assets:</div>
            <div className="text-terminal-amber">{parsedValue.totalAssets}</div>
          </div>
          <div>
            <div className="text-terminal-gray">Min ADA:</div>
            <div className={ValueParser.validateMinAda(parsedValue) ? 'text-terminal-green' : 'text-terminal-red'}>
              {ValueParser.validateMinAda(parsedValue) ? 'VALID' : 'INVALID'}
            </div>
          </div>
          <div>
            <div className="text-terminal-gray">Is Dust:</div>
            <div className={ValueParser.isDustValue(parsedValue) ? 'text-terminal-red' : 'text-terminal-green'}>
              {ValueParser.isDustValue(parsedValue) ? 'YES' : 'NO'}
            </div>
          </div>
        </div>
      </div>

      {/* Asset Filter */}
      <div className="mb-6">
        <label className="text-sm font-mono text-terminal-green mb-2 block">
          FILTER_BY_POLICY:
        </label>
        <input
          type="text"
          value={filterPolicy}
          onChange={(e) => setFilterPolicy(e.target.value)}
          placeholder="Enter policy ID (e.g., policy1, pucky_policy)"
          className="w-full terminal-input p-3 rounded font-mono"
        />
      </div>

      {/* Asset List */}
      <div className="mb-6">
        <h3 className="text-lg font-mono text-terminal-green mb-3">
          ASSET_INVENTORY {filterPolicy && `(FILTERED: ${filterPolicy})`}
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredAssets.length > 0 ? (
            filteredAssets.map((asset, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 bg-terminal-bg-light rounded border border-terminal/30"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-mono text-terminal-amber text-sm">
                      {asset.assetName || 'UNNAMED'}
                    </div>
                    <div className="font-mono text-terminal-gray text-xs">
                      Policy: {asset.policyId}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-terminal-green">
                      {ValueParser.formatAsset(asset)}
                    </div>
                    <div className="font-mono text-terminal-gray text-xs">
                      {asset.unit}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center text-terminal-gray font-mono py-8">
              {filterPolicy ? 'NO_ASSETS_MATCH_FILTER' : 'NO_NATIVE_ASSETS'}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <motion.button
          onClick={handleAssetAnalysis}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="terminal-button px-4 py-2 rounded font-mono text-sm"
        >
          ANALYZE_ASSETS
        </motion.button>

        <motion.button
          onClick={demonstrateValueOperations}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="terminal-button px-4 py-2 rounded font-mono text-sm"
        >
          VALUE_OPERATIONS
        </motion.button>

        <motion.button
          onClick={() => {
            const formatted = ValueParser.formatValue(parsedValue);
            navigator.clipboard.writeText(formatted);
            alert('Formatted value copied to clipboard!');
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="terminal-button px-4 py-2 rounded font-mono text-sm"
        >
          COPY_FORMATTED
        </motion.button>
      </div>

      {/* Technical Details */}
      <div className="mt-6 p-4 bg-terminal-bg-light rounded border border-terminal/30">
        <h3 className="text-sm font-mono text-terminal-green mb-2">TECHNICAL_DETAILS</h3>
        <div className="text-xs font-mono text-terminal-gray space-y-1">
          <div>• Enhanced value parsing with comprehensive asset validation</div>
          <div>• Multi-asset filtering and querying capabilities</div>
          <div>• Value operations: merge, difference, analysis</div>
          <div>• CIP-20 multi-asset standard compliance</div>
          <div>• Minimum ADA and dust detection</div>
          <div>• Policy-based asset authorization</div>
        </div>
      </div>
    </div>
  );
}
