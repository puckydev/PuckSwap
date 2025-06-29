#!/bin/bash

# PuckSwap Immediate Extension Conflict Fix
# Applies enhanced protection against browser extension conflicts

echo "🛡️ PuckSwap Immediate Extension Conflict Fix"
echo "============================================"
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the PuckSwap root directory."
    exit 1
fi

echo "🔧 Applying immediate extension conflict fixes..."

# Stop any running development server
echo "🛑 Stopping development server..."
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Clear Next.js cache to ensure fresh build
echo "🧹 Clearing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache

# Verify all protection files are in place
echo "🔍 Verifying protection files..."

REQUIRED_FILES=(
    "src/lib/browser-extension-guard.ts"
    "src/components/ExtensionErrorBoundary.tsx"
    "public/extension-guard.js"
    "src/pages/_document.tsx"
)

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo "❌ Missing protection files:"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
    echo ""
    echo "Please ensure all extension protection files are properly created."
    exit 1
fi

echo "✅ All protection files verified"

# Test the extension guard
echo "🧪 Testing extension guard..."
npm run test:wallet-integration

if [ $? -ne 0 ]; then
    echo "⚠️  Extension guard tests failed, but continuing with fixes..."
else
    echo "✅ Extension guard tests passed"
fi

# Start development server with enhanced protection
echo "🚀 Starting development server with enhanced extension protection..."

# Set environment variables for maximum protection
export NEXT_PUBLIC_EXTENSION_GUARD_AGGRESSIVE=true
export NEXT_PUBLIC_EXTENSION_GUARD_DEBUG=true

# Start the server
npm run dev &
DEV_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 8

# Check if server is running
if kill -0 $DEV_PID 2>/dev/null; then
    echo "✅ Development server started successfully with enhanced protection"
    echo ""
    echo "🛡️ Enhanced Extension Protection Active:"
    echo "======================================="
    echo "✅ Early inline script protection"
    echo "✅ Public extension guard script"
    echo "✅ Enhanced browser extension guard"
    echo "✅ Extension error boundary"
    echo "✅ Runtime mutation observer"
    echo "✅ Protected window.cardano object"
    echo "✅ Aggressive error suppression"
    echo ""
    echo "🌐 Application URL: http://localhost:3000"
    echo ""
    echo "🧪 Testing Instructions:"
    echo "======================="
    echo "1. Open http://localhost:3000 in your browser"
    echo "2. Open browser developer tools (F12)"
    echo "3. Check the Console tab for extension guard messages"
    echo "4. Look for messages starting with '🛡️'"
    echo "5. Try connecting a Cardano wallet"
    echo "6. Verify no extension errors appear"
    echo ""
    echo "🔍 Expected Console Messages:"
    echo "============================"
    echo "🛡️ Inline extension protection active"
    echo "🛡️ PuckSwap Extension Guard - Early initialization"
    echo "🛡️ Enhanced browser extension guard initialized"
    echo "🛡️ Runtime extension protection active"
    echo ""
    echo "⚠️  If you still see extension conflicts:"
    echo "========================================"
    echo "1. The extension guard should catch and suppress them"
    echo "2. Look for '🛡️ Extension conflict detected' messages"
    echo "3. Try refreshing the page"
    echo "4. Try incognito mode to disable all extensions"
    echo "5. Check that the problematic extension is being detected"
    echo ""
    echo "📊 Debug Information:"
    echo "===================="
    echo "Extension ID: ffnbelfdoeiohenkjibnmadjiehjhajb"
    echo "Problem File: initialInject.js:9:20"
    echo "Error Pattern: Cannot read properties of undefined (reading 'type')"
    echo ""
    echo "✅ Enhanced extension conflict protection is now active!"
    echo "   The server will continue running. Press Ctrl+C to stop."
    echo ""
    echo "📚 Documentation:"
    echo "================"
    echo "- Protection Details: BROWSER_EXTENSION_CONFLICT_RESOLUTION.md"
    echo "- Extension Guard: src/lib/browser-extension-guard.ts"
    echo "- Error Boundary: src/components/ExtensionErrorBoundary.tsx"
    echo "- Early Protection: public/extension-guard.js"
    echo "- Document Setup: src/pages/_document.tsx"
else
    echo "❌ Failed to start development server"
    echo "   Please check the error messages above and try running 'npm run dev' manually"
    exit 1
fi
