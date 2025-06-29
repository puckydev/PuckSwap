import React from 'react';
import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast';

// Dynamic import with SSR disabled to avoid WASM issues
const SwapV5 = dynamic(
  () => import('../components/SwapV5'),
  { 
    ssr: false,
    loading: () => (
      <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-8"></div>
          <div className="space-y-4">
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }
);

export default function SwapPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-8">
          PuckSwap DEX
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-12">
          Swap ADA and PUCKY on Cardano Preprod Testnet
        </p>
        
        <SwapV5 />
        
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Network: Cardano Preprod Testnet</p>
          <p>Make sure your wallet is connected to preprod network</p>
        </div>
      </div>
      
      <Toaster 
        position="top-right"
        toastOptions={{
          className: '',
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
    </div>
  );
} 