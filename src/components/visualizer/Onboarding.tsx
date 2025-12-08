import React from 'react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/beats-and-bobbins-logo.png';

interface OnboardingProps {
  onStartCapture: () => void;
}

export function Onboarding({ onStartCapture }: OnboardingProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-xl w-full flex flex-col items-center text-center space-y-8">
        
        {/* Logo */}
        <img 
          src={logo} 
          alt="Beats and Bobbins" 
          className="w-64 md:w-80 h-auto"
        />

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-mono font-normal text-foreground tracking-widest uppercase">
            Screen Sampler v.1.0
          </h1>
          <p className="text-sm text-muted-foreground uppercase tracking-[0.3em] font-mono">
            VJ software for DJs
          </p>
        </div>

        {/* Instructions */}
        <div className="space-y-2 text-sm text-muted-foreground font-mono">
          <p>1. Share screen</p>
          <p>2. Select regions</p>
          <p>3. Enable microphone</p>
        </div>

        {/* Start Button */}
        <Button
          onClick={onStartCapture}
          size="lg"
          className="px-20 py-7 text-lg font-bold uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-md mt-4"
        >
          Start
        </Button>

        {/* Footer Links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground font-mono pt-8">
          <a 
            href="https://github.com/evanroth/Screen-Sampler" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors underline underline-offset-4"
          >
            Source code
          </a>
          <a 
            href="https://evan-roth.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors underline underline-offset-4"
          >
            By Evan Roth
          </a>
          <a 
            href="https://www.youtube.com/@evan-roth-com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors underline underline-offset-4"
          >
            Beats and Bobbins
          </a>
        </div>
      </div>
    </div>
  );
}