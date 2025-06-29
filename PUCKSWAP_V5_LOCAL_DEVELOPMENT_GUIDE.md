# 🚀 PuckSwap v5 Local Development Setup Guide

This guide provides step-by-step instructions to launch PuckSwap v5 DeFi application on localhost for local development and testing.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **Git** (for version control)

---

## 🔧 Step 1: Install Dependencies

First, install all required dependencies:

```bash
# Install all dependencies
npm install

# Verify installation
npm list --depth=0
```

**Expected output:** All dependencies should install without errors, including:
- `@lucid-evolution/lucid`
- `next`
- `react`
- `tailwindcss`
- `framer-motion`
- `react-hot-toast`

---

## 🌍 Step 2: Configure Environment Variables

Create a `.env.local` file in the project root with the following configuration:

```bash
# Create environment file
touch .env.local
```

Add the following environment variables to `.env.local`:

```bash
# ===========================================
# PuckSwap v5 Local Development Configuration
# ===========================================

# Network Configuration
NETWORK=preprod
NEXT_PUBLIC_NETWORK=Preprod

# Demo Mode (IMPORTANT: Keep this enabled for local testing)
NEXT_PUBLIC_DEMO_MODE=true

# Blockfrost API Keys (for Preprod testnet)
BLOCKFROST_API_KEY_PREPROD=preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL
NEXT_PUBLIC_BLOCKFROST_API_KEY=preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL
NEXT_PUBLIC_PREPROD_API_KEY=preprodd86p4euUeF6yIUbwl03sJJMD03aICMxL

# Blockfrost API Keys (for Mainnet - for future use)
BLOCKFROST_API_KEY_MAINNET=mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7
NEXT_PUBLIC_MAINNET_API_KEY=mainnet6q2cu8SKVFP3cUMR6yQp2fTK9xh7Gji7

# Contract Addresses (Preprod Testnet)
NEXT_PUBLIC_SWAP_VALIDATOR_ADDRESS=addr_test1wzgcaxmervmczuv0xhz7l6q5dm8cph5y2ea3h62vsvvzwpcj6t98g
NEXT_PUBLIC_LIQUIDITY_VALIDATOR_ADDRESS=addr_test1wrjkmckqj5gm4znvrysj7w222a33ppdszz5nr6vwlmwpf0gxnc3pj
NEXT_PUBLIC_STAKING_VALIDATOR_ADDRESS=addr_test1wpjtepk6gptg6a7w8qpq89dp2rvmjjqv52ezxmnv2wr9nagan5xqk
NEXT_PUBLIC_CROSSCHAIN_VALIDATOR_ADDRESS=addr_test1wqrmczgy3s4eztn3s5k6lr7wzx6q2xrr8ufft5h594xrkesdrt4ay

# Minting Policy IDs
NEXT_PUBLIC_LP_POLICY_ID=ad524e5497fdf1f924de936f9f7ec31d460c02267e8acce544a5a09e
NEXT_PUBLIC_PADA_POLICY_ID=eb031002fa1dbc400bbb5314a63741c8bf8524106fe7b50cafbcc113

# Development Settings
NODE_ENV=development
DEBUG=false
```

---

## 🏗️ Step 3: Verify Build System

Test that the build system is working correctly:

```bash
# Test TypeScript compilation
npm run type-check

# Test environment configuration
npm run test-env-preprod

# Verify contract compilation (optional)
npm run build-contracts
```

**Expected output:**
- TypeScript compilation should complete without errors
- Environment test should show all configuration loaded correctly
- Contract compilation should succeed (if Aiken is installed)

---

## 📄 Step 4: Create PuckSwap v5 Page

Create a dedicated page for PuckSwap v5 components:

```bash
# Create the v5 page file
touch src/pages/v5.tsx
```

---

## 🚀 Step 5: Start Development Server

Launch the Next.js development server:

```bash
# Start the development server
npm run dev
```

**Expected output:**
```
> puckswap-dex@1.0.0 dev
> next dev

ready - started server on 0.0.0.0:3000, url: http://localhost:3000
info  - Loaded env from .env.local
event - compiled client and server successfully in 2.3s (173 modules)
```

---

## 🌐 Step 6: Access the Application

Open your browser and navigate to:

**Main Application:** http://localhost:3000
**PuckSwap v5 Interface:** http://localhost:3000/v5

### Available Routes:
- **/** - Main PuckSwap interface (v2 components)
- **/v5** - PuckSwap v5 DeFi interface (all v5 components)
- **/v3** - PuckSwap v3 interface
- **/staking** - Liquid staking interface
- **/crosschain** - Cross-chain router interface

---

## ✅ Step 7: Verify Demo Mode

