import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CaptureRegion } from '@/hooks/useScreenCapture';
import { VisualizerSettings, AnimationMode3D, ANIMATION_MODES_3D } from '@/hooks/useVisualizerSettings';

interface VisualizerCanvas3DProps {
  videoElement: HTMLVideoElement | null;
  regions: CaptureRegion[];
  settings: VisualizerSettings;
  audioLevel: number;
  isActive: boolean;
  onUpdateRegion?: (regionId: string, updates: Partial<CaptureRegion>) => void;
}

interface RegionTextureProps {
  videoElement: HTMLVideoElement;
  region: CaptureRegion;
  index: number;
  totalRegions: number;
  settings: VisualizerSettings;
  audioLevel: number;
  defaultMode: AnimationMode3D;
  onDragStart: () => void;
  onDragEnd: () => void;
  onPositionChange: (position: { x: number; y: number; z: number }) => void;
}

function RegionMesh({ 
  videoElement, 
  region, 
  index, 
  totalRegions, 
  settings, 
  audioLevel, 
  defaultMode,
  onDragStart,
  onDragEnd,
  onPositionChange
}: RegionTextureProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const timeRef = useRef(0);
  const phaseOffset = useMemo(() => Math.random() * Math.PI * 2, []);
  const isDraggingRef = useRef(false);
  const customPositionRef = useRef<{ x: number; y: number; z: number } | null>(
    region.position3D || null
  );
  
  // Use region-specific mode or fall back to default
  const mode = region.animationMode3D || defaultMode;

  // Create offscreen canvas for region capture
  useEffect(() => {
    canvasRef.current = document.createElement('canvas');
    canvasRef.current.width = 512;
    canvasRef.current.height = 512;
    textureRef.current = new THREE.CanvasTexture(canvasRef.current);
    textureRef.current.minFilter = THREE.LinearFilter;
    textureRef.current.magFilter = THREE.LinearFilter;
    
    return () => {
      textureRef.current?.dispose();
    };
  }, []);

  // Sync custom position from region prop
  useEffect(() => {
    if (region.position3D) {
      customPositionRef.current = region.position3D;
    }
  }, [region.position3D]);

  useFrame((state, delta) => {
    if (!meshRef.current || !canvasRef.current || !textureRef.current || !videoElement) return;
    
    timeRef.current += delta;
    const time = timeRef.current;
    
    // Update texture from video
    const ctx = canvasRef.current.getContext('2d');
    if (ctx && videoElement.videoWidth > 0) {
      const vw = videoElement.videoWidth;
      const vh = videoElement.videoHeight;
      const rx = region.x * vw;
      const ry = region.y * vh;
      const rw = region.width * vw;
      const rh = region.height * vh;
      
      ctx.drawImage(videoElement, rx, ry, rw, rh, 0, 0, 512, 512);
      textureRef.current.needsUpdate = true;
    }

    // Apply material texture
    if (materialRef.current) {
      materialRef.current.map = textureRef.current;
    }

    // Audio-reactive scale
    const audioScale = 1 + audioLevel * settings.bounceStrength * 2;
    const baseScale = settings.panelScaleX;

    const mesh = meshRef.current;
    
    // If dragging or has custom position, don't animate position
    if (isDraggingRef.current) {
      mesh.scale.setScalar(baseScale * audioScale);
      return;
    }
    
    if (customPositionRef.current) {
      mesh.position.set(
        customPositionRef.current.x,
        customPositionRef.current.y,
        customPositionRef.current.z
      );
      // Still rotate for shape modes
      if (['sphere3D', 'cube3D', 'cylinder3D', 'torus3D'].includes(mode)) {
        mesh.rotation.y = time * settings.movementSpeed * 0.2;
        mesh.rotation.x = Math.sin(time * settings.movementSpeed * 0.1) * 0.1;
      }
      mesh.scale.setScalar(baseScale * audioScale);
      return;
    }

    // Animation based on mode
    const speed = settings.movementSpeed;
    const angleOffset = (index / totalRegions) * Math.PI * 2;

    switch (mode) {
      case 'floating3D':
        mesh.position.x = Math.sin(time * speed + angleOffset) * 3;
        mesh.position.y = Math.cos(time * speed * 0.7 + phaseOffset) * 2;
        mesh.position.z = Math.sin(time * speed * 0.5 + angleOffset) * 2;
        mesh.rotation.x = time * 0.2;
        mesh.rotation.y = time * 0.3;
        break;
        
      case 'orbit3D':
        const orbitRadius = 3 + index * 0.5;
        mesh.position.x = Math.cos(time * speed + angleOffset) * orbitRadius;
        mesh.position.y = Math.sin(time * speed * 0.3 + phaseOffset) * 1.5;
        mesh.position.z = Math.sin(time * speed + angleOffset) * orbitRadius;
        mesh.rotation.y = -time * speed - angleOffset;
        break;
        
      case 'carousel3D':
        const carouselRadius = 4;
        const carouselAngle = time * speed * 0.5 + angleOffset;
        mesh.position.x = Math.cos(carouselAngle) * carouselRadius;
        mesh.position.y = 0;
        mesh.position.z = Math.sin(carouselAngle) * carouselRadius;
        mesh.rotation.y = -carouselAngle + Math.PI / 2;
        break;
        
      case 'helix3D':
        const helixRadius = 3;
        const helixAngle = time * speed + angleOffset;
        mesh.position.x = Math.cos(helixAngle) * helixRadius;
        mesh.position.y = (Math.sin(helixAngle * 2) * 2);
        mesh.position.z = Math.sin(helixAngle) * helixRadius;
        mesh.rotation.y = -helixAngle;
        break;
        
      case 'explode3D':
        const explodePhase = (Math.sin(time * speed * 0.5) + 1) / 2;
        const explodeRadius = 2 + explodePhase * 4;
        const theta = (index / totalRegions) * Math.PI * 2;
        const phi = ((index % 3) / 3) * Math.PI;
        mesh.position.x = Math.sin(phi) * Math.cos(theta) * explodeRadius;
        mesh.position.y = Math.cos(phi) * explodeRadius;
        mesh.position.z = Math.sin(phi) * Math.sin(theta) * explodeRadius;
        mesh.rotation.x = time * 0.5;
        mesh.rotation.y = time * 0.3;
        break;
        
      case 'wave3D':
        mesh.position.x = (index - totalRegions / 2) * 2.5;
        mesh.position.y = Math.sin(time * speed * 2 + index * 0.5) * 2;
        mesh.position.z = Math.cos(time * speed + index * 0.3) * 1.5;
        mesh.rotation.z = Math.sin(time * speed + index) * 0.3;
        break;

      case 'sphere3D':
      case 'cube3D':
      case 'cylinder3D':
      case 'torus3D':
        // For shape modes, spread out by index
        const shapeSpacing = 3;
        mesh.position.x = (index - (totalRegions - 1) / 2) * shapeSpacing;
        mesh.position.y = 0;
        mesh.position.z = 0;
        mesh.rotation.y = time * speed * 0.2;
        mesh.rotation.x = Math.sin(time * speed * 0.1) * 0.1;
        break;
    }

    mesh.scale.setScalar(baseScale * audioScale);
  });

  // Determine geometry based on mode
  const geometry = useMemo(() => {
    switch (mode) {
      case 'sphere3D':
        return <sphereGeometry args={[1.5, 32, 32]} />;
      case 'cube3D':
        return <boxGeometry args={[2, 2, 2]} />;
      case 'cylinder3D':
        return <cylinderGeometry args={[1.2, 1.2, 2, 32]} />;
      case 'torus3D':
        return <torusGeometry args={[1.5, 0.5, 16, 48]} />;
      default:
        return <planeGeometry args={[2, 2]} />;
    }
  }, [mode]);

  const handlePointerDown = useCallback((e: any) => {
    if (e.nativeEvent?.shiftKey || e.shiftKey) {
      if (e.stopPropagation) e.stopPropagation();
      isDraggingRef.current = true;
      onDragStart();
    }
  }, [onDragStart]);

  const handlePointerUp = useCallback(() => {
    if (isDraggingRef.current && meshRef.current) {
      isDraggingRef.current = false;
      const pos = meshRef.current.position;
      customPositionRef.current = { x: pos.x, y: pos.y, z: pos.z };
      onPositionChange({ x: pos.x, y: pos.y, z: pos.z });
      onDragEnd();
    }
  }, [onDragEnd, onPositionChange]);

  const handlePointerMove = useCallback((e: THREE.Event) => {
    if (isDraggingRef.current && meshRef.current) {
      const event = e as unknown as { point: THREE.Vector3 };
      if (event.point) {
        meshRef.current.position.copy(event.point);
      }
    }
  }, []);

  return (
    <mesh 
      ref={meshRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerUp}
    >
      {geometry}
      <meshBasicMaterial 
        ref={materialRef} 
        side={THREE.DoubleSide}
        transparent
        opacity={0.95}
      />
    </mesh>
  );
}

