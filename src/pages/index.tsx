import React from 'react';
import Link from 'next/link';
import Head from 'next/head';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>PuckSwap - Cardano DEX</title>
        <meta name="description" content="Swap tokens on Cardano preprod testnet" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto px-4">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-6">
            PuckSwap
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            A modern DEX built on Cardano with Aiken smart contracts
          </p>
          
          <div className="space-y-4 mb-12">
            <Link href="/swap">
              <a className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                Launch App →
              </a>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                🔒 Secure
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Audited Aiken smart contracts deployed on Cardano
              </p>
            </div>
            
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                ⚡ Fast
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Optimized for speed with Lucid Evolution
              </p>
            </div>
            
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                🌐 Testnet Ready
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Live on Cardano preprod testnet
              </p>
            </div>
          </div>
          
          <div className="mt-12 text-sm text-gray-500 dark:text-gray-400">
            <p>Contract Addresses:</p>
            <p className="font-mono text-xs mt-2">
              Swap: addr_test1wq2h74nkmwd0pu5e0xytu6695p62xf8xagq6zc6rpy6ftgqy93gtr
            </p>
            <p className="font-mono text-xs">
              Liquidity: addr_test1wquuqqd9dlsy5l6dxhq8f3urrng0pea37c9ws8fxlzvegqs8p87l4
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
