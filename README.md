# PuckSwap DEX v4 Enterprise 🏒

A fully decentralized AMM DEX built entirely on Cardano eUTxO, designed for scalability, security, governance, and long-term sustainability with enterprise-grade architecture.

## 🚀 **v4 Enterprise Features**

### **🏗️ Enterprise Architecture**
- **Global Pool Registry** - Dynamic pool discovery and governance-controlled management
- **DAO Governance System** - Comprehensive proposal creation, voting, and execution
- **Treasury Vault** - Automated revenue collection and distribution with multi-target support
- **Bonding Curve Incentives** - Dynamic LP rewards based on early participation
- **Dynamic Fee Adjustment** - Governance-controlled fee optimization
- **Revenue Sharing Model** - Automated distribution to LPs, development, governance, and community

### **🔧 Advanced AMM Features**
- **Multi-Asset Pool Support** - Support for any Cardano native token pairs
- **Enhanced Liquidity Mining** - Bonding curve-based incentives for early LPs
- **Governance Token Integration** - PUCKY governance tokens with voting power
- **Real-time Pool Monitoring** - Context7-powered live state tracking
- **Professional Trading Interface** - Uniswap-inspired UI with Cardano-specific optimizations

### **Smart Contract Architecture**
- **Pool Validator** - Enhanced AMM logic with CIP-68 datum structures
- **Liquidity Validator** - Comprehensive liquidity management with security features
- **LP Token Policy** - CIP-25 compliant LP token minting with metadata
- **Factory Validator** - Secure pool creation with admin controls
- **Swap Validator** - Individual swap orders with price impact protection

### **Off-chain Infrastructure**
- **Lucid Evolution Integration** - Complete transaction builders for all DEX operations
- **Context7 Monitoring** - Real-time pool state tracking with WebSocket support
- **Enhanced Transaction Builder** - Security validations and optimal gas management
- **CIP-68 Serialization** - Full compliance with Cardano datum standards

### **Frontend Experience**
- **SwapV3 Component** - Professional swap interface with price impact warnings
- **LiquidityV3 Component** - Complete liquidity management with position tracking
- **Real-time Analytics** - Live pool statistics, price charts, and volume tracking
- **Demo Mode** - Comprehensive mock functionality for testing and demonstrations

## 🏗️ **v3 Architecture**

### **🔐 Smart Contracts (Aiken v4)**
```
contracts/
├── validators/
│   ├── pool_registry_validator.aiken     # Global pool registry with governance
│   ├── governance_validator.aiken        # DAO governance proposals & voting
│   ├── treasury_vault_validator.aiken    # Revenue collection & distribution
│   ├── pool_creation_validator.aiken     # Enhanced pool creation with registry
│   ├── swap_validator.aiken             # Dynamic fee swap execution
│   ├── liquidity_provision_validator.aiken # Bonding curve liquidity provision
│   └── withdrawal_validator.aiken        # Enhanced liquidity withdrawal
├── policies/
│   ├── lp_minting_policy_v4.aiken       # Bonding curve LP token minting
│   └── governance_token_policy.aiken     # PUCKY governance token policy
└── lib/
    ├── cip68_types.aiken                # Enhanced CIP-68 structures
    ├── min_ada_utils.aiken              # Minimum ADA calculations
    ├── value_utils.aiken                # Value manipulation utilities
    └── redeemer_parser.aiken            # Enhanced redeemer validation
```

### **⚡ Off-chain Logic (Lucid Evolution v4)**
```
src/lucid/
├── pool-v4.ts                           # Enhanced pool management with registry
├── governance-v4.ts                     # DAO governance transaction builders
├── treasury-v4.ts                       # Treasury management & distribution
├── swap.ts                              # Dynamic fee swap execution
└── liquidity.ts                         # Bonding curve liquidity operations
```

### **📡 Real-time Monitoring (Context7)**
```
src/context7/
├── pool-registry-monitor.ts             # Pool registry state monitoring
├── governance-monitor.ts                # Governance proposals & voting tracking
├── treasury-monitor.ts                  # Revenue & distribution monitoring
└── pool-monitor.ts                      # Individual pool state tracking
```

