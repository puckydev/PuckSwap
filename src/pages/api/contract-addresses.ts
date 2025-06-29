/**
 * PuckSwap v5 - Contract Addresses API Route
 * 
 * Serves deployed contract addresses from deployment/addresses.json
 * to frontend components in a browser-compatible way.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

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
 * Validate that an address exists and is properly formatted
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
 * Validates an optional policy ID (returns empty string if not present)
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.'
    });
  }

  try {
    const { network } = req.query;
    const targetNetwork = (network as string) || process.env.NETWORK || 'preprod';
    
    // Resolve path to deployment addresses file
    const addressesPath = path.resolve(process.cwd(), 'deployment', 'addresses.json');

    // Check if file exists and read it
    let deploymentData: DeploymentData;
    try {
      const fileContent = await fs.readFile(addressesPath, 'utf8');
      deploymentData = JSON.parse(fileContent);
    } catch (error) {
      console.error('Failed to read deployment addresses:', error);
      return res.status(404).json({
        success: false,
        error: `Contract addresses file not found or corrupted. Please run deployment first using: npm run deploy-v5-${targetNetwork}`
      });
    }

    // Validate network match
    if (deploymentData.network !== targetNetwork) {
      return res.status(400).json({
        success: false,
        error: `Network mismatch: Expected '${targetNetwork}', found '${deploymentData.network}'. Please deploy to the correct network.`
      });
    }

    // Validate deployment success
    if (deploymentData.success === false) {
      const errors = deploymentData.errors?.join(', ') || 'Unknown deployment errors';
      return res.status(400).json({
        success: false,
        error: `Deployment was not successful: ${errors}. Please redeploy contracts.`
      });
    }

    // Transform to strongly typed interface
    // Support both old and new deployment formats
    const contractAddresses = {
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

    const deploymentInfo = {
      network: deploymentData.network,
      deployedAt: deploymentData.endTime || deploymentData.startTime || deploymentData.deployedAt,
      addresses: contractAddresses,
      policyIds: contractAddresses.policies
    };

    return res.status(200).json({
      success: true,
      data: deploymentInfo
    });

  } catch (error) {
    console.error('Contract addresses API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
