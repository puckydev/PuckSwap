// PuckSwap v5 - Token Selection Button
// Interactive button for token selection with dynamic pool data display
// Shows current token or prompts for selection

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { TokenInfo } from '../hooks/useAvailableTokens';
import { formatADA, formatNumber } from '../lib/format-utils';

interface TokenSelectionButtonProps {
  selectedToken: TokenInfo | null; // null represents ADA
  onClick: () => void;
  disabled?: boolean;
  showBalance?: boolean;
  balance?: string;
  variant?: 'default' | 'terminal' | 'compact';
  placeholder?: string;
  showPoolInfo?: boolean;
  className?: string;
}

export default function TokenSelectionButton({
  selectedToken,
  onClick,
  disabled = false,
  showBalance = true,
  balance,
  variant = 'default',
  placeholder = 'Select Token',
  showPoolInfo = false,
  className = ''
}: TokenSelectionButtonProps) {
  
  const isADA = selectedToken === null || selectedToken?.isNative;
  const displayToken = isADA ? {
    symbol: 'ADA',
    name: 'Cardano',
    icon: '/icons/ada.svg',
    isNative: true,
    policy: '',
    decimals: 6,
    adaReserve: '0',
    tokenReserve: '0',
    price: '1.0'
  } : selectedToken;

  const hasSelection = selectedToken !== undefined;

  // Variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'terminal':
        return {
          button: 'bg-terminal-bg border border-terminal-white/30 text-terminal-white hover:border-terminal-green/50',
          text: 'text-terminal-white',
          subtext: 'text-terminal-white/70'
        };
      case 'compact':
        return {
          button: 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20',
          text: 'text-green-300',
          subtext: 'text-green-400/70'
        };
      default:
        return {
          button: 'bg-black border border-green-500/30 text-green-400 hover:border-green-500/50 hover:bg-green-500/5',
          text: 'text-green-300',
          subtext: 'text-green-400/70'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full p-3 rounded-lg transition-all duration-200 
        ${styles.button}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      whileHover={!disabled ? { scale: 1.01 } : {}}
      whileTap={!disabled ? { scale: 0.99 } : {}}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Token Icon */}
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
            {hasSelection && displayToken ? (
              displayToken.icon ? (
                <img 
                  src={displayToken.icon} 
                  alt={displayToken.symbol}
                  className="w-6 h-6 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-green-400 font-bold text-sm">
                  {displayToken.symbol.slice(0, 2)}
                </span>
              )
            ) : (
              <AlertTriangle size={16} className="text-green-400/50" />
            )}
          </div>

          {/* Token Info */}
          <div className="text-left">
            <div className="flex items-center space-x-2">
              <span className={`font-semibold ${styles.text}`}>
                {hasSelection && displayToken ? displayToken.symbol : placeholder}
              </span>
              {hasSelection && displayToken?.isNative && (
                <span className="bg-green-500/30 text-green-300 text-xs px-2 py-0.5 rounded">
                  NATIVE
                </span>
              )}
            </div>
            
            {/* Token Name or Balance */}
            <div className={`text-sm ${styles.subtext}`}>
              {showBalance && balance ? (
                `Balance: ${balance}`
              ) : hasSelection && displayToken ? (
                displayToken.name || 'No name'
              ) : (
                'Choose from available pools'
              )}
            </div>

            {/* Pool Info */}
            {showPoolInfo && hasSelection && displayToken && !displayToken.isNative && (
              <div className={`text-xs ${styles.subtext} mt-1`}>
                Pool: {formatADA(BigInt(displayToken.adaReserve || '0'))} ADA • 
                Price: {Number(displayToken.price || '0').toFixed(6)} ADA
              </div>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronDown 
          size={20} 
          className={`${styles.text} transition-transform ${disabled ? 'opacity-50' : ''}`}
        />
      </div>

      {/* Additional Pool Details for non-compact variant */}
      {variant !== 'compact' && hasSelection && displayToken && !displayToken.isNative && (
        <div className="mt-2 pt-2 border-t border-green-500/10">
          <div className="flex justify-between items-center text-xs">
            <div className={styles.subtext}>
              Liquidity: {formatADA(BigInt(displayToken.adaReserve || '0'))} ADA
            </div>
            <div className={styles.subtext}>
              {formatNumber(
                Number(displayToken.tokenReserve || '0') / Math.pow(10, displayToken.decimals),
                2
              )} {displayToken.symbol}
            </div>
          </div>
        </div>
      )}
    </motion.button>
  );
}