function Scene({ videoElement, regions, settings, audioLevel, defaultMode, onUpdateRegion }: {
  videoElement: HTMLVideoElement;
  regions: CaptureRegion[];
  settings: VisualizerSettings;
  audioLevel: number;
  defaultMode: AnimationMode3D;
  onUpdateRegion?: (regionId: string, updates: Partial<CaptureRegion>) => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  useEffect(() => {
    camera.position.set(0, 0, 8);
  }, [camera]);

  // Disable orbit controls when dragging a shape
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = !isDragging;
    }
  }, [isDragging]);

  const handlePositionChange = useCallback((regionId: string, position: { x: number; y: number; z: number }) => {
    onUpdateRegion?.(regionId, { position3D: position });
  }, [onUpdateRegion]);

  return (
    <>
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {/* Invisible plane for drag detection */}
      <mesh visible={false} position={[0, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      {regions.map((region, index) => (
        <RegionMesh
          key={region.id}
          videoElement={videoElement}
          region={region}
          index={index}
          totalRegions={regions.length}
          settings={settings}
          audioLevel={audioLevel}
          defaultMode={defaultMode}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
          onPositionChange={(pos) => handlePositionChange(region.id, pos)}
        />
      ))}
      
      <OrbitControls 
        ref={controlsRef}
        enableDamping 
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.5}
        enablePan={false}
        autoRotate={settings.autoRotateCamera}
        autoRotateSpeed={settings.autoRotateCameraSpeed}
      />
    </>
  );
}

