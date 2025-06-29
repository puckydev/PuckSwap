/**
 * PuckSwap Wallet Migration Utility
 * 
 * Provides feature flag support for switching between old and new wallet implementations
 * Enables gradual migration and fallback capabilities
 */

import { useState, useEffect, useCallback } from 'react';

// Feature flag configuration
export const WALLET_FEATURE_FLAGS = {
  USE_CARDANO_CONNECT_WALLET: process.env.NEXT_PUBLIC_USE_CARDANO_CONNECT_WALLET === 'true',
  ENABLE_WALLET_FALLBACK: process.env.NEXT_PUBLIC_ENABLE_WALLET_FALLBACK !== 'false',
  WALLET_MIGRATION_MODE: process.env.NEXT_PUBLIC_WALLET_MIGRATION_MODE || 'gradual', // 'gradual' | 'immediate' | 'testing'
} as const;

export type WalletImplementation = 'legacy' | 'cardano-connect-wallet';

export interface WalletMigrationState {
  currentImplementation: WalletImplementation;
  isTransitioning: boolean;
  fallbackAvailable: boolean;
  migrationProgress: number;
  lastError: string | null;
}

export interface WalletMigrationActions {
  switchToLegacy: () => Promise<void>;
  switchToNew: () => Promise<void>;
  enableFallback: () => void;
  disableFallback: () => void;
  resetMigration: () => void;
  testImplementation: (implementation: WalletImplementation) => Promise<boolean>;
}

/**
 * Hook for managing wallet implementation migration
 */
export function useWalletMigration(): WalletMigrationState & WalletMigrationActions {
  const [state, setState] = useState<WalletMigrationState>({
    currentImplementation: WALLET_FEATURE_FLAGS.USE_CARDANO_CONNECT_WALLET ? 'cardano-connect-wallet' : 'legacy',
    isTransitioning: false,
    fallbackAvailable: WALLET_FEATURE_FLAGS.ENABLE_WALLET_FALLBACK,
    migrationProgress: 0,
    lastError: null
  });

  /**
   * Switch to legacy wallet implementation
   */
  const switchToLegacy = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isTransitioning: true, lastError: null }));
    
    try {
      console.log('🔄 Switching to legacy wallet implementation...');
      
      // Simulate migration steps
      setState(prev => ({ ...prev, migrationProgress: 25 }));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setState(prev => ({ ...prev, migrationProgress: 50 }));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setState(prev => ({ ...prev, migrationProgress: 75 }));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setState(prev => ({ 
        ...prev, 
        currentImplementation: 'legacy',
        migrationProgress: 100,
        isTransitioning: false
      }));
      
      console.log('✅ Successfully switched to legacy wallet implementation');
      
      // Store preference
      localStorage.setItem('puckswap_wallet_implementation', 'legacy');
      
    } catch (error) {
      console.error('❌ Failed to switch to legacy implementation:', error);
      setState(prev => ({ 
        ...prev, 
        isTransitioning: false,
        migrationProgress: 0,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  /**
   * Switch to new cardano-connect-wallet implementation
   */
  const switchToNew = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isTransitioning: true, lastError: null }));
    
    try {
      console.log('🔄 Switching to cardano-connect-wallet implementation...');
      
      // Test if new implementation is available
      const isAvailable = await testImplementation('cardano-connect-wallet');
      if (!isAvailable) {
        throw new Error('cardano-connect-wallet library is not available');
      }
      
      // Simulate migration steps
      setState(prev => ({ ...prev, migrationProgress: 25 }));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setState(prev => ({ ...prev, migrationProgress: 50 }));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setState(prev => ({ ...prev, migrationProgress: 75 }));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setState(prev => ({ 
        ...prev, 
        currentImplementation: 'cardano-connect-wallet',
        migrationProgress: 100,
        isTransitioning: false
      }));
      
      console.log('✅ Successfully switched to cardano-connect-wallet implementation');
      
      // Store preference
      localStorage.setItem('puckswap_wallet_implementation', 'cardano-connect-wallet');
      
    } catch (error) {
      console.error('❌ Failed to switch to cardano-connect-wallet implementation:', error);
      setState(prev => ({ 
        ...prev, 
        isTransitioning: false,
        migrationProgress: 0,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      }));
      
      // Auto-fallback if enabled
      if (state.fallbackAvailable) {
        console.log('🔄 Auto-falling back to legacy implementation...');
        await switchToLegacy();
      }
    }
  }, [state.fallbackAvailable]);

  /**
   * Enable fallback mechanism
   */
  const enableFallback = useCallback((): void => {
    setState(prev => ({ ...prev, fallbackAvailable: true }));
    localStorage.setItem('puckswap_wallet_fallback_enabled', 'true');
    console.log('✅ Wallet fallback enabled');
  }, []);

  /**
   * Disable fallback mechanism
   */
  const disableFallback = useCallback((): void => {
    setState(prev => ({ ...prev, fallbackAvailable: false }));
    localStorage.setItem('puckswap_wallet_fallback_enabled', 'false');
    console.log('🚫 Wallet fallback disabled');
  }, []);

  /**
   * Reset migration state
   */
  const resetMigration = useCallback((): void => {
    setState(prev => ({
      ...prev,
      isTransitioning: false,
      migrationProgress: 0,
      lastError: null
    }));
    
    // Clear stored preferences
    localStorage.removeItem('puckswap_wallet_implementation');
    localStorage.removeItem('puckswap_wallet_fallback_enabled');
    
    console.log('🔄 Wallet migration state reset');
  }, []);

  /**
   * Test if a wallet implementation is working
   */
  const testImplementation = useCallback(async (implementation: WalletImplementation): Promise<boolean> => {
    try {
      console.log(`🧪 Testing ${implementation} implementation...`);
      
      if (implementation === 'legacy') {
        // Test legacy implementation
        const { WalletManager } = await import('./wallet');
        const walletManager = new WalletManager();
        return walletManager !== null;
      } else {
        // Test cardano-connect-wallet implementation
        try {
          const { useCardano } = await import('@cardano-foundation/cardano-connect-with-wallet');
          return typeof useCardano === 'function';
        } catch (importError) {
          console.warn('cardano-connect-with-wallet library not available:', importError);
          return false;
        }
      }
    } catch (error) {
      console.error(`❌ Failed to test ${implementation} implementation:`, error);
      return false;
    }
  }, []);

  // Load saved preferences on mount
  useEffect(() => {
    const savedImplementation = localStorage.getItem('puckswap_wallet_implementation') as WalletImplementation | null;
    const savedFallbackEnabled = localStorage.getItem('puckswap_wallet_fallback_enabled');
    
    if (savedImplementation && savedImplementation !== state.currentImplementation) {
      setState(prev => ({ ...prev, currentImplementation: savedImplementation }));
    }
    
    if (savedFallbackEnabled !== null) {
      setState(prev => ({ ...prev, fallbackAvailable: savedFallbackEnabled === 'true' }));
    }
  }, []);

  return {
    ...state,
    switchToLegacy,
    switchToNew,
    enableFallback,
    disableFallback,
    resetMigration,
    testImplementation
  };
}

