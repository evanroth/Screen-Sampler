import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CaptureRegion } from '@/hooks/useScreenCapture';
import { VisualizerSettings, AnimationMode3D, ANIMATION_MODES_3D } from '@/hooks/useVisualizerSettings';

interface VisualizerCanvas3DProps {
  regions: CaptureRegion[];
  settings: VisualizerSettings;
  audioLevel: number;
  isActive: boolean;
  onUpdateRegion?: (regionId: string, updates: Partial<CaptureRegion>) => void;
  getVideoElement: (sourceId: string) => HTMLVideoElement | null;
}

interface RegionTextureProps {
  region: CaptureRegion;
  index: number;
  totalRegions: number;
  settings: VisualizerSettings;
  audioLevel: number;
  defaultMode: AnimationMode3D;
  getVideoElement: (sourceId: string) => HTMLVideoElement | null;
  overrideMode?: AnimationMode3D; // For morph transitions
  overrideOpacity?: number; // For morph transitions
}

function RegionMesh({ 
  region, 
  index, 
  totalRegions, 
  settings, 
  audioLevel, 
  defaultMode,
  getVideoElement,
  overrideMode,
  overrideOpacity
}: RegionTextureProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const timeRef = useRef(0);
  const phaseOffset = useMemo(() => Math.random() * Math.PI * 2, []);
  
  // Use override mode (for morph ghost), region-specific mode, or fall back to default
  const mode = overrideMode || region.animationMode3D || defaultMode;

  // Create offscreen canvas for region capture
  useEffect(() => {
    const quality = settings.textureQuality;
    canvasRef.current = document.createElement('canvas');
    canvasRef.current.width = quality;
    canvasRef.current.height = quality;
    textureRef.current = new THREE.CanvasTexture(canvasRef.current);
    // Set correct color space to prevent washed out colors
    textureRef.current.colorSpace = THREE.SRGBColorSpace;
    // Use NearestFilter for crisp pixels, LinearFilter for smooth
    const filter = settings.textureSmoothing ? THREE.LinearFilter : THREE.NearestFilter;
    textureRef.current.minFilter = filter;
    textureRef.current.magFilter = filter;
    
    return () => {
      textureRef.current?.dispose();
    };
  }, [settings.textureQuality, settings.textureSmoothing]);


  useFrame((state, delta) => {
    const videoElement = getVideoElement(region.sourceId);
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
      
      const quality = settings.textureQuality;
      ctx.drawImage(videoElement, rx, ry, rw, rh, 0, 0, quality, quality);
      
      // Per-region transparent color processing
      if (region.transparentColor) {
        const imageData = ctx.getImageData(0, 0, quality, quality);
        const data = imageData.data;
        const threshold = region.transparentThreshold ?? 30;
        
        // Parse the hex color
        const hex = region.transparentColor.replace('#', '');
        const targetR = parseInt(hex.substring(0, 2), 16);
        const targetG = parseInt(hex.substring(2, 4), 16);
        const targetB = parseInt(hex.substring(4, 6), 16);
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Calculate color distance from target
          const distance = Math.sqrt(
            Math.pow(r - targetR, 2) + 
            Math.pow(g - targetG, 2) + 
            Math.pow(b - targetB, 2)
          );
          
          if (distance < threshold) {
            const closeness = 1 - distance / threshold;
            data[i + 3] = Math.round(data[i + 3] * (1 - closeness));
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
      }
      
      textureRef.current.needsUpdate = true;
    }

    // Apply material texture and fade/morph opacity
    if (materialRef.current) {
      materialRef.current.map = textureRef.current;
      
      // Use override opacity if provided (for ghost meshes)
      let targetOpacity: number;
      if (overrideOpacity !== undefined) {
        targetOpacity = overrideOpacity * 0.95;
      } else {
        // Handle opacity based on transition type
        targetOpacity = (region.fadeOpacity ?? 1) * 0.95;
        
        // For zoom transitions, don't change opacity
        if (region.morphProgress !== undefined && region.transitionType === 'zoom') {
          targetOpacity = 0.95;
        }
      }
      
      const currentOpacity = materialRef.current.opacity;
      materialRef.current.opacity = currentOpacity + (targetOpacity - currentOpacity) * 0.15;
    }

    // Calculate zoom scale modifier (shrinks at midpoint, grows back) - only for zoom transitions
    let morphScale = 1;
    if (region.morphProgress !== undefined && region.transitionType === 'zoom') {
      // At progress 0.5, scale is at minimum (0.1), at 0 and 1 it's at maximum (1)
      const distFromMid = Math.abs(region.morphProgress - 0.5) * 2; // 0 at midpoint, 1 at ends
      morphScale = 0.1 + distFromMid * 0.9;
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
      case 'pyramid3D':
      case 'cone3D':
      case 'dodecahedron3D':
      case 'icosahedron3D':
      case 'octahedron3D':
      case 'tetrahedron3D':
      case 'torusKnot3D':
      case 'trefoil3D':
      case 'cinquefoil3D':
      case 'septafoil3D':
      case 'figure8_3D':
      case 'granny3D':
      case 'lissajous3D':
      case 'capsule3D':
      case 'ring3D':
      case 'mobius3D':
        // For shape modes, use custom position if set, otherwise spread out by index
        const customPos = region.position3D;
        if (customPos) {
          mesh.position.x = customPos.x;
          mesh.position.y = customPos.y;
          mesh.position.z = customPos.z;
        } else {
          mesh.position.x = (index - (totalRegions - 1) / 2) * settings.regionSpacing3D;
          mesh.position.y = 0;
          mesh.position.z = 0;
        }
        mesh.rotation.y = time * speed * 0.2;
        mesh.rotation.x = Math.sin(time * speed * 0.1) * 0.1;
        break;
    }

    // Apply scale with optional per-region override and morph effect
    const regionScale = region.scale3D ?? 1;
    mesh.scale.setScalar(baseScale * audioScale * regionScale * morphScale);
  });

  // Create mobius geometry using TubeGeometry with a custom curve
  const mobiusGeometry = useMemo(() => {
    // TorusKnotGeometry with p=2, q=1 creates a figure-8 like shape
    const geometry = new THREE.TorusKnotGeometry(1.2, 0.25, 100, 16, 2, 1);
    return geometry;
  }, []);

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
      case 'pyramid3D':
        return <coneGeometry args={[1.5, 2.5, 4]} />;
      case 'cone3D':
        return <coneGeometry args={[1.5, 2.5, 32]} />;
      case 'dodecahedron3D':
        return <dodecahedronGeometry args={[1.5, 0]} />;
      case 'icosahedron3D':
        return <icosahedronGeometry args={[1.5, 0]} />;
      case 'octahedron3D':
        return <octahedronGeometry args={[1.5, 0]} />;
      case 'tetrahedron3D':
        return <tetrahedronGeometry args={[1.5, 0]} />;
      case 'torusKnot3D':
        return <torusKnotGeometry args={[1, 0.4, 100, 16]} />;
      case 'trefoil3D':
        return <torusKnotGeometry args={[1, 0.35, 100, 16, 2, 3]} />;
      case 'cinquefoil3D':
        return <torusKnotGeometry args={[1, 0.3, 100, 16, 2, 5]} />;
      case 'septafoil3D':
        return <torusKnotGeometry args={[1, 0.25, 128, 16, 2, 7]} />;
      case 'figure8_3D':
        return <torusKnotGeometry args={[1.1, 0.35, 100, 16, 2, 3]} />;
      case 'granny3D':
        return <torusKnotGeometry args={[1, 0.3, 128, 16, 3, 2]} />;
      case 'lissajous3D':
        return <torusKnotGeometry args={[1.1, 0.28, 128, 16, 3, 4]} />;
      case 'capsule3D':
        return <capsuleGeometry args={[0.8, 2, 16, 32]} />;
      case 'ring3D':
        return <torusGeometry args={[1.5, 0.15, 8, 48]} />;
      case 'mobius3D':
        return <primitive object={mobiusGeometry} attach="geometry" />;
      default:
        return <planeGeometry args={[2, 2]} />;
    }
  }, [mode, mobiusGeometry]);

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

