/**
 * PuckSwap Extension Guard - Early Initialization
 * 
 * This script runs as early as possible to prevent extension conflicts
 * before React/Next.js components load
 */

(function() {
  'use strict';
  
  // Early extension conflict detection and prevention
  console.log('🛡️ PuckSwap Extension Guard - Early initialization');
  
  // Specific protection for the problematic extension
  const PROBLEMATIC_EXTENSION_ID = 'ffnbelfdoeiohenkjibnmadjiehjhajb';
  
  // Enhanced error detection patterns
  function isExtensionError(message, source, error) {
    const messageStr = String(message || '');
    const sourceStr = String(source || '');
    
    return (
      sourceStr.includes('extension://') ||
      sourceStr.includes(PROBLEMATIC_EXTENSION_ID) ||
      sourceStr.includes('initialInject.js') ||
      messageStr.includes('Cannot read properties of undefined') ||
      messageStr.includes("reading 'type'") ||
      messageStr.includes('TypeError') ||
      error?.stack?.includes('extension://') ||
      error?.stack?.includes('initialInject.js') ||
      error?.stack?.includes(PROBLEMATIC_EXTENSION_ID)
    );
  }
  
  // Override window.onerror immediately
  const originalOnerror = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (isExtensionError(message, source, error)) {
      console.warn('🛡️ Early extension conflict prevented:', {
        message: String(message),
        source: String(source),
        line: lineno,
        column: colno,
        extensionId: PROBLEMATIC_EXTENSION_ID
      });
      
      // Completely suppress the error
      return true;
    }
    
    // Call original handler for legitimate errors
    if (originalOnerror) {
      return originalOnerror.call(this, message, source, lineno, colno, error);
    }
    
    return false;
  };
  
  // Early addEventListener protection
  if (window.addEventListener) {
    window.addEventListener('error', function(event) {
      if (isExtensionError(event.message, event.filename, event.error)) {
        console.warn('🛡️ Early extension error event prevented:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
        
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    }, true);
  }
  
  // Early promise rejection protection
  if (window.addEventListener) {
    window.addEventListener('unhandledrejection', function(event) {
      const reason = event.reason;
      const reasonStr = String(reason?.message || reason || '');
      
      if (isExtensionError(reasonStr, '', reason)) {
        console.warn('🛡️ Early extension promise rejection prevented:', {
          reason: reasonStr,
          stack: reason?.stack?.substring(0, 100) + '...'
        });
        
        event.preventDefault();
        return false;
      }
    });
  }
  
  // Protect console methods from extension interference
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    
    if (isExtensionError(message, '', null)) {
      console.warn('🛡️ Extension console error suppressed:', message);
      return;
    }
    
    return originalConsoleError.apply(console, args);
  };
  
  // Early DOM protection
  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', function() {
      // Remove any problematic extension scripts
      const scripts = document.querySelectorAll('script[src*="' + PROBLEMATIC_EXTENSION_ID + '"]');
      scripts.forEach(function(script) {
        console.warn('🛡️ Removing problematic extension script:', script.src);
        script.remove();
      });
      
      // Protect against extension script injection
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === 'SCRIPT' && 
                  node.src && 
                  node.src.includes(PROBLEMATIC_EXTENSION_ID)) {
                console.warn('🛡️ Preventing extension script injection:', node.src);
                node.remove();
              }
            }
          });
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }
  
  // Early window.cardano protection
  let cardanoProtected = false;
  
  function protectCardanoObject() {
    if (cardanoProtected || typeof window.cardano === 'undefined') {
      return;
    }
    
    try {
      const originalCardano = window.cardano;
      
      // Create a protected wrapper
      window.cardano = new Proxy(originalCardano, {
        get: function(target, prop) {
          try {
            const value = target[prop];
            
            // Additional protection for wallet objects
            if (value && typeof value === 'object' && typeof value.enable === 'function') {
              return new Proxy(value, {
                get: function(walletTarget, walletProp) {
                  try {
                    return walletTarget[walletProp];
                  } catch (error) {
                    if (isExtensionError(error.message, '', error)) {
                      console.warn('🛡️ Protected wallet property access:', prop, walletProp, error.message);
                      return undefined;
                    }
                    throw error;
                  }
                }
              });
            }
            
            return value;
          } catch (error) {
            if (isExtensionError(error.message, '', error)) {
              console.warn('🛡️ Protected cardano property access:', prop, error.message);
              return undefined;
            }
            throw error;
          }
        }
      });
      
      cardanoProtected = true;
      console.log('🛡️ Early window.cardano protection enabled');
      
    } catch (error) {
      console.warn('🛡️ Failed to protect window.cardano early:', error);
    }
  }
  
  // Try to protect immediately and also on interval
  protectCardanoObject();
  
  // Check periodically for window.cardano
  const cardanoCheckInterval = setInterval(function() {
    if (typeof window.cardano !== 'undefined' && !cardanoProtected) {
      protectCardanoObject();
    }
    
    // Stop checking after 10 seconds
    if (Date.now() - startTime > 10000) {
      clearInterval(cardanoCheckInterval);
    }
  }, 100);
  
  const startTime = Date.now();
  
  // Mark that the guard is active
  window.__PUCKSWAP_EXTENSION_GUARD_EARLY__ = true;
  
  console.log('🛡️ PuckSwap Extension Guard - Early initialization complete');
  
})();
