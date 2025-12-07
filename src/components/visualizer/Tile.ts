export interface TileState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseSize: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  blurAmount: number;
  phase: number; // For audio variation
}

export function createTile(id: number, canvasWidth: number, canvasHeight: number, settings: {
  opacityVariation: number;
  blurIntensity: number;
  enableRotation: boolean;
}): TileState {
  const baseSize = 80 + Math.random() * 200;
  
  return {
    id,
    x: Math.random() * (canvasWidth - baseSize),
    y: Math.random() * (canvasHeight - baseSize),
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    baseSize,
    rotation: settings.enableRotation ? Math.random() * 360 : 0,
    rotationSpeed: settings.enableRotation ? (Math.random() - 0.5) * 0.5 : 0,
    opacity: 1 - Math.random() * settings.opacityVariation,
    blurAmount: Math.random() * settings.blurIntensity * 3,
    phase: Math.random() * Math.PI * 2,
  };
}

export function updateTile(
  tile: TileState,
  canvasWidth: number,
  canvasHeight: number,
  speedMultiplier: number,
  deltaTime: number
): TileState {
  const dt = deltaTime / 16.67; // Normalize to 60fps
  
  let { x, y, vx, vy, rotation, rotationSpeed } = tile;
  
  // Update position
  x += vx * speedMultiplier * dt;
  y += vy * speedMultiplier * dt;
  
  // Bounce off edges
  if (x <= 0 || x + tile.baseSize >= canvasWidth) {
    vx = -vx;
    x = Math.max(0, Math.min(canvasWidth - tile.baseSize, x));
  }
  if (y <= 0 || y + tile.baseSize >= canvasHeight) {
    vy = -vy;
    y = Math.max(0, Math.min(canvasHeight - tile.baseSize, y));
  }
  
  // Update rotation
  rotation += rotationSpeed * dt;
  
  return { ...tile, x, y, vx, vy, rotation };
}
