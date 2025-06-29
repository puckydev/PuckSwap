'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// Windows 98 Window Component
interface Win98WindowProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  showControls?: boolean;
  isTerminal?: boolean;
}

export function Win98Window({ 
  title, 
  children, 
  className, 
  onClose, 
  onMinimize, 
  onMaximize, 
  showControls = true,
  isTerminal = false
}: Win98WindowProps) {
  const windowClass = isTerminal ? 'terminal-mode' : '';
  
  return (
    <div className={cn('win98-window', windowClass, className)}>
      {/* Title Bar */}
      <div className="win98-title-bar">
        <span>{title}</span>
        {showControls && (
          <div className="flex space-x-1">
            {onMinimize && (
              <button 
                onClick={onMinimize}
                className="w-4 h-4 bg-win98-gray border border-win98-gray-dark text-xs flex items-center justify-center hover:bg-win98-gray-light"
              >
                _
              </button>
            )}
            {onMaximize && (
              <button 
                onClick={onMaximize}
                className="w-4 h-4 bg-win98-gray border border-win98-gray-dark text-xs flex items-center justify-center hover:bg-win98-gray-light"
              >
                □
              </button>
            )}
            {onClose && (
              <button 
                onClick={onClose}
                className="w-4 h-4 bg-win98-gray border border-win98-gray-dark text-xs flex items-center justify-center hover:bg-win98-gray-light"
              >
                ×
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Window Content */}
      <div className="p-2">
        {children}
      </div>
    </div>
  );
}

// Windows 98 Button Component
interface Win98ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary';
  isTerminal?: boolean;
}

export function Win98Button({ 
  children, 
  className, 
  variant = 'default', 
  isTerminal = false,
  ...props 
}: Win98ButtonProps) {
  const baseClass = isTerminal ? 'terminal-mode' : '';
  const variantClass = variant === 'primary' ? 'bg-win98-blue text-white' : '';
  
  return (
    <button 
      className={cn('win98-button', baseClass, variantClass, className)}
      {...props}
    >
      {children}
    </button>
  );
}

// Windows 98 Input Component
interface Win98InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isTerminal?: boolean;
}

export function Win98Input({ 
  className, 
  isTerminal = false,
  ...props 
}: Win98InputProps) {
  const baseClass = isTerminal ? 'terminal-mode' : '';
  
  return (
    <input 
      className={cn('win98-input', baseClass, className)}
      {...props}
    />
  );
}

// Windows 98 Panel Component
interface Win98PanelProps {
  children: React.ReactNode;
  className?: string;
  isTerminal?: boolean;
}

export function Win98Panel({ 
  children, 
  className, 
  isTerminal = false 
}: Win98PanelProps) {
  const baseClass = isTerminal ? 'terminal-mode' : '';
  
  return (
    <div className={cn('win98-panel', baseClass, className)}>
      {children}
    </div>
  );
}

// Windows 98 Group Box Component
interface Win98GroupBoxProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  isTerminal?: boolean;
}

export function Win98GroupBox({ 
  title, 
  children, 
  className, 
  isTerminal = false 
}: Win98GroupBoxProps) {
  const baseClass = isTerminal ? 'terminal-mode' : '';
  
  return (
    <div className={cn('win98-group-box', baseClass, className)}>
      <div className="win98-group-box-title">{title}</div>
      {children}
    </div>
  );
}

// Windows 98 Label Component
interface Win98LabelProps {
  children: React.ReactNode;
  className?: string;
  isTerminal?: boolean;
}

export function Win98Label({ 
  children, 
  className, 
  isTerminal = false 
}: Win98LabelProps) {
  const baseClass = isTerminal ? 'text-terminal-white' : 'text-black';
  
  return (
    <label className={cn('font-sans text-xs', baseClass, className)}>
      {children}
    </label>
  );
}

// Windows 98 Status Bar Component
interface Win98StatusBarProps {
  children: React.ReactNode;
  className?: string;
}

export function Win98StatusBar({ children, className }: Win98StatusBarProps) {
  return (
    <div className={cn('win98-panel border-t-0 text-xs flex items-center justify-between', className)}>
      {children}
    </div>
  );
}

// Windows 98 Menu Bar Component
interface Win98MenuBarProps {
  items: Array<{ label: string; onClick?: () => void; disabled?: boolean }>;
  className?: string;
}

export function Win98MenuBar({ items, className }: Win98MenuBarProps) {
  return (
    <div className={cn('bg-win98-gray border-b border-win98-gray-dark flex', className)}>
      {items.map((item, index) => (
        <button
          key={index}
          onClick={item.onClick}
          disabled={item.disabled}
          className="px-2 py-1 text-xs hover:bg-win98-blue hover:text-white disabled:text-win98-gray-dark disabled:cursor-not-allowed"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// Windows 98 Progress Bar Component
interface Win98ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
}

export function Win98ProgressBar({ value, max = 100, className }: Win98ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className={cn('win98-input h-4 p-0 overflow-hidden', className)}>
      <div 
        className="h-full bg-win98-blue transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
