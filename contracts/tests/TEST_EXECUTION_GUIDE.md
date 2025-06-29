# PuckSwap Validator Edge Case Test Execution Guide

## Overview

This guide provides instructions for executing the comprehensive edge case test suite for PuckSwap DEX validators. The test suite covers critical security scenarios including slippage protection, front-run protection, empty pool handling, and mathematical edge cases.

## Test Files Structure

```
contracts/tests/
├── edge_case_validator_test.aiken           # General edge cases
├── slippage_protection_test.aiken           # Slippage and price impact tests
├── front_run_protection_test.aiken          # MEV and deadline protection tests
├── empty_pool_test.aiken                    # Empty pool and initialization tests
├── mathematical_edge_cases_test.aiken       # Mathematical precision and overflow tests
├── comprehensive_integration_test.aiken     # Integration tests combining multiple edge cases
├── min_ada_utils_test.aiken                # Min ADA validation tests (existing)
├── pool_validator_test.aiken               # Basic pool validator tests (existing)
└── redeemer_parser_test.aiken              # Redeemer parsing tests (existing)
```

## Prerequisites

1. **Aiken Installation**: Ensure Aiken is installed and available in your PATH
   ```bash
   # Install Aiken (if not already installed)
   curl -sSfL https://install.aiken-lang.org | bash
   ```

2. **Project Setup**: Navigate to the project root directory
   ```bash
   cd /path/to/PuckSwap
   ```

## Test Execution Commands

### Run All Tests
```bash
# Execute all tests in the test suite
aiken test

# Run tests with verbose output
aiken test --verbose

# Run tests with coverage report
aiken test --coverage
```

### Run Specific Test Categories

#### 1. Edge Case Validator Tests
```bash
aiken test --match "edge_case_validator_test"
```
**Tests covered:**
- Maximum slippage protection
- Minimum output validation
- Price impact calculations
- Empty pool creation scenarios
- Zero reserve protection
- Pool drainage attempts
- Integer overflow protection
- Precision loss handling
- Division by zero protection

#### 2. Slippage Protection Tests
```bash
aiken test --match "slippage_protection_test"
```
**Tests covered:**
- Minimal slippage for small trades
- Moderate slippage for medium trades
- High slippage for large trades
- Slippage limit enforcement
- Sandwich attack simulation
- Price impact scaling
- Asymmetric pool slippage
- Minimum output enforcement
- Cascading slippage scenarios
- Extreme fee interactions

#### 3. Front-Run Protection Tests
```bash
aiken test --match "front_run_protection_test"
```
**Tests covered:**
- Valid deadline acceptance
- Expired deadline rejection
- Deadline boundary conditions
- Infinite validity range handling
- Short deadline MEV protection
- Transaction ordering attack simulation
- Deadline granularity protection
- Multiple deadline validations

#### 4. Empty Pool Tests
```bash
aiken test --match "empty_pool_test"
```
**Tests covered:**
- Empty pool initialization
- Minimal valid pool creation
- First liquidity provision
- Zero reserve protection
- Pool drainage protection
- Minimal swap amounts
- Single unit liquidity
- Initialization sequence validation

#### 5. Mathematical Edge Cases Tests
```bash
aiken test --match "mathematical_edge_cases_test"
```
**Tests covered:**
- Large number multiplication safety
- Maximum integer handling
- Product calculation overflow protection
- Division by zero protection
- Small amount precision
- Rounding consistency
- Fee calculation precision
- Extreme value handling
- LP token calculation edge cases
- Constant product invariant maintenance

#### 6. Comprehensive Integration Tests
```bash
aiken test --match "comprehensive_integration_test"
```
**Tests covered:**
- Slippage and min ADA integration
- Empty pool to functional pool lifecycle
- Multi-vector attack resistance
- Mathematical stress testing
- Fee and slippage interaction
- Complete liquidity lifecycle
- Edge case combinations

### Run Individual Test Functions

To run specific test functions, use the test name:
```bash
# Example: Run specific slippage test
aiken test --match "test_maximum_slippage_protection"

# Example: Run specific mathematical test
aiken test --match "test_integer_overflow_protection"

# Example: Run specific front-run protection test
aiken test --match "test_sandwich_attack_simulation"
```

## Expected Test Results

### Success Criteria
All tests should pass, demonstrating:

1. **Slippage Protection**: ✅
   - Maximum 10% slippage enforcement
   - Proper minimum output validation
   - Price impact scaling with trade size
   - Sandwich attack resistance

2. **Front-Run Protection**: ✅
   - Deadline validation working correctly
   - MEV protection through time constraints
   - Transaction ordering attack resistance

3. **Empty Pool Handling**: ✅
   - Safe pool initialization
   - Zero reserve protection
   - Pool drainage prevention
   - Minimal amount handling

4. **Mathematical Robustness**: ✅
   - No integer overflow/underflow
   - Division by zero protection
   - Precision maintenance
   - Constant product invariant preservation

5. **Min ADA Compliance**: ✅
   - All operations maintain minimum ADA requirements
   - Complex multi-asset scenarios handled
   - Enhanced validation integration

### Failure Investigation

If tests fail, investigate in this order:

1. **Check Import Paths**: Ensure all module imports are correct
2. **Verify Function Signatures**: Confirm function signatures match implementations
3. **Review Test Logic**: Check test assertions and expected values
4. **Examine Edge Cases**: Look for mathematical edge cases causing failures
5. **Validate Constants**: Ensure constants like `min_ada`, `max_slippage_bps` are defined

## Performance Benchmarks

Expected test execution times:
- **Individual test files**: 1-5 seconds each
- **Complete test suite**: 10-30 seconds
- **Comprehensive integration tests**: 5-10 seconds

## Debugging Failed Tests

### Common Issues and Solutions

1. **Import Errors**
   ```bash
   # Check module structure
   ls -la contracts/
   # Verify import paths in test files
   ```

2. **Function Not Found**
   ```bash
   # Check function exports in validator files
   grep -n "fn function_name" contracts/*.aiken
   ```

3. **Type Mismatches**
   ```bash
   # Run type checking
   aiken check
   ```

4. **Mathematical Assertion Failures**
   - Review calculation logic
   - Check for integer overflow scenarios
   - Verify constant product maintenance

## Test Coverage Report

To generate a detailed coverage report:
```bash
aiken test --coverage --output-format=html
```

This will generate an HTML report showing:
- Function coverage percentages
- Line coverage for each validator
- Uncovered edge cases
- Critical path analysis

## Continuous Integration

For CI/CD integration, use:
```bash
# Run tests with exit codes for CI
aiken test --ci

# Generate machine-readable output
aiken test --output-format=json > test_results.json
```

## Security Validation Checklist

After running tests, verify:

- [ ] All slippage protection tests pass
- [ ] Front-run protection mechanisms work
- [ ] Empty pool scenarios are handled safely
- [ ] Mathematical edge cases don't cause failures
- [ ] Min ADA requirements are maintained
- [ ] No integer overflow/underflow occurs
- [ ] Constant product invariant is preserved
- [ ] Attack simulation tests demonstrate resistance

## Next Steps

1. **Run the complete test suite**
2. **Review any failing tests**
3. **Generate coverage report**
4. **Document any additional edge cases discovered**
5. **Integrate tests into CI/CD pipeline**
6. **Schedule regular security test execution**

This comprehensive test suite ensures PuckSwap validators are production-ready and secure against various edge cases and attack vectors.
