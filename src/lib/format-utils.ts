// PuckSwap v3 Format Utilities
// Comprehensive formatting functions for displaying blockchain data

/**
 * Format ADA amounts with proper decimals and units
 */
export function formatADA(lovelace: bigint, decimals: number = 2): string {
  const ada = Number(lovelace) / 1_000_000;
  
  if (ada >= 1_000_000) {
    return `₳${(ada / 1_000_000).toFixed(decimals)}M`;
  } else if (ada >= 1_000) {
    return `₳${(ada / 1_000).toFixed(decimals)}K`;
  } else {
    return `₳${ada.toFixed(decimals)}`;
  }
}

/**
 * Format token amounts with proper decimals
 */
export function formatToken(amount: bigint, decimals: number = 6, symbol?: string): string {
  const value = Number(amount) / Math.pow(10, decimals);
  
  let formatted: string;
  if (value >= 1_000_000) {
    formatted = `${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    formatted = `${(value / 1_000).toFixed(2)}K`;
  } else if (value >= 1) {
    formatted = value.toFixed(2);
  } else {
    formatted = value.toFixed(6);
  }
  
  return symbol ? `${formatted} ${symbol}` : formatted;
}

/**
 * Format price with appropriate precision
 */
export function formatPrice(price: number, decimals: number = 6): string {
  if (price >= 1000) {
    return price.toFixed(2);
  } else if (price >= 1) {
    return price.toFixed(4);
  } else {
    return price.toFixed(decimals);
  }
}

/**
 * Format percentage values
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  const percentage = value * 100;
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(decimals)}%`;
}

/**
 * Format large numbers with K/M/B suffixes
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(decimals)}B`;
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(decimals)}M`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(decimals)}K`;
  } else {
    return value.toFixed(decimals);
  }
}

/**
 * Format time duration in human readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  } else if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h`;
  } else {
    return `${Math.floor(seconds / 86400)}d`;
  }
}

/**
 * Format timestamp to readable date
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format address for display (truncated)
 */
export function formatAddress(address: string, startChars: number = 8, endChars: number = 6): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format transaction hash for display
 */
export function formatTxHash(txHash: string): string {
  return formatAddress(txHash, 8, 8);
}

/**
 * Format policy ID for display
 */
export function formatPolicyId(policyId: string): string {
  return formatAddress(policyId, 6, 4);
}

/**
 * Format asset name (hex to string if possible)
 */
export function formatAssetName(assetName: string): string {
  try {
    // Try to decode hex to string
    const decoded = Buffer.from(assetName, 'hex').toString('utf8');
    // Check if it's printable ASCII
    if (/^[\x20-\x7E]*$/.test(decoded)) {
      return decoded;
    }
  } catch (error) {
    // Fall back to hex display
  }
  return assetName.length > 16 ? `${assetName.slice(0, 8)}...${assetName.slice(-4)}` : assetName;
}

/**
 * Format price impact with color coding info
 */
export function formatPriceImpact(impact: number): {
  formatted: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  color: string;
} {
  const formatted = formatPercentage(impact / 10000); // Convert from basis points
  
  let level: 'low' | 'medium' | 'high' | 'critical';
  let color: string;
  
  if (impact < 100) { // < 1%
    level = 'low';
    color = 'text-green-400';
  } else if (impact < 300) { // < 3%
    level = 'medium';
    color = 'text-yellow-400';
  } else if (impact < 500) { // < 5%
    level = 'high';
    color = 'text-orange-400';
  } else {
    level = 'critical';
    color = 'text-red-400';
  }
  
  return { formatted, level, color };
}

/**
 * Format slippage tolerance
 */
export function formatSlippage(slippageBPS: number): string {
  return `${(slippageBPS / 100).toFixed(1)}%`;
}

/**
 * Format APR/APY
 */
export function formatAPR(apr: number): string {
  return `${apr.toFixed(2)}%`;
}

/**
 * Format market cap
 */
export function formatMarketCap(marketCap: bigint): string {
  const value = Number(marketCap) / 1_000_000; // Convert from lovelace
  return `₳${formatNumber(value)}`;
}

/**
 * Format volume with time period
 */
export function formatVolume(volume: bigint, period: '24h' | '7d' | '30d' = '24h'): string {
  const formatted = formatADA(volume);
  return `${formatted} (${period})`;
}

/**
 * Format liquidity with USD equivalent (if available)
 */
export function formatLiquidity(adaAmount: bigint, usdPrice?: number): string {
  const adaFormatted = formatADA(adaAmount);
  
  if (usdPrice) {
    const usdValue = (Number(adaAmount) / 1_000_000) * usdPrice;
    return `${adaFormatted} (~$${formatNumber(usdValue)})`;
  }
  
  return adaFormatted;
}

/**
 * Format fee amount
 */
export function formatFee(feeAmount: bigint, feeBPS: number): string {
  const adaFormatted = formatADA(feeAmount);
  const percentage = (feeBPS / 100).toFixed(1);
  return `${adaFormatted} (${percentage}%)`;
}

/**
 * Format ratio between two tokens
 */
export function formatRatio(tokenA: bigint, tokenB: bigint, symbolA: string, symbolB: string): string {
  const ratio = Number(tokenA) / Number(tokenB);
  return `1 ${symbolA} = ${formatPrice(ratio)} ${symbolB}`;
}

/**
 * Format impermanent loss
 */
export function formatImpermanentLoss(loss: number): {
  formatted: string;
  color: string;
} {
  const formatted = formatPercentage(loss / 100);
  const color = loss >= 0 ? 'text-green-400' : 'text-red-400';
  return { formatted, color };
}

/**
 * Format pool share
 */
export function formatPoolShare(share: number): string {
  if (share < 0.01) {
    return '<0.01%';
  }
  return `${share.toFixed(2)}%`;
}

/**
 * Format gas/transaction fee
 */
export function formatGasFee(fee: bigint): string {
  return formatADA(fee, 6);
}

/**
 * Format countdown timer
 */
export function formatCountdown(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    return `${bytes} B`;
  }
}

/**
 * Format network status
 */
export function formatNetworkStatus(status: 'online' | 'offline' | 'connecting'): {
  label: string;
  color: string;
  icon: string;
} {
  switch (status) {
    case 'online':
      return { label: 'ONLINE', color: 'text-green-400', icon: '🟢' };
    case 'connecting':
      return { label: 'CONNECTING', color: 'text-yellow-400', icon: '🟡' };
    case 'offline':
      return { label: 'OFFLINE', color: 'text-red-400', icon: '🔴' };
    default:
      return { label: 'UNKNOWN', color: 'text-gray-400', icon: '⚪' };
  }
}

/**
 * Format error messages for user display
 */
export function formatError(error: Error | string): string {
  const message = typeof error === 'string' ? error : error.message;
  
  // Common error message improvements
  if (message.includes('insufficient funds')) {
    return 'Insufficient funds in wallet';
  } else if (message.includes('slippage')) {
    return 'Transaction failed due to slippage. Try increasing slippage tolerance.';
  } else if (message.includes('deadline')) {
    return 'Transaction deadline exceeded. Please try again.';
  } else if (message.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  return message;
}
