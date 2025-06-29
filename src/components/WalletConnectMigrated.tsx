'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useWalletMigration, getCurrentWalletImplementation } from '../lib/wallet-migration';

// Dynamic imports to avoid loading issues
import dynamic from 'next/dynamic';

const WalletConnect = dynamic(() => import('./WalletConnect'), { 
  ssr: false,
  loading: () => <WalletConnectSkeleton />
});

const WalletConnectNew = dynamic(() => import('./WalletConnectNew'), { 
  ssr: false,
  loading: () => <WalletConnectSkeleton />
});

// Loading skeleton component
function WalletConnectSkeleton() {
  return (
    <div className="terminal-card p-4 animate-pulse">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-terminal-green/20 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-terminal-green/20 rounded w-24 mb-2"></div>
          <div className="h-3 bg-terminal-gray/20 rounded w-32"></div>
        </div>
        <div className="h-8 bg-terminal-green/20 rounded w-20"></div>
      </div>
    </div>
  );
}

interface WalletConnectMigratedProps {
  onWalletConnected?: (walletInfo: any) => void;
  onWalletDisconnected?: () => void;
  className?: string;
  forceImplementation?: 'legacy' | 'cardano-connect-wallet';
}

export default function WalletConnectMigrated({
  onWalletConnected,
  onWalletDisconnected,
  className = '',
  forceImplementation
}: WalletConnectMigratedProps) {
  const {
    currentImplementation,
    isTransitioning,
    fallbackAvailable,
    migrationProgress,
    lastError,
    switchToLegacy,
    switchToNew,
    resetMigration,
    testImplementation
  } = useWalletMigration();

  const [showMigrationControls, setShowMigrationControls] = useState(false);
  const [testResults, setTestResults] = useState<{
    legacy: boolean | null;
    new: boolean | null;
  }>({ legacy: null, new: null });

  // Determine which implementation to use
  const activeImplementation = forceImplementation || currentImplementation;

  // Test both implementations on mount (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const runTests = async () => {
        const legacyTest = await testImplementation('legacy');
        const newTest = await testImplementation('cardano-connect-wallet');
        
        setTestResults({
          legacy: legacyTest,
          new: newTest
        });

        console.log('🧪 Wallet Implementation Test Results:');
        console.log(`   Legacy: ${legacyTest ? '✅' : '❌'}`);
        console.log(`   New (cardano-connect-wallet): ${newTest ? '✅' : '❌'}`);
      };

      runTests();
    }
  }, [testImplementation]);

  // Handle migration errors
  useEffect(() => {
    if (lastError) {
      toast.error(`Migration Error: ${lastError}`, {
        duration: 8000,
        icon: '⚠️'
      });
    }
  }, [lastError]);

  const handleSwitchToLegacy = async () => {
    try {
      await switchToLegacy();
      toast.success('Switched to legacy wallet implementation', {
        icon: '🔄'
      });
    } catch (error) {
      toast.error('Failed to switch to legacy implementation', {
        icon: '❌'
      });
    }
  };

  const handleSwitchToNew = async () => {
    try {
      await switchToNew();
      toast.success('Switched to new wallet implementation', {
        icon: '🚀'
      });
    } catch (error) {
      toast.error('Failed to switch to new implementation', {
        icon: '❌'
      });
    }
  };

  const handleResetMigration = () => {
    resetMigration();
    toast.success('Migration state reset', {
      icon: '🔄'
    });
  };

  // Show migration progress during transition
  if (isTransitioning) {
    return (
      <div className={`wallet-migration-progress ${className}`}>
        <div className="terminal-card p-6">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-terminal-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="font-mono text-terminal-green text-lg mb-2">
              Migrating Wallet Implementation
            </h3>
            <div className="w-full bg-terminal-bg-light rounded-full h-2 mb-2">
              <div 
                className="bg-terminal-green h-2 rounded-full transition-all duration-300"
                style={{ width: `${migrationProgress}%` }}
              ></div>
            </div>
            <p className="font-mono text-terminal-gray text-sm">
              {migrationProgress}% Complete
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`wallet-connect-migrated ${className}`}>
      {/* Render the appropriate wallet component */}
      {activeImplementation === 'cardano-connect-wallet' ? (
        <WalletConnectNew
          onWalletConnected={onWalletConnected}
          onWalletDisconnected={onWalletDisconnected}
        />
      ) : (
        <WalletConnect />
      )}

      {/* Development migration controls */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4">
          <motion.button
            onClick={() => setShowMigrationControls(!showMigrationControls)}
            className="text-xs font-mono text-terminal-gray hover:text-terminal-green transition-colors"
            whileHover={{ scale: 1.05 }}
          >
            {showMigrationControls ? '▼' : '▶'} Migration Controls
          </motion.button>

          {showMigrationControls && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 p-3 bg-terminal-bg-light rounded border border-terminal/30"
            >
              <div className="space-y-2">
                <div className="text-xs font-mono text-terminal-gray">
                  Current: <span className="text-terminal-green">{activeImplementation}</span>
                </div>
                
                <div className="text-xs font-mono text-terminal-gray">
                  Fallback: <span className={fallbackAvailable ? 'text-terminal-green' : 'text-terminal-red'}>
                    {fallbackAvailable ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="text-xs font-mono text-terminal-gray">
                  Tests: 
                  <span className={`ml-1 ${testResults.legacy ? 'text-terminal-green' : 'text-terminal-red'}`}>
                    Legacy {testResults.legacy ? '✅' : '❌'}
                  </span>
                  <span className={`ml-2 ${testResults.new ? 'text-terminal-green' : 'text-terminal-red'}`}>
                    New {testResults.new ? '✅' : '❌'}
                  </span>
                </div>

                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={handleSwitchToLegacy}
                    disabled={activeImplementation === 'legacy' || isTransitioning}
                    className="px-2 py-1 text-xs font-mono border border-terminal-amber/30 rounded hover:bg-terminal-amber/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Use Legacy
                  </button>
                  
                  <button
                    onClick={handleSwitchToNew}
                    disabled={activeImplementation === 'cardano-connect-wallet' || isTransitioning}
                    className="px-2 py-1 text-xs font-mono border border-terminal-green/30 rounded hover:bg-terminal-green/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Use New
                  </button>
                  
                  <button
                    onClick={handleResetMigration}
                    disabled={isTransitioning}
                    className="px-2 py-1 text-xs font-mono border border-terminal-red/30 rounded hover:bg-terminal-red/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reset
                  </button>
                </div>

                {lastError && (
                  <div className="mt-2 p-2 bg-terminal-red/10 border border-terminal-red/30 rounded">
                    <p className="text-xs font-mono text-terminal-red">{lastError}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Production migration status indicator */}
      {process.env.NODE_ENV === 'production' && activeImplementation === 'cardano-connect-wallet' && (
        <div className="mt-2 text-xs font-mono text-terminal-gray text-center">
          Using enhanced wallet connection
        </div>
      )}
    </div>
  );
}

// Export utility functions for other components
export {
  getCurrentWalletImplementation,
  useWalletMigration
};
