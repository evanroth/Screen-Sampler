import { useState, useCallback } from 'react';

export type BackgroundStyle = 'black' | 'blurred' | 'gradient';
export type TileEffect = 'none' | 'glow' | 'opacity' | 'blur' | 'all';
export type AnimationMode = 
  | 'bounce'
  | 'verticalDrop'
  | 'horizontalSweep'
  | 'clockwise'
  | 'counterClockwise'
  | 'clockHand'
  | 'pendulum'
  | 'waterfall'
  | 'spiral'
  | 'orbit'
  | 'zigzag'
  | 'wave'
  | 'float'
  | 'random';

export const ANIMATION_MODES: AnimationMode[] = [
  'bounce', 'verticalDrop', 'horizontalSweep', 'clockwise', 'counterClockwise',
  'clockHand', 'pendulum', 'waterfall', 'spiral', 'orbit', 'zigzag', 'wave', 'float'
];

export interface VisualizerSettings {
  panelScale: number;
  movementSpeed: number;
  bounceStrength: number;
  opacityVariation: number;
  blurIntensity: number;
  backgroundStyle: BackgroundStyle;
  tileEffect: TileEffect;
  enableRotation: boolean;
  trailAmount: number;
  enableTrails: boolean;
  animationMode: AnimationMode;
  randomModeInterval: number;
  blackAsTransparent: boolean;
  blackThreshold: number;
}

const defaultSettings: VisualizerSettings = {
  panelScale: 1.15,
  movementSpeed: 0.8,
  bounceStrength: 0.11,
  opacityVariation: 0.7,
  blurIntensity: 1.0,
  backgroundStyle: 'black',
  tileEffect: 'none',
  enableRotation: true,
  trailAmount: 0.85,
  enableTrails: false,
  animationMode: 'bounce',
  randomModeInterval: 10,
  blackAsTransparent: true,
  blackThreshold: 30,
};

export function useVisualizerSettings() {
  const [settings, setSettings] = useState<VisualizerSettings>(defaultSettings);

  const updateSetting = useCallback(<K extends keyof VisualizerSettings>(
    key: K,
    value: VisualizerSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  return {
    settings,
    updateSetting,
    resetSettings,
  };
}
