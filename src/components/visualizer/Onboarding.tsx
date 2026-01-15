import React from "react";
import { Button } from "@/components/ui/button";
import cropIcon from "@/assets/crop-icon.png";

interface OnboardingProps {
  onStartCapture: () => void;
}

// Crop icon component using the image asset
const CropIcon = () => <img src={cropIcon} alt="Crop region" width={48} height={48} className="dark:invert" />;

export function Onboarding({ onStartCapture }: OnboardingProps) {
  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4 md:p-8">
      {/* Outer hardware frame */}
      <div className="w-full max-w-5xl bg-muted border-[6px] border-foreground rounded-[2rem] p-4 md:p-6">
        {/* Window controls */}
        <div className="flex gap-3 mb-4">
          <div className="w-6 h-6 rounded-full border-2 border-foreground" />
          <div className="w-6 h-6 rounded-full border-2 border-foreground" />
          <div className="w-6 h-6 rounded-full border-2 border-foreground" />
        </div>

        {/* Main content area */}
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* Left panel - Main content */}
          <div className="flex-1 bg-muted border-2 border-foreground rounded-lg p-6 md:p-8 flex flex-col">
            {/* Title */}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-mono font-bold text-foreground tracking-wider uppercase mb-1">
              SCREEN SAMPLER V.1.0
            </h1>
            <p className="text-xs md:text-sm text-foreground uppercase tracking-[0.3em] font-mono mb-8">
              VJ SOFTWARE FOR DJS
            </p>

            {/* Logo and instructions area */}
            <div className="flex-1 flex flex-col">
              {/* Crop icon with dashed instruction box */}
              <div className="relative mb-8">
                {/* Crop icon */}
                <div className="absolute -top-[12px] -left-[5px]">
                  <CropIcon />
                </div>

                {/* Dashed instruction box */}
                <div className="ml-8 mt-6 border-2 border-dashed border-foreground/60 p-6 md:p-8 max-w-xs">
                  <div className="space-y-3 text-sm md:text-base text-foreground font-mono">
                    <p>1. Share screen</p>
                    <p>2. Select regions</p>
                    <p>3. Start Visualizer</p>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <Button
                onClick={onStartCapture}
                size="lg"
                className="w-full max-w-sm px-12 py-6 text-lg font-bold uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-none"
              >
                START
              </Button>
            </div>

            {/* Footer Links */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground font-mono mt-8">
              <a
                href="https://github.com/evanroth/Screen-Sampler"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground/70 transition-colors underline underline-offset-4"
              >
                Source code
              </a>
              <a
                href="https://evan-roth.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground/70 transition-colors underline underline-offset-4"
              >
                By Evan Roth
              </a>
              <a
                href="https://www.youtube.com/@evan-roth-com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground/70 transition-colors underline underline-offset-4"
              >
                Beats and Bobbins
              </a>
              <a
                href="https://shop.evan-roth.com/product/beats-bobbins-tip-jar/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground/70 transition-colors underline underline-offset-4"
              >
                Support this work
              </a>
            </div>
          </div>

          {/* Right panel - MPC-style pad grid */}
          <div className="lg:w-80 flex items-center justify-center p-4">
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="w-16 h-16 md:w-20 md:h-20 border-2 border-foreground rounded-md bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
