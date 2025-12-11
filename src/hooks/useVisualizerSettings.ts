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
  | 'septafoil3D'
  | 'figure8_3D'
  | 'granny3D'
  | 'lissajous3D'
  | 'capsule3D'
  | 'ring3D'
  | 'mobius3D'
  | 'tetrakisHexahedron3D'
  | 'greatDodecahedron3D'
  | 'greatIcosahedron3D'
  | 'smallStellatedDodecahedron3D'
  | 'greatStellatedDodecahedron3D'
  | 'tripleTwistMobius3D'
  | 'verrill3D'
  | 'doubleTrefoil3D'
  | 'schwarzP3D'
  | 'enneper3D'
  | 'boysSurface3D'
  | 'cliffordTorus3D'
  | 'hyperbolicParaboloid3D'
  | 'hyperboloidOneSheet3D'
  | 'steiner3D'
  | 'helicoid3D'
  | 'random3D';

export const ANIMATION_MODES: AnimationMode[] = [
  'bounce', 'verticalDrop', 'horizontalSweep', 'clockwise', 'counterClockwise',
  'clockHand', 'pendulum', 'waterfall', 'spiral', 'orbit', 'zigzag', 'wave', 'float'
];

export const ANIMATION_MODES_3D: AnimationMode3D[] = [
  'floating3D', 'orbit3D', 'carousel3D', 'helix3D', 'explode3D', 'wave3D',
  'sphere3D', 'cube3D', 'cylinder3D', 'torus3D', 'pyramid3D', 'cone3D',
  'dodecahedron3D', 'icosahedron3D', 'octahedron3D', 'tetrahedron3D', 
  'torusKnot3D', 'trefoil3D', 'cinquefoil3D', 'septafoil3D', 'figure8_3D',
  'granny3D', 'lissajous3D', 'capsule3D', 'ring3D', 'mobius3D',
  'tetrakisHexahedron3D', 'greatDodecahedron3D', 'greatIcosahedron3D',
  'smallStellatedDodecahedron3D', 'greatStellatedDodecahedron3D',
  'tripleTwistMobius3D', 'verrill3D', 'doubleTrefoil3D', 'schwarzP3D',
  'enneper3D', 'boysSurface3D', 'cliffordTorus3D', 'hyperbolicParaboloid3D',
  'hyperboloidOneSheet3D', 'steiner3D', 'helicoid3D'
];

export type VisualizerMode = '2d' | '3d';

export type TextureQuality = 512 | 1024 | 2048;

export type PlayModeTransition = 'none' | 'fade' | 'zoom';

export interface PlayModeSettings {
  enabled: boolean;
  interval: number;
  transition: PlayModeTransition;
}

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
  autoRotateCamera: boolean;
  autoRotateCameraSpeed: number;
  regionSpacing3D: number;
  textureQuality: TextureQuality;
  textureSmoothing: boolean;
  playMode: PlayModeSettings;
}

const defaultSettings: VisualizerSettings = {
  visualizerMode: '3d',
  panelScaleX: 0.4,
  panelScaleY: 0.4,
  panelScaleLinked: true,
  movementSpeed: 0.8,
  bounceStrength: 0.11,
  opacityVariation: 0.7,
  blurIntensity: 1.0,
  backgroundStyle: 'linearGradient',
  backgroundColor: '#000000',
  gradientSettings: {
    color1: '#FFFFFF',
    color2: '#000000',
  },
  tileEffect: 'none',
  enableRotation: true,
  trailAmount: 1.0,
  enableTrails: false,
  animationMode: 'bounce',
  animationMode3D: 'mobius3D',
  randomModeInterval: 10,
  autoRotateCamera: false,
  autoRotateCameraSpeed: 1,
  regionSpacing3D: 1.5,
  textureQuality: 2048,
  textureSmoothing: false,
  playMode: {
    enabled: false,
    interval: 10,
    transition: 'fade',
  },
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
