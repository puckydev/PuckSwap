# PuckSwap Testnet Testing Guide

## 🎯 Complete End-to-End Testing Instructions

### Prerequisites ✅
- ✅ Smart contracts deployed to Preprod testnet
- ✅ Development server running on http://localhost:3001
- ✅ Environment configured for testnet
- ✅ Transaction builders verified and working
- ✅ **WALLET CONNECTION FIX APPLIED** - Lucid Evolution API compatibility resolved

### Required Setup

#### 1. Install a Testnet Wallet
**Recommended: Eternl Wallet**
- Download from: https://eternl.io/
- Install browser extension
- Create new wallet or import existing
- **IMPORTANT**: Switch to Preprod Testnet in wallet settings

**Alternative Wallets:**
- Lace: https://www.lace.io/
- Vespr: https://vespr.xyz/
- Any CIP-30 compatible wallet

#### 2. Fund Your Testnet Wallet
- Get testnet ADA from Cardano faucet: https://docs.cardano.org/cardano-testnet/tools/faucet/
- Request at least 100 tADA for testing
- Wait for confirmation (usually 1-2 minutes)

### Testing Phases

## Phase 1: Wallet Connection Testing 🔗

### Test 1.1: Wallet Detection
1. Open http://localhost:3001
2. Look for wallet connection interface
3. **Expected**: Available wallets should be detected automatically
4. **Verify**: Your installed wallet appears in the list

### Test 1.2: Wallet Connection
1. Click "Connect Wallet" button
2. Select your testnet wallet (e.g., Eternl)
3. **Expected**: Wallet popup appears requesting permission
4. Click "Allow" or "Connect" in wallet popup
5. **Expected**: 
   - Connection success message appears
   - Wallet address displayed (starts with `addr_test1`)
   - Balance shows your testnet ADA amount

### Test 1.3: Balance Detection
1. After wallet connection
2. **Verify**: 
   - ADA balance matches your wallet
   - Balance updates in real-time
   - Address format is correct for testnet

## Phase 2: Token Discovery Testing 🪙

### Test 2.1: Available Tokens
1. Navigate to swap interface
2. Click token selector dropdown
3. **Expected**: 
   - ADA is always available
   - Sample development tokens appear (since no real pools exist yet)
   - Token list loads without errors

### Test 2.2: Pool Discovery
1. Check browser console (F12 → Console)
2. **Expected logs**:
   ```
   🔍 Discovering available tokens from real pools...
   📦 Found 0 UTxOs at swap validator
   📊 Fetched 0 active pools
   🧪 Development mode: Adding sample tokens for testing
   ```
3. **Verify**: System correctly detects no existing pools

## Phase 3: Transaction Building Testing 🔧

### Test 3.1: Swap Transaction Preparation
1. Select ADA → Sample Token swap
2. Enter amount (e.g., 10 ADA)
3. **Expected**: 
   - Swap preview appears
   - Estimated output calculated
   - No errors in console

### Test 3.2: Liquidity Transaction Preparation
1. Navigate to Liquidity tab
2. Select "Add Liquidity"
3. Enter ADA and token amounts
4. **Expected**: 
   - LP token calculation appears
   - Transaction preview shows
   - No errors in console

## Phase 4: Real Transaction Testing 💰

### Test 4.1: Create Initial Pool (Advanced)
**Note**: This requires actual token creation first

1. If you have test tokens, try creating a pool
2. **Expected**: Transaction builds successfully
3. **Verify**: Wallet prompts for signature

### Test 4.2: Transaction Simulation
1. Build any transaction (don't submit)
2. **Expected**: 
   - Transaction builds without errors
   - Proper fee calculation
   - Correct UTxO selection

## Phase 5: Error Handling Testing ⚠️

### Test 5.1: Insufficient Balance
1. Try to swap more ADA than you have
2. **Expected**: Clear error message about insufficient funds

### Test 5.2: Network Issues
1. Disconnect internet briefly
2. Try to perform action
3. **Expected**: Appropriate error handling

### Test 5.3: Wallet Disconnection
1. Disconnect wallet from extension
2. Try to perform action
3. **Expected**: Prompt to reconnect wallet

## Verification Checklist ✅

### Core Functionality
- [ ] Wallet detection works
- [ ] Wallet connection successful
- [ ] Balance detection accurate
- [ ] Token discovery functional
- [ ] Transaction building works
- [ ] Error handling appropriate

### Network Configuration
- [ ] Testnet addresses (addr_test1...)
- [ ] Preprod network detected
- [ ] Blockfrost API responding
- [ ] Contract addresses loaded

### User Experience
- [ ] Interface loads without errors
- [ ] Responsive design works
- [ ] Clear error messages
- [ ] Smooth wallet interaction

## Expected Results Summary

### ✅ Working Features
- Wallet connection and detection
- Balance and address display
- Token discovery (with fallback)
- Transaction building
- Real-time blockchain queries
- Error handling

### ⚠️ Expected Limitations
- No existing liquidity pools (new deployment)
- Limited token selection (no real pools)
- Sample tokens for testing only

### 🚀 Ready for Production
- Smart contracts deployed
- Wallet integration complete
- Transaction builders functional
- Testnet configuration verified

## Troubleshooting

### Common Issues
1. **Wallet not detected**: Ensure wallet extension is installed and enabled
2. **Wrong network**: Verify wallet is set to Preprod testnet
3. **No balance**: Fund wallet from testnet faucet
4. **Connection fails**: Try refreshing page and reconnecting

### Debug Information
- Check browser console for detailed logs
- Verify wallet network settings
- Confirm testnet ADA balance
- Check contract addresses in deployment/addresses.json

## Next Steps After Testing

1. **Create Real Liquidity Pools**: Deploy test tokens and create initial pools
2. **Test Real Swaps**: Execute actual swap transactions
3. **Monitor Performance**: Track transaction success rates
4. **User Feedback**: Gather feedback on UX/UI
5. **Mainnet Preparation**: Prepare for mainnet deployment

---

**🎉 PuckSwap is ready for comprehensive testnet usage!**
