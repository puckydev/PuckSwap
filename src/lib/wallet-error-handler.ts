/**
 * PuckSwap Wallet Connection Error Handler
 * 
 * Comprehensive error handling for wallet connection issues,
 * particularly the "Cannot convert undefined to a BigInt" error
 */

export interface WalletError {
  type: 'CONNECTION_FAILED' | 'BIGINT_CONVERSION' | 'NETWORK_ERROR' | 'USER_REJECTED' | 'WALLET_NOT_FOUND' | 'UNKNOWN';
  message: string;
  originalError?: Error;
  suggestions: string[];
}

/**
 * Safely convert any value to BigInt with comprehensive error handling
 */
export function safeToBigInt(value: any, context?: string): bigint {
  if (value === undefined || value === null || value === '') {
    console.debug(`safeToBigInt: Converting ${value} to 0n${context ? ` (${context})` : ''}`);
    return 0n;
  }
  
  if (typeof value === 'bigint') {
    return value;
  }
  
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      console.warn(`safeToBigInt: Invalid number ${value}${context ? ` (${context})` : ''}, converting to 0n`);
      return 0n;
    }
    return BigInt(Math.floor(value));
  }
  
  if (typeof value === 'string') {
    // Handle common string representations of null/undefined
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'NaN') {
      console.debug(`safeToBigInt: Converting string "${value}" to 0n${context ? ` (${context})` : ''}`);
      return 0n;
    }
    
    try {
      // Remove any non-numeric characters except minus sign
      const cleaned = trimmed.replace(/[^-0-9]/g, '');
      if (cleaned === '' || cleaned === '-') {
        console.debug(`safeToBigInt: Empty cleaned string from "${value}", converting to 0n${context ? ` (${context})` : ''}`);
        return 0n;
      }
      return BigInt(cleaned);
    } catch (error) {
      console.warn(`safeToBigInt: Failed to convert string "${value}" to BigInt${context ? ` (${context})` : ''}:`, error);
      return 0n;
    }
  }
  
  console.warn(`safeToBigInt: Unexpected value type ${typeof value} for value:`, value, context ? `(${context})` : '');
  return 0n;
}

/**
 * Safely process UTxO assets with comprehensive error handling
 */
export function safeProcessAssets(assets: any, context?: string): Record<string, bigint> {
  const result: Record<string, bigint> = {};
  
  if (!assets || typeof assets !== 'object') {
    console.warn(`safeProcessAssets: Invalid assets object${context ? ` (${context})` : ''}:`, assets);
    return result;
  }
  
  for (const [unit, amount] of Object.entries(assets)) {
    if (typeof unit !== 'string') {
      console.warn(`safeProcessAssets: Invalid unit type${context ? ` (${context})` : ''}:`, typeof unit, unit);
      continue;
    }
    
    const safeAmount = safeToBigInt(amount, `${context ? context + ' - ' : ''}${unit}`);
    if (safeAmount > 0n) {
      result[unit] = safeAmount;
    }
  }
  
  return result;
}

/**
 * Parse and categorize wallet connection errors
 */
export function parseWalletError(error: any): WalletError {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  
  // BigInt conversion errors
  if (errorMessage.includes('Cannot convert undefined to a BigInt') || 
      errorMessage.includes('Cannot convert null to a BigInt') ||
      errorMessage.includes('BigInt')) {
    return {
      type: 'BIGINT_CONVERSION',
      message: 'Failed to process wallet balance data',
      originalError: error,
      suggestions: [
        'Try disconnecting and reconnecting your wallet',
        'Ensure your wallet has some ADA balance',
        'Check if your wallet is properly synced',
        'Try refreshing the page and connecting again'
      ]
    };
  }
  
  // User rejection errors
  if (errorMessage.includes('User declined') || 
      errorMessage.includes('user rejected') ||
      errorMessage.includes('cancelled')) {
    return {
      type: 'USER_REJECTED',
      message: 'Wallet connection was cancelled by user',
      originalError: error,
      suggestions: [
        'Click "Allow" when prompted by your wallet',
        'Make sure to approve the connection request',
        'Try connecting again'
      ]
    };
  }
  
  // Wallet not found errors
  if (errorMessage.includes('not installed') || 
      errorMessage.includes('not found') ||
      errorMessage.includes('undefined')) {
    return {
      type: 'WALLET_NOT_FOUND',
      message: 'Wallet extension not found or not installed',
      originalError: error,
      suggestions: [
        'Install the wallet extension from the official website',
        'Refresh the page after installing the wallet',
        'Make sure the wallet extension is enabled',
        'Try a different supported wallet'
      ]
    };
  }
  
  // Network errors
  if (errorMessage.includes('network') || 
      errorMessage.includes('fetch') ||
      errorMessage.includes('timeout')) {
    return {
      type: 'NETWORK_ERROR',
      message: 'Network connection error',
      originalError: error,
      suggestions: [
        'Check your internet connection',
        'Try again in a few moments',
        'Make sure you\'re connected to the correct network (Preprod)',
        'Check if Blockfrost API is accessible'
      ]
    };
  }
  
  // Generic connection errors
  if (errorMessage.includes('connect') || errorMessage.includes('enable')) {
    return {
      type: 'CONNECTION_FAILED',
      message: 'Failed to connect to wallet',
      originalError: error,
      suggestions: [
        'Make sure your wallet is unlocked',
        'Try refreshing the page',
        'Check if the wallet is set to the correct network (Preprod)',
        'Try connecting with a different wallet'
      ]
    };
  }
  
  // Unknown errors
  return {
    type: 'UNKNOWN',
    message: errorMessage,
    originalError: error,
    suggestions: [
      'Try refreshing the page',
      'Check browser console for more details',
      'Try connecting with a different wallet',
      'Contact support if the issue persists'
    ]
  };
}

/**
 * Format error message for user display
 */
export function formatErrorForUser(walletError: WalletError): string {
  const baseMessage = walletError.message;
  const suggestion = walletError.suggestions[0]; // Show first suggestion
  
  return `${baseMessage}. ${suggestion}`;
}

/**
 * Log detailed error information for debugging
 */
export function logWalletError(walletError: WalletError, context?: string): void {
  console.group(`🚨 Wallet Error${context ? ` (${context})` : ''}`);
  console.error('Type:', walletError.type);
  console.error('Message:', walletError.message);
  console.error('Original Error:', walletError.originalError);
  console.info('Suggestions:', walletError.suggestions);
  console.groupEnd();
}
