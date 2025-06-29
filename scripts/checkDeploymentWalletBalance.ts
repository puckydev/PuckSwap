#!/usr/bin/env tsx

import { Lucid, Blockfrost } from '@lucid-evolution/lucid';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function checkDeploymentWalletBalance() {
  console.log('💰 Checking deployment wallet balance...');
  
  const lucid = await Lucid(
    new Blockfrost(`https://cardano-preprod.blockfrost.io/api/v0`, process.env.NEXT_PUBLIC_PREPROD_API_KEY!),
    'Preprod'
  );
  
  const deploymentAddress = process.env.DEPLOYMENT_WALLET_ADDRESS!;
  console.log('📍 Deployment Address:', deploymentAddress);
  
  try {
    const utxos = await lucid.utxosAt(deploymentAddress);
    const balance = utxos.reduce((acc, utxo) => acc + utxo.assets.lovelace, 0n);
    
    console.log(`💰 Wallet Balance: ${Number(balance) / 1_000_000} ADA`);
    console.log(`📦 UTxOs: ${utxos.length}`);
    
    if (balance < 100_000_000n) {
      console.log('⚠️  Insufficient funds. Need at least 100 ADA for deployment.');
      console.log('🚰 Fund this address from Preprod faucet:');
      console.log('   https://docs.cardano.org/cardano-testnet/tools/faucet');
      return false;
    } else {
      console.log('✅ Sufficient funds for deployment.');
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to check wallet balance:', error);
    return false;
  }
}

if (require.main === module) {
  checkDeploymentWalletBalance().catch(console.error);
}

export { checkDeploymentWalletBalance };
