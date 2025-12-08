import { useState, useCallback } from 'react';

export type BackgroundStyle = 'black' | 'white' | 'solid' | 'blurred' | 'linearGradient' | 'radialGradient';
export type TileEffect = 'none' | 'glow' | 'opacity' | 'blur' | 'all';

export interface GradientSettings {
  color1: string;
  color2: string;
}

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
  | 'pyramid3D'
  | 'cone3D'
  | 'dodecahedron3D'
  | 'icosahedron3D'
  | 'octahedron3D'
  | 'tetrahedron3D'
  | 'torusKnot3D'
  | 'trefoil3D'
  | 'cinquefoil3D'
  | 'star3D'
  | 'heart3D'
  | 'capsule3D'
  | 'ring3D'
  | 'mobius3D'
  | 'random3D';

export const ANIMATION_MODES: AnimationMode[] = [
  'bounce', 'verticalDrop', 'horizontalSweep', 'clockwise', 'counterClockwise',
  'clockHand', 'pendulum', 'waterfall', 'spiral', 'orbit', 'zigzag', 'wave', 'float'
];

export const ANIMATION_MODES_3D: AnimationMode3D[] = [
  'floating3D', 'orbit3D', 'carousel3D', 'helix3D', 'explode3D', 'wave3D',
  'sphere3D', 'cube3D', 'cylinder3D', 'torus3D', 'pyramid3D', 'cone3D',
  'dodecahedron3D', 'icosahedron3D', 'octahedron3D', 'tetrahedron3D', 
  'torusKnot3D', 'trefoil3D', 'cinquefoil3D', 'star3D', 'heart3D', 
  'capsule3D', 'ring3D', 'mobius3D'
];

export type VisualizerMode = '2d' | '3d';

export type TextureQuality = 512 | 1024 | 2048;

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
  backgroundColor: string;
  gradientSettings: GradientSettings;
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
  regionSpacing3D: number;
  textureQuality: TextureQuality;
  textureSmoothing: boolean;
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
  backgroundColor: '#000000',
  gradientSettings: {
    color1: '#1a0033',
    color2: '#000000',
  },
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
  regionSpacing3D: 3,
  textureQuality: 1024,
  textureSmoothing: false,
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
