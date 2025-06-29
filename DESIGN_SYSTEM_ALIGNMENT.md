# PuckSwap v5 Frontend UI Design System Alignment

## 🎨 Overview

PuckSwap v5 has been successfully aligned with PuckHub's design system while maintaining its DEX functionality and terminal aesthetic heritage. This implementation creates a unified design language that combines the best of both worlds.

## 🚀 Key Features

### Design System Integration
- ✅ **ShadCN UI Components** - Professional component library with Radix UI primitives
- ✅ **PuckHub-Compatible Styling** - Soft color palette, rounded corners (2xl), light shadows
- ✅ **Terminal Mode Support** - Legacy terminal aesthetic available as alternative theme
- ✅ **Responsive Design** - Mobile-first approach with grid-based layouts
- ✅ **Accessibility** - WCAG compliant with keyboard navigation support

### Visual Design Rules (Implemented)
- ✅ **TailwindCSS** for styling with custom design tokens
- ✅ **ShadCN UI** component library integration
- ✅ **Framer Motion** for subtle animations
- ✅ **Rounded corners**: 2xl (1rem) for cards/buttons following PuckHub standard
- ✅ **Light soft shadows** for cards/modals
- ✅ **Grid-based layouts** with ample padding (p-4 or larger)
- ✅ **Soft color palette** with muted neutral backgrounds and accent colors
- ✅ **Consistent typography**: xl for section titles, base for body text, sm for labels

### Functional Design Rules (Implemented)
- ✅ **Clean minimal UX** for wallet-connected dApp interfaces
- ✅ **State transitions** (pending, success, error) with clear visual feedback
- ✅ **Form validation** with disabled submit buttons during transaction pending
- ✅ **Lucid Evolution wallet connection** provided via context hook
- ✅ **Zustand** for lightweight state management
- ✅ **Fully mobile responsive** layouts
- ✅ **PuckHub component structure** & naming conventions

## 📁 File Structure

```
src/
├── components/
│   ├── ui/                     # ShadCN UI components
│   │   ├── button.tsx         # Button with terminal variants
│   │   ├── card.tsx           # Card components with PuckHub styling
│   │   ├── input.tsx          # Input with rounded corners
│   │   ├── label.tsx          # Label component
│   │   ├── badge.tsx          # Badge with terminal variants
│   │   ├── separator.tsx      # Separator component
│   │   ├── progress.tsx       # Progress component
│   │   └── SwapV6.tsx         # Modern swap component
│   └── theme-provider.tsx     # Theme and design system provider
├── lib/
│   └── utils.ts               # Utility functions including cn()
├── styles/
│   └── globals.css            # Global styles with CSS variables
└── pages/
    └── design-system-demo.tsx # Design system showcase
```

## 🎯 Design System Components

### Core Components
1. **Button** - Multiple variants including terminal modes
2. **Card** - PuckHub-style cards with soft shadows
3. **Input** - Rounded inputs with proper focus states
4. **Label** - Consistent labeling
5. **Badge** - Status indicators with terminal variants
6. **Separator** - Clean dividers
7. **Progress** - Progress indicators

### Advanced Components
1. **SwapV6** - Modern DEX interface combining PuckHub aesthetics with DEX functionality

## 🎨 Color System

### CSS Variables (Light Theme)
```css
--background: 210 20% 98%;
--foreground: 222.2 84% 4.9%;
--primary: 142 76% 36%; /* Terminal green */
--secondary: 210 40% 96%;
--muted: 210 40% 96%;
--accent: 210 40% 96%;
--border: 214.3 31.8% 91.4%;
--radius: 1rem; /* PuckHub 2xl standard */
```

### CSS Variables (Dark/Terminal Theme)
```css
--background: 0 0% 4%; /* Terminal black */
--foreground: 142 100% 50%; /* Terminal green */
--primary: 142 100% 50%; /* Terminal green */
--secondary: 0 0% 10%;
--muted: 0 0% 10%;
--accent: 0 0% 10%;
--border: 0 0% 15%;
```

## 🔧 Usage Examples

### Basic Button Usage
```tsx
import { Button } from '@/components/ui/button';

// PuckHub style
<Button>Default Button</Button>
<Button variant="outline">Outline Button</Button>

// Terminal style (when in terminal mode)
<Button variant="terminal">Terminal Button</Button>
<Button variant="terminal-outline">Terminal Outline</Button>
```

### Card Usage
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content with PuckHub styling
  </CardContent>
</Card>
```

### SwapV6 Component
```tsx
import SwapV6 from '@/components/ui/SwapV6';

<SwapV6 />
```

## 🎛️ Theme Switching

The design system supports dual modes:

### PuckHub Mode (Default)
- Soft color palette
- Rounded corners (2xl)
- Light shadows
- Inter font family
- Professional DEX interface

### Terminal Mode (Legacy)
- Terminal green/amber color scheme
- Monospace fonts
- Glow effects
- CRT-style animations
- Retro computer aesthetic

### Usage
```tsx
import { useDesignSystem } from '@/components/theme-provider';

const { designMode, setDesignMode } = useDesignSystem();

// Switch to terminal mode
setDesignMode('terminal');

// Switch to PuckHub mode
setDesignMode('puckhub');
```

## 📱 Responsive Design

All components follow mobile-first responsive design:

- **Mobile**: Optimized touch targets, simplified layouts
- **Tablet**: Enhanced spacing, multi-column layouts
- **Desktop**: Full feature set, optimal information density

## ♿ Accessibility

- **WCAG 2.1 AA compliant**
- **Keyboard navigation** support
- **Screen reader** friendly
- **Focus management** with visible focus indicators
- **Color contrast** meets accessibility standards

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **View Design System Demo**:
   ```bash
   npm run dev
   ```
   Navigate to `/design-system-demo`

3. **Use Components**:
   ```tsx
   import { Button } from '@/components/ui/button';
   import { Card } from '@/components/ui/card';
   ```

## 🔄 Migration Guide

### From Legacy Terminal Components
```tsx
// Old terminal component
<div className="terminal-card">
  <button className="terminal-button">Click me</button>
</div>

// New design system component
<Card>
  <Button variant="terminal">Click me</Button>
</Card>
```

### Component Mapping
- `terminal-card` → `<Card>`
- `terminal-button` → `<Button variant="terminal">`
- `terminal-input` → `<Input>` (with terminal mode styling)

## 📊 Performance

- **Bundle size**: Optimized with tree-shaking
- **Runtime performance**: Minimal re-renders
- **Loading time**: Lazy-loaded components
- **Accessibility**: No performance impact

## 🎯 Next Steps

1. **Component Library Expansion**: Add more ShadCN UI components as needed
2. **Animation System**: Enhance Framer Motion integration
3. **Theme Customization**: Add more theme variants
4. **Documentation**: Expand component documentation
5. **Testing**: Add comprehensive component tests

## 📝 Notes

- All legacy terminal styling is preserved for backward compatibility
- New components default to PuckHub styling
- Terminal mode can be activated globally or per-component
- CSS variables enable easy theme customization
- Mobile-first responsive design ensures optimal UX across devices

This design system alignment successfully bridges PuckHub's modern aesthetic with PuckSwap's DEX functionality while maintaining the beloved terminal heritage as an optional theme.
