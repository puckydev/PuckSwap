import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Early Extension Guard - Load before everything else */}
        <script 
          src="/extension-guard.js" 
          strategy="beforeInteractive"
        />
        
        {/* Meta tags for security */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        
        {/* Preload critical resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        
        {/* Additional extension protection inline script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Immediate extension protection
              (function() {
                'use strict';
                
                // Mark early protection as active
                window.__PUCKSWAP_EXTENSION_GUARD_INLINE__ = true;
                
                // Immediate error suppression for known problematic extension
                const originalError = window.onerror;
                window.onerror = function(msg, url, line, col, error) {
                  const message = String(msg || '');
                  const source = String(url || '');
                  
                  if (source.includes('ffnbelfdoeiohenkjibnmadjiehjhajb') || 
                      source.includes('initialInject.js') ||
                      message.includes('Cannot read properties of undefined')) {
                    console.warn('🛡️ Inline extension guard: Suppressed extension error');
                    return true;
                  }
                  
                  return originalError ? originalError.apply(this, arguments) : false;
                };
                
                console.log('🛡️ Inline extension protection active');
              })();
            `
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
        
        {/* Additional runtime protection */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Runtime extension protection
              (function() {
                'use strict';
                
                // Additional runtime checks
                if (typeof window !== 'undefined') {
                  // Monitor for extension script injections
                  const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                      mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
                          const src = node.src || '';
                          if (src.includes('ffnbelfdoeiohenkjibnmadjiehjhajb') || 
                              src.includes('initialInject.js')) {
                            console.warn('🛡️ Runtime guard: Blocked extension script injection');
                            node.remove();
                          }
                        }
                      });
                    });
                  });
                  
                  if (document.body) {
                    observer.observe(document.body, {
                      childList: true,
                      subtree: true
                    });
                  }
                }
                
                console.log('🛡️ Runtime extension protection active');
              })();
            `
          }}
        />
      </body>
    </Html>
  )
}