/**
 * Utility function to get the current wallet implementation
 */
export function getCurrentWalletImplementation(): WalletImplementation {
  if (typeof window === 'undefined') {
    return WALLET_FEATURE_FLAGS.USE_CARDANO_CONNECT_WALLET ? 'cardano-connect-wallet' : 'legacy';
  }
  
  const saved = localStorage.getItem('puckswap_wallet_implementation') as WalletImplementation | null;
  if (saved) {
    return saved;
  }
  
  return WALLET_FEATURE_FLAGS.USE_CARDANO_CONNECT_WALLET ? 'cardano-connect-wallet' : 'legacy';
}

/**
 * Utility function to check if fallback is enabled
 */
export function isFallbackEnabled(): boolean {
  if (typeof window === 'undefined') {
    return WALLET_FEATURE_FLAGS.ENABLE_WALLET_FALLBACK;
  }
  
  const saved = localStorage.getItem('puckswap_wallet_fallback_enabled');
  if (saved !== null) {
    return saved === 'true';
  }
  
  return WALLET_FEATURE_FLAGS.ENABLE_WALLET_FALLBACK;
}

/**
 * Migration status reporter
 */
export function reportMigrationStatus(): void {
  const implementation = getCurrentWalletImplementation();
  const fallbackEnabled = isFallbackEnabled();
  
  console.log('📊 PuckSwap Wallet Migration Status:');
  console.log(`   Current Implementation: ${implementation}`);
  console.log(`   Fallback Enabled: ${fallbackEnabled}`);
  console.log(`   Feature Flags:`, WALLET_FEATURE_FLAGS);
}
