import React from 'react';
import { Monitor, Mic, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingProps {
  onStartCapture: () => void;
}

export function Onboarding({ onStartCapture }: OnboardingProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-12 text-center">
        {/* Logo/Title */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-2xl bg-primary/10 glow-primary">
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            DJ Visualizer
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Transform any part of your DJ software into a stunning fullscreen visualizer
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="p-6 rounded-xl glass-panel space-y-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mx-auto">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-medium text-foreground">1. Capture Screen</h3>
            <p className="text-sm text-muted-foreground">
              Share your screen or the Djay Pro window
            </p>
          </div>

          <div className="p-6 rounded-xl glass-panel space-y-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mx-auto">
              <div className="w-5 h-5 border-2 border-primary rounded" />
            </div>
            <h3 className="font-medium text-foreground">2. Select Region</h3>
            <p className="text-sm text-muted-foreground">
              Choose the waveforms, artwork, or decks to visualize
            </p>
          </div>

          <div className="p-6 rounded-xl glass-panel space-y-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mx-auto">
              <Mic className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-medium text-foreground">3. Enable Audio</h3>
            <p className="text-sm text-muted-foreground">
              Let the visuals react to your music via microphone
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <Button
            onClick={onStartCapture}
            size="lg"
            className="px-8 py-6 text-lg glow-primary"
          >
            Start Screen Capture
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-xs text-muted-foreground">
            You'll be asked to share your screen or a specific window
          </p>
        </div>
      </div>
    </div>
  );
}
