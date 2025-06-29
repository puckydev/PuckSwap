# PuckSwap tPUCKY Test Token Minting Script

## Overview

The `mint-tPucky.ts` script is a production-ready TypeScript utility for minting 1 billion tPUCKY test tokens on the Cardano Preprod testnet. This script is specifically designed for PuckSwap DEX development and testing, providing realistic token amounts for AMM liquidity pool operations.

## Features

- **Lucid Evolution Integration**: Uses the latest `@lucid-evolution/lucid` library
- **Time-Locked Security**: Native script policy expires after 1 hour to prevent unauthorized future minting
- **Dual Wallet Support**: Works with both seed phrase files and CIP-30 browser wallets
- **Comprehensive Error Handling**: Robust error checking and transaction confirmation
- **Balance Monitoring**: Shows wallet balance before and after minting
- **Automatic Configuration**: Updates `deployment/addresses.json` with token information
- **Testnet Safety**: Built-in safeguards to prevent mainnet usage

## Prerequisites

1. **Node.js Environment**: Ensure Node.js 18+ is installed
2. **PuckSwap Project**: Run from within the PuckSwap project directory
3. **Preprod Testnet ADA**: Wallet must have at least 5 ADA for transaction fees
4. **Wallet Setup**: Either a seed phrase file or CIP-30 compatible wallet

## Installation

No additional installation required - the script uses existing PuckSwap dependencies.

## Usage

### Option 1: Seed Phrase File (Recommended for Development)

```bash
# Create a seed phrase file (DO NOT COMMIT TO GIT)
echo "your twelve word seed phrase goes here like this example phrase" > wallet.seed

# Mint tPUCKY tokens
npx tsx scripts/mint-tPucky.ts --seed-file ./wallet.seed
```

### Option 2: CIP-30 Wallet (Browser Environment)

```bash
# Connect with Eternl wallet
npx tsx scripts/mint-tPucky.ts --wallet eternl

# Connect with other supported wallets
npx tsx scripts/mint-tPucky.ts --wallet nami
npx tsx scripts/mint-tPucky.ts --wallet vespr
npx tsx scripts/mint-tPucky.ts --wallet lace
```

### Option 3: Balance Check Only

```bash
# Check current balance without minting
npx tsx scripts/mint-tPucky.ts --check-balance --seed-file ./wallet.seed
```

## Command Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `--seed-file <path>` | Path to wallet seed phrase file | `--seed-file ./wallet.seed` |
| `--wallet <name>` | CIP-30 wallet name | `--wallet eternl` |
| `--check-balance` | Only check balance, don't mint | `--check-balance` |
| `--help`, `-h` | Show help message | `--help` |

## Security Considerations

### 🔒 Seed Phrase Security

- **Never commit seed files to version control**
- Add `*.seed` to your `.gitignore` file
- Store seed phrases securely and delete files after use
- Use environment variables for production deployments

### 🌐 Network Safety

- Script validates network configuration to prevent mainnet usage
- Built-in checks ensure Preprod testnet operation only
- Time-locked policy prevents unauthorized future minting

### ⏰ Time Lock Policy

- Minting policy expires after 1 hour for security
- No additional tokens can be minted after expiry
- Policy uses native script with signature + time lock validation

## Output and Results

### Successful Minting Output

```
🎉 SUCCESS! tPUCKY tokens minted successfully
================================================================================
💰 Minted: 1,000,000,000 tPUCKY tokens
🆔 Policy ID: a1b2c3d4e5f6...
🪙 Asset Unit: a1b2c3d4e5f6...74505543
📋 Transaction: 9f8e7d6c5b4a...
🔗 Explorer: https://preprod.cardanoscan.io/transaction/9f8e7d6c5b4a...
================================================================================

📋 Next Steps:
1. Verify transaction on Cardano Preprod explorer
2. Use asset unit in PuckSwap liquidity pool testing
3. Test token swaps in PuckSwap DEX interface
4. Asset unit is saved in deployment/addresses.json

⚠️  Remember: Minting policy expires in 1 hour for security
```

### Updated Configuration

The script automatically updates `deployment/addresses.json`:

```json
{
  "testTokens": {
    "tPucky": {
      "policyId": "a1b2c3d4e5f6...",
      "assetName": "tPUCKY",
      "assetNameHex": "74505543",
      "assetUnit": "a1b2c3d4e5f6...74505543",
      "totalSupply": "1000000000",
      "mintedAt": "2025-06-26T...",
      "expiresAt": "2025-06-26T..."
    }
  }
}
```

## Integration with PuckSwap

### Token Selection

The minted tPUCKY tokens will automatically appear in PuckSwap's token selection dropdown when:

1. The asset unit is properly stored in `deployment/addresses.json`
2. The wallet contains the minted tokens
3. PuckSwap's dynamic token discovery is functioning

### Liquidity Pool Testing

Use the minted tokens for comprehensive AMM testing:

```typescript
// Example liquidity provision with tPUCKY
const addLiquidityParams = {
  adaAmount: 100_000_000n, // 100 ADA
  tokenAmount: 2_301_952n,  // tPUCKY tokens (100 ADA worth at test rate)
  slippageTolerance: 0.5    // 0.5% slippage
};
```

### Swap Testing

Test bidirectional swaps:

```typescript
// ADA → tPUCKY swap
const swapParams = {
  fromAsset: "lovelace",
  toAsset: "a1b2c3d4e5f6...74505543", // tPUCKY asset unit
  amount: 10_000_000n, // 10 ADA
  slippageTolerance: 1.0
};
```

## Troubleshooting

### Common Issues

1. **"Invalid network" Error**
   - Ensure `NETWORK=preprod` in environment
   - Verify Blockfrost API key is for Preprod

2. **"Insufficient ADA" Error**
   - Ensure wallet has at least 5 ADA
   - Get testnet ADA from Cardano faucet

3. **"Wallet not found" Error**
   - Verify wallet extension is installed
   - Check wallet name spelling (eternl, nami, vespr, lace)

4. **"Seed file not found" Error**
   - Verify file path is correct
   - Ensure seed file contains valid 12+ word phrase

### Getting Testnet ADA

Visit the Cardano testnet faucet:
- **Preprod Faucet**: https://docs.cardano.org/cardano-testnet/tools/faucet/

## Development Notes

### Script Architecture

- **Environment Validation**: Ensures Preprod network usage
- **Wallet Abstraction**: Supports multiple wallet connection methods
- **Transaction Building**: Uses Lucid Evolution's transaction builder
- **Confirmation Waiting**: Polls for transaction confirmation
- **Configuration Management**: Updates deployment addresses automatically

### Testing Integration

The script integrates with PuckSwap's testing infrastructure:

- Compatible with existing mock wallet systems
- Provides realistic token amounts for AMM calculations
- Supports automated testing workflows
- Maintains consistency with PuckSwap's token standards

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Verify environment configuration with `--check-balance`
3. Review transaction on Cardano Preprod explorer
4. Consult PuckSwap development documentation

---

**⚠️ Important**: This script is for TESTNET ONLY. Never use on Cardano mainnet.
