# PuckSwap v5 Simulation Test Reports

This directory contains detailed test reports from PuckSwap v5 deployment simulation runs.

## Report Structure

Each test report includes:

### 📊 **Overall Statistics**
- Total tests executed
- Pass/fail counts
- Success rate percentage
- Total execution time
- Network environment

### 🧪 **Suite Breakdown**
- **Pool Lifecycle**: AMM operations testing
- **Governance**: DAO proposal and voting flows
- **Liquid Staking**: pADA minting/burning operations
- **Cross-Chain Router**: Bridge transfer operations
- **Backend Monitoring**: Context7 monitor verification

### 📋 **Detailed Results**
- Individual test results with timing
- Transaction hashes (for real tests)
- Error messages and stack traces
- Performance metrics

### 🌍 **Environment Information**
- Network configuration (Preprod/Mainnet)
- Blockfrost API configuration
- Test wallet addresses
- Contract deployment addresses

## Report Files

Reports are automatically generated with timestamps:
- `puckswap-v5-simulation-preprod-[timestamp].json`
- `puckswap-v5-simulation-mainnet-[timestamp].json`

## Usage

### Generate Reports
```bash
# Run full simulation suite with reports
npm run test-simulation

# Run individual scenarios
npm run test-simulation-pool
npm run test-simulation-governance
npm run test-simulation-staking
npm run test-simulation-crosschain
npm run test-simulation-monitors
```

### View Reports
```bash
# View latest report
cat tests/simulation/reports/puckswap-v5-simulation-preprod-*.json | jq '.'

# Extract summary
cat tests/simulation/reports/puckswap-v5-simulation-preprod-*.json | jq '.summary'

# View failed tests only
cat tests/simulation/reports/puckswap-v5-simulation-preprod-*.json | jq '.results[] | select(.success == false)'
```

## Interpreting Results

### ✅ **Success Criteria**
- **100% Pass Rate**: Ready for production deployment
- **90-99% Pass Rate**: Minor issues, review failures
- **70-89% Pass Rate**: Significant issues, fix before deployment
- **<70% Pass Rate**: Critical failures, do not deploy

### 🔍 **Key Metrics**
- **Pool Operations**: Liquidity provision, swaps, withdrawals
- **Governance**: Proposal lifecycle, voting, execution
- **Staking**: Exchange rate accuracy, reward calculations
- **Cross-Chain**: Nonce validation, replay protection
- **Monitoring**: Event detection, state synchronization

### 🚨 **Common Issues**
- Network connectivity timeouts
- Insufficient test wallet funding
- Contract deployment failures
- Datum parsing errors
- Monitor initialization failures

## Continuous Integration

Reports can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions integration
- name: Run PuckSwap v5 Simulations
  run: npm run test-simulation
  
- name: Upload Test Reports
  uses: actions/upload-artifact@v3
  with:
    name: simulation-reports
    path: tests/simulation/reports/
```

## Report Analysis Tools

### Python Analysis Script
```python
import json
import pandas as pd

# Load report
with open('puckswap-v5-simulation-preprod-latest.json') as f:
    report = json.load(f)

# Analyze results
df = pd.DataFrame(report['results'])
print(f"Success Rate: {df['success'].mean() * 100:.1f}%")
print(f"Average Duration: {df['duration'].mean():.0f}ms")
```

### JavaScript Analysis
```javascript
const fs = require('fs');
const report = JSON.parse(fs.readFileSync('report.json'));

const failedTests = report.results.filter(r => !r.success);
console.log('Failed Tests:', failedTests.map(t => t.testName));
```

## Troubleshooting

### Common Solutions
1. **Wallet Funding**: Ensure test wallets have sufficient ADA
2. **Network Issues**: Check Blockfrost API key and network connectivity
3. **Contract Deployment**: Verify Aiken compilation and CBOR generation
4. **Monitor Setup**: Confirm Context7 configuration and permissions

### Debug Mode
```bash
# Enable detailed logging
NETWORK=preprod DEBUG=true npm run test-simulation
```

### Manual Verification
```bash
# Verify individual components
npm run test-env-preprod
npm run build-contracts
npm run test-contracts
```

---

For questions or issues with simulation reports, please refer to the main PuckSwap v5 documentation or create an issue in the repository.
