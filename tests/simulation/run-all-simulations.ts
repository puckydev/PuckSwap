#!/usr/bin/env tsx
/**
 * PuckSwap v5 Complete Deployment Simulation Test Suite
 * Orchestrates all simulation scenarios and generates comprehensive reports
 */

import { getTestConfig, validateTestConfig } from "./config/test-config";
import {
  generateTestReport,
  logTestReport,
  saveTestReport,
  TestResult
} from "./utils/test-helpers";

import PoolLifecycleSimulation from "./scenarios/pool-lifecycle-simulation";
import GovernanceSimulation from "./scenarios/governance-simulation";
import LiquidStakingSimulation from "./scenarios/liquid-staking-simulation";
import CrossChainSimulation from "./scenarios/crosschain-simulation";
import BackendMonitoringVerification from "./scenarios/backend-monitoring-verification";

export interface SimulationSuite {
  name: string;
  description: string;
  simulation: any;
  enabled: boolean;
}

export class PuckSwapV5SimulationRunner {
  private config = getTestConfig();
  private allResults: TestResult[] = [];
  private suiteStartTime = Date.now();

  private simulations: SimulationSuite[] = [
    {
      name: "Pool Lifecycle",
      description: "AMM pool deployment, liquidity provision, swaps, and withdrawals",
      simulation: PoolLifecycleSimulation,
      enabled: true
    },
    {
      name: "Governance",
      description: "DAO proposal submission, voting, and execution",
      simulation: GovernanceSimulation,
      enabled: true
    },
    {
      name: "Liquid Staking",
      description: "pADA minting, rewards syncing, and withdrawals",
      simulation: LiquidStakingSimulation,
      enabled: true
    },
    {
      name: "Cross-Chain Router",
      description: "Bridge transfers, nonce validation, and replay protection",
      simulation: CrossChainSimulation,
      enabled: true
    },
    {
      name: "Backend Monitoring",
      description: "Context7 monitor verification and event detection",
      simulation: BackendMonitoringVerification,
      enabled: true
    }
  ];

  /**
   * Run all simulation scenarios
   */
  async runAllSimulations(): Promise<void> {
    console.log("🚀 PUCKSWAP V5 DEPLOYMENT SIMULATION TEST SUITE");
    console.log("=" .repeat(60));
    console.log(`Network: ${this.config.network.toUpperCase()}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Test Pools: ${this.config.testPools.length}`);
    console.log(`Governance Proposals: ${this.config.governance.proposals.length}`);
    console.log("=" .repeat(60));

    // Validate configuration
    if (!validateTestConfig(this.config)) {
      console.error("❌ Invalid test configuration. Aborting simulation.");
      process.exit(1);
    }

    console.log("✅ Test configuration validated");
    console.log(`🎯 Running ${this.simulations.filter(s => s.enabled).length} simulation scenarios...\n`);

    // Run each simulation scenario
    for (const suite of this.simulations) {
      if (!suite.enabled) {
        console.log(`⏭️ Skipping ${suite.name} simulation (disabled)`);
        continue;
      }

      await this.runSimulationSuite(suite);
      
      // Delay between test suites
      if (this.config.execution.delayBetweenTests > 0) {
        console.log(`⏳ Waiting ${this.config.execution.delayBetweenTests}ms before next suite...\n`);
        await new Promise(resolve => setTimeout(resolve, this.config.execution.delayBetweenTests));
      }
    }

    // Generate and display final report
    await this.generateFinalReport();
  }

  /**
   * Run individual simulation suite
   */
  private async runSimulationSuite(suite: SimulationSuite): Promise<void> {
    console.log(`🧪 Starting ${suite.name} Simulation`);
    console.log(`📝 ${suite.description}`);
    console.log("-".repeat(50));

    const suiteStartTime = Date.now();

    try {
      // Initialize and run simulation
      const simulation = new suite.simulation(this.config);
      const results = await simulation.runSimulation();

      // Add suite metadata to results
      const suiteResults = results.map((result: TestResult) => ({
        ...result,
        testName: `${suite.name}: ${result.testName}`,
        suite: suite.name
      }));

      this.allResults.push(...suiteResults);

      const suiteDuration = Date.now() - suiteStartTime;
      const passedTests = results.filter((r: TestResult) => r.success).length;
      const totalTests = results.length;

      console.log(`✅ ${suite.name} Simulation completed in ${suiteDuration}ms`);
      console.log(`📊 Results: ${passedTests}/${totalTests} tests passed`);

      // Display suite-specific statistics if available
      if (simulation.getStatistics) {
        const stats = simulation.getStatistics();
        console.log(`📈 Statistics:`, stats);
      }

      console.log("");

    } catch (error) {
      const suiteDuration = Date.now() - suiteStartTime;
      console.error(`❌ ${suite.name} Simulation failed after ${suiteDuration}ms:`, error);

      // Add failure result
      this.allResults.push({
        testName: `${suite.name}: Suite Execution`,
        success: false,
        duration: suiteDuration,
        error: error instanceof Error ? error.message : String(error),
        suite: suite.name
      });

      console.log("");
    }
  }

