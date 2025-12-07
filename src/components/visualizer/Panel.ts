import { CaptureRegion } from '@/hooks/useScreenCapture';
import { AnimationMode } from '@/hooks/useVisualizerSettings';

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
  angle: number; // For circular animations
  startTime: number;
}

export function createPanel(
  region: CaptureRegion,
  canvasWidth: number,
  canvasHeight: number,
  settings: {
    opacityVariation: number;
    blurIntensity: number;
    enableRotation: boolean;
  },
  index: number = 0
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
    angle: (index / 8) * Math.PI * 2,
    startTime: performance.now(),
  };
}

export function updatePanel(
  panel: PanelState,
  panelWidth: number,
  panelHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  speedMultiplier: number,
  deltaTime: number,
  animationMode: AnimationMode,
  timestamp: number
): PanelState {
  const dt = deltaTime / 16.67;
  const elapsed = (timestamp - panel.startTime) / 1000;
  const speed = speedMultiplier * 2;
  
  let { x, y, vx, vy, rotation, rotationSpeed, angle } = panel;
  
  const centerX = canvasWidth / 2 - panelWidth / 2;
  const centerY = canvasHeight / 2 - panelHeight / 2;
  
  switch (animationMode) {
    case 'bounce':
      x += vx * speed * dt;
      y += vy * speed * dt;
      if (x <= 0 || x + panelWidth >= canvasWidth) {
        vx = -vx;
        x = Math.max(0, Math.min(canvasWidth - panelWidth, x));
      }
      if (y <= 0 || y + panelHeight >= canvasHeight) {
        vy = -vy;
        y = Math.max(0, Math.min(canvasHeight - panelHeight, y));
      }
      rotation += rotationSpeed * dt;
      break;
      
    case 'verticalDrop':
      y += speed * 3 * dt;
      if (y > canvasHeight) {
        y = -panelHeight;
        x = Math.random() * (canvasWidth - panelWidth);
      }
      break;
      
    case 'horizontalSweep':
      x += speed * 3 * dt;
      if (x > canvasWidth) {
        x = -panelWidth;
        y = Math.random() * (canvasHeight - panelHeight);
      }
      break;
      
    case 'clockwise': {
      const radius = Math.min(canvasWidth, canvasHeight) * 0.35;
      angle += speed * 0.02 * dt;
      x = centerX + Math.cos(angle) * radius;
      y = centerY + Math.sin(angle) * radius;
      rotation = (angle * 180 / Math.PI) + 90;
      break;
    }
    
    case 'counterClockwise': {
      const radius = Math.min(canvasWidth, canvasHeight) * 0.35;
      angle -= speed * 0.02 * dt;
      x = centerX + Math.cos(angle) * radius;
      y = centerY + Math.sin(angle) * radius;
      rotation = (angle * 180 / Math.PI) + 90;
      break;
    }
    
    case 'clockHand': {
      angle += speed * 0.015 * dt;
      const handLength = Math.min(canvasWidth, canvasHeight) * 0.4;
      x = canvasWidth / 2 + Math.cos(angle - Math.PI / 2) * handLength - panelWidth / 2;
      y = canvasHeight / 2 + Math.sin(angle - Math.PI / 2) * handLength - panelHeight / 2;
      rotation = (angle * 180 / Math.PI);
      break;
    }
    
    case 'pendulum': {
      const swingAngle = Math.sin(elapsed * speed) * 0.8;
      const armLength = canvasHeight * 0.4;
      x = canvasWidth / 2 + Math.sin(swingAngle) * armLength - panelWidth / 2;
      y = Math.cos(swingAngle) * armLength;
      rotation = swingAngle * 45;
      break;
    }
    
    case 'waterfall': {
      y += speed * 4 * dt;
      x += Math.sin(elapsed * 2 + panel.phase) * speed * 0.5 * dt;
      if (y > canvasHeight) {
        y = -panelHeight;
        x = Math.random() * (canvasWidth - panelWidth);
      }
      break;
    }
    
    case 'spiral': {
      angle += speed * 0.02 * dt;
      const spiralRadius = ((elapsed * speed * 20) % (Math.min(canvasWidth, canvasHeight) * 0.45));
      x = centerX + Math.cos(angle) * spiralRadius;
      y = centerY + Math.sin(angle) * spiralRadius;
      rotation += speed * dt;
      break;
    }
    
    case 'orbit': {
      const orbitRadius = Math.min(canvasWidth, canvasHeight) * 0.3;
      angle += speed * 0.025 * dt;
      const wobble = Math.sin(angle * 3) * 30;
      x = centerX + Math.cos(angle) * (orbitRadius + wobble);
      y = centerY + Math.sin(angle) * (orbitRadius + wobble);
      break;
    }
    
    case 'zigzag': {
      x += speed * 3 * dt;
      const zigzagHeight = canvasHeight * 0.3;
      y = centerY + Math.sin(x * 0.02) * zigzagHeight;
      if (x > canvasWidth) {
        x = -panelWidth;
      }
      rotation = Math.cos(x * 0.02) * 15;
      break;
    }
    
    case 'wave': {
      x += speed * 2 * dt;
      y = centerY + Math.sin(elapsed * 2 + panel.phase) * canvasHeight * 0.25;
      if (x > canvasWidth) {
        x = -panelWidth;
      }
      rotation = Math.sin(elapsed * 2 + panel.phase) * 10;
      break;
    }
    
    case 'float': {
      x = panel.x + Math.sin(elapsed * 0.5 + panel.phase) * 50 * speed;
      y = panel.y + Math.cos(elapsed * 0.3 + panel.phase) * 30 * speed;
      rotation += Math.sin(elapsed) * 0.2 * dt;
      // Keep within bounds gently
      if (panel.x < 0) panel.x = 0;
      if (panel.x > canvasWidth - panelWidth) panel.x = canvasWidth - panelWidth;
      if (panel.y < 0) panel.y = 0;
      if (panel.y > canvasHeight - panelHeight) panel.y = canvasHeight - panelHeight;
      return { ...panel, rotation, angle };
    }
  }
  
  return { ...panel, x, y, vx, vy, rotation, angle };
}