export function VisualizerCanvas3D({
  videoElement,
  regions,
  settings,
  audioLevel,
  isActive,
  onUpdateRegion,
}: VisualizerCanvas3DProps) {
  const [currentDefaultMode, setCurrentDefaultMode] = useState<AnimationMode3D>(
    settings.animationMode3D === 'random3D' 
      ? ANIMATION_MODES_3D[0] 
      : settings.animationMode3D
  );
  const lastModeChangeRef = useRef<number>(Date.now());

  // Handle random mode switching for default mode
  useEffect(() => {
    if (settings.animationMode3D !== 'random3D') {
      setCurrentDefaultMode(settings.animationMode3D);
      return;
    }

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * ANIMATION_MODES_3D.length);
      setCurrentDefaultMode(ANIMATION_MODES_3D[randomIndex]);
    }, settings.randomModeInterval * 1000);

    return () => clearInterval(interval);
  }, [settings.animationMode3D, settings.randomModeInterval]);

  if (!isActive || !videoElement) {
    return null;
  }

  return (
    <div className="fixed inset-0" style={{ zIndex: 0, background: '#000' }}>
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 10, 30]} />
        <Scene 
          videoElement={videoElement}
          regions={regions}
          settings={settings}
          audioLevel={audioLevel}
          defaultMode={currentDefaultMode}
          onUpdateRegion={onUpdateRegion}
        />
      </Canvas>
      <div className="fixed bottom-4 left-4 text-xs text-muted-foreground bg-background/80 px-3 py-2 rounded-lg">
        Shift + Drag to reposition shapes
      </div>
    </div>
  );
}