#!/usr/bin/env tsx

/**
 * PuckSwap v5 - Context7 Integration Configuration Script
 * 
 * Configures Context7 monitoring system to track deployed contracts
 * and verify real-time data feeds are working correctly.
 */

import { getPuckSwapEnvironmentConfig } from '../src/config/env';
import { loadContractAddresses } from '../src/lucid/utils/contractAddresses';

interface Context7MonitorConfig {
  network: string;
  endpoint: string;
  apiKey?: string;
  contracts: {
    validators: string[];
    policies: string[];
  };
  monitoring: {
    poolAddresses: string[];
    governanceAddress: string;
    stakingAddress: string;
    registryAddress: string;
    crossChainAddress: string;
  };
}

async function configureContext7Integration() {
  console.log('🔧 Configuring Context7 Integration...\n');

  try {
    // Get environment configuration
    const envConfig = getPuckSwapEnvironmentConfig();
    const deploymentInfo = loadContractAddresses();
    const addresses = deploymentInfo.addresses;

    console.log(`📡 Network: ${envConfig.network}`);
    console.log(`🌍 Context7 Endpoint: ${envConfig.context7Endpoint}`);
    console.log(`🔑 API Key: ${envConfig.context7ApiKey ? 'Configured' : 'Not configured'}\n`);

    // Create Context7 monitoring configuration
    const context7Config: Context7MonitorConfig = {
      network: envConfig.network,
      endpoint: envConfig.context7Endpoint,
      apiKey: envConfig.context7ApiKey,
      contracts: {
        validators: [
          addresses.validators.swap,
          addresses.validators.liquidityProvision,
          addresses.validators.withdrawal,
          addresses.validators.governance,
          addresses.validators.staking,
          addresses.validators.registry,
          addresses.validators.crossChainRouter
        ],
        policies: [
          addresses.policies.lpMinting,
          addresses.policies.pADAMinting
        ]
      },
      monitoring: {
        poolAddresses: [addresses.validators.swap], // Main pool for PUCKY/ADA
        governanceAddress: addresses.validators.governance,
        stakingAddress: addresses.validators.staking,
        registryAddress: addresses.validators.registry,
        crossChainAddress: addresses.validators.crossChainRouter
      }
    };

    console.log('📋 Context7 Monitoring Configuration:');
    console.log('   Validators to Monitor:');
    context7Config.contracts.validators.forEach((addr, i) => {
      const names = ['Swap', 'Liquidity', 'Withdrawal', 'Governance', 'Staking', 'Registry', 'Cross-Chain'];
      console.log(`     ${names[i]}: ${addr}`);
    });
    
    console.log('   Policies to Monitor:');
    console.log(`     LP Minting: ${context7Config.contracts.policies[0]}`);
    console.log(`     pADA Minting: ${context7Config.contracts.policies[1]}\n`);

    // Test Context7 connectivity
    console.log('🧪 Testing Context7 Connectivity...');
    
    try {
      const testEndpoint = `${envConfig.context7Endpoint}/health`;
      console.log(`   Testing: ${testEndpoint}`);
      
      const response = await fetch(testEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(envConfig.context7ApiKey && { 'Authorization': `Bearer ${envConfig.context7ApiKey}` })
        }
      });

      if (response.ok) {
        console.log('✅ Context7 endpoint is accessible');
        const data = await response.json().catch(() => ({ status: 'ok' }));
        console.log(`   Status: ${data.status || 'healthy'}`);
      } else {
        console.log(`⚠️  Context7 endpoint returned ${response.status}: ${response.statusText}`);
        console.log('   This may be expected if Context7 is not yet configured for these contracts');
      }
    } catch (error) {
      console.log(`⚠️  Context7 connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log('   This may be expected if Context7 is not yet configured');
    }

    // Test individual contract monitoring endpoints
    console.log('\n🔍 Testing Contract Monitoring Endpoints...');
    
    const testEndpoints = [
      { name: 'Pool Data', path: '/pools/PUCKY-ADA' },
      { name: 'Governance', path: '/governance' },
      { name: 'Staking', path: '/staking' },
      { name: 'Registry', path: '/registry' }
    ];

    for (const endpoint of testEndpoints) {
      try {
        const url = `${envConfig.context7Endpoint}${endpoint.path}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(envConfig.context7ApiKey && { 'Authorization': `Bearer ${envConfig.context7ApiKey}` })
          }
        });

        if (response.ok) {
          console.log(`✅ ${endpoint.name} endpoint is accessible`);
        } else {
          console.log(`⚠️  ${endpoint.name} endpoint returned ${response.status}`);
        }
      } catch (error) {
        console.log(`⚠️  ${endpoint.name} endpoint test failed`);
      }
    }

    // Save Context7 configuration for reference
    const configPath = 'deployment/context7-config.json';
    const fs = await import('fs/promises');
    await fs.writeFile(configPath, JSON.stringify(context7Config, null, 2));
    console.log(`\n💾 Context7 configuration saved to: ${configPath}`);

    console.log('\n🎯 Context7 Integration Summary:');
    console.log(`   Network: ${context7Config.network}`);
    console.log(`   Monitored Contracts: ${context7Config.contracts.validators.length + context7Config.contracts.policies.length}`);
    console.log(`   Endpoint: ${context7Config.endpoint}`);
    console.log(`   Configuration: Saved`);

    console.log('\n📝 Next Steps:');
    console.log('   1. Ensure Context7 is configured to monitor these contract addresses');
    console.log('   2. Verify real-time data feeds are working');
    console.log('   3. Test API endpoints return actual blockchain data');
    console.log('   4. Proceed with end-to-end testing');

    console.log('\n🚀 Context7 integration configuration completed!');

  } catch (error) {
    console.error('❌ Context7 configuration failed:', error);
    process.exit(1);
  }
}

// Run configuration
configureContext7Integration().catch(console.error);