Confirm that demo mode is enabled and working:

1. **Check Demo Banner:** You should see a yellow banner at the top stating "DEMO MODE ACTIVE"
2. **Test Wallet Connection:** Click wallet connect buttons - they should work without requiring real wallets
3. **Test Transactions:** All transaction buttons should work and show success messages
4. **Check Console:** Open browser dev tools - you should see demo mode logs

### Demo Mode Features:
- ✅ **Mock Wallet Connections** - No real wallet required
- ✅ **Simulated Transactions** - All operations work without blockchain
- ✅ **Realistic Data** - Pool reserves, prices, and balances are simulated
- ✅ **Safe Testing** - No real ADA or tokens at risk

---

## 🧪 Step 8: Test All v5 Components

Navigate to http://localhost:3000/v5 and test each component:

### SwapV5 Component
- ✅ Token selection (ADA ↔ PUCKY)
- ✅ Amount input and price calculation
- ✅ Slippage tolerance settings
- ✅ Swap execution (demo mode)

### LiquidityV5 Component
- ✅ Add liquidity with proportional amounts
- ✅ Remove liquidity and LP token burning
- ✅ Pool statistics display

### LiquidStaking Component
- ✅ Stake ADA and mint pADA tokens
- ✅ Unstake pADA and withdraw ADA
- ✅ Rewards tracking and APY display

### CrossChainRouterV5 Component
- ✅ Multi-chain support (Ethereum, BSC, etc.)
- ✅ Cross-chain transfer simulation
- ✅ Bridge selection and fee calculation

### GovernanceV5 Component
- ✅ DAO proposal creation
- ✅ Voting interface
- ✅ Treasury management

---

## 🔧 Troubleshooting

### Issue: Server Won't Start

**Symptoms:** `npm run dev` fails or shows errors

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be v18+
```

### Issue: Environment Variables Not Loading

**Symptoms:** Demo mode not working, API errors

**Solutions:**
```bash
# Verify .env.local exists and has correct format
cat .env.local

# Restart development server
npm run dev

# Check environment loading
npm run test-env-preprod
```

### Issue: TypeScript Errors

**Symptoms:** Red underlines in IDE, compilation errors

**Solutions:**
```bash
# Run type checking
npm run type-check

# Install missing type definitions
npm install --save-dev @types/node @types/react @types/react-dom

# Restart TypeScript server in your IDE
```

### Issue: Styling Not Loading

**Symptoms:** Components appear unstyled, missing terminal aesthetic

**Solutions:**
```bash
# Verify Tailwind CSS is working
npm run build

# Check if custom CSS is loading
# Look for terminal-* classes in browser dev tools

# Clear browser cache and hard refresh
Ctrl+Shift+R (or Cmd+Shift+R on Mac)
```

### Issue: Components Not Rendering

**Symptoms:** Blank pages, component errors

**Solutions:**
```bash
# Check browser console for JavaScript errors
# Open dev tools (F12) and look for red errors

# Verify all imports are correct
npm run type-check

# Test individual components
# Navigate to different routes to isolate the issue
```

---

## 📊 Development Workflow

### Daily Development Routine:
1. **Start Server:** `npm run dev`
2. **Open Browser:** http://localhost:3000/v5
3. **Enable Demo Mode:** Verify banner is visible
4. **Test Components:** Check all functionality works
5. **Check Console:** Monitor for any errors or warnings

### Before Making Changes:
1. **Run Tests:** `npm run test-env-preprod`
2. **Type Check:** `npm run type-check`
3. **Verify Demo Mode:** Ensure safe testing environment

### After Making Changes:
1. **Test All Components:** Verify nothing is broken
2. **Check Browser Console:** Look for new errors
3. **Test Responsive Design:** Check mobile/tablet layouts

---

## 🎯 Next Steps

Once you have the local environment running:

1. **Explore Components:** Test all v5 features in demo mode
2. **Review Code:** Examine component implementations
3. **Customize Styling:** Modify the retro terminal theme
4. **Add Features:** Implement new functionality
5. **Test Real Wallets:** Disable demo mode for testnet testing

---

## 📚 Additional Resources

- **Component Documentation:** `src/components/README-V5.md`
- **Environment Configuration:** `src/config/README.md`
- **Deployment Guide:** `PUCKSWAP_V5_DEPLOYMENT_GUIDE.md`
- **Architecture Overview:** `PUCKSWAP_V5_IMPLEMENTATION_SUMMARY.md`

---

**🎉 Congratulations! You now have PuckSwap v5 running locally for development and testing.**

**Default URL:** http://localhost:3000/v5  
**Default Port:** 3000  
**Demo Mode:** Enabled by default for safe testing
