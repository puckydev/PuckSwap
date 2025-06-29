
// Test environment configuration using tsx for TypeScript support
import { getEnvironmentConfig, validateEnvironmentConfig } from '../src/lib/environment-config.ts';

try {
  // Set environment variables
  process.env.NETWORK = 'preview';
  process.env.BLOCKFROST_API_KEY = 'preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL';

  // Get configuration
  const envConfig = getEnvironmentConfig();

  // Validate configuration
  const isValid = validateEnvironmentConfig();

  // Output results
  console.log(JSON.stringify({
    network: envConfig.network,
    lucidNetwork: envConfig.lucidNetwork,
    apiKey: envConfig.blockfrostApiKey,
    isMainnet: envConfig.isMainnet,
    isTestnet: envConfig.isTestnet,
    isDemoMode: envConfig.isDemoMode,
    isValid: isValid
  }));

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
