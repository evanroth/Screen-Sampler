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
}

function RegionMesh({ 
  videoElement, 
  region, 
  index, 
  totalRegions, 
  settings, 
  audioLevel, 
  defaultMode
}: RegionTextureProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const timeRef = useRef(0);
  const phaseOffset = useMemo(() => Math.random() * Math.PI * 2, []);
  
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
    

    // Animation based on mode
    const speed = settings.movementSpeed;
    const angleOffset = (index / totalRegions) * Math.PI * 2;

    switch (mode) {
      case 'floating3D':
        mesh.position.x = Math.sin(time * speed + angleOffset) * settings.regionSpacing3D;
        mesh.position.y = Math.cos(time * speed * 0.7 + phaseOffset) * (settings.regionSpacing3D * 0.66);
        mesh.position.z = Math.sin(time * speed * 0.5 + angleOffset) * (settings.regionSpacing3D * 0.66);
        mesh.rotation.x = time * 0.2;
        mesh.rotation.y = time * 0.3;
        break;
        
      case 'orbit3D':
        const orbitRadius = settings.regionSpacing3D + index * 0.5;
        mesh.position.x = Math.cos(time * speed + angleOffset) * orbitRadius;
        mesh.position.y = Math.sin(time * speed * 0.3 + phaseOffset) * (settings.regionSpacing3D * 0.5);
        mesh.position.z = Math.sin(time * speed + angleOffset) * orbitRadius;
        mesh.rotation.y = -time * speed - angleOffset;
        break;
        
      case 'carousel3D':
        const carouselRadius = settings.regionSpacing3D * 1.33;
        const carouselAngle = time * speed * 0.5 + angleOffset;
        mesh.position.x = Math.cos(carouselAngle) * carouselRadius;
        mesh.position.y = 0;
        mesh.position.z = Math.sin(carouselAngle) * carouselRadius;
        mesh.rotation.y = -carouselAngle + Math.PI / 2;
        break;
        
      case 'helix3D':
        const helixRadius = settings.regionSpacing3D;
        const helixAngle = time * speed + angleOffset;
        mesh.position.x = Math.cos(helixAngle) * helixRadius;
        mesh.position.y = (Math.sin(helixAngle * 2) * (settings.regionSpacing3D * 0.66));
        mesh.position.z = Math.sin(helixAngle) * helixRadius;
        mesh.rotation.y = -helixAngle;
        break;
        
      case 'explode3D':
        const explodePhase = (Math.sin(time * speed * 0.5) + 1) / 2;
        const explodeRadius = (settings.regionSpacing3D * 0.66) + explodePhase * settings.regionSpacing3D * 1.33;
        const theta = (index / totalRegions) * Math.PI * 2;
        const phi = ((index % 3) / 3) * Math.PI;
        mesh.position.x = Math.sin(phi) * Math.cos(theta) * explodeRadius;
        mesh.position.y = Math.cos(phi) * explodeRadius;
        mesh.position.z = Math.sin(phi) * Math.sin(theta) * explodeRadius;
        mesh.rotation.x = time * 0.5;
        mesh.rotation.y = time * 0.3;
        break;
        
      case 'wave3D':
        mesh.position.x = (index - totalRegions / 2) * (settings.regionSpacing3D * 0.83);
        mesh.position.y = Math.sin(time * speed * 2 + index * 0.5) * (settings.regionSpacing3D * 0.66);
        mesh.position.z = Math.cos(time * speed + index * 0.3) * (settings.regionSpacing3D * 0.5);
        mesh.rotation.z = Math.sin(time * speed + index) * 0.3;
        break;

      case 'sphere3D':
      case 'cube3D':
      case 'cylinder3D':
      case 'torus3D':
        // For shape modes, spread out by index
        mesh.position.x = (index - (totalRegions - 1) / 2) * settings.regionSpacing3D;
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

function Scene({ videoElement, regions, settings, audioLevel, defaultMode }: {
  videoElement: HTMLVideoElement;
  regions: CaptureRegion[];
  settings: VisualizerSettings;
  audioLevel: number;
  defaultMode: AnimationMode3D;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  
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
          defaultMode={defaultMode}
        />
      ))}
      
      <OrbitControls 
        ref={controlsRef}
        enableDamping 
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.5}
        enablePan={true}
        panSpeed={0.5}
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

  // Create blurred background for 3D mode
  const blurredBgRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (settings.backgroundStyle !== 'blurred' || !videoElement || !blurredBgRef.current) return;
    
    const canvas = blurredBgRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    
    const updateBackground = () => {
      if (videoElement.videoWidth === 0) {
        animationId = requestAnimationFrame(updateBackground);
        return;
      }
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (regions.length > 0) {
        const region = regions[0];
        const vw = videoElement.videoWidth;
        const vh = videoElement.videoHeight;
        const rx = region.x * vw;
        const ry = region.y * vh;
        const rw = region.width * vw;
        const rh = region.height * vh;
        
        ctx.filter = 'blur(50px)';
        ctx.globalAlpha = 0.5;
        ctx.drawImage(videoElement, rx, ry, rw, rh, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      animationId = requestAnimationFrame(updateBackground);
    };
    
    updateBackground();
    return () => cancelAnimationFrame(animationId);
  }, [settings.backgroundStyle, videoElement, regions]);

  return (
    <div className="fixed inset-0" style={{ zIndex: 0, background: '#000' }}>
      {settings.backgroundStyle === 'blurred' && (
        <canvas 
          ref={blurredBgRef} 
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 0 }}
        />
      )}
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: settings.backgroundStyle === 'blurred' }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        {settings.backgroundStyle !== 'blurred' && (
          <color attach="background" args={['#000000']} />
        )}
        <fog attach="fog" args={['#000000', 10, 30]} />
        <Scene 
          videoElement={videoElement}
          regions={regions}
          settings={settings}
          audioLevel={audioLevel}
          defaultMode={currentDefaultMode}
        />
      </Canvas>
      <div className="fixed bottom-4 left-4 text-xs text-muted-foreground bg-background/80 px-3 py-2 rounded-lg">
        Shift + Drag to pan camera
      </div>
    </div>
  );
}