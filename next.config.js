/** @type {import('next').NextConfig} */
const webpack = require('webpack');

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Enable experimental features for better performance
  experimental: {
    // Disable CSS optimization to avoid critters dependency issues
    optimizeCss: false,
    scrollRestoration: true,
    // Better ESM support for Lucid Evolution
    esmExternals: 'loose',
  },

  // Suppress hydration warnings in development
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },

  // Webpack configuration for Cardano libraries
  webpack: (config, { isServer }) => {
    // Handle WebAssembly files with better browser support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
      layers: true,
      topLevelAwait: true,
    };

    // Handle node modules that need to run in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser'),
        // Add additional fallbacks for Lucid Evolution
        path: false,
        os: false,
        util: require.resolve('util'),
        // Additional fallbacks for WASM and browser compatibility
        vm: false,
        child_process: false,
        worker_threads: false,
      };

      // Add global polyfills
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );
    }

    // Add support for importing .wasm files with better error handling
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Handle WASM files from @lucid-evolution/uplc specifically
    config.module.rules.push({
      test: /uplc_tx_bg\.wasm$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/wasm/[name].[hash][ext]',
      },
    });

    // Handle Lucid Evolution modules properly with better error handling
    if (!isServer) {
      // Don't externalize UPLC module, handle it properly instead
      config.resolve.alias = {
        ...config.resolve.alias,
        // Provide browser-compatible alternatives
        '@lucid-evolution/uplc': false,
      };

      // More targeted ignore patterns for Node.js modules
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(fs|path|os|crypto|child_process|worker_threads)$/,
          contextRegExp: /@lucid-evolution/,
        })
      );

      // Handle WASM loading issues specifically
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
          'typeof window': JSON.stringify('object'),
        })
      );

      // Add browser extension conflict prevention
      config.plugins.push(
        new webpack.BannerPlugin({
          banner: `
// PuckSwap Browser Extension Guard
if (typeof window !== 'undefined') {
  window.__PUCKSWAP_EXTENSION_GUARD__ = true;

  // Prevent extension conflicts with error boundary
  const originalError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (source && source.includes('extension://')) {
      console.warn('Extension conflict prevented:', message);
      return true; // Prevent error propagation
    }
    return originalError ? originalError.apply(this, arguments) : false;
  };
}
          `,
          raw: true,
          entryOnly: true,
        })
      );
    }

    return config;
  },

  // Environment variables
  env: {
    // Legacy support
    NEXT_PUBLIC_BLOCKFROST_API_KEY: process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY,
    NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK || 'preprod',
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE || 'false',

    // New centralized environment configuration
    NETWORK: process.env.NETWORK || 'preprod',
    BLOCKFROST_API_KEY: process.env.BLOCKFROST_API_KEY,

    // Network-specific API keys
    NEXT_PUBLIC_PREPROD_API_KEY: process.env.NEXT_PUBLIC_PREPROD_API_KEY,
    NEXT_PUBLIC_MAINNET_API_KEY: process.env.NEXT_PUBLIC_MAINNET_API_KEY,
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Headers for security and CORS
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [];
  },
};

module.exports = nextConfig;
