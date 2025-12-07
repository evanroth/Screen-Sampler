import { useState, useCallback } from 'react';

export type BackgroundStyle = 'black' | 'blurred' | 'gradient';
export type TileEffect = 'none' | 'glow' | 'opacity' | 'blur' | 'all';

export interface VisualizerSettings {
  tileCount: number;
  movementSpeed: number;
  bounceStrength: number;
  opacityVariation: number;
  blurIntensity: number;
  backgroundStyle: BackgroundStyle;
  tileEffect: TileEffect;
  enableRotation: boolean;
}

const defaultSettings: VisualizerSettings = {
  tileCount: 25,
  movementSpeed: 0.5,
  bounceStrength: 0.12,
  opacityVariation: 0.3,
  blurIntensity: 0.5,
  backgroundStyle: 'black',
  tileEffect: 'all',
  enableRotation: true,
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
