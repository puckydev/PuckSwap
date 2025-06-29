// PuckSwap v4 Enterprise - Treasury Dashboard
// Comprehensive treasury management interface with revenue tracking and distribution
// Retro terminal aesthetic with professional financial analytics

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { PuckSwapTreasuryV4, RevenueRecord, DistributionRecord, TreasuryDatum } from '../lucid/treasury-v4';
import { TreasuryMonitor, TreasuryState, TreasuryAnalytics } from '../context7/treasury-monitor';
import { formatADA, formatToken, formatPercentage, formatUSD } from '../lib/format-utils';

// Treasury interfaces
interface TreasuryDashboardProps {
  treasury?: PuckSwapTreasuryV4;
  monitor?: TreasuryMonitor;
  isDemoMode?: boolean;
}

interface DistributionFormData {
  targetType: string;
  amount: string;
  recipients: string[];
  purpose: string;
  governanceProposalId?: string;
}

export default function TreasuryDashboard({ 
  treasury, 
  monitor, 
  isDemoMode = false 
}: TreasuryDashboardProps) {
  // State management
  const [treasuryState, setTreasuryState] = useState<TreasuryState | null>(null);
  const [analytics, setAnalytics] = useState<TreasuryAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'distributions' | 'analytics' | 'manage'>('overview');
  const [revenueHistory, setRevenueHistory] = useState<RevenueRecord[]>([]);
  const [distributionHistory, setDistributionHistory] = useState<DistributionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);

  // Form state
  const [distributionForm, setDistributionForm] = useState<DistributionFormData>({
    targetType: 'LiquidityProviders',
    amount: '',
    recipients: [],
    purpose: '',
    governanceProposalId: ''
  });

  // Load treasury state
  const loadTreasuryState = useCallback(async () => {
    if (isDemoMode) {
      // Demo data
      const demoState: TreasuryState = {
        totalRevenueCollected: 2500000000000n, // 2.5M ADA
        totalDistributed: 1800000000000n, // 1.8M ADA
        currentBalance: {
          "": "700000000000", // 700K ADA
          "demo_pucky_policy": "50000000000000" // 50M PUCKY
        },
        revenueRecords: [
          {
            source: {
              type: 'SwapFees',
              poolId: 'pool_ada_pucky',
              volume: 100000000000n,
              amount: 300000000n
            },
            tokenPolicy: '',
            tokenName: '',
            amount: 300000000n, // 300 ADA
            receivedAtSlot: 1000000,
            transactionHash: 'demo_tx_1',
            usdValue: 105,
            dailyTotal: 1500000000n,
            sourcePercentage: 20
          },
          {
            source: {
              type: 'RegistrationFees',
              poolCount: 5,
              amount: 10000000000n
            },
            tokenPolicy: '',
            tokenName: '',
            amount: 10000000000n, // 10K ADA
            receivedAtSlot: 999000,
            transactionHash: 'demo_tx_2',
            usdValue: 3500,
            dailyTotal: 10000000000n,
            sourcePercentage: 80
          }
        ],
        distributionRecords: [
          {
            target: {
              type: 'LiquidityProviders',
              poolId: 'pool_ada_pucky',
              lpAddresses: ['addr1_lp_1', 'addr1_lp_2'],
              amounts: [50000000000n, 30000000000n]
            },
            tokenPolicy: '',
            tokenName: '',
            totalAmount: 80000000000n, // 80K ADA
            distributedAtSlot: 995000,
            transactionHash: 'demo_dist_1',
            usdValue: 28000,
            recipientCount: 2,
            distributionEfficiency: 98.5
          }
        ],
        lpRewardPercentage: 4000, // 40%
        developmentPercentage: 2000, // 20%
        governancePercentage: 1500, // 15%
        protocolPercentage: 1500, // 15%
        communityPercentage: 1000, // 10%
        governanceAddress: 'addr1_demo_governance',
        autoDistributionEnabled: true,
        distributionThreshold: 1000000000000n, // 1M ADA
        adminAddresses: ['addr1_demo_admin'],
        emergencyAdmin: 'addr1_demo_emergency',
        paused: false,
        maxSingleDistribution: 10000000000000n, // 10M ADA
        dailyDistributionLimit: 50000000000000n, // 50M ADA
        lastDistributionSlot: 995000,
        supportedAssets: [
          { policy: '', name: '' },
          { policy: 'demo_pucky_policy', name: 'PUCKY' }
        ]
      };

      const demoAnalytics: TreasuryAnalytics = {
        totalRevenue: 2500000000000n,
        totalDistributed: 1800000000000n,
        currentTVL: 750000000000n,
        revenueGrowthRate: 15.5,
        distributionEfficiency: 72,
        revenueBySource: new Map([
          ['SwapFees', 1500000000000n],
          ['RegistrationFees', 800000000000n],
          ['GovernanceFees', 200000000000n]
        ]),
        distributionByTarget: new Map([
          ['LiquidityProviders', 720000000000n],
          ['DevelopmentFund', 360000000000n],
          ['GovernanceRewards', 270000000000n],
          ['ProtocolUpgrade', 270000000000n],
          ['CommunityGrants', 180000000000n]
        ]),
        monthlyRevenue: [],
        topRevenueGenerators: [],
        distributionHistory: [],
        assetBreakdown: new Map([
          ['ADA', { balance: 700000000000n, percentage: 93.3, usdValue: 245000 }],
          ['PUCKY', { balance: 50000000000000n, percentage: 6.7, usdValue: 50000 }]
        ])
      };

      setTreasuryState(demoState);
      setAnalytics(demoAnalytics);
      setRevenueHistory(demoState.revenueRecords);
      setDistributionHistory(demoState.distributionRecords);
      return;
    }

    if (!treasury || !monitor) return;

    try {
      setIsLoading(true);
      
      const state = monitor.getCurrentState();
      if (state) {
        setTreasuryState(state);
      }

      const analyticsData = monitor.getAnalytics();
      if (analyticsData) {
        setAnalytics(analyticsData);
      }

      const revenue = monitor.getRevenueHistory(50);
      setRevenueHistory(revenue);

      const distributions = monitor.getDistributionHistory(50);
      setDistributionHistory(distributions);

    } catch (error) {
      console.error('Error loading treasury state:', error);
      toast.error('Failed to load treasury data');
    } finally {
      setIsLoading(false);
    }
  }, [treasury, monitor, isDemoMode]);

  // Load data on component mount
  useEffect(() => {
    loadTreasuryState();
  }, [loadTreasuryState]);

  // Set up real-time updates
  useEffect(() => {
    if (!monitor || isDemoMode) return;

    const handleTreasuryUpdate = () => {
      loadTreasuryState();
    };

    monitor.addEventListener('*', handleTreasuryUpdate);

    return () => {
      monitor.removeEventListener('*', handleTreasuryUpdate);
    };
  }, [monitor, isDemoMode, loadTreasuryState]);

  // Distribute revenue
  const handleDistributeRevenue = async () => {
    if (!treasury && !isDemoMode) {
      toast.error('Treasury system not connected');
      return;
    }

    if (!distributionForm.amount || parseFloat(distributionForm.amount) <= 0) {
      toast.error('Please enter a valid distribution amount');
      return;
    }

    try {
      setIsDistributing(true);

      if (isDemoMode) {
        // Simulate distribution
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success(`Demo distribution of ${distributionForm.amount} ADA completed!`, {
          duration: 5000,
          icon: '💰'
        });
        
        // Reset form
        setDistributionForm({
          targetType: 'LiquidityProviders',
          amount: '',
          recipients: [],
          purpose: '',
          governanceProposalId: ''
        });
      } else if (treasury) {
        // Build distribution targets based on form
        const targets = [{
          type: distributionForm.targetType as any,
          amount: BigInt(Math.floor(parseFloat(distributionForm.amount) * 1_000_000)),
          purpose: distributionForm.purpose
        }];

        const txHash = await treasury.distributeRevenue({
          targets,
          governanceProposalId: distributionForm.governanceProposalId ? 
            parseInt(distributionForm.governanceProposalId) : undefined
        });

        toast.success(`Revenue distributed! TX: ${txHash.slice(0, 8)}...`, {
          duration: 10000,
          icon: '💰'
        });

        // Reset form and reload data
        setDistributionForm({
          targetType: 'LiquidityProviders',
          amount: '',
          recipients: [],
          purpose: '',
          governanceProposalId: ''
        });
        await loadTreasuryState();
      }
    } catch (error) {
      console.error('Error distributing revenue:', error);
      toast.error('Failed to distribute revenue');
    } finally {
      setIsDistributing(false);
    }
  };

  // Auto-distribute revenue
  const handleAutoDistribute = async () => {
    if (!treasury && !isDemoMode) {
      toast.error('Treasury system not connected');
      return;
    }

    try {
      setIsLoading(true);

      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success('Demo auto-distribution completed!', {
          duration: 5000,
          icon: '🤖'
        });
      } else if (treasury) {
        const txHash = await treasury.autoDistributeRevenue();
        toast.success(`Auto-distribution completed! TX: ${txHash.slice(0, 8)}...`, {
          duration: 10000,
          icon: '🤖'
        });

        await loadTreasuryState();
      }
    } catch (error) {
      console.error('Error auto-distributing revenue:', error);
      toast.error('Failed to auto-distribute revenue');
    } finally {
      setIsLoading(false);
    }
  };

  // Memoized calculations
  const treasuryStats = useMemo(() => {
    if (!treasuryState || !analytics) return null;

    const adaBalance = BigInt(treasuryState.currentBalance[""] || "0");
    const totalTVL = analytics.currentTVL;
    const distributionRate = treasuryState.totalRevenueCollected > 0n ? 
      Number(treasuryState.totalDistributed * 100n / treasuryState.totalRevenueCollected) : 0;

    const canAutoDistribute = treasuryState.autoDistributionEnabled && 
                             adaBalance >= treasuryState.distributionThreshold;

    return {
      totalRevenue: Number(treasuryState.totalRevenueCollected) / 1_000_000, // Convert to ADA
      totalDistributed: Number(treasuryState.totalDistributed) / 1_000_000,
      currentBalance: Number(adaBalance) / 1_000_000,
      totalTVL: Number(totalTVL) / 1_000_000,
      distributionRate,
      revenueGrowthRate: analytics.revenueGrowthRate,
      distributionEfficiency: analytics.distributionEfficiency,
      canAutoDistribute,
      autoDistributionEnabled: treasuryState.autoDistributionEnabled,
      distributionThreshold: Number(treasuryState.distributionThreshold) / 1_000_000
    };
  }, [treasuryState, analytics]);

  return (
    <div className="min-h-screen bg-terminal-black text-terminal-green font-mono">
      {/* Header */}
      <div className="border-b border-terminal-green/30 bg-terminal-black/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-glow">
                TREASURY_DASHBOARD.exe
              </h1>
              <p className="text-terminal-green/70 text-sm mt-1">
                Revenue Management • Distribution Control • Financial Analytics
              </p>
            </div>
            
            {treasuryStats && (
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <div className="text-terminal-amber font-bold">
                    {formatADA(treasuryStats.currentBalance)}
                  </div>
                  <div className="text-terminal-green/70">Current Balance</div>
                </div>
                <div className="text-center">
                  <div className="text-terminal-amber font-bold">
                    {treasuryStats.distributionRate.toFixed(1)}%
                  </div>
                  <div className="text-terminal-green/70">Distributed</div>
                </div>
                <div className="text-center">
                  <div className={`font-bold ${treasuryStats.canAutoDistribute ? 'text-terminal-amber' : 'text-terminal-green/50'}`}>
                    {treasuryStats.canAutoDistribute ? 'READY' : 'WAITING'}
                  </div>
                  <div className="text-terminal-green/70">Auto-Dist</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex space-x-1 bg-terminal-gray/10 p-1 rounded border border-terminal-green/30">
          {[
            { id: 'overview', label: 'OVERVIEW', icon: '📊' },
            { id: 'revenue', label: 'REVENUE', icon: '💰' },
            { id: 'distributions', label: 'DISTRIBUTIONS', icon: '📤' },
            { id: 'analytics', label: 'ANALYTICS', icon: '📈' },
            { id: 'manage', label: 'MANAGE', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 px-4 text-sm font-bold transition-all duration-300 rounded ${
                activeTab === tab.id
                  ? 'bg-terminal-green text-terminal-black'
                  : 'text-terminal-green hover:bg-terminal-green/10'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TreasuryOverview 
                stats={treasuryStats}
                analytics={analytics}
                isLoading={isLoading}
                onAutoDistribute={handleAutoDistribute}
              />
            </motion.div>
          )}

          {activeTab === 'revenue' && (
            <motion.div
              key="revenue"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <RevenueHistory 
                revenueHistory={revenueHistory}
                analytics={analytics}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {activeTab === 'distributions' && (
            <motion.div
              key="distributions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <DistributionHistory 
                distributionHistory={distributionHistory}
                analytics={analytics}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TreasuryAnalytics 
                analytics={analytics}
                treasuryState={treasuryState}
                monitor={monitor}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {activeTab === 'manage' && (
            <motion.div
              key="manage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TreasuryManagement 
                distributionForm={distributionForm}
                setDistributionForm={setDistributionForm}
                onDistribute={handleDistributeRevenue}
                onAutoDistribute={handleAutoDistribute}
                treasuryState={treasuryState}
                isDistributing={isDistributing}
                isLoading={isLoading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
