import React from 'react';
import { Button } from '@/components/ui/button';

interface OnboardingProps {
  onStartCapture: () => void;
}

export function Onboarding({ onStartCapture }: OnboardingProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-xl w-full flex flex-col items-center text-center space-y-12">
        
        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight uppercase">
            Beats and Bobbins Screen Sampler v.1.0
          </h1>
          <p className="text-sm text-muted-foreground uppercase tracking-widest">
            VJ software for DJs
          </p>
        </div>

        {/* Instructions */}
        <div className="space-y-3 text-sm text-muted-foreground font-medium">
          <p>1. Share screen</p>
          <p>2. Select regions</p>
          <p>3. Enable microphone</p>
        </div>

        {/* Start Button */}
        <Button
          onClick={onStartCapture}
          size="lg"
          className="px-16 py-8 text-xl font-bold uppercase tracking-wider hardware-raised hover:glow-primary transition-all"
        >
          Start
        </Button>

        {/* Footer Links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground pt-8">
          <a 
            href="https://github.com/evanroth/Screen-Sampler" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors underline underline-offset-2"
          >
            Source code
          </a>
          <a 
            href="https://evan-roth.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors underline underline-offset-2"
          >
            By Evan Roth
          </a>
          <a 
            href="https://www.youtube.com/@evan-roth-com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors underline underline-offset-2"
          >
            Beats and Bobbins
          </a>
        </div>
      </div>
    </div>
  );
}