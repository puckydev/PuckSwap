'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  formatWalletAddress, 
  formatADA, 
  type ConnectedWalletState 
} from '@/lib/wallet-integration';
import { Copy, ExternalLink, LogOut, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface WalletPortfolioProps {
  connectedWallet: ConnectedWalletState;
  onDisconnect: () => void;
}

export const WalletPortfolio: React.FC<WalletPortfolioProps> = ({
  connectedWallet,
  onDisconnect
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(connectedWallet.address);
    toast.success('Address copied to clipboard!', {
      icon: '📋',
      duration: 2000
    });
  };

  const getWalletIcon = () => {
    // Check if it's a file path (starts with /) or emoji
    if (connectedWallet.cip30Wallet?.api && typeof connectedWallet.cip30Wallet.api === 'object') {
      const walletName = connectedWallet.walletName;
      
      // Map wallet names to their icon paths
      const iconMap: Record<string, string> = {
        'eternl': '/Wallets/Eternl.jpg',
        'vespr': '/Wallets/VESPR.jpg',
        'lace': '/Wallets/Lace.jpg',
        'yoroi': '/Wallets/Yoroi.png',
        'typhon': '🌪️',
        'flint': '🔥',
        'gerowallet': '⚡'
      };

      const iconPath = iconMap[walletName];
      
      if (iconPath && iconPath.startsWith('/')) {
        return (
          <Image
            src={iconPath}
            alt={`${connectedWallet.walletName} wallet`}
            width={24}
            height={24}
            className="rounded-full"
          />
        );
      } else {
        return <span className="text-lg">{iconPath || '🔗'}</span>;
      }
    }
    
    return <Wallet className="w-5 h-5" />;
  };

  return (
    <div className="relative">
      {/* Wallet Icon Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        {getWalletIcon()}
        <span className="hidden sm:inline text-sm font-medium">
          {formatADA(connectedWallet.balance.ada)}
        </span>
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      </Button>

      {/* Portfolio Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Portfolio Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 z-50"
            >
              <Card className="w-80 shadow-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getWalletIcon()}
                      <div>
                        <CardTitle className="text-sm font-medium">
                          {connectedWallet.walletName}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {connectedWallet.networkName}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Connected
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Address */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Address</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyAddress}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                      {formatWalletAddress(connectedWallet.address)}
                    </div>
                  </div>

                  <Separator />

                  {/* Balance */}
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Portfolio</span>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">ADA</span>
                        <span className="text-sm font-medium">
                          {formatADA(connectedWallet.balance.ada)}
                        </span>
                      </div>
                      
                      {/* Show other assets if available */}
                      {Object.entries(connectedWallet.balance.assets).length > 0 && (
                        <>
                          {Object.entries(connectedWallet.balance.assets).slice(0, 3).map(([asset, amount]) => (
                            <div key={asset} className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {asset.length > 20 ? `${asset.slice(0, 20)}...` : asset}
                              </span>
                              <span className="text-xs font-medium">
                                {amount.toString()}
                              </span>
                            </div>
                          ))}
                          {Object.entries(connectedWallet.balance.assets).length > 3 && (
                            <div className="text-xs text-muted-foreground text-center">
                              +{Object.entries(connectedWallet.balance.assets).length - 3} more assets
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* UTxO Info */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">UTxOs</span>
                    <span className="font-medium">{connectedWallet.utxos?.length || 0}</span>
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        window.open(`https://cardanoscan.io/address/${connectedWallet.address}`, '_blank');
                      }}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Explorer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        onDisconnect();
                        setIsOpen(false);
                      }}
                    >
                      <LogOut className="w-3 h-3 mr-1" />
                      Disconnect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