  /**
   * Generate comprehensive final report
   */
  private async generateFinalReport(): Promise<void> {
    const totalDuration = Date.now() - this.suiteStartTime;
    
    console.log("📊 GENERATING FINAL SIMULATION REPORT");
    console.log("=" .repeat(60));

    // Generate overall report
    const report = generateTestReport(this.allResults);
    
    // Add simulation-specific metadata
    const enhancedReport = {
      ...report,
      simulation_metadata: {
        network: this.config.network,
        total_duration_ms: totalDuration,
        test_pools: this.config.testPools.length,
        governance_proposals: this.config.governance.proposals.length,
        supported_chains: this.config.crossChain.supportedChains.length,
        simulation_suites: this.simulations.filter(s => s.enabled).length,
        configuration: {
          timeout_ms: this.config.execution.timeoutMs,
          retry_attempts: this.config.execution.retryAttempts,
          detailed_logging: this.config.execution.enableDetailedLogging
        }
      },
      suite_breakdown: this.generateSuiteBreakdown()
    };

    // Display report
    logTestReport(enhancedReport);

    // Display suite breakdown
    console.log("\n📋 Suite Breakdown:");
    Object.entries(enhancedReport.suite_breakdown).forEach(([suite, stats]: [string, any]) => {
      const status = stats.success_rate === 100 ? "✅" : stats.success_rate >= 80 ? "⚠️" : "❌";
      console.log(`  ${status} ${suite}: ${stats.passed}/${stats.total} (${stats.success_rate.toFixed(1)}%)`);
    });

    // Display network and environment info
    console.log("\n🌍 Environment Information:");
    console.log(`  Network: ${this.config.network.toUpperCase()}`);
    console.log(`  Blockfrost API: ${this.config.blockfrostApiKey.substring(0, 8)}...`);
    console.log(`  Demo Mode: ${process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? 'Enabled' : 'Disabled'}`);

    // Save detailed report if enabled
    if (this.config.execution.generateReports) {
      await saveTestReport(enhancedReport, `puckswap-v5-simulation-${this.config.network}-${Date.now()}.json`);
    }

    // Display final status
    const overallSuccessRate = (enhancedReport.passedTests / enhancedReport.totalTests) * 100;
    console.log("\n" + "=" .repeat(60));
    
    if (overallSuccessRate === 100) {
      console.log("🎉 ALL SIMULATIONS PASSED! PuckSwap v5 is ready for deployment.");
    } else if (overallSuccessRate >= 90) {
      console.log("✅ SIMULATIONS MOSTLY SUCCESSFUL. Minor issues detected.");
    } else if (overallSuccessRate >= 70) {
      console.log("⚠️ SIMULATIONS PARTIALLY SUCCESSFUL. Review failures before deployment.");
    } else {
      console.log("❌ SIMULATIONS FAILED. Critical issues detected. Do not deploy.");
    }

    console.log(`📊 Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`);
    console.log(`⏱️ Total Execution Time: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log("=" .repeat(60));

    // Exit with appropriate code
    process.exit(overallSuccessRate >= 90 ? 0 : 1);
  }

  /**
   * Generate suite breakdown statistics
   */
  private generateSuiteBreakdown(): Record<string, any> {
    const breakdown: Record<string, any> = {};

    this.simulations.forEach(suite => {
      const suiteResults = this.allResults.filter((r: any) => r.suite === suite.name);
      const passed = suiteResults.filter(r => r.success).length;
      const total = suiteResults.length;
      
      breakdown[suite.name] = {
        total,
        passed,
        failed: total - passed,
        success_rate: total > 0 ? (passed / total) * 100 : 0,
        average_duration: total > 0 ? suiteResults.reduce((sum, r) => sum + r.duration, 0) / total : 0
      };
    });

    return breakdown;
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    const runner = new PuckSwapV5SimulationRunner();
    await runner.runAllSimulations();
  } catch (error) {
    console.error("💥 Simulation runner crashed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default PuckSwapV5SimulationRunner;
