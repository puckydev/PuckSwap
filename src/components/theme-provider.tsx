"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

// PuckSwap Design System Context
interface DesignSystemContextType {
  designMode: 'puckhub' | 'terminal';
  setDesignMode: (mode: 'puckhub' | 'terminal') => void;
  isDemoMode: boolean;
  setIsDemoMode: (demo: boolean) => void;
}

const DesignSystemContext = React.createContext<DesignSystemContextType | undefined>(undefined);

export function DesignSystemProvider({ children }: { children: React.ReactNode }) {
  const [designMode, setDesignMode] = React.useState<'puckhub' | 'terminal'>('puckhub');
  const [isDemoMode, setIsDemoMode] = React.useState(
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  );

  React.useEffect(() => {
    // Apply design mode class to body
    document.body.classList.remove('terminal-mode', 'puckhub-mode');
    document.body.classList.add(`${designMode}-mode`);
  }, [designMode]);

  const value = {
    designMode,
    setDesignMode,
    isDemoMode,
    setIsDemoMode,
  };

  return (
    <DesignSystemContext.Provider value={value}>
      {children}
    </DesignSystemContext.Provider>
  );
}

export function useDesignSystem() {
  const context = React.useContext(DesignSystemContext);
  if (context === undefined) {
    throw new Error('useDesignSystem must be used within a DesignSystemProvider');
  }
  return context;
}
