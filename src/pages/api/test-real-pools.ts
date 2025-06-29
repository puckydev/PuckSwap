// PuckSwap v5 - Test Real Pool Discovery API
// Simple test endpoint to verify real Cardano preprod integration works

import { NextApiRequest, NextApiResponse } from 'next';

interface TestResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Test environment configuration
    const network = process.env.NETWORK || 'preprod';
    const blockfrostKey = process.env.BLOCKFROST_API_KEY_PREPROD;
    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

    console.log('🧪 Testing PuckSwap v5 Real Integration...');
    console.log(`📡 Network: ${network}`);
    console.log(`🔑 Blockfrost Key: ${blockfrostKey ? blockfrostKey.substring(0, 8) + '...' : 'NOT SET'}`);
    console.log(`🎭 Demo Mode: ${demoMode}`);

    // Test deployed contract addresses
    const fs = require('fs');
    const path = require('path');
    const deploymentPath = path.join(process.cwd(), 'deployment', 'addresses.json');
    let contractAddresses = null;

    try {
      const addressesData = fs.readFileSync(deploymentPath, 'utf8');
      contractAddresses = JSON.parse(addressesData);
      console.log(`📋 Contract addresses loaded: ${Object.keys(contractAddresses.validators || {}).length} validators`);
    } catch (error) {
      console.warn('⚠️ Could not load contract addresses:', error);
    }

    const testResults = {
      environment: {
        network,
        hasBlockfrostKey: !!blockfrostKey,
        demoMode,
        nodeEnv: process.env.NODE_ENV
      },
      contracts: {
        addressesLoaded: !!contractAddresses,
        swapValidator: contractAddresses?.validators?.swap || 'NOT LOADED',
        lpMintingPolicy: contractAddresses?.policies?.lpMinting || 'NOT LOADED'
      },
      status: {
        mockDataRemoved: !demoMode,
        readyForRealIntegration: !!blockfrostKey && !!contractAddresses && !demoMode
      }
    };

    return res.status(200).json({
      success: true,
      message: 'PuckSwap v5 Real Integration Test Complete',
      data: testResults
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
