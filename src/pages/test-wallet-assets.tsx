import React from 'react';
import Head from 'next/head';
import { Toaster } from 'react-hot-toast';
import WalletAssetTest from '../components/WalletAssetTest';

export default function TestWalletAssetsPage() {
  return (
    <>
      <Head>
        <title>PuckSwap - Wallet Asset Detection Test</title>
        <meta name="description" content="Test real wallet asset detection for PuckSwap DEX" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Toaster position="top-right" />
        
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  PuckSwap
                </h1>
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                  v1.0
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Cardano AMM DEX and DeFi Hub
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Wallet Asset Detection Test
            </h2>
            <p className="text-gray-600">
              Test the enhanced wallet asset detection system that replaces mock balances with real Cardano preprod wallet data.
            </p>
          </div>

          {/* Test Component */}
          <WalletAssetTest />

          {/* Information Section */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🔧 What This Test Does
            </h3>
            <div className="space-y-3 text-gray-700">
              <div className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Connects to your Cardano preprod wallet (Vespr, Eternl, or Lace)</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Fetches real UTxOs and enumerates all assets using Lucid Evolution</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Parses native token policy IDs and asset names from blockchain data</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Displays actual tADA balance (converted from lovelace)</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Shows all native tokens with proper decimal formatting</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Validates the enhanced swap interface can detect real wallet contents</span>
              </div>
            </div>
          </div>

          {/* Implementation Details */}
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🚀 Implementation Details
            </h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Real Asset Detection:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Uses <code>lucid.wallet.getUtxos()</code> for real UTxO enumeration</li>
                  <li>• Aggregates assets across all UTxOs</li>
                  <li>• Parses policy IDs and asset names from hex</li>
                  <li>• Handles decimal formatting for different token types</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Enhanced Swap Interface:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Real-time balance display in swap interface</li>
                  <li>• Asset selection from actual wallet contents</li>
                  <li>• Balance validation before transactions</li>
                  <li>• Automatic refresh after successful swaps</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-8 flex justify-center space-x-4">
            <a
              href="/v5"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Test Enhanced Swap Interface
            </a>
            <a
              href="/"
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Back to Main App
            </a>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-gray-500 text-sm">
              <p>PuckSwap (v1.0) - Cardano AMM DEX and DeFi Hub</p>
              <p className="mt-1">Enhanced with real wallet asset detection using Lucid Evolution</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
