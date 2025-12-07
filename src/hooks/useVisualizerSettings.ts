import { useState, useCallback } from 'react';

export type BackgroundStyle = 'black' | 'blurred' | 'gradient';
export type TileEffect = 'none' | 'glow' | 'opacity' | 'blur' | 'all';

export interface VisualizerSettings {
  panelScale: number;
  movementSpeed: number;
  bounceStrength: number;
  opacityVariation: number;
  blurIntensity: number;
  backgroundStyle: BackgroundStyle;
  tileEffect: TileEffect;
  enableRotation: boolean;
  trailAmount: number; // 0 = no trail, 1 = full trail (no fade)
}

const defaultSettings: VisualizerSettings = {
  panelScale: 0.3,
  movementSpeed: 0.5,
  bounceStrength: 0.12,
  opacityVariation: 0.3,
  blurIntensity: 0.5,
  backgroundStyle: 'black',
  tileEffect: 'all',
  enableRotation: true,
  trailAmount: 0.5,
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
