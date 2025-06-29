/**
 * PuckSwap v5 DeFi - Contract Addresses Utility
 *
 * Browser-compatible contract address loader utility that reads deployed contract addresses
 * from /deployment/addresses.json via API routes for frontend and direct file access for backend.
 *
 * Features:
 * - Browser-compatible loading via API routes
 * - Node.js fs/promises compatibility for backend and test suites
 * - Strongly typed interface with required contract addresses
 * - Network-specific loading (mainnet/preprod)
 * - Comprehensive error handling for missing/malformed files
 * - Automatic environment detection (browser vs Node.js)
 */

// Conditional imports - only import fs modules in Node.js environment
let fs: typeof import('fs').promises | undefined;
let fsSync: typeof import('fs') | undefined;
let path: typeof import('path') | undefined;

// Only import Node.js modules when running in Node.js environment
if (typeof window === 'undefined') {
  try {
    fs = require('fs').promises;
    fsSync = require('fs');
    path = require('path');
  } catch (error) {
    console.warn('Node.js modules not available, using browser-compatible mode');
  }
}

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

/**
 * Core AMM contract addresses interface for production deployment
 * Contains only the essential contracts for ADA ↔ PUCKY swaps
 */
export interface CoreAMMAddresses {
  swapValidator: string;
  liquidityProvisionValidator: string;
  liquidityWithdrawalValidator: string;
  lpMintingPolicy: string;
}

/**
 * Strongly typed contract addresses interface
 * All addresses are required for complete PuckSwap v5 deployment
 */
export interface ContractAddresses {
  validators: {
    swap: string;
    liquidityProvision: string;
    withdrawal: string;
    governance: string;
    staking: string;
    registry: string;
    crossChainRouter: string;
  };
  policies: {
    lpMinting: string;
    pADAMinting: string;
  };
}

/**
 * Raw deployment data structure from addresses.json
 */
interface DeploymentData {
  network: string;
  startTime?: string;
  endTime?: string;
  deployedAt?: string;
  // Support both old and new deployment formats
  addresses?: {
    // Old format with puckswap_ prefixes
    puckswap_swap_validator?: string;
    puckswap_liquidity_provision_validator?: string;
    puckswap_withdrawal_validator?: string;
    puckswap_governance_validator?: string;
    puckswap_liquid_staking_validator?: string;
    puckswap_pool_registry_validator?: string;
    puckswap_cross_chain_router_validator?: string;
    // New format without prefixes
    swap_validator?: string;
    liquidity_provision_validator?: string;
    withdrawal_validator?: string;
    governance_validator?: string;
    liquid_staking_validator?: string;
    pool_registry_validator?: string;
    cross_chain_router_validator?: string;
  };
  // New format with validators object
  validators?: {
    swap?: string;
    liquidityProvision?: string;
    withdrawal?: string;
    governance?: string;
    staking?: string;
    registry?: string;
    crossChainRouter?: string;
  };
  policyIds?: {
    lp_minting_policy?: string;
    pADA_minting_policy?: string;
  };
  // New format with policies object
  policies?: {
    lpMinting?: string;
    pADAMinting?: string;
  };
  success?: boolean;
  errors?: string[];
}

/**
 * Extended deployment information
 */
export interface DeploymentInfo {
  network: string;
  deployedAt: string;
  addresses: ContractAddresses;
  policyIds: {
    lpMinting: string;
    pADAMinting: string;
  };
}

// =============================================================================
// CONTRACT ADDRESS LOADING
// =============================================================================

/**
 * Load contract addresses from deployment/addresses.json (Browser-compatible)
 * @param network - Network to load addresses for ('mainnet' or 'preprod')
 * @returns Strongly typed contract addresses
 * @throws Error if addresses file is missing or malformed
 */
