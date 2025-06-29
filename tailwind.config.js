/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // PuckHub-inspired soft design tokens with terminal aesthetic
      colors: {
        // ShadCN UI color system with terminal twist
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Windows 98 color palette
        win98: {
          gray: '#C0C0C0',
          'gray-light': '#DFDFDF',
          'gray-dark': '#808080',
          'gray-darker': '#404040',
          blue: '#0000FF',
          'blue-light': '#0080FF',
          'blue-dark': '#000080',
          white: '#FFFFFF',
          black: '#000000',
          red: '#FF0000',
          green: '#008000',
          yellow: '#FFFF00',
          'title-bar': 'linear-gradient(90deg, #0000FF 0%, #0080FF 100%)',
        },
        // Legacy terminal colors for swap functionality
        terminal: {
          bg: '#000000',
          'bg-light': '#111111',
          'bg-card': '#000000',
          green: '#00ff00',
          'green-dim': '#00cc00',
          'green-bright': '#00ff41',
          amber: '#ffb000',
          'amber-dim': '#cc8800',
          'amber-bright': '#ffd700',
          red: '#ff0000',
          'red-dim': '#cc0000',
          blue: '#0080ff',
          'blue-dim': '#0066cc',
          gray: '#808080',
          'gray-dim': '#606060',
          'gray-light': '#a0a0a0',
          white: '#ffffff',
        },
      },

      // PuckHub-inspired typography with terminal fallbacks
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
        terminal: ['Share Tech Mono', 'JetBrains Mono', 'monospace'],
      },

      // PuckHub-style border radius
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem", // PuckHub standard
      },

      // PuckHub-style animations with terminal effects
      animation: {
        // ShadCN UI animations
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-down": "collapsible-down 0.2s ease-out",
        "collapsible-up": "collapsible-up 0.2s ease-out",
        // Terminal effects (legacy)
        'flicker': 'flicker 0.15s infinite linear alternate',
        'scan-line': 'scan-line 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-green': 'pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },

      keyframes: {
        // ShadCN UI keyframes
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "collapsible-down": {
          from: { height: "0" },
          to: { height: "var(--radix-collapsible-content-height)" },
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: "0" },
        },
        // Terminal effects (legacy)
        flicker: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0.98' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100vh)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        glow: {
          '0%': {
            'text-shadow': '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor',
            'box-shadow': '0 0 5px currentColor',
          },
          '100%': {
            'text-shadow': '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor',
            'box-shadow': '0 0 10px currentColor, 0 0 20px currentColor',
          },
        },
        'pulse-green': {
          '0%, 100%': {
            'box-shadow': '0 0 0 0 rgba(0, 255, 0, 0.7)',
          },
          '70%': {
            'box-shadow': '0 0 0 10px rgba(0, 255, 0, 0)',
          },
        },
      },
      
      // Box shadows for glow effects
      boxShadow: {
        'terminal': '0 0 10px rgba(0, 255, 0, 0.3)',
        'terminal-strong': '0 0 20px rgba(0, 255, 0, 0.5)',
        'amber': '0 0 10px rgba(255, 176, 0, 0.3)',
        'amber-strong': '0 0 20px rgba(255, 176, 0, 0.5)',
      },
      
      // Border styles
      borderColor: {
        'terminal': 'rgba(0, 255, 0, 0.3)',
        'terminal-bright': 'rgba(0, 255, 0, 0.6)',
      },
      
      // Background patterns
      backgroundImage: {
        'scan-lines': 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.03) 2px, rgba(0, 255, 0, 0.03) 4px)',
        'crt-flicker': 'linear-gradient(90deg, transparent 50%, rgba(0, 255, 0, 0.02) 50%)',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // Custom plugin for terminal effects and PuckHub compatibility
    function({ addUtilities }) {
      const newUtilities = {
        // Terminal effects (legacy)
        '.text-glow': {
          'text-shadow': '0 0 5px currentColor, 0 0 10px currentColor',
        },
        '.text-glow-strong': {
          'text-shadow': '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor',
        },
        '.border-glow': {
          'box-shadow': '0 0 5px currentColor, inset 0 0 5px currentColor',
        },
        '.border-glow-strong': {
          'box-shadow': '0 0 10px currentColor, 0 0 20px currentColor, inset 0 0 10px currentColor',
        },
        '.crt-screen': {
          'background-image': 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.03) 2px, rgba(0, 255, 0, 0.03) 4px)',
          'animation': 'flicker 0.15s infinite linear alternate',
        },
        '.terminal-card': {
          'background': 'rgba(17, 17, 17, 0.9)',
          'border': '1px solid rgba(0, 255, 0, 0.3)',
          'box-shadow': '0 0 10px rgba(0, 255, 0, 0.2), inset 0 0 10px rgba(0, 255, 0, 0.1)',
          'backdrop-filter': 'blur(10px)',
        },
        '.terminal-button': {
          'background': 'rgba(0, 255, 0, 0.1)',
          'border': '1px solid rgba(0, 255, 0, 0.5)',
          'color': '#00ff00',
          'text-shadow': '0 0 5px currentColor',
          'transition': 'all 0.3s ease',
          '&:hover': {
            'background': 'rgba(0, 255, 0, 0.2)',
            'box-shadow': '0 0 15px rgba(0, 255, 0, 0.4)',
            'text-shadow': '0 0 10px currentColor',
          },
        },
        '.terminal-input': {
          'background': 'rgba(0, 0, 0, 0.8)',
          'border': '1px solid rgba(0, 255, 0, 0.3)',
          'color': '#00ff00',
          'caret-color': '#00ff00',
          '&:focus': {
            'border-color': 'rgba(0, 255, 0, 0.6)',
            'box-shadow': '0 0 10px rgba(0, 255, 0, 0.3)',
            'outline': 'none',
          },
          '&::placeholder': {
            'color': 'rgba(0, 255, 0, 0.5)',
          },
        },
      };

      addUtilities(newUtilities);
    },
  ],
};
