#!/bin/bash

# PuckSwap cardano-connect-with-wallet Installation Script
# Installs the Cardano Foundation's official wallet connection library

echo "🚀 Installing cardano-connect-with-wallet for PuckSwap..."
echo "=================================================="

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the PuckSwap root directory."
    exit 1
fi

echo "📦 Installing @cardano-foundation/cardano-connect-with-wallet..."

# Install the main library
npm install @cardano-foundation/cardano-connect-with-wallet

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ Successfully installed @cardano-foundation/cardano-connect-with-wallet"
else
    echo "❌ Failed to install @cardano-foundation/cardano-connect-with-wallet"
    exit 1
fi

echo "📦 Installing core library..."

# Install the core library
npm install @cardano-foundation/cardano-connect-with-wallet-core

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ Successfully installed @cardano-foundation/cardano-connect-with-wallet-core"
else
    echo "❌ Failed to install @cardano-foundation/cardano-connect-with-wallet-core"
    exit 1
fi

echo "📦 Installing additional dependencies..."

# Install any additional required dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom

echo "🔧 Setting up environment variables..."

# Create or update .env.local with new feature flags
ENV_FILE=".env.local"

# Backup existing .env.local if it exists
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "📋 Backed up existing $ENV_FILE"
fi

# Add new environment variables
echo "" >> "$ENV_FILE"
echo "# Cardano Connect Wallet Configuration" >> "$ENV_FILE"
echo "NEXT_PUBLIC_USE_CARDANO_CONNECT_WALLET=false" >> "$ENV_FILE"
echo "NEXT_PUBLIC_ENABLE_WALLET_FALLBACK=true" >> "$ENV_FILE"
echo "NEXT_PUBLIC_WALLET_MIGRATION_MODE=gradual" >> "$ENV_FILE"

echo "✅ Added cardano-connect-wallet environment variables to $ENV_FILE"

echo "📝 Updating TypeScript configuration..."

# Check if tsconfig.json exists and add module resolution if needed
if [ -f "tsconfig.json" ]; then
    # Create a backup
    cp "tsconfig.json" "tsconfig.json.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Note: In a real implementation, you might want to use a JSON parser
    # For now, we'll just add a note
    echo "📋 Please ensure your tsconfig.json includes proper module resolution for the new library"
fi

echo "🧪 Setting up test configuration..."

# Create jest configuration if it doesn't exist
if [ ! -f "jest.config.js" ] && [ ! -f "jest.config.json" ]; then
    cat > jest.config.js << 'EOF'
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/src/tests/**/*.{js,jsx,ts,tsx}'
  ]
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
EOF
    echo "✅ Created jest.config.js"
fi

# Create jest setup file if it doesn't exist
if [ ! -f "jest.setup.js" ]; then
    cat > jest.setup.js << 'EOF'
import '@testing-library/jest-dom'

// Mock cardano-connect-with-wallet for testing
jest.mock('@cardano-foundation/cardano-connect-with-wallet', () => ({
  useCardano: jest.fn(() => ({
    isEnabled: false,
    isConnected: false,
    enabledWallet: null,
    stakeAddress: null,
    signMessage: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn()
  })),
  ConnectWalletList: jest.fn(() => null),
  ConnectWalletButton: jest.fn(() => null),
  CardanoProvider: jest.fn(({ children }) => children)
}))

// Mock window.cardano for wallet testing
Object.defineProperty(window, 'cardano', {
  value: {
    eternl: {
      enable: jest.fn(() => Promise.resolve({
        getUtxos: jest.fn(() => Promise.resolve([])),
        getBalance: jest.fn(() => Promise.resolve('0')),
        getNetworkId: jest.fn(() => Promise.resolve(0))
      }))
    }
  },
  writable: true
})
EOF
    echo "✅ Created jest.setup.js"
fi

echo "📚 Creating documentation..."

# Create migration guide
cat > docs/CARDANO_CONNECT_WALLET_MIGRATION.md << 'EOF'
# PuckSwap: cardano-connect-with-wallet Migration Guide

## Quick Start

1. **Enable the new implementation:**
   ```bash
   # Set environment variable
   NEXT_PUBLIC_USE_CARDANO_CONNECT_WALLET=true
   ```

2. **Test the implementation:**
   ```bash
   npm run test:wallet
   ```

3. **Gradual migration:**
   - Start with `NEXT_PUBLIC_WALLET_MIGRATION_MODE=gradual`
   - Test thoroughly with real wallets
   - Switch to `NEXT_PUBLIC_WALLET_MIGRATION_MODE=immediate` when ready

## Environment Variables

- `NEXT_PUBLIC_USE_CARDANO_CONNECT_WALLET`: Enable new implementation
- `NEXT_PUBLIC_ENABLE_WALLET_FALLBACK`: Enable automatic fallback
- `NEXT_PUBLIC_WALLET_MIGRATION_MODE`: Migration strategy (gradual/immediate/testing)

## Testing

Run the test suite:
```bash
npm run test:wallet-integration
```

## Rollback

To rollback to the legacy implementation:
```bash
NEXT_PUBLIC_USE_CARDANO_CONNECT_WALLET=false
```

## Support

For issues with the migration, check:
1. Browser console for error messages
2. Network connectivity
3. Wallet extension versions
4. Environment variable configuration
EOF

echo "✅ Created migration documentation"

echo "🎯 Adding npm scripts..."

# Add test scripts to package.json (note: this is a simplified approach)
echo "📋 Please add the following scripts to your package.json:"
echo ""
echo "\"scripts\": {"
echo "  \"test:wallet\": \"jest src/tests/cardano-connect-wallet-test.ts\","
echo "  \"test:wallet-integration\": \"jest src/tests/ --testNamePattern=wallet\","
echo "  \"wallet:migrate-to-new\": \"node -e \\\"console.log('Setting USE_CARDANO_CONNECT_WALLET=true'); process.env.NEXT_PUBLIC_USE_CARDANO_CONNECT_WALLET='true'\\\"\","
echo "  \"wallet:migrate-to-legacy\": \"node -e \\\"console.log('Setting USE_CARDANO_CONNECT_WALLET=false'); process.env.NEXT_PUBLIC_USE_CARDANO_CONNECT_WALLET='false'\\\"\""
echo "}"

echo ""
echo "=================================================="
echo "✅ cardano-connect-with-wallet installation complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Add the npm scripts shown above to your package.json"
echo "2. Review the environment variables in .env.local"
echo "3. Test the new implementation with: npm run test:wallet"
echo "4. Enable gradual migration when ready"
echo "5. Update your app to use WalletProviderWrapper"
echo ""
echo "📚 Documentation:"
echo "- Migration guide: docs/CARDANO_CONNECT_WALLET_MIGRATION.md"
echo "- Integration plan: docs/CARDANO_CONNECT_WALLET_INTEGRATION_PLAN.md"
echo ""
echo "🔧 Configuration:"
echo "- Feature flags: .env.local"
echo "- Test setup: jest.config.js, jest.setup.js"
echo ""
echo "⚠️  Remember to:"
echo "- Test with real Cardano wallets on preprod testnet"
echo "- Monitor for any compatibility issues"
echo "- Keep the legacy implementation as fallback initially"
echo ""
echo "🎉 Happy wallet connecting!"