export function loadContractAddresses(network?: string): DeploymentInfo {
  // In browser environment, throw error directing to use async version
  if (typeof window !== 'undefined') {
    throw new Error(
      'loadContractAddresses() cannot be used in browser environment. ' +
      'Use loadContractAddressesAsync() instead or access via API routes.'
    );
  }

  // Node.js environment - use file system
  if (!fsSync || !path) {
    throw new Error('Node.js modules not available for file system access');
  }

  const targetNetwork = network || process.env.NETWORK || 'preprod';
  const addressesPath = path.resolve(process.cwd(), 'deployment', 'addresses.json');

  // Check if addresses file exists
  if (!fsSync.existsSync(addressesPath)) {
    throw new Error(
      `Contract addresses file not found: ${addressesPath}. ` +
      `Please run deployment first using: npm run deploy-v5-${targetNetwork}`
    );
  }

  let deploymentData: DeploymentData;

  try {
    const fileContent = fsSync.readFileSync(addressesPath, 'utf8');
    deploymentData = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(
      `Failed to parse contract addresses file: ${addressesPath}. ` +
      `File may be corrupted. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Validate network match
  if (deploymentData.network !== targetNetwork) {
    throw new Error(
      `Network mismatch: Expected '${targetNetwork}', found '${deploymentData.network}' in ${addressesPath}. ` +
      `Please deploy to the correct network or update NETWORK environment variable.`
    );
  }

  // Validate deployment success
  if (deploymentData.success === false) {
    const errors = deploymentData.errors?.join(', ') || 'Unknown deployment errors';
    throw new Error(
      `Deployment was not successful: ${errors}. Please redeploy contracts.`
    );
  }

  // Transform to strongly typed interface
  // Support both old and new deployment formats
  const contractAddresses: ContractAddresses = {
    validators: {
      swap: validateAddress(
        deploymentData.addresses.puckswap_swap_validator || deploymentData.validators?.swap || deploymentData.addresses?.swap_validator,
        'swap_validator'
      ),
      liquidityProvision: validateAddress(
        deploymentData.addresses.puckswap_liquidity_provision_validator || deploymentData.validators?.liquidityProvision || deploymentData.addresses?.liquidity_provision_validator,
        'liquidity_provision_validator'
      ),
      withdrawal: validateOptionalAddress(
        deploymentData.addresses.puckswap_withdrawal_validator || deploymentData.validators?.withdrawal || deploymentData.addresses?.withdrawal_validator,
        'withdrawal_validator'
      ),
      governance: validateOptionalAddress(
        deploymentData.addresses.puckswap_governance_validator || deploymentData.validators?.governance || deploymentData.addresses?.governance_validator,
        'governance_validator'
      ),
      staking: validateOptionalAddress(
        deploymentData.addresses.puckswap_liquid_staking_validator || deploymentData.validators?.staking || deploymentData.addresses?.liquid_staking_validator,
        'liquid_staking_validator'
      ),
      registry: validateOptionalAddress(
        deploymentData.addresses.puckswap_pool_registry_validator || deploymentData.validators?.registry || deploymentData.addresses?.pool_registry_validator,
        'pool_registry_validator'
      ),
      crossChainRouter: validateOptionalAddress(
        deploymentData.addresses.puckswap_cross_chain_router_validator || deploymentData.validators?.crossChainRouter || deploymentData.addresses?.cross_chain_router_validator,
        'cross_chain_router_validator'
      ),
    },
    policies: {
      lpMinting: validateOptionalPolicyId(
        deploymentData.policyIds?.lp_minting_policy || deploymentData.policies?.lpMinting,
        'lp_minting_policy'
      ),
      pADAMinting: validateOptionalPolicyId(
        deploymentData.policyIds?.pADA_minting_policy || deploymentData.policies?.pADAMinting,
        'pADA_minting_policy'
      ),
    }
  };

  return {
    network: deploymentData.network,
    deployedAt: deploymentData.endTime || deploymentData.startTime,
    addresses: contractAddresses,
    policyIds: contractAddresses.policies
  };
}

/**
 * Validate that an address exists and is properly formatted
 * @param address - Address to validate
 * @param contractName - Name of contract for error messages
 * @returns Validated address
 * @throws Error if address is missing or invalid
 */
function validateAddress(address: string | undefined, contractName: string): string {
  if (!address) {
    throw new Error(
      `Missing contract address for '${contractName}'. ` +
      `Please ensure deployment completed successfully.`
    );
  }

  // Basic Cardano address validation (starts with addr1 for mainnet, addr_test for testnet)
  if (!address.startsWith('addr1') && !address.startsWith('addr_test')) {
    throw new Error(
      `Invalid contract address format for '${contractName}': ${address}. ` +
      `Expected Cardano address starting with 'addr1' or 'addr_test'.`
    );
  }

  return address;
}

/**
 * Validates an optional contract address (returns empty string if not present)
 * @param address - Address to validate
 * @param contractName - Name of contract for error messages
 * @returns Validated address or empty string if not present
 */
function validateOptionalAddress(address: string | undefined, contractName: string): string {
  if (!address) {
    return '';
  }

  // Basic Cardano address validation
  if (!address.startsWith('addr_test') && !address.startsWith('addr')) {
    throw new Error(
      `Invalid contract address format for '${contractName}': ${address}. ` +
      `Expected Cardano address starting with 'addr_test' or 'addr'.`
    );
  }

  return address;
}

/**
 * Validates a policy ID
 * @param policyId - Policy ID to validate
 * @param contractName - Name of the contract for error messages
 * @returns Validated policy ID
 * @throws Error if policy ID is missing or invalid
 */
function validatePolicyId(policyId: string | undefined, contractName: string): string {
  if (!policyId) {
    throw new Error(
      `Missing policy ID for '${contractName}'. ` +
      `Please ensure deployment completed successfully.`
    );
  }

  // Basic policy ID validation (hex string, typically 56 characters)
  if (!/^[a-fA-F0-9]{56}$/.test(policyId)) {
    throw new Error(
      `Invalid policy ID format for '${contractName}': ${policyId}. ` +
      `Expected 56-character hex string.`
    );
  }

  return policyId;
}

/**
 * Validates an optional policy ID (returns empty string if not present)
 * @param policyId - Policy ID to validate
 * @param contractName - Name of the contract for error messages
 * @returns Validated policy ID or empty string if not present
 */
function validateOptionalPolicyId(policyId: string | undefined, contractName: string): string {
  if (!policyId) {
    return '';
  }

  // Basic policy ID validation (56 hex characters)
  if (!/^[a-fA-F0-9]{56}$/.test(policyId)) {
    throw new Error(
      `Invalid policy ID format for '${contractName}': ${policyId}. ` +
      `Expected 56 hexadecimal characters.`
    );
  }

  return policyId;
}

/**
 * Browser-compatible async version of loadContractAddresses
 * Uses API routes in browser environment, fs/promises in Node.js
 * @param network - Network to load addresses for ('mainnet' or 'preprod')
 * @returns Promise resolving to strongly typed contract addresses
 * @throws Error if addresses file is missing or malformed
 */
export async function loadContractAddressesAsync(network?: string): Promise<DeploymentInfo> {
  const targetNetwork = network || process.env.NETWORK || 'preprod';

  // Browser environment - use API route
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch(`/api/contract-addresses?network=${targetNetwork}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch contract addresses: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load contract addresses from API');
      }

      return data.data;
    } catch (error) {
      throw new Error(
        `Failed to load contract addresses via API: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Please ensure deployment is complete and API is accessible.`
      );
    }
  }

  // Node.js environment - use file system
  if (!fs || !path) {
    throw new Error('Node.js modules not available for file system access');
  }

  const addressesPath = path.resolve(process.cwd(), 'deployment', 'addresses.json');

  try {
    // Check if file exists
    await fs.access(addressesPath);
  } catch (error) {
    throw new Error(
      `Contract addresses file not found: ${addressesPath}. ` +
      `Please run deployment first using: npm run deploy-v5-${targetNetwork}`
    );
  }

  let deploymentData: DeploymentData;

  try {
    const fileContent = await fs.readFile(addressesPath, 'utf8');
    deploymentData = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(
      `Failed to parse contract addresses file: ${addressesPath}. ` +
      `File may be corrupted. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Validate network match
  if (deploymentData.network !== targetNetwork) {
    throw new Error(
      `Network mismatch: Expected '${targetNetwork}', found '${deploymentData.network}' in ${addressesPath}. ` +
      `Please deploy to the correct network or update NETWORK environment variable.`
    );
  }

  // Validate deployment success
  if (deploymentData.success === false) {
    const errors = deploymentData.errors?.join(', ') || 'Unknown deployment errors';
    throw new Error(
      `Deployment was not successful: ${errors}. Please redeploy contracts.`
    );
  }

  // Transform to strongly typed interface
  // Support both old and new deployment formats
  const contractAddresses: ContractAddresses = {
    validators: {
      swap: validateAddress(
        deploymentData.addresses?.puckswap_swap_validator || deploymentData.validators?.swap || deploymentData.addresses?.swap_validator,
        'swap_validator'
      ),
      liquidityProvision: validateAddress(
        deploymentData.addresses?.puckswap_liquidity_provision_validator || deploymentData.validators?.liquidityProvision || deploymentData.addresses?.liquidity_provision_validator,
        'liquidity_provision_validator'
      ),
      withdrawal: validateOptionalAddress(
        deploymentData.addresses?.puckswap_withdrawal_validator || deploymentData.validators?.withdrawal || deploymentData.addresses?.withdrawal_validator,
        'withdrawal_validator'
      ),
      governance: validateOptionalAddress(
        deploymentData.addresses?.puckswap_governance_validator || deploymentData.validators?.governance || deploymentData.addresses?.governance_validator,
        'governance_validator'
      ),
      staking: validateOptionalAddress(
        deploymentData.addresses?.puckswap_liquid_staking_validator || deploymentData.validators?.staking || deploymentData.addresses?.liquid_staking_validator,
        'liquid_staking_validator'
      ),
      registry: validateOptionalAddress(
        deploymentData.addresses?.puckswap_pool_registry_validator || deploymentData.validators?.registry || deploymentData.addresses?.pool_registry_validator,
        'pool_registry_validator'
      ),
      crossChainRouter: validateOptionalAddress(
        deploymentData.addresses?.puckswap_cross_chain_router_validator || deploymentData.validators?.crossChainRouter || deploymentData.addresses?.cross_chain_router_validator,
        'cross_chain_router_validator'
      ),
    },
    policies: {
      lpMinting: validateOptionalPolicyId(
        deploymentData.policyIds?.lp_minting_policy || deploymentData.policies?.lpMinting,
        'lp_minting_policy'
      ),
      pADAMinting: validateOptionalPolicyId(
        deploymentData.policyIds?.pADA_minting_policy || deploymentData.policies?.pADAMinting,
        'pADA_minting_policy'
      ),
    }
  };

  return {
    network: deploymentData.network,
    deployedAt: deploymentData.endTime || deploymentData.startTime || deploymentData.deployedAt,
    addresses: contractAddresses,
    policyIds: contractAddresses.policies
  };
}

// =============================================================================
// MAIN EXPORT - STRONGLY TYPED CONTRACT ADDRESSES
// =============================================================================

/**
 * Browser-compatible contract addresses loader
 * Returns a promise that resolves to contract addresses
 * @param network - Network to load addresses for
 * @returns Promise resolving to contract addresses
 */
export async function getContractAddresses(network?: string): Promise<ContractAddresses> {
  const deployment = await loadContractAddressesAsync(network);
  return deployment.addresses;
}

/**
 * Legacy export: Strongly typed contract addresses object
 * ⚠️  DEPRECATED: This will throw an error in browser environments
 * Use getContractAddresses() or loadContractAddressesAsync() instead
 * @throws Error in browser environment - use async alternatives
 */
let _contractAddresses: ContractAddresses | null = null;

export const contractAddresses: ContractAddresses = new Proxy({} as ContractAddresses, {
  get(target, prop) {
    // In browser environment, provide a helpful error
    if (typeof window !== 'undefined') {
      throw new Error(
        'contractAddresses cannot be used in browser environment. ' +
        'Use getContractAddresses() or loadContractAddressesAsync() instead.'
      );
    }

    // Lazy load the addresses only when accessed
    if (!_contractAddresses) {
      try {
        const deployment = loadContractAddresses();
        _contractAddresses = deployment.addresses;
      } catch (error) {
        // In development/test environments, provide helpful error message
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          console.warn(
            '⚠️  Contract addresses not loaded:',
            error instanceof Error ? error.message : 'Unknown error'
          );
          console.warn('   This is expected if contracts have not been deployed yet.');
          console.warn('   Run deployment first: npm run deploy-v5-preprod');
        }

        // Re-throw the error for proper handling by consumers
        throw error;
      }
    }

    return _contractAddresses[prop as keyof ContractAddresses];
  }
});

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Check if contracts are deployed for the current network
 * @param network - Network to check
 * @returns True if contracts are deployed
 */
export function areContractsDeployed(network?: string): boolean {
  try {
    loadContractAddresses(network);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all contract addresses as a flat object (Browser-compatible async version)
 * @param network - Network to load from
 * @returns Promise resolving to flat object with all addresses and policy IDs
 */
export async function getAllAddressesAsync(network?: string): Promise<Record<string, string>> {
  const deployment = await loadContractAddressesAsync(network);
  return {
    // Validators
    swap: deployment.addresses.validators.swap,
    liquidityProvision: deployment.addresses.validators.liquidityProvision,
    withdrawal: deployment.addresses.validators.withdrawal,
    governance: deployment.addresses.validators.governance,
    staking: deployment.addresses.validators.staking,
    registry: deployment.addresses.validators.registry,
    crossChainRouter: deployment.addresses.validators.crossChainRouter,
    // Policies
    lpMinting: deployment.addresses.policies.lpMinting,
    pADAMinting: deployment.addresses.policies.pADAMinting,
  };
}

/**
 * Get all contract addresses as a flat object (Node.js only)
 * @deprecated Use getAllAddressesAsync() for browser compatibility
 * @param network - Network to load from
 * @returns Flat object with all addresses and policy IDs
 */
export function getAllAddresses(network?: string): Record<string, string> {
  const deployment = loadContractAddresses(network);
  return {
    // Validators
    swap: deployment.addresses.validators.swap,
    liquidityProvision: deployment.addresses.validators.liquidityProvision,
    withdrawal: deployment.addresses.validators.withdrawal,
    governance: deployment.addresses.validators.governance,
    staking: deployment.addresses.validators.staking,
    registry: deployment.addresses.validators.registry,
    crossChainRouter: deployment.addresses.validators.crossChainRouter,
    // Policies
    lpMinting: deployment.addresses.policies.lpMinting,
    pADAMinting: deployment.addresses.policies.pADAMinting,
  };
}

/**
 * Validate that all required contracts are deployed
 * @param network - Network to validate
 * @throws Error if any required contracts are missing
 */
export function validateDeployment(network?: string): void {
  try {
    const deployment = loadContractAddresses(network);

    // Validation is already performed in loadContractAddresses
    // through validateAddress calls, so if we reach here, all contracts are present
    console.log(`✅ All contracts validated for network: ${deployment.network}`);
    console.log(`   Deployed at: ${deployment.deployedAt}`);

  } catch (error) {
    throw new Error(
      `Deployment validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get deployment info with network fallback
 * @param preferredNetwork - Preferred network to load from
 * @returns Deployment info with network fallback
 */
export function getDeploymentInfo(preferredNetwork?: string): DeploymentInfo {
  const networks = ['mainnet', 'preprod', 'preview'];
  const targetNetwork = preferredNetwork || process.env.NETWORK || 'preprod';

  // Try target network first
  try {
    return loadContractAddresses(targetNetwork);
  } catch (error) {
    console.warn(`Failed to load contracts for ${targetNetwork}:`, error);

    // Try other networks as fallback
    for (const network of networks) {
      if (network !== targetNetwork) {
        try {
          console.log(`Trying fallback network: ${network}`);
          return loadContractAddresses(network);
        } catch (fallbackError) {
          console.warn(`Fallback network ${network} also failed:`, fallbackError);
        }
      }
    }

    throw new Error(`No deployed contracts found on any network. Please run deployment first.`);
  }
}

/**
 * Get core AMM contract addresses for ADA ↔ PUCKY swaps (Browser-compatible async version)
 * @param network - Network to load from (defaults to 'preprod')
 * @returns Promise resolving to core AMM contract addresses for production deployment
 */
export async function getAMMAddressesAsync(network?: string): Promise<CoreAMMAddresses> {
  const deployment = await loadContractAddressesAsync(network);

  return {
    swapValidator: deployment.addresses.validators.swap,
    liquidityProvisionValidator: deployment.addresses.validators.liquidityProvision,
    liquidityWithdrawalValidator: deployment.addresses.validators.withdrawal,
    lpMintingPolicy: deployment.addresses.policies.lpMinting
  };
}

/**
 * Get core AMM contract addresses for ADA ↔ PUCKY swaps (Node.js only)
 * @deprecated Use getAMMAddressesAsync() for browser compatibility
 * @param network - Network to load from (defaults to 'preprod')
 * @returns Core AMM contract addresses for production deployment
 */
export function getAMMAddresses(network?: string): CoreAMMAddresses {
  const deployment = loadContractAddresses(network);

  return {
    swapValidator: deployment.addresses.validators.swap,
    liquidityProvisionValidator: deployment.addresses.validators.liquidityProvision,
    liquidityWithdrawalValidator: deployment.addresses.validators.withdrawal,
    lpMintingPolicy: deployment.addresses.policies.lpMinting
  };
}

/**
 * Get contract addresses for governance operations
 * @param network - Network to load from
 * @returns Governance contract addresses
 */
export function getGovernanceAddresses(network?: string): {
  governanceValidator: string;
  poolRegistryValidator: string;
} {
  const deployment = loadContractAddresses(network);

  return {
    governanceValidator: deployment.addresses.validators.governance,
    poolRegistryValidator: deployment.addresses.validators.registry
  };
}

/**
 * Get contract addresses for advanced DeFi operations
 * @param network - Network to load from
 * @returns Advanced DeFi contract addresses
 */
export function getAdvancedDeFiAddresses(network?: string): {
  liquidStakingValidator: string;
  crossChainRouterValidator: string;
  pADAMintingPolicy: string;
} {
  const deployment = loadContractAddresses(network);

  return {
    liquidStakingValidator: deployment.addresses.validators.staking,
    crossChainRouterValidator: deployment.addresses.validators.crossChainRouter,
    pADAMintingPolicy: deployment.addresses.policies.pADAMinting
  };
}

// =============================================================================
// LEGACY COMPATIBILITY FUNCTIONS
// =============================================================================

/**
 * Legacy function for backward compatibility
 * @deprecated Use contractAddresses.validators.swap instead
 */
export function getContractAddress(contractName: string, network?: string): string {
  const deployment = loadContractAddresses(network);

  // Map legacy contract names to new structure
  const legacyMapping: Record<string, string> = {
    'puckswap_swap_validator': deployment.addresses.validators.swap,
    'puckswap_liquidity_provision_validator': deployment.addresses.validators.liquidityProvision,
    'puckswap_withdrawal_validator': deployment.addresses.validators.withdrawal,
    'puckswap_governance_validator': deployment.addresses.validators.governance,
    'puckswap_liquid_staking_validator': deployment.addresses.validators.staking,
    'puckswap_pool_registry_validator': deployment.addresses.validators.registry,
    'puckswap_cross_chain_router_validator': deployment.addresses.validators.crossChainRouter,
  };

  const address = legacyMapping[contractName];
  if (!address) {
    throw new Error(`Contract address not found: ${contractName}`);
  }

  return address;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use contractAddresses.policies.lpMinting instead
 */
export function getPolicyId(policyName: string, network?: string): string {
  const deployment = loadContractAddresses(network);

  // Map legacy policy names to new structure
  const legacyMapping: Record<string, string> = {
    'lp_minting_policy': deployment.addresses.policies.lpMinting,
    'pADA_minting_policy': deployment.addresses.policies.pADAMinting,
  };

  const policyId = legacyMapping[policyName];
  if (!policyId) {
    throw new Error(`Policy ID not found: ${policyName}`);
  }

  return policyId;
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

// Export functions for easy access
export {
  loadContractAddresses as load,
  loadContractAddressesAsync as loadAsync,
  areContractsDeployed as isDeployed,
  getAllAddresses as getAll,
  validateDeployment as validate,
  getDeploymentInfo as getInfo,
  getAMMAddresses as getAMM,
  getGovernanceAddresses as getGovernance,
  getAdvancedDeFiAddresses as getAdvanced
};

// Browser-compatible default export for common usage patterns
export default {
  // Browser-compatible loading functions
  loadAsync: loadContractAddressesAsync,
  getAddresses: getContractAddresses,

  // Validation functions (Node.js only)
  isDeployed: areContractsDeployed,
  validate: validateDeployment,

  // Utility functions (async versions for browser compatibility)
  getAllAsync: getAllAddressesAsync,
  getInfo: getDeploymentInfo,

  // Specialized getters (async versions for browser compatibility)
  getAMMAsync: getAMMAddressesAsync,

  // Legacy compatibility (deprecated - Node.js only)
  getAddress: getContractAddress,
  getPolicy: getPolicyId,

  // Note: Synchronous exports removed to prevent browser errors
  // Use loadAsync() or getAddresses() instead
};