// Fullscreen background plane that renders behind everything - uses screen space
function FullscreenBackgroundMesh({ 
  region,
  settings,
  getVideoElement
}: {
  region: CaptureRegion;
  settings: VisualizerSettings;
  getVideoElement: (sourceId: string) => HTMLVideoElement | null;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const { camera, size } = useThree();

  useEffect(() => {
    const quality = settings.textureQuality;
    canvasRef.current = document.createElement('canvas');
    canvasRef.current.width = quality;
    canvasRef.current.height = quality;
    textureRef.current = new THREE.CanvasTexture(canvasRef.current);
    const filter = settings.textureSmoothing ? THREE.LinearFilter : THREE.NearestFilter;
    textureRef.current.minFilter = filter;
    textureRef.current.magFilter = filter;
    
    // Assign texture to material immediately
    if (materialRef.current) {
      materialRef.current.map = textureRef.current;
      materialRef.current.needsUpdate = true;
    }
    
    return () => {
      textureRef.current?.dispose();
    };
  }, [settings.textureQuality, settings.textureSmoothing]);

  // Ensure texture is assigned when material mounts
  useEffect(() => {
    if (materialRef.current && textureRef.current) {
      materialRef.current.map = textureRef.current;
      materialRef.current.needsUpdate = true;
    }
  }, []);

  useFrame(() => {
    const videoElement = getVideoElement(region.sourceId);
    if (!meshRef.current || !canvasRef.current || !textureRef.current || !videoElement) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx && videoElement.videoWidth > 0) {
      const vw = videoElement.videoWidth;
      const vh = videoElement.videoHeight;
      const rx = region.x * vw;
      const ry = region.y * vh;
      const rw = region.width * vw;
      const rh = region.height * vh;
      
      const quality = settings.textureQuality;
      ctx.drawImage(videoElement, rx, ry, rw, rh, 0, 0, quality, quality);
      
      // Apply transparent color processing
      if (region.transparentColor) {
        const imageData = ctx.getImageData(0, 0, quality, quality);
        const data = imageData.data;
        const threshold = region.transparentThreshold ?? 30;
        
        const hex = region.transparentColor.replace('#', '');
        const targetR = parseInt(hex.substring(0, 2), 16);
        const targetG = parseInt(hex.substring(2, 4), 16);
        const targetB = parseInt(hex.substring(4, 6), 16);
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          const distance = Math.sqrt(
            Math.pow(r - targetR, 2) + 
            Math.pow(g - targetG, 2) + 
            Math.pow(b - targetB, 2)
          );
          
          if (distance < threshold) {
            const closeness = 1 - distance / threshold;
            data[i + 3] = Math.round(data[i + 3] * (1 - closeness));
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
      }
      
      textureRef.current.needsUpdate = true;
    }

    if (materialRef.current) {
      materialRef.current.map = textureRef.current;
    }

    // Position the mesh to always fill the screen, staying in front of camera
    const mesh = meshRef.current;
    
    // Calculate distance from camera and size needed to fill viewport
    // Use a distance within the fog range but behind other objects
    const distance = 25; // Place within fog range but behind scene objects
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    const height = 2 * Math.tan(fov / 2) * distance;
    const width = height * (size.width / size.height);
    
    // Position mesh behind camera's view, centered
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(camera.quaternion);
    
    mesh.position.copy(camera.position).add(cameraDirection.multiplyScalar(distance));
    mesh.quaternion.copy(camera.quaternion);
    mesh.scale.set(width, height, 1);
  });

  // Create a default white texture to ensure the material is visible before video loads
  const defaultTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 2, 2);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <mesh ref={meshRef} renderOrder={-1000}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial 
        ref={materialRef} 
        map={textureRef.current || defaultTexture}
        side={THREE.FrontSide}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function Scene({ regions, settings, audioLevel, defaultMode, getVideoElement }: {
  regions: CaptureRegion[];
  settings: VisualizerSettings;
  audioLevel: number;
  defaultMode: AnimationMode3D;
  getVideoElement: (sourceId: string) => HTMLVideoElement | null;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const meshGroupRef = useRef<THREE.Group>(null);
  
  // Filter visible regions, then separate fullscreen background from normal
  const visibleRegions = regions.filter(r => r.visible !== false);
  const backgroundRegions = visibleRegions.filter(r => r.fullscreenBackground);
  const normalRegions = visibleRegions.filter(r => !r.fullscreenBackground);
  
  useEffect(() => {
    camera.position.set(0, 0, 4); // 2x zoom (closer to scene)
  }, [camera]);

  // Update OrbitControls target to center of all meshes
  useFrame(() => {
    if (!controlsRef.current || !meshGroupRef.current) return;
    
    const children = meshGroupRef.current.children;
    if (children.length === 0) return;
    
    // Calculate center point of all meshes
    let centerX = 0, centerY = 0, centerZ = 0;
    children.forEach((child) => {
      centerX += child.position.x;
      centerY += child.position.y;
      centerZ += child.position.z;
    });
    centerX /= children.length;
    centerY /= children.length;
    centerZ /= children.length;
    
    // Smoothly interpolate target to center
    controlsRef.current.target.lerp(
      new THREE.Vector3(centerX, centerY, centerZ),
      0.05
    );
  });

  return (
    <>
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {/* Render fullscreen backgrounds behind everything */}
      {backgroundRegions.map((region) => (
        <FullscreenBackgroundMesh
          key={`bg-${region.id}`}
          region={region}
          settings={settings}
          getVideoElement={getVideoElement}
        />
      ))}
      
      <group ref={meshGroupRef}>
        {normalRegions.map((region, index) => (
          <RegionMesh
            key={region.id}
            region={region}
            index={index}
            totalRegions={normalRegions.length}
            settings={settings}
            audioLevel={audioLevel}
            defaultMode={defaultMode}
            getVideoElement={getVideoElement}
          />
        ))}
      </group>
      
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
  regions,
  settings,
  audioLevel,
  isActive,
  onUpdateRegion,
  getVideoElement,
}: VisualizerCanvas3DProps) {
  const [currentDefaultMode, setCurrentDefaultMode] = useState<AnimationMode3D>(
    settings.animationMode3D === 'random3D' 
      ? ANIMATION_MODES_3D[0] 
      : settings.animationMode3D
  );
  const lastModeChangeRef = useRef<number>(Date.now());
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);

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

  // Check if we have any valid video element
  const hasValidSource = regions.some(r => getVideoElement(r.sourceId) !== null);

  if (!isActive || !hasValidSource) {
    return null;
  }
  
  useEffect(() => {
    const needsCanvas = settings.backgroundStyle === 'blurred' || 
                        settings.backgroundStyle === 'linearGradient' || 
                        settings.backgroundStyle === 'radialGradient';
    
    if (!needsCanvas || !bgCanvasRef.current) return;
    
    const canvas = bgCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    
    const updateBackground = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      if (settings.backgroundStyle === 'linearGradient') {
        const gradient = ctx.createLinearGradient(
          canvas.width / 2, 0,
          canvas.width / 2, canvas.height
        );
        gradient.addColorStop(0, settings.gradientSettings.color1);
        gradient.addColorStop(1, settings.gradientSettings.color2);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (settings.backgroundStyle === 'radialGradient') {
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
        );
        gradient.addColorStop(0, settings.gradientSettings.color1);
        gradient.addColorStop(1, settings.gradientSettings.color2);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (settings.backgroundStyle === 'blurred') {
        // Get first available video element for blurred background
        const firstRegion = regions[0];
        const videoElement = firstRegion ? getVideoElement(firstRegion.sourceId) : null;
        
        if (videoElement && videoElement.videoWidth === 0) {
          animationId = requestAnimationFrame(updateBackground);
          return;
        }
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (regions.length > 0 && videoElement) {
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
      }
      
      if (settings.backgroundStyle === 'blurred') {
        animationId = requestAnimationFrame(updateBackground);
      }
    };
    
    updateBackground();
    return () => cancelAnimationFrame(animationId);
  }, [settings.backgroundStyle, settings.gradientSettings, getVideoElement, regions]);

  // Determine background color for Canvas
  const getBackgroundColor = () => {
    switch (settings.backgroundStyle) {
      case 'white':
        return '#ffffff';
      case 'solid':
        return settings.backgroundColor;
      default:
        return '#000000';
    }
  };

  const needsCanvasBackground = settings.backgroundStyle === 'blurred' || 
                                 settings.backgroundStyle === 'linearGradient' || 
                                 settings.backgroundStyle === 'radialGradient';

  return (
    <div className="fixed inset-0" style={{ zIndex: 0, background: getBackgroundColor() }}>
      {needsCanvasBackground && (
        <canvas 
          ref={bgCanvasRef} 
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 0 }}
        />
      )}
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 500 }}
        gl={{ antialias: true, alpha: needsCanvasBackground, toneMapping: THREE.NoToneMapping }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        {!needsCanvasBackground && (
          <color attach="background" args={[getBackgroundColor()]} />
        )}
        <fog attach="fog" args={[getBackgroundColor(), 20, 80]} />
        <Scene 
          regions={regions}
          settings={settings}
          audioLevel={audioLevel}
          defaultMode={currentDefaultMode}
          getVideoElement={getVideoElement}
        />
      </Canvas>
    </div>
  );
}
