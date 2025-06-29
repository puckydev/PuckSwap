/**
 * PuckSwap Extension Error Boundary
 * 
 * Catches and handles browser extension conflicts gracefully
 * Prevents extension errors from breaking the wallet integration
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
// Note: browser-extension-guard has been removed in favor of unified wallet system

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  extensionConflicts: string[];
  retryCount: number;
}

class ExtensionErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      extensionConflicts: [],
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if this is an extension-related error
    const isExtensionError = 
      error.message?.includes('extension://') ||
      error.stack?.includes('extension://') ||
      error.message?.includes('Cannot read properties of undefined') ||
      error.message?.includes('initialInject.js');

    if (isExtensionError) {
      return {
        hasError: true,
        error,
        extensionConflicts: detectExtensionConflicts()
      };
    }

    // For non-extension errors, let them bubble up
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log extension conflicts for debugging
    console.warn('🛡️ Extension Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      extensionConflicts: this.state.extensionConflicts
    });

    this.setState({
      error,
      errorInfo,
      extensionConflicts: detectExtensionConflicts()
    });

    // Auto-retry after a delay for transient extension conflicts
    if (this.state.retryCount < 3) {
      this.retryTimeout = setTimeout(() => {
        this.handleRetry();
      }, 2000 + (this.state.retryCount * 1000));
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI for extension conflicts
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="extension-error-boundary p-6 max-w-2xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-yellow-800">
                  Browser Extension Conflict Detected
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    A browser extension is interfering with PuckSwap's wallet connection.
                    This is a common issue that can be resolved.
                  </p>
                </div>

                {this.state.extensionConflicts.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-yellow-800">
                      Detected Conflicts:
                    </h4>
                    <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                      {this.state.extensionConflicts.map((conflict, index) => (
                        <li key={index}>{conflict}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4">
                  <h4 className="text-sm font-medium text-yellow-800">
                    Recommended Solutions:
                  </h4>
                  <ol className="mt-1 text-sm text-yellow-700 list-decimal list-inside space-y-1">
                    <li>Try refreshing the page</li>
                    <li>Disable non-Cardano browser extensions temporarily</li>
                    <li>Use an incognito/private browsing window</li>
                    <li>Try a different browser</li>
                    <li>Ensure your Cardano wallet extension is up to date</li>
                  </ol>
                </div>

                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={this.handleRetry}
                    disabled={this.state.retryCount >= 3}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {this.state.retryCount >= 3 ? 'Max Retries Reached' : `Retry (${3 - this.state.retryCount} left)`}
                  </button>
                  
                  <button
                    onClick={this.handleReload}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    Reload Page
                  </button>
                </div>

                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-4">
                    <summary className="text-sm font-medium text-yellow-800 cursor-pointer">
                      Technical Details (Development)
                    </summary>
                    <div className="mt-2 text-xs text-yellow-600 bg-yellow-100 p-3 rounded">
                      <div><strong>Error:</strong> {this.state.error?.message}</div>
                      <div className="mt-2"><strong>Stack:</strong></div>
                      <pre className="whitespace-pre-wrap text-xs">
                        {this.state.error?.stack}
                      </pre>
                      {this.state.errorInfo && (
                        <>
                          <div className="mt-2"><strong>Component Stack:</strong></div>
                          <pre className="whitespace-pre-wrap text-xs">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ExtensionErrorBoundary;