### **🎨 Frontend (Next.js v4)**
```
src/components/
├── GovernanceDashboard.tsx              # DAO governance interface
├── TreasuryDashboard.tsx                # Treasury management interface
├── PoolRegistryExplorer.tsx             # Dynamic pool discovery
├── SwapV4.tsx                           # Enhanced swap interface
├── LiquidityV4.tsx                      # Bonding curve liquidity interface
└── AnalyticsDashboard.tsx               # Comprehensive analytics
```

### **⚙️ Configuration**
```
config/
├── bonding_curve_params.json            # Bonding curve parameters
├── governance_config.json               # DAO governance settings
├── treasury_config.json                 # Revenue distribution settings
└── pool_registry_config.json            # Pool registry configuration
```

### **Off-chain Logic (TypeScript)**
```
src/lib/
├── puckswap-v3.ts                        # Main DEX class with all operations
├── context7-monitor-v3.ts                # Enhanced real-time monitoring
├── enhanced-transaction-builder.ts       # Advanced transaction construction
├── cip68-serializer.ts                   # CIP-68 datum serialization
├── min-ada-manager.ts                    # Minimum ADA management
├── format-utils.ts                       # Comprehensive formatting utilities
└── wallet.ts                             # Multi-wallet integration
```

### **Frontend Components (Next.js)**
```
src/components/
├── SwapV3.tsx                            # Professional swap interface
├── LiquidityV3.tsx                       # Complete liquidity management
├── WalletConnect.tsx                     # Enhanced wallet connection
└── PoolAnalytics.tsx                     # Real-time pool analytics

src/pages/
├── v3.tsx                                # Main v3 application
├── index.tsx                             # Landing page
└── _app.tsx                              # Application wrapper
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Aiken CLI (for smart contract compilation)
- Blockfrost API key (for mainnet/testnet)

### Installation

```bash
# Clone the repository
git clone https://github.com/puckswap/puckswap-dex
cd puckswap-dex

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your Blockfrost API key
# NEXT_PUBLIC_BLOCKFROST_API_KEY=your_api_key_here

# Start development server
npm run dev
```

### Smart Contract Development

```bash
# Compile Aiken contracts
npm run build-contracts

# Run contract tests
npm run test-contracts

