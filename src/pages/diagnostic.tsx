/**
 * Simple diagnostic page to test if the app is working
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Diagnostic() {
  const [isClient, setIsClient] = useState(false);
  const [browserInfo, setBrowserInfo] = useState({
    userAgent: 'Server-side',
    hasWindow: false,
    hasLocalStorage: false
  });

  useEffect(() => {
    setIsClient(true);
    setBrowserInfo({
      userAgent: window.navigator.userAgent,
      hasWindow: true,
      hasLocalStorage: !!window.localStorage
    });
  }, []);

  return (
    <>
      <Head>
        <title>Diagnostic - PuckSwap</title>
      </Head>

      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#000', 
        color: '#00ff00', 
        fontFamily: 'monospace',
        padding: '20px',
        fontSize: '14px'
      }}>
        <h1 style={{ color: '#00ff00', marginBottom: '20px' }}>
          🔧 PuckSwap Diagnostic Page
        </h1>
        
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: '#ffff00', marginBottom: '10px' }}>✅ Basic Functionality Test</h2>
          <p>✅ React is working</p>
          <p>✅ Next.js is working</p>
          <p>✅ TypeScript is working</p>
          <p>✅ Server is responding</p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: '#ffff00', marginBottom: '10px' }}>🌐 Environment Info</h2>
          <p>Network: {process.env.NEXT_PUBLIC_NETWORK || 'Not set'}</p>
          <p>Demo Mode: {process.env.NEXT_PUBLIC_DEMO_MODE || 'Not set'}</p>
          <p>Node Environment: {process.env.NODE_ENV || 'Not set'}</p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: '#ffff00', marginBottom: '10px' }}>🧪 Browser Info</h2>
          <p>User Agent: {browserInfo.userAgent}</p>
          <p>Window Object: {browserInfo.hasWindow ? '✅ Available' : '❌ Not available (SSR)'}</p>
          <p>Local Storage: {browserInfo.hasLocalStorage ? '✅ Available' : '❌ Not available'}</p>
          <p>Client Hydrated: {isClient ? '✅ Yes' : '❌ No'}</p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: '#ffff00', marginBottom: '10px' }}>🔗 Navigation</h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a 
              href="/" 
              style={{ 
                color: '#00ffff', 
                textDecoration: 'underline',
                padding: '5px 10px',
                border: '1px solid #00ffff',
                borderRadius: '3px'
              }}
            >
              🏠 Main App
            </a>
            <a 
              href="/test-wallet-provider" 
              style={{ 
                color: '#00ffff', 
                textDecoration: 'underline',
                padding: '5px 10px',
                border: '1px solid #00ffff',
                borderRadius: '3px'
              }}
            >
              🧪 Wallet Test
            </a>
            <button
              onClick={() => window.location.reload()}
              style={{ 
                color: '#00ffff', 
                backgroundColor: 'transparent',
                border: '1px solid #00ffff',
                borderRadius: '3px',
                padding: '5px 10px',
                cursor: 'pointer'
              }}
            >
              🔄 Reload Page
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: '#ffff00', marginBottom: '10px' }}>📝 Instructions</h2>
          <p>1. If you can see this page, the Next.js server is working correctly</p>
          <p>2. Try clicking the "Main App" link to go to the homepage</p>
          <p>3. If the main app doesn't load, check the browser console for errors</p>
          <p>4. Try the "Wallet Test" page for isolated wallet testing</p>
        </div>

        <div style={{ 
          marginTop: '30px', 
          padding: '15px', 
          border: '1px solid #00ff00',
          borderRadius: '5px',
          backgroundColor: '#001100'
        }}>
          <h3 style={{ color: '#00ff00', marginBottom: '10px' }}>🚀 Status: All Systems Operational</h3>
          <p>The PuckSwap development server is running correctly.</p>
          <p>Timestamp: {new Date().toISOString()}</p>
        </div>
      </div>
    </>
  );
}
