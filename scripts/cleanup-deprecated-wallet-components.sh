#!/bin/bash

# PuckSwap Deprecated Wallet Components Cleanup Script
# Safely removes deprecated wallet components after successful consolidation

echo "🧹 PuckSwap Wallet Components Cleanup"
echo "====================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the PuckSwap root directory."
    exit 1
fi

# Check if the new wallet integration is working
echo "🔍 Checking wallet integration status..."

# Run the wallet integration test
if npm run test:wallet-integration > /dev/null 2>&1; then
    echo "✅ Wallet integration tests passed"
else
    echo "❌ Wallet integration tests failed. Cannot proceed with cleanup."
    echo "   Please fix the wallet integration issues first."
    exit 1
fi

echo ""
echo "📋 The following deprecated wallet components will be removed:"
echo ""

# List of deprecated files to remove
DEPRECATED_FILES=(
    "src/components/WalletConnect.tsx"
    "src/components/WalletConnection.tsx"
    "src/components/WalletConnectMigrated.tsx"
    "src/components/WalletConnectionTest.tsx"
    "src/components/WalletAssetTest.tsx"
    "src/components/WalletAssets.tsx"
)

# Check which files exist
EXISTING_FILES=()
for file in "${DEPRECATED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  - $file"
        EXISTING_FILES+=("$file")
    fi
done

if [ ${#EXISTING_FILES[@]} -eq 0 ]; then
    echo "  No deprecated files found to remove."
    echo ""
    echo "✅ Cleanup already complete!"
    exit 0
fi

echo ""
echo "⚠️  WARNING: This action cannot be undone!"
echo "   Make sure you have committed your changes to git before proceeding."
echo ""

# Ask for confirmation
read -p "Do you want to proceed with removing these files? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled."
    exit 0
fi

echo ""
echo "🗑️  Removing deprecated wallet components..."

# Create backup directory
BACKUP_DIR="backup/deprecated-wallet-components-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Move files to backup and remove
for file in "${EXISTING_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  📦 Backing up $file to $BACKUP_DIR/"
        cp "$file" "$BACKUP_DIR/"
        
        echo "  🗑️  Removing $file"
        rm "$file"
        
        if [ $? -eq 0 ]; then
            echo "  ✅ Successfully removed $file"
        else
            echo "  ❌ Failed to remove $file"
        fi
    fi
done

echo ""
echo "🔍 Checking for any remaining references to deprecated components..."

# Check for imports of deprecated components
DEPRECATED_IMPORTS=(
    "WalletConnect"
    "WalletConnection"
    "WalletConnectMigrated"
    "WalletConnectionTest"
    "WalletAssetTest"
    "WalletAssets"
)

FOUND_REFERENCES=false

for import_name in "${DEPRECATED_IMPORTS[@]}"; do
    # Search for imports in TypeScript/JavaScript files
    if grep -r "import.*$import_name" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" > /dev/null 2>&1; then
        echo "⚠️  Found references to $import_name:"
        grep -r "import.*$import_name" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
        FOUND_REFERENCES=true
    fi
done

if [ "$FOUND_REFERENCES" = true ]; then
    echo ""
    echo "⚠️  WARNING: Found references to deprecated components."
    echo "   Please update these files to use the consolidated wallet approach."
    echo "   Files have been backed up to: $BACKUP_DIR"
else
    echo "✅ No references to deprecated components found."
fi

echo ""
echo "📊 Cleanup Summary:"
echo "=================="
echo "✅ Removed ${#EXISTING_FILES[@]} deprecated wallet component files"
echo "📦 Backup created at: $BACKUP_DIR"
echo "🧪 Wallet integration tests: PASSING"
echo ""

if [ "$FOUND_REFERENCES" = false ]; then
    echo "🎉 Cleanup completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Test the application: npm run dev"
    echo "2. Test wallet connections with real wallets"
    echo "3. Verify all functionality works as expected"
    echo "4. Commit the changes to git"
    echo ""
    echo "🔧 Active Wallet Components:"
    echo "- WalletProviderWrapper.tsx (Provider)"
    echo "- WalletConnectNew.tsx (Connection UI)"
    echo "- useCardanoWallet.ts (Hook)"
    echo "- WalletPortfolio.tsx (Portfolio display)"
else
    echo "⚠️  Cleanup completed with warnings."
    echo "   Please fix the remaining references before proceeding."
fi

echo ""
echo "📚 Documentation:"
echo "- Integration Plan: docs/CARDANO_CONNECT_WALLET_INTEGRATION_PLAN.md"
echo "- Deprecation Notice: src/components/WALLET_COMPONENTS_DEPRECATED.md"
echo "- Implementation Checklist: docs/IMPLEMENTATION_CHECKLIST.md"