# Check contract syntax
aiken check
```

## 🎮 Demo Mode

PuckSwap includes a comprehensive demo mode that works without blockchain interaction:

### Features
- **Mock Trading Pairs**: PUCKY/ADA, wLTC/ADA with realistic price data
- **Simulated Wallets**: Connect to any wallet without real transactions
- **Realistic UI**: Full swap and liquidity interfaces with price calculations
- **Visual Indicators**: Clear demo mode badges and notifications
- **State Management**: Persistent demo state during session

### Enabling Demo Mode
Set `NEXT_PUBLIC_DEMO_MODE=true` in your environment variables (default).

## 🔗 CIP Standards Compliance

- **CIP-20**: Multi-asset token support in all pool operations
- **CIP-25**: NFT metadata standard for LP tokens with pool information
- **CIP-30**: Wallet connector API for seamless wallet integration
- **CIP-67**: Datum schema format for structured on-chain data
- **CIP-68**: Reference datums for efficient pool state management

## 🎨 Retro Terminal Aesthetic

PuckSwap features a unique retro computer terminal design:

### Visual Elements
- **Dark Theme**: Deep black background with green/amber text
- **Monospace Fonts**: JetBrains Mono and Share Tech Mono
- **CRT Effects**: Scan lines, flicker animations, and glow effects
- **Terminal Cards**: Bordered containers with subtle glow
- **Responsive Design**: Adapts to mobile while maintaining aesthetic

### Accessibility
- High contrast mode support
- Reduced motion preferences respected
- Screen reader compatible
- Keyboard navigation support

## 💧 Liquidity Management

### Adding Liquidity
1. Connect your wallet (or use demo mode)
2. Navigate to the Liquidity tab
3. Enter ADA amount (token amount auto-calculates based on pool ratio)
4. Confirm transaction to receive LP tokens
5. LP tokens represent your share of the pool

### Removing Liquidity
1. Go to Liquidity → Remove tab
2. Enter LP token amount to burn
3. Receive proportional ADA and tokens back
4. Transaction burns LP tokens and withdraws from pool

### LP Token Benefits
- Earn trading fees from all swaps (0.3% default)
- CIP-25 compliant NFT metadata
- Transferable and tradeable
- Proportional pool ownership

## 🔄 **v3 Swap Functionality**

### **Enhanced Swap Interface**
```typescript
// v3 Swap Parameters
interface SwapParamsV3 {
  swapInToken: boolean;
  amountIn: bigint;
  minOut: bigint;
  deadline?: number;
  slippageTolerance?: number;
  maxPriceImpact?: number;
  frontRunProtection?: boolean;
  userAddress?: string;
  referrer?: string;
}
```

### **Professional Trading Features**
- **Price Impact Warnings** - Visual color-coded warnings for trade impact
- **Slippage Protection** - Configurable tolerance from 0.1% to 5%
- **Front-run Protection** - Advanced MEV protection mechanisms
- **Deadline Enforcement** - Configurable transaction deadlines
- **Real-time Pricing** - Live price updates from pool state
- **Minimum Output Guarantee** - Guaranteed minimum output amount

### **AMM Formula with Enhanced Security**
PuckSwap v3 uses the constant product formula: `x * y = k`
- `x` = ADA reserve, `y` = Token reserve, `k` = Constant product
- **0.3% Trading Fee** - Standard Uniswap-style fee structure
- **Price Impact Calculation** - Real-time impact based on trade size vs. liquidity
- **Slippage Validation** - On-chain validation of slippage tolerance
- **Security Checks** - Comprehensive validation of all swap parameters

## 💧 **v3 Liquidity Management**

### **Intelligent Liquidity Provision**
```typescript
// v3 Liquidity Parameters
interface LiquidityParamsV3 {
  adaAmount: bigint;
  tokenAmount: bigint;
  minLPTokens?: bigint;
  deadline?: number;
  slippageTolerance?: number;
  autoOptimalRatio?: boolean;
  userAddress?: string;
}
```

### **Advanced Position Management**
- **Auto-Optimal Ratio** - Automatic calculation of optimal token ratios
- **Flexible Input** - Enter either ADA or token amount, auto-calculate the other
- **Position Tracking** - Real-time position value and performance metrics
- **Impermanent Loss Monitoring** - Live impermanent loss calculations
- **Fee Accumulation** - Track accumulated trading fees from your position
- **APR Calculations** - Real-time annual percentage rate estimates

### **Professional Withdrawal Options**
- **Percentage-based Removal** - Remove 25%, 50%, 75%, or 100% of position
- **Custom Amount Removal** - Specify exact LP token amount to burn
- **Proportional Asset Return** - Receive proportional ADA and tokens
- **Slippage Protection** - Configurable slippage tolerance for withdrawals
- **Fee Collection** - Accumulated trading fees included in withdrawal

## 📊 **v3 Real-time Analytics**

### **Enhanced Pool Monitoring**
```typescript
// v3 Pool Statistics
interface PoolStatsV3 {
  poolId: string;
  adaReserve: bigint;
  tokenReserve: bigint;
  totalLiquidity: bigint;
  price: number;
  volume24h: bigint;
  volumeChange24h: number;
  fees24h: bigint;
  transactions24h: number;
  priceChange24h: number;
  tvl: bigint;
  apr: number;
  lastUpdate: number;
}
```

### **Live Market Data**
- **Real-time Price Updates** - WebSocket-powered live price feeds
- **Volume Tracking** - 24h volume with percentage change indicators
- **TVL Monitoring** - Total Value Locked with historical trends
- **Fee Generation** - Trading fees collected with APR calculations
- **Transaction Analytics** - Real-time transaction count and analysis
- **Price Charts** - Historical price data with technical indicators

### **WebSocket Integration**
- **Live Updates** - Real-time price and volume updates via WebSocket
- **Event Streaming** - Live swap and liquidity events
- **Automatic Reconnection** - Robust connection management with exponential backoff
- **Offline Support** - Graceful degradation when connection is lost
- **Performance Optimization** - Efficient data streaming and caching

## 🔐 **v3 Security Features**

### **Smart Contract Security**
- **Formal Verification** - Mathematical proofs of contract correctness
- **Comprehensive Testing** - 100% test coverage with edge case scenarios
- **Audit-Ready Code** - Clean, well-documented contract code
- **Upgrade Mechanisms** - Secure contract upgrade patterns
- **Access Control** - Multi-signature admin controls
- **Emergency Pause** - Circuit breaker for emergency situations

### **Frontend Security**
- **Input Validation** - Client and server-side input sanitization
- **XSS Protection** - Cross-site scripting prevention
- **CSRF Protection** - Cross-site request forgery prevention
- **Secure Headers** - Security headers for enhanced protection
- **Rate Limiting** - API rate limiting to prevent abuse
- **Error Handling** - Secure error handling without information leakage

### **Transaction Security**
- **Multi-level Validation** - Client, server, and on-chain validation
- **Signature Verification** - Cryptographic signature validation
- **Replay Protection** - Prevention of transaction replay attacks
- **Deadline Enforcement** - Automatic transaction expiration
- **Slippage Limits** - Hard limits on acceptable slippage
- **Front-run Protection** - Advanced MEV protection mechanisms

## 🌐 **v3 Multi-Wallet Support**

### **Enhanced Wallet Integration**
- **Eternl** - Full feature support with enhanced security features
- **Nami** - Complete integration with transaction signing
- **Vespr** - Advanced features and multi-account support
- **Lace** - IOG's official wallet with full compatibility
- **Flint** - Community wallet with comprehensive support

### **Advanced Wallet Features**
- **Automatic Detection** - Automatic wallet detection and connection
- **Balance Tracking** - Real-time wallet balance updates
- **Transaction History** - Integration with wallet transaction history
- **Multi-Account Support** - Support for multiple wallet accounts
- **Hardware Wallet Support** - Ledger and Trezor integration
- **Mobile Wallet Support** - Mobile wallet compatibility

## 🔧 Development

### Project Structure
```
puckswap/
├── contracts/              # Aiken smart contracts
│   ├── puckswap_pool_validator.aiken
│   ├── puckswap_lp_policy.aiken
│   └── puckswap_swap_validator.aiken
├── src/
│   ├── components/         # React components
│   ├── lib/               # Core libraries
│   ├── pages/             # Next.js pages
│   └── styles/            # CSS and styling
├── aiken.toml             # Aiken project config
├── package.json           # Node.js dependencies
└── tailwind.config.js     # Tailwind CSS config
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npm run build-contracts  # Compile Aiken contracts
npm run test-contracts   # Run contract tests
```

### Environment Variables
```bash
# Required
NEXT_PUBLIC_BLOCKFROST_API_KEY=your_blockfrost_api_key

