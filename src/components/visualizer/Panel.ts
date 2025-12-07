import { CaptureRegion } from '@/hooks/useScreenCapture';

export interface PanelState {
  regionId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  blurAmount: number;
  phase: number;
}

export function createPanel(
  region: CaptureRegion,
  canvasWidth: number,
  canvasHeight: number,
  settings: {
    opacityVariation: number;
    blurIntensity: number;
    enableRotation: boolean;
  }
): PanelState {
  return {
    regionId: region.id,
    x: Math.random() * canvasWidth * 0.5,
    y: Math.random() * canvasHeight * 0.5,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    rotation: settings.enableRotation ? Math.random() * 360 : 0,
    rotationSpeed: settings.enableRotation ? (Math.random() - 0.5) * 0.5 : 0,
    opacity: 1 - Math.random() * settings.opacityVariation,
    blurAmount: Math.random() * settings.blurIntensity * 3,
    phase: Math.random() * Math.PI * 2,
  };
}

export function updatePanel(
  panel: PanelState,
  panelWidth: number,
  panelHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  speedMultiplier: number,
  deltaTime: number
): PanelState {
  const dt = deltaTime / 16.67; // Normalize to 60fps
  
  let { x, y, vx, vy, rotation, rotationSpeed } = panel;
  
  // Update position
  x += vx * speedMultiplier * dt;
  y += vy * speedMultiplier * dt;
  
  // Bounce off edges
  if (x <= 0 || x + panelWidth >= canvasWidth) {
    vx = -vx;
    x = Math.max(0, Math.min(canvasWidth - panelWidth, x));
  }
  if (y <= 0 || y + panelHeight >= canvasHeight) {
    vy = -vy;
    y = Math.max(0, Math.min(canvasHeight - panelHeight, y));
  }
  
  // Update rotation
  rotation += rotationSpeed * dt;
  
  return { ...panel, x, y, vx, vy, rotation };
}
