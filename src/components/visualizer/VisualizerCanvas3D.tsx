import React, { useRef, useEffect, useMemo, useState } from 'react';
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
}

interface RegionTextureProps {
  videoElement: HTMLVideoElement;
  region: CaptureRegion;
  index: number;
  totalRegions: number;
  settings: VisualizerSettings;
  audioLevel: number;
  mode: AnimationMode3D;
}

function RegionMesh({ videoElement, region, index, totalRegions, settings, audioLevel, mode }: RegionTextureProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const timeRef = useRef(0);
  const phaseOffset = useMemo(() => Math.random() * Math.PI * 2, []);

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

    // Animation based on mode
    const mesh = meshRef.current;
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
        // For shape modes, just subtle movement
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

  return (
    <mesh ref={meshRef}>
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

function Scene({ videoElement, regions, settings, audioLevel, mode }: {
  videoElement: HTMLVideoElement;
  regions: CaptureRegion[];
  settings: VisualizerSettings;
  audioLevel: number;
  mode: AnimationMode3D;
}) {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(0, 0, 8);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {regions.map((region, index) => (
        <RegionMesh
          key={region.id}
          videoElement={videoElement}
          region={region}
          index={index}
          totalRegions={regions.length}
          settings={settings}
          audioLevel={audioLevel}
          mode={mode}
        />
      ))}
      
      <OrbitControls 
        enableDamping 
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.5}
        enablePan={false}
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
}: VisualizerCanvas3DProps) {
  const [currentMode, setCurrentMode] = useState<AnimationMode3D>(
    settings.animationMode3D === 'random3D' 
      ? ANIMATION_MODES_3D[0] 
      : settings.animationMode3D
  );
  const lastModeChangeRef = useRef<number>(Date.now());

  // Handle random mode switching
  useEffect(() => {
    if (settings.animationMode3D !== 'random3D') {
      setCurrentMode(settings.animationMode3D);
      return;
    }

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * ANIMATION_MODES_3D.length);
      setCurrentMode(ANIMATION_MODES_3D[randomIndex]);
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
          mode={currentMode}
        />
      </Canvas>
    </div>
  );
}