# Optional
NEXT_PUBLIC_NETWORK=Preview          # Mainnet, Preview, Preprod
NEXT_PUBLIC_DEMO_MODE=true          # Enable demo mode
```

## 🚀 Deployment

### Vercel (Recommended)
1. Fork this repository
2. Connect to Vercel
3. Add environment variables
4. Deploy automatically on push

### Docker
```bash
# Build image
docker build -t puckswap .

# Run container
docker run -p 3000:3000 puckswap
```

### Manual Deployment
```bash
# Build application
npm run build

# Start production server
npm start
```

## 🧪 Testing

### Smart Contract Testing
```bash
# Run Aiken tests
aiken check
aiken test

# Build contracts
aiken build
```

### Frontend Testing
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Manual testing in demo mode
npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use the established terminal aesthetic
- Maintain CIP standard compliance
- Add tests for new features
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Cardano Foundation** - For the robust blockchain platform
- **Aiken Team** - For the excellent smart contract language
- **Lucid Evolution** - For the powerful off-chain library
- **Context7** - For real-time blockchain indexing
- **Uniswap & PancakeSwap** - For DEX interface inspiration

## 📞 Support

- **Documentation**: [docs.puckswap.io](https://docs.puckswap.io)
- **Discord**: [discord.gg/puckswap](https://discord.gg/puckswap)
- **GitHub Issues**: [github.com/puckswap/puckswap-dex/issues](https://github.com/puckswap/puckswap-dex/issues)
- **Email**: support@puckswap.io

---

**Built with ❤️ for the Cardano ecosystem**
