// PuckSwap v5 - Swap Component Demo Page
// Demonstrates the enhanced Swap component with full functionality

import React from 'react';
import Head from 'next/head';
import Swap from '../components/Swap';

export default function SwapDemo() {
  return (
    <>
      <Head>
        <title>PuckSwap v5 - Swap Demo</title>
        <meta name="description" content="PuckSwap v5 Enhanced Swap Interface Demo" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-black text-terminal-green">
        {/* Background Effects */}
        <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-50"></div>
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,255,0,0.03)_100%)]"></div>
        
        {/* Scanlines Effect */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="h-full w-full bg-[linear-gradient(transparent_50%,_rgba(0,255,0,0.02)_50%)] bg-[length:100%_4px]"></div>
        </div>

        <div className="relative z-10">
          {/* Header */}
          <header className="border-b border-terminal-green/30 bg-black/80 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold font-mono text-terminal-green text-glow">
                    &gt; PUCKSWAP_v5.0_TERMINAL
                  </h1>
                  <p className="text-terminal-amber font-mono text-sm mt-1">
                    Enhanced AMM Swap Interface - Cardano DEX Protocol
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-terminal-green font-mono text-sm">
                    STATUS: <span className="text-terminal-amber">ONLINE</span>
                  </div>
                  <div className="text-terminal-gray font-mono text-xs">
                    Network: {process.env.NEXT_PUBLIC_NETWORK || 'Preprod'}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">


              {/* Feature Highlights */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="terminal-card p-4">
                  <h3 className="text-terminal-green font-mono text-sm mb-2">⚡ Real-Time Updates</h3>
                  <p className="text-terminal-gray font-mono text-xs">
                    Live pool monitoring via Context7 indexing with WebSocket updates
                  </p>
                </div>
                <div className="terminal-card p-4">
                  <h3 className="text-terminal-green font-mono text-sm mb-2">🔗 Multi-Wallet Support</h3>
                  <p className="text-terminal-gray font-mono text-xs">
                    Connect with Eternl, Nami, Vespr, or Lace wallets via CIP-30
                  </p>
                </div>
                <div className="terminal-card p-4">
                  <h3 className="text-terminal-green font-mono text-sm mb-2">🛡️ Slippage Protection</h3>
                  <p className="text-terminal-gray font-mono text-xs">
                    Configurable tolerance with price impact warnings and minimum received
                  </p>
                </div>
              </div>

              {/* Swap Component */}
              <div className="mb-8">
                <Swap />
              </div>

              {/* Technical Details */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="terminal-card p-6">
                  <h3 className="text-terminal-green font-mono text-lg mb-4">🔧 Technical Stack</h3>
                  <ul className="space-y-2 text-sm font-mono text-terminal-gray">
                    <li>• <span className="text-terminal-amber">Lucid Evolution</span> - Transaction building</li>
                    <li>• <span className="text-terminal-amber">Context7</span> - Real-time indexing</li>
                    <li>• <span className="text-terminal-amber">CIP-68</span> - Datum compliance</li>
                    <li>• <span className="text-terminal-amber">React 18</span> - Modern UI framework</li>
                    <li>• <span className="text-terminal-amber">TypeScript</span> - Type safety</li>
                    <li>• <span className="text-terminal-amber">Framer Motion</span> - Smooth animations</li>
                  </ul>
                </div>

                <div className="terminal-card p-6">
                  <h3 className="text-terminal-green font-mono text-lg mb-4">📊 AMM Features</h3>
                  <ul className="space-y-2 text-sm font-mono text-terminal-gray">
                    <li>• <span className="text-terminal-amber">Constant Product</span> - x * y = k formula</li>
                    <li>• <span className="text-terminal-amber">0.3% Fee</span> - 30 basis points</li>
                    <li>• <span className="text-terminal-amber">Price Impact</span> - Real-time calculation</li>
                    <li>• <span className="text-terminal-amber">Slippage Control</span> - 0.1% to 50%</li>
                    <li>• <span className="text-terminal-amber">Min ADA</span> - Protocol compliance</li>
                    <li>• <span className="text-terminal-amber">LP Tokens</span> - Proportional minting</li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <footer className="mt-12 pt-8 border-t border-terminal-green/30">
                <div className="text-center">
                  <p className="text-terminal-gray font-mono text-sm">
                    PuckSwap v5 - Enhanced AMM Protocol for Cardano
                  </p>
                  <p className="text-terminal-gray font-mono text-xs mt-2">
                    Built with ❤️ for the Cardano ecosystem
                  </p>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
