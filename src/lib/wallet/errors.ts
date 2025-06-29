/**
 * PuckSwap Wallet Error Handling
 * 
 * Comprehensive error handling for wallet operations with user-friendly messages
 * and recovery actions
 */

import type { WalletName, WalletError } from './types';
import { WALLET_DISPLAY_NAMES, WALLET_INSTALL_URLS } from './WalletManager';

// Error recovery actions
export interface ErrorRecoveryAction {
  label: string;
  action: () => void;
  type: 'primary' | 'secondary';
}

// Enhanced error information
export interface EnhancedWalletError extends WalletError {
  title: string;
  userMessage: string;
  recoveryActions: ErrorRecoveryAction[];
  canRetry: boolean;
}

/**
 * Create user-friendly error messages with recovery actions
 */
export function createWalletError(
  type: WalletError['type'],
  originalError: any,
  walletName?: WalletName
): EnhancedWalletError {
  const baseError: WalletError = {
    type,
    message: originalError?.message || 'Unknown error',
    walletName,
    details: originalError
  };

  switch (type) {
    case 'NOT_INSTALLED':
      return {
        ...baseError,
        title: `${walletName ? WALLET_DISPLAY_NAMES[walletName] : 'Wallet'} Not Found`,
        userMessage: `${walletName ? WALLET_DISPLAY_NAMES[walletName] : 'The wallet'} extension is not installed. Please install it to continue.`,
        recoveryActions: walletName ? [
          {
            label: `Install ${WALLET_DISPLAY_NAMES[walletName]}`,
            action: () => window.open(WALLET_INSTALL_URLS[walletName], '_blank'),
            type: 'primary'
          },
          {
            label: 'Try Another Wallet',
            action: () => {}, // Will be handled by component
            type: 'secondary'
          }
        ] : [],
        canRetry: false
      };

    case 'CONNECTION_FAILED':
      return {
        ...baseError,
        title: 'Connection Failed',
        userMessage: `Failed to connect to ${walletName ? WALLET_DISPLAY_NAMES[walletName] : 'wallet'}. Please make sure the wallet is unlocked and try again.`,
        recoveryActions: [
          {
            label: 'Retry Connection',
            action: () => {}, // Will be handled by component
            type: 'primary'
          },
          {
            label: 'Check Wallet Status',
            action: () => {
              // Open wallet extension
              if (walletName && typeof window !== 'undefined') {
                const walletExtension = (window as any).cardano?.[walletName];
                if (walletExtension) {
                  walletExtension.enable?.();
                }
              }
            },
            type: 'secondary'
          }
        ],
        canRetry: true
      };

    case 'NETWORK_MISMATCH':
      return {
        ...baseError,
        title: 'Network Mismatch',
        userMessage: 'Your wallet is connected to a different network. Please switch to the correct network in your wallet settings.',
        recoveryActions: [
          {
            label: 'Check Network Settings',
            action: () => {
              // Guide user to wallet network settings
              console.log('Please check your wallet network settings');
            },
            type: 'primary'
          },
          {
            label: 'Retry Connection',
            action: () => {}, // Will be handled by component
            type: 'secondary'
          }
        ],
        canRetry: true
      };

    case 'INSUFFICIENT_FUNDS':
      return {
        ...baseError,
        title: 'Insufficient Funds',
        userMessage: 'You don\'t have enough ADA or tokens to complete this transaction. Please add funds to your wallet.',
        recoveryActions: [
          {
            label: 'Check Balance',
            action: () => {}, // Will be handled by component
            type: 'primary'
          },
          {
            label: 'Add Funds',
            action: () => {
              // Guide to funding options
              console.log('Please add funds to your wallet');
            },
            type: 'secondary'
          }
        ],
        canRetry: true
      };

    case 'USER_REJECTED':
      return {
        ...baseError,
        title: 'Transaction Cancelled',
        userMessage: 'You cancelled the transaction in your wallet. No changes were made.',
        recoveryActions: [
          {
            label: 'Try Again',
            action: () => {}, // Will be handled by component
            type: 'primary'
          }
        ],
        canRetry: true
      };

    case 'TRANSACTION_FAILED':
      return {
        ...baseError,
        title: 'Transaction Failed',
        userMessage: 'The transaction could not be completed. This might be due to network issues or insufficient fees.',
        recoveryActions: [
          {
            label: 'Retry Transaction',
            action: () => {}, // Will be handled by component
            type: 'primary'
          },
          {
            label: 'Check Network Status',
            action: () => window.open('https://cardanoscan.io/', '_blank'),
            type: 'secondary'
          }
        ],
        canRetry: true
      };

    default:
      return {
        ...baseError,
        title: 'Wallet Error',
        userMessage: 'An unexpected error occurred. Please try again.',
        recoveryActions: [
          {
            label: 'Retry',
            action: () => {}, // Will be handled by component
            type: 'primary'
          }
        ],
        canRetry: true
      };
  }
}

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(error: WalletError): boolean {
  return ['CONNECTION_FAILED', 'NETWORK_MISMATCH', 'INSUFFICIENT_FUNDS', 'USER_REJECTED', 'TRANSACTION_FAILED'].includes(error.type);
}

/**
 * Get error severity level
 */
export function getErrorSeverity(error: WalletError): 'low' | 'medium' | 'high' {
  switch (error.type) {
    case 'USER_REJECTED':
      return 'low';
    case 'CONNECTION_FAILED':
    case 'NETWORK_MISMATCH':
    case 'INSUFFICIENT_FUNDS':
      return 'medium';
    case 'NOT_INSTALLED':
    case 'TRANSACTION_FAILED':
      return 'high';
    default:
      return 'medium';
  }
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: WalletError): string {
  return `[${error.type}] ${error.message} ${error.walletName ? `(${error.walletName})` : ''}`;
}

/**
 * Create error from unknown exception
 */
export function createErrorFromException(
  exception: unknown,
  walletName?: WalletName
): EnhancedWalletError {
  if (exception instanceof Error) {
    // Try to determine error type from message
    const message = exception.message.toLowerCase();
    
    if (message.includes('not installed') || message.includes('not found')) {
      return createWalletError('NOT_INSTALLED', exception, walletName);
    }
    
    if (message.includes('rejected') || message.includes('cancelled')) {
      return createWalletError('USER_REJECTED', exception, walletName);
    }
    
    if (message.includes('network') || message.includes('mismatch')) {
      return createWalletError('NETWORK_MISMATCH', exception, walletName);
    }
    
    if (message.includes('insufficient') || message.includes('funds')) {
      return createWalletError('INSUFFICIENT_FUNDS', exception, walletName);
    }
    
    if (message.includes('transaction') || message.includes('submit')) {
      return createWalletError('TRANSACTION_FAILED', exception, walletName);
    }
  }
  
  // Default to connection failed
  return createWalletError('CONNECTION_FAILED', exception, walletName);
}
