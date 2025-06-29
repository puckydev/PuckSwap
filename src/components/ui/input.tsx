import * as React from "react"

import { cn } from "@/lib/utils"



export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'win98' | 'terminal';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = 'default', ...props }, ref) => {
    const variantStyles = {
      default: "flex h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      win98: "win98-input h-8 w-full text-xs",
      terminal: "flex h-10 w-full bg-terminal-bg border border-terminal-white/30 text-terminal-white px-3 py-2 text-sm font-mono placeholder:text-terminal-white/50 focus-visible:outline-none focus-visible:border-terminal-white/60 disabled:cursor-not-allowed disabled:opacity-50"
    };

    return (
      <input
        type={type}
        className={cn(variantStyles[variant], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
