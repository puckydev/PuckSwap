
import { getNetworkEnvironment, getBlockfrostApiKey } from '../src/lib/environment-config.ts';

// Test preprod
process.env.NETWORK = 'preprod';
const preprodNetwork = getNetworkEnvironment();
const preprodApiKey = getBlockfrostApiKey(preprodNetwork);

// Test mainnet
process.env.NETWORK = 'mainnet';
const mainnetNetwork = getNetworkEnvironment();
const mainnetApiKey = getBlockfrostApiKey(mainnetNetwork);

console.log(JSON.stringify({
  preprod: { network: preprodNetwork, apiKey: preprodApiKey },
  mainnet: { network: mainnetNetwork, apiKey: mainnetApiKey }
}));
