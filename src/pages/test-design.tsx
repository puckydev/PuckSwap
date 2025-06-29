import React from 'react';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function TestDesign() {
  return (
    <>
      <Head>
        <title>PuckSwap Design System Test</title>
        <meta name="description" content="Testing PuckSwap Design System" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-background p-8">
        <div className="container mx-auto max-w-4xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">PuckSwap Design System Test</h1>
            <p className="text-xl text-muted-foreground">
              Testing the new design system components
            </p>
          </div>

          {/* Component Tests */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Buttons</CardTitle>
                <CardDescription>Various button styles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button>Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                </div>
              </CardContent>
            </Card>

            {/* Form Elements */}
            <Card>
              <CardHeader>
                <CardTitle>Form Elements</CardTitle>
                <CardDescription>Input fields and labels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-input">Test Input</Label>
                  <Input id="test-input" placeholder="Enter text here..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number-input">Number Input</Label>
                  <Input id="number-input" type="number" placeholder="0.000000" />
                </div>
              </CardContent>
            </Card>

            {/* Badges */}
            <Card>
              <CardHeader>
                <CardTitle>Badges</CardTitle>
                <CardDescription>Status indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Typography */}
            <Card>
              <CardHeader>
                <CardTitle>Typography</CardTitle>
                <CardDescription>Text styles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <h1 className="text-4xl font-bold">Heading 1</h1>
                <h2 className="text-3xl font-semibold">Heading 2</h2>
                <h3 className="text-2xl font-semibold">Heading 3</h3>
                <p className="text-base">Body text with normal weight</p>
                <p className="text-sm text-muted-foreground">Small muted text</p>
              </CardContent>
            </Card>
          </div>

          {/* Success Message */}
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium text-green-800 dark:text-green-200">
                  ✅ Design System is working correctly!
                </span>
              </div>
              <p className="mt-2 text-sm text-green-700 dark:text-green-300">
                All components are rendering properly with the new PuckHub-aligned design system.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
