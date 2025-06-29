import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import WalletProviderWrapper from '../components/WalletProviderWrapper';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WalletProviderWrapper>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#111111',
            color: '#00ff00',
            border: '1px solid rgba(0, 255, 0, 0.3)',
            fontFamily: 'monospace',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#00ff00',
              secondary: '#111111',
            },
          },
          error: {
            iconTheme: {
              primary: '#ff0000',
              secondary: '#111111',
            },
          },
        }}
      />
    </WalletProviderWrapper>
  );
}
