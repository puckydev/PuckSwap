import React from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { Palette, Monitor, Smartphone, Zap, Shield, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import SwapV6 from '@/components/ui/SwapV6';
import { ThemeProvider, DesignSystemProvider, useDesignSystem } from '@/components/theme-provider';

function DesignSystemContent() {
  const { designMode, setDesignMode } = useDesignSystem();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl font-bold">PuckSwap v5 Design System</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unified design system combining PuckHub's soft aesthetics with terminal functionality
          </p>
          
          {/* Design Mode Toggle */}
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant={designMode === 'puckhub' ? 'default' : 'outline'}
              onClick={() => setDesignMode('puckhub')}
              className="flex items-center space-x-2"
            >
              <Palette className="h-4 w-4" />
              <span>PuckHub Mode</span>
            </Button>
            <Button
              variant={designMode === 'terminal' ? 'terminal' : 'terminal-outline'}
              onClick={() => setDesignMode('terminal')}
              className="flex items-center space-x-2"
            >
              <Monitor className="h-4 w-4" />
              <span>Terminal Mode</span>
            </Button>
          </div>
        </motion.div>

        {/* Design Principles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Design Principles</CardTitle>
              <CardDescription>
                Core principles guiding the PuckSwap v5 design system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Mobile First</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Responsive design with mobile-optimized interactions
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Performance</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Optimized components with minimal bundle impact
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Accessibility</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    WCAG compliant with keyboard navigation support
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Component Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>Various button styles and states</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
              
              {designMode === 'terminal' && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="terminal">Terminal</Button>
                  <Button variant="terminal-outline">Terminal Outline</Button>
                  <Button variant="terminal-ghost">Terminal Ghost</Button>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">
                  <TrendingUp className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
              <CardDescription>Status indicators and labels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
              
              {designMode === 'terminal' && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="terminal">Terminal</Badge>
                  <Badge variant="terminal-amber">Amber</Badge>
                  <Badge variant="terminal-red">Red</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form Elements */}
          <Card>
            <CardHeader>
              <CardTitle>Form Elements</CardTitle>
              <CardDescription>Input fields and form controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="demo-input">Email</Label>
                <Input id="demo-input" type="email" placeholder="Enter your email" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="demo-number">Amount</Label>
                <Input id="demo-number" type="number" placeholder="0.000000" step="0.000001" />
              </div>
              
              <div className="space-y-2">
                <Label>Progress Example</Label>
                <Progress value={65} className="w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>Text styles and hierarchy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold">Heading 1</h1>
                <h2 className="text-3xl font-semibold">Heading 2</h2>
                <h3 className="text-2xl font-semibold">Heading 3</h3>
                <h4 className="text-xl font-semibold">Heading 4</h4>
                <p className="text-base">Body text with normal weight</p>
                <p className="text-sm text-muted-foreground">Small muted text</p>
                {designMode === 'terminal' && (
                  <p className="font-mono text-terminal-green">Terminal monospace text</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Swap Component Demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Swap Component v6</CardTitle>
              <CardDescription>
                Modern DEX interface with PuckHub design system integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <SwapV6 />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Color Palette */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Color System</CardTitle>
              <CardDescription>
                Semantic color tokens for consistent theming
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="w-full h-12 bg-primary rounded-2xl"></div>
                  <p className="text-sm font-medium">Primary</p>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-12 bg-secondary rounded-2xl"></div>
                  <p className="text-sm font-medium">Secondary</p>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-12 bg-muted rounded-2xl"></div>
                  <p className="text-sm font-medium">Muted</p>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-12 bg-accent rounded-2xl"></div>
                  <p className="text-sm font-medium">Accent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default function DesignSystemDemo() {
  return (
    <>
      <Head>
        <title>PuckSwap v5 - Design System Demo</title>
        <meta name="description" content="PuckSwap v5 Design System Showcase" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <DesignSystemProvider>
          <DesignSystemContent />
        </DesignSystemProvider>
      </ThemeProvider>
    </>
  );
}
