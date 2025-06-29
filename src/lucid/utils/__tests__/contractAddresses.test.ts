/**
 * PuckSwap v5 DeFi - Contract Addresses Utility Tests
 * 
 * Test suite for the contract address loader utility
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import {
  contractAddresses,
  loadContractAddresses,
  loadContractAddressesAsync,
  areContractsDeployed,
  validateDeployment,
  getAllAddresses,
  getAMMAddresses,
  getGovernanceAddresses,
  getAdvancedDeFiAddresses,
  ContractAddresses
} from '../contractAddresses';

// Mock deployment data
const mockDeploymentData = {
  network: 'preprod',
  startTime: '2024-06-24T10:30:00.000Z',
  endTime: '2024-06-24T10:35:00.000Z',
  addresses: {
    puckswap_swap_validator: 'addr_test1qr5w8z9x8y7v6u5t4s3r2q1p0o9n8m7l6k5j4i3h2g1f0e9d8c7b6a5',
    puckswap_liquidity_provision_validator: 'addr_test1qr5w8z9x8y7v6u5t4s3r2q1p0o9n8m7l6k5j4i3h2g1f0e9d8c7b6a6',
    puckswap_withdrawal_validator: 'addr_test1qr5w8z9x8y7v6u5t4s3r2q1p0o9n8m7l6k5j4i3h2g1f0e9d8c7b6a7',
    puckswap_governance_validator: 'addr_test1qr5w8z9x8y7v6u5t4s3r2q1p0o9n8m7l6k5j4i3h2g1f0e9d8c7b6a8',
    puckswap_liquid_staking_validator: 'addr_test1qr5w8z9x8y7v6u5t4s3r2q1p0o9n8m7l6k5j4i3h2g1f0e9d8c7b6a9',
    puckswap_pool_registry_validator: 'addr_test1qr5w8z9x8y7v6u5t4s3r2q1p0o9n8m7l6k5j4i3h2g1f0e9d8c7b6b0',
    puckswap_cross_chain_router_validator: 'addr_test1qr5w8z9x8y7v6u5t4s3r2q1p0o9n8m7l6k5j4i3h2g1f0e9d8c7b6b1',
  },
  policyIds: {
    lp_minting_policy: 'policy1234567890abcdef1234567890abcdef12345678',
    pADA_minting_policy: 'policy1234567890abcdef1234567890abcdef12345679',
  },
  success: true,
  errors: []
};

const mockAddressesPath = path.join(process.cwd(), 'deployment', 'addresses.json');

describe('Contract Addresses Utility', () => {
  beforeEach(() => {
    // Create mock deployment directory and file
    const deploymentDir = path.dirname(mockAddressesPath);
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true });
    }
    fs.writeFileSync(mockAddressesPath, JSON.stringify(mockDeploymentData, null, 2));
  });

  afterEach(() => {
    // Clean up mock files
    if (fs.existsSync(mockAddressesPath)) {
      fs.unlinkSync(mockAddressesPath);
    }
  });

  describe('loadContractAddresses', () => {
    it('should load contract addresses successfully', () => {
      const deployment = loadContractAddresses('preprod');
      
      expect(deployment.network).toBe('preprod');
      expect(deployment.deployedAt).toBe('2024-06-24T10:35:00.000Z');
      expect(deployment.addresses.validators.swap).toBe('addr_test1qr5w8z9x8y7v6u5t4s3r2q1p0o9n8m7l6k5j4i3h2g1f0e9d8c7b6a5');
      expect(deployment.addresses.policies.lpMinting).toBe('policy1234567890abcdef1234567890abcdef12345678');
    });

    it('should throw error for missing file', () => {
      fs.unlinkSync(mockAddressesPath);
      
      expect(() => loadContractAddresses('preprod')).toThrow(
        'Contract addresses file not found'
      );
    });

    it('should throw error for network mismatch', () => {
      expect(() => loadContractAddresses('mainnet')).toThrow(
        'Network mismatch: Expected \'mainnet\', found \'preprod\''
      );
    });

    it('should throw error for failed deployment', () => {
      const failedDeployment = { ...mockDeploymentData, success: false, errors: ['Test error'] };
      fs.writeFileSync(mockAddressesPath, JSON.stringify(failedDeployment, null, 2));
      
      expect(() => loadContractAddresses('preprod')).toThrow(
        'Deployment was not successful: Test error'
      );
    });
  });

  describe('loadContractAddressesAsync', () => {
    it('should load contract addresses asynchronously', async () => {
      const deployment = await loadContractAddressesAsync('preprod');
      
      expect(deployment.network).toBe('preprod');
      expect(deployment.addresses.validators.swap).toBe('addr_test1qr5w8z9x8y7v6u5t4s3r2q1p0o9n8m7l6k5j4i3h2g1f0e9d8c7b6a5');
    });
  });

  describe('areContractsDeployed', () => {
    it('should return true when contracts are deployed', () => {
      expect(areContractsDeployed('preprod')).toBe(true);
    });

    it('should return false when contracts are not deployed', () => {
      fs.unlinkSync(mockAddressesPath);
      expect(areContractsDeployed('preprod')).toBe(false);
    });
  });

  describe('validateDeployment', () => {
    it('should validate deployment successfully', () => {
      expect(() => validateDeployment('preprod')).not.toThrow();
    });

    it('should throw error for invalid deployment', () => {
      fs.unlinkSync(mockAddressesPath);
      expect(() => validateDeployment('preprod')).toThrow(
        'Deployment validation failed'
      );
    });
  });

  describe('getAllAddresses', () => {
    it('should return all addresses as flat object', () => {
      const addresses = getAllAddresses('preprod');
      
      expect(addresses.swap).toBe('addr_test1qr5w8z9x8y7v6u5t4s3r2q1p0o9n8m7l6k5j4i3h2g1f0e9d8c7b6a5');
      expect(addresses.lpMinting).toBe('policy1234567890abcdef1234567890abcdef12345678');
      expect(Object.keys(addresses)).toHaveLength(9); // 7 validators + 2 policies
    });
  });

  describe('getAMMAddresses', () => {
    it('should return AMM-specific addresses', () => {
      const ammAddresses = getAMMAddresses('preprod');
      
      expect(ammAddresses.swapValidator).toBe('addr_test1qr5w8z9x8y7v6u5t4s3r2q1p0o9n8m7l6k5j4i3h2g1f0e9d8c7b6a5');
      expect(ammAddresses.liquidityValidator).toBe('addr_test1qr5w8z9x8y7v6u5t4s3r2q1p0o9n8m7l6k5j4i3h2g1f0e9d8c7b6a6');
      expect(ammAddresses.withdrawalValidator).toBe('addr_test1qr5w8z9x8y7v6u5t4s3r2q1p0o9n8m7l6k5j4i3h2g1f0e9d8c7b6a7');
      expect(ammAddresses.lpMintingPolicy).toBe('policy1234567890abcdef1234567890abcdef12345678');
    });
  });

  describe('getGovernanceAddresses', () => {
    it('should return governance-specific addresses', () => {
      const govAddresses = getGovernanceAddresses('preprod');
      
      expect(govAddresses.governanceValidator).toBe('addr_test1qr5w8z9x8y7v6u5t4s3r2q1p0o9n8m7l6k5j4i3h2g1f0e9d8c7b6a8');
      expect(govAddresses.poolRegistryValidator).toBe('addr_test1qr5w8z9x8y7v6u5t4s3r2q1p0o9n8m7l6k5j4i3h2g1f0e9d8c7b6b0');
    });
  });

  describe('getAdvancedDeFiAddresses', () => {
    it('should return advanced DeFi addresses', () => {
      const advancedAddresses = getAdvancedDeFiAddresses('preprod');
      
      expect(advancedAddresses.liquidStakingValidator).toBe('addr_test1qr5w8z9x8y7v6u5t4s3r2q1p0o9n8m7l6k5j4i3h2g1f0e9d8c7b6a9');
      expect(advancedAddresses.crossChainRouterValidator).toBe('addr_test1qr5w8z9x8y7v6u5t4s3r2q1p0o9n8m7l6k5j4i3h2g1f0e9d8c7b6b1');
      expect(advancedAddresses.pADAMintingPolicy).toBe('policy1234567890abcdef1234567890abcdef12345679');
    });
  });

  describe('ContractAddresses interface', () => {
    it('should have correct strongly typed structure', () => {
      const deployment = loadContractAddresses('preprod');
      const addresses: ContractAddresses = deployment.addresses;
      
      // Validators
      expect(typeof addresses.validators.swap).toBe('string');
      expect(typeof addresses.validators.liquidityProvision).toBe('string');
      expect(typeof addresses.validators.withdrawal).toBe('string');
      expect(typeof addresses.validators.governance).toBe('string');
      expect(typeof addresses.validators.staking).toBe('string');
      expect(typeof addresses.validators.registry).toBe('string');
      expect(typeof addresses.validators.crossChainRouter).toBe('string');
      
      // Policies
      expect(typeof addresses.policies.lpMinting).toBe('string');
      expect(typeof addresses.policies.pADAMinting).toBe('string');
    });
  });
});
