import { useState, useCallback } from 'react';

export type BackgroundStyle = 'black' | 'blurred' | 'gradient';
export type TileEffect = 'none' | 'glow' | 'opacity' | 'blur' | 'all';

// 2D Animation modes
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

// 3D Animation modes
export type AnimationMode3D = 
  | 'floating3D'
  | 'orbit3D'
  | 'carousel3D'
  | 'helix3D'
  | 'explode3D'
  | 'wave3D'
  | 'sphere3D'
  | 'cube3D'
  | 'cylinder3D'
  | 'torus3D'
  | 'random3D';

export const ANIMATION_MODES: AnimationMode[] = [
  'bounce', 'verticalDrop', 'horizontalSweep', 'clockwise', 'counterClockwise',
  'clockHand', 'pendulum', 'waterfall', 'spiral', 'orbit', 'zigzag', 'wave', 'float'
];

export const ANIMATION_MODES_3D: AnimationMode3D[] = [
  'floating3D', 'orbit3D', 'carousel3D', 'helix3D', 'explode3D', 'wave3D',
  'sphere3D', 'cube3D', 'cylinder3D', 'torus3D'
];

export type VisualizerMode = '2d' | '3d';

export interface VisualizerSettings {
  visualizerMode: VisualizerMode;
  panelScaleX: number;
  panelScaleY: number;
  panelScaleLinked: boolean;
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
  animationMode3D: AnimationMode3D;
  randomModeInterval: number;
  blackAsTransparent: boolean;
  blackThreshold: number;
  autoRotateCamera: boolean;
  autoRotateCameraSpeed: number;
}

const defaultSettings: VisualizerSettings = {
  visualizerMode: '2d',
  panelScaleX: 1.15,
  panelScaleY: 1.15,
  panelScaleLinked: true,
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
  animationMode3D: 'floating3D',
  randomModeInterval: 10,
  blackAsTransparent: false,
  blackThreshold: 30,
  autoRotateCamera: false,
  autoRotateCameraSpeed: 1,
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
