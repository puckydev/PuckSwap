/**
 * DEPRECATED: This file is being removed as part of wallet system refactoring.
 * Use the unified wallet system instead:
 * - src/lib/wallet/WalletManager.ts
 * - src/hooks/useCardanoWallet.ts
 * - @cardano-foundation/cardano-connect-with-wallet
 */

// Placeholder types to prevent import errors
export type WalletInfo = { name: string; displayName: string; isInstalled: boolean };
export type UTxOInfo = any;
export type ConnectedWalletState = { isConnected: boolean; address: string; balance: any };

// Placeholder functions to prevent import errors
export const detectAvailableWallets = () => [];
export const connectToWallet = async () => { throw new Error('Use unified wallet system'); };
export const disconnectWallet = () => { console.warn('Use unified wallet system'); };
export const formatWalletAddress = (addr: string) => addr;
export const formatADA = (amount: any) => '0 ADA';

// End of deprecated file
export default {};
