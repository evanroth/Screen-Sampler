import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CaptureRegion } from '@/hooks/useScreenCapture';
import { VisualizerSettings, AnimationMode3D, ANIMATION_MODES_3D } from '@/hooks/useVisualizerSettings';
import {
  createTetrakisHexahedron,
  createGreatDodecahedron,
  createGreatIcosahedron,
  createSmallStellatedDodecahedron,
  createGreatStellatedDodecahedron,
  createTripleTwistMobius,
  createVerrillSurface,
  createDoubleTrefoil,
  createSchwarzPSurface,
  createEnneperSurface,
  createBoysSurface,
  createCliffordTorus,
  createHyperbolicParaboloid,
  createHyperboloidOneSheet,
  createSteinerSurface,
  createHelicoid,
} from './customGeometries';

interface VisualizerCanvas3DProps {
  regions: CaptureRegion[];
  settings: VisualizerSettings;
  audioLevel: number;
  isActive: boolean;
  onUpdateRegion?: (regionId: string, updates: Partial<CaptureRegion>) => void;
  getVideoElement: (sourceId: string) => HTMLVideoElement | null;
  getCustomGeometry?: (modelId: string) => THREE.BufferGeometry | null;
  midiCameraAngle?: number | null; // MIDI-controlled camera horizontal rotation
}

interface RegionTextureProps {
  region: CaptureRegion;
  index: number;
  totalRegions: number;
  settings: VisualizerSettings;
  audioLevel: number;
  defaultMode: AnimationMode3D;
  getVideoElement: (sourceId: string) => HTMLVideoElement | null;
  getCustomGeometry?: (modelId: string) => THREE.BufferGeometry | null;
  overrideMode?: AnimationMode3D; // For morph transitions
  overrideOpacity?: number; // For morph transitions
  isDraggingRef?: React.MutableRefObject<boolean>; // Shared ref for drag state
}

function RegionMesh({ 
  region, 
  index, 
  totalRegions, 
  settings, 
  audioLevel, 
  defaultMode,
  getVideoElement,
  getCustomGeometry,
  overrideMode,
  overrideOpacity,
  isDraggingRef
}: RegionTextureProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const timeRef = useRef(0);
  // Pool ImageData to avoid massive allocation per frame when transparent color is active
  const imageDataRef = useRef<ImageData | null>(null);
  // Per-region turntable state for Individual Rotation mode.
  // We keep an explicit angle accumulator so that:
  // - turning Auto-Rotate Region off/on never "jumps" (angle is continuous)
  // - MIDI rotation can "write" the angle, and auto-rotate will resume from that exact angle
  // - turning auto-rotate off decelerates smoothly (friction)
  // IMPORTANT: Use a stable initial value (0) - do NOT re-initialize from props on re-render
  // or the rotation will jump when unrelated props (like scale) change.
  // MIDI rotation syncs this ref inside useFrame when active.
  const rotationAngleRef = useRef(0);
  // Current rotation velocity (decays when auto-rotate is off)
  const rotateVelocityRef = useRef(0);
  const phaseOffset = useMemo(() => Math.random() * Math.PI * 2, []);
  
  // Use override mode (for morph ghost), region-specific mode, or fall back to default
  const mode = overrideMode || region.animationMode3D || defaultMode;

  // IMPORTANT: Initialize material opacity from the current region fade state.
  // Otherwise, newly-mounted meshes will render 1 frame at the JSX default (0.95)
  // before the first useFrame() tick applies fadeOpacity.
  const initialMaterialOpacity = useMemo(() => {
    if (overrideOpacity !== undefined) return overrideOpacity * 0.95;
    return (region.fadeOpacity ?? 1) * 0.95;
  }, [overrideOpacity, region.fadeOpacity]);

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
    
    // Invalidate pooled ImageData when quality changes
    imageDataRef.current = null;
    
    return () => {
      textureRef.current?.dispose();
    };
  }, [settings.textureQuality, settings.textureSmoothing]);


  useFrame((state, delta) => {
    const videoElement = getVideoElement(region.sourceId);
    if (!meshRef.current || !canvasRef.current || !textureRef.current || !videoElement) return;
    
    timeRef.current += delta;
    const time = timeRef.current;

    // Turntable stop effect (per-region) for Individual Rotation mode.
    // Individual rotation is INDEPENDENT of auto-rotate camera - they can work simultaneously.
    // IMPORTANT: Skip auto-rotation logic entirely when MIDI is controlling this region's rotation
    // to prevent the rotation angle from advancing and causing jumps during other prop updates.
    const isUserDragging = isDraggingRef?.current ?? false;
    const isMidiControlled = region.midiRotationY !== undefined;
    if (settings.individualRotation && !isMidiControlled) {
      const regionAutoRotateEnabled = region.autoRotate3D !== false; // default true
      // Individual rotation works independently - only check region toggle, not camera
      const shouldAutoRotate = regionAutoRotateEnabled && !isUserDragging;

      const targetVelocity = shouldAutoRotate ? 1 : 0;
      const friction = isUserDragging ? 0.5 : (targetVelocity > 0 ? 0.1 : 0.04);
      rotateVelocityRef.current += (targetVelocity - rotateVelocityRef.current) * friction;

      // Stop completely when velocity is negligible
      if (rotateVelocityRef.current < 0.001) {
        rotateVelocityRef.current = 0;
      }

      // Advance rotation angle based on current velocity - use individualRotationSpeed
      // IMPORTANT: This speed is completely independent of camera rotation speed.
      // Use a higher multiplier (1.0) so models rotate at a meaningful speed even when
      // camera is also rotating. The individualRotationSpeed slider (0.1-10) provides full control.
      const angularSpeed = settings.individualRotationSpeed * 1.0;
      rotationAngleRef.current += delta * rotateVelocityRef.current * angularSpeed;
    }
    
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
      
      // Per-region transparent color processing with pooled ImageData
      if (region.transparentColor) {
        // Reuse ImageData to avoid massive per-frame allocation (up to 16MB at 2048x2048)
        if (!imageDataRef.current || imageDataRef.current.width !== quality || imageDataRef.current.height !== quality) {
          imageDataRef.current = ctx.createImageData(quality, quality);
        }
        const freshData = ctx.getImageData(0, 0, quality, quality);
        imageDataRef.current.data.set(freshData.data);
        
        const data = imageDataRef.current.data;
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
        
        ctx.putImageData(imageDataRef.current, 0, 0);
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
        // Default: opacity follows fadeOpacity when provided; otherwise stays at 0.95
        // (This prevents a single-frame flash when a region becomes visible mid-transition.)
        targetOpacity = (region.fadeOpacity ?? 1) * 0.95;
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

    // Calculate MIDI bounce scale (triggered by button press, decays over 300ms)
    let bounceScale = 1;
    if (region.bounceTime) {
      const elapsed = Date.now() - region.bounceTime;
      const duration = 300; // bounce duration in ms
      if (elapsed < duration) {
        // Quick attack, smooth decay using sine curve
        const progress = elapsed / duration;
        const bounceAmount = Math.sin(progress * Math.PI) * 0.5; // 0 -> 0.5 -> 0
        bounceScale = 1 + bounceAmount;
      }
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
      case 'tetrakisHexahedron3D':
      case 'greatDodecahedron3D':
      case 'greatIcosahedron3D':
      case 'smallStellatedDodecahedron3D':
      case 'greatStellatedDodecahedron3D':
      case 'tripleTwistMobius3D':
      case 'verrill3D':
      case 'doubleTrefoil3D':
      case 'schwarzP3D':
      case 'enneper3D':
      case 'boysSurface3D':
      case 'cliffordTorus3D':
      case 'hyperbolicParaboloid3D':
      case 'hyperboloidOneSheet3D':
      case 'steiner3D':
      case 'helicoid3D':
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
        // Auto-rotate with turntable stop effect (velocity-based, MIDI override applied below)
        // Individual rotation: models rotate around their own center (INDEPENDENT of camera rotation)
        if (settings.individualRotation) {
          // Individual rotation is independent - if region toggle is on, model rotates
          const regionWantsAutoRotate = region.autoRotate3D !== false;
          const hasSpinVelocity = rotateVelocityRef.current > 0;
          if (regionWantsAutoRotate || hasSpinVelocity) {
            const y = rotationAngleRef.current;
            mesh.rotation.y = y;
            mesh.rotation.x = Math.sin(y * 0.5) * 0.1;
          }
        }
        // When camera is rotating (not individual mode), don't rotate mesh - camera does it
        break;
    }

    // MIDI model rotation overrides all animation mode rotations
    // This should work regardless of auto-rotate camera settings
    if (region.midiRotationY !== undefined) {
      // Keep the auto-rotate accumulator synced so when MIDI releases we continue smoothly
      rotationAngleRef.current = region.midiRotationY;
      mesh.rotation.y = region.midiRotationY;
      // Add subtle X tilt based on Y rotation for visual interest
      mesh.rotation.x = Math.sin(region.midiRotationY * 0.5) * 0.1;
    }

    // Apply scale with optional per-region override, morph effect, bounce, and MIDI scaling.
    // `scale3D` is the user-set max in the UI. MIDI writes to `midiScale3D` (0..1) so it
    // never overwrites the user's slider value.
    const regionScaleMax = region.scale3D ?? 1;
    const midiScale = region.midiScale3D ?? 1;
    mesh.scale.setScalar(baseScale * audioScale * regionScaleMax * midiScale * morphScale * bounceScale);
  });

  // Create custom geometries
  const customGeometries = useMemo(() => ({
    mobius: new THREE.TorusKnotGeometry(1.2, 0.25, 100, 16, 2, 1),
    tetrakisHexahedron: createTetrakisHexahedron(1.5),
    greatDodecahedron: createGreatDodecahedron(1.5),
    greatIcosahedron: createGreatIcosahedron(1.5),
    smallStellatedDodecahedron: createSmallStellatedDodecahedron(1.5),
    greatStellatedDodecahedron: createGreatStellatedDodecahedron(1.5),
    tripleTwistMobius: createTripleTwistMobius(1.2),
    verrill: createVerrillSurface(1.2),
    doubleTrefoil: createDoubleTrefoil(1.0),
    schwarzP: createSchwarzPSurface(1.2),
    enneper: createEnneperSurface(0.8),
    boysSurface: createBoysSurface(1.0),
    cliffordTorus: createCliffordTorus(1.2),
    hyperbolicParaboloid: createHyperbolicParaboloid(1.2),
    hyperboloidOneSheet: createHyperboloidOneSheet(1.0),
    steiner: createSteinerSurface(1.2),
    helicoid: createHelicoid(1.0),
  }), []);

  // Determine geometry based on mode or custom model
  const geometry = useMemo(() => {
    // Check if region has a custom model from external or custom source
    if (region.customModelId && getCustomGeometry) {
      const customGeo = getCustomGeometry(region.customModelId);
      if (customGeo) {
        return <primitive object={customGeo} attach="geometry" />;
      }
      // If modelSource is 'external' or 'custom' but geometry not loaded yet,
      // return null to avoid flashing the default shape
      if (region.modelSource === 'external' || region.modelSource === 'custom') {
        return null;
      }
    }
    
    // If modelSource is explicitly 'external' or 'custom' but no customModelId,
    // don't fall back to default shape - return null
    if (region.modelSource === 'external' || region.modelSource === 'custom') {
      return null;
    }
    
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
        return <primitive object={customGeometries.mobius} attach="geometry" />;
      case 'tetrakisHexahedron3D':
        return <primitive object={customGeometries.tetrakisHexahedron} attach="geometry" />;
      case 'greatDodecahedron3D':
        return <primitive object={customGeometries.greatDodecahedron} attach="geometry" />;
      case 'greatIcosahedron3D':
        return <primitive object={customGeometries.greatIcosahedron} attach="geometry" />;
      case 'smallStellatedDodecahedron3D':
        return <primitive object={customGeometries.smallStellatedDodecahedron} attach="geometry" />;
      case 'greatStellatedDodecahedron3D':
        return <primitive object={customGeometries.greatStellatedDodecahedron} attach="geometry" />;
      case 'tripleTwistMobius3D':
        return <primitive object={customGeometries.tripleTwistMobius} attach="geometry" />;
      case 'verrill3D':
        return <primitive object={customGeometries.verrill} attach="geometry" />;
      case 'doubleTrefoil3D':
        return <primitive object={customGeometries.doubleTrefoil} attach="geometry" />;
      case 'schwarzP3D':
        return <primitive object={customGeometries.schwarzP} attach="geometry" />;
      case 'enneper3D':
        return <primitive object={customGeometries.enneper} attach="geometry" />;
      case 'boysSurface3D':
        return <primitive object={customGeometries.boysSurface} attach="geometry" />;
      case 'cliffordTorus3D':
        return <primitive object={customGeometries.cliffordTorus} attach="geometry" />;
      case 'hyperbolicParaboloid3D':
        return <primitive object={customGeometries.hyperbolicParaboloid} attach="geometry" />;
      case 'hyperboloidOneSheet3D':
        return <primitive object={customGeometries.hyperboloidOneSheet} attach="geometry" />;
      case 'steiner3D':
        return <primitive object={customGeometries.steiner} attach="geometry" />;
      case 'helicoid3D':
        return <primitive object={customGeometries.helicoid} attach="geometry" />;
      default:
        return <planeGeometry args={[2, 2]} />;
    }
  }, [mode, customGeometries, region.customModelId, getCustomGeometry]);

  // Don't render mesh if geometry is null (e.g., external model still loading)
  if (!geometry) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      // Keep meshes mounted even when hidden so they don't reset animation time (prevents position "jump")
      // but mark them invisible at the Three.js level so camera-target centering can ignore them.
      visible={region.visible !== false}
    >
      {geometry}
      <meshBasicMaterial 
        ref={materialRef} 
        side={THREE.DoubleSide}
        transparent
        opacity={initialMaterialOpacity}
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
  // Reusable objects to avoid per-frame allocation (prevents GC pressure over hours)
  const cameraDirectionRef = useRef(new THREE.Vector3());
  // Pool ImageData to avoid 16MB allocation per frame when transparent color is active
  const imageDataRef = useRef<ImageData | null>(null);

  useEffect(() => {
    const quality = settings.textureQuality;
    canvasRef.current = document.createElement('canvas');
    canvasRef.current.width = quality;
    canvasRef.current.height = quality;
    textureRef.current = new THREE.CanvasTexture(canvasRef.current);
    const filter = settings.textureSmoothing ? THREE.LinearFilter : THREE.NearestFilter;
    textureRef.current.minFilter = filter;
    textureRef.current.magFilter = filter;
    
    // Invalidate pooled ImageData when quality changes
    imageDataRef.current = null;
    
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
      
      // Apply transparent color processing with pooled ImageData
      if (region.transparentColor) {
        // Reuse ImageData object to avoid 16MB allocation per frame
        if (!imageDataRef.current || imageDataRef.current.width !== quality || imageDataRef.current.height !== quality) {
          imageDataRef.current = ctx.createImageData(quality, quality);
        }
        // Copy current canvas pixels into pooled ImageData
        const freshData = ctx.getImageData(0, 0, quality, quality);
        imageDataRef.current.data.set(freshData.data);
        
        const data = imageDataRef.current.data;
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
        
        ctx.putImageData(imageDataRef.current, 0, 0);
      }
      
      textureRef.current.needsUpdate = true;
    }

    if (materialRef.current) {
      materialRef.current.map = textureRef.current;
    }

    // Position the mesh to always fill the screen, staying in front of camera
    const mesh = meshRef.current;
    
    // Calculate distance from camera and size needed to fill viewport
    const distance = 25;
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    const height = 2 * Math.tan(fov / 2) * distance;
    const width = height * (size.width / size.height);
    
    // Reuse Vector3 to avoid per-frame allocation
    const cameraDirection = cameraDirectionRef.current;
    cameraDirection.set(0, 0, -1);
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

  // Dispose default texture on unmount
  useEffect(() => {
    return () => {
      defaultTexture.dispose();
    };
  }, [defaultTexture]);

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

function Scene({ regions, settings, audioLevel, defaultMode, getVideoElement, getCustomGeometry, midiCameraAngle }: {
  regions: CaptureRegion[];
  settings: VisualizerSettings;
  audioLevel: number;
  defaultMode: AnimationMode3D;
  getVideoElement: (sourceId: string) => HTMLVideoElement | null;
  getCustomGeometry?: (modelId: string) => THREE.BufferGeometry | null;
  midiCameraAngle?: number | null;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const meshGroupRef = useRef<THREE.Group>(null);
  const isPlayMode = settings.playMode.enabled;

  // IMPORTANT: Avoid re-fitting the camera on *any* regions array change.
  // Changing a per-region setting like Scale updates `regions`, and if we
  // reset the camera position here it feels like the scene "jumps" back to
  // its initial rotation.
  const visibleNormalCount = useMemo(() => {
    let count = 0;
    for (const r of regions) {
      if (r.visible !== false && !r.fullscreenBackground) count += 1;
    }
    return count;
  }, [regions]);
  
  // Track auto-rotate state to handle smooth resume
  const wasAutoRotatingRef = useRef(settings.autoRotateCamera);
  const manualRotationAngleRef = useRef(0);
  // Track if MIDI is controlling camera (disables auto-rotate when MIDI takes over)
  const lastMidiAngleRef = useRef<number | null>(null);
  // Turntable stop effect - velocity-based camera rotation
  const cameraRotateVelocityRef = useRef(settings.autoRotateCamera ? 1 : 0);
  // Track if user is currently dragging
  const isDraggingRef = useRef(false);
  // Reusable Vector3 for center camera lerp - prevents memory leak from creating new objects every frame
  const centerTargetRef = useRef(new THREE.Vector3());
  
  // Filter visible regions, then separate fullscreen background from normal
  const backgroundRegions = regions.filter(r => r.fullscreenBackground && r.visible !== false);
  const layoutNormalRegions = regions.filter(r => !r.fullscreenBackground && r.visible !== false);
  const allNormalRegions = regions.filter(r => !r.fullscreenBackground);

  const layoutInfo = useMemo(() => {
    const indexMap = new Map<string, number>();
    layoutNormalRegions.forEach((r, i) => indexMap.set(r.id, i));
    return {
      indexMap,
      total: layoutNormalRegions.length,
    };
  }, [layoutNormalRegions]);
  
  // Handle OrbitControls events to track drag state (ref-based, no React state updates)
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    
    const handleStart = () => {
      isDraggingRef.current = true;
    };
    
    const handleEnd = () => {
      isDraggingRef.current = false;
    };
    
    controls.addEventListener('start', handleStart);
    controls.addEventListener('end', handleEnd);
    
    return () => {
      controls.removeEventListener('start', handleStart);
      controls.removeEventListener('end', handleEnd);
    };
  }, []);
  
  useEffect(() => {
    // Skip auto-positioning when centerCamera is disabled
    if (!settings.centerCamera) return;
    
    // Calculate camera distance to fit objects at ~85% of screen
    // IMPORTANT (Play Mode): During crossfades there are briefly 2 visible meshes.
    // If we re-fit the camera based on visible count, it causes a perceived "position jump".
    // In Play Mode we intentionally keep the camera fit stable as if showing a single model.
    const regionCount = isPlayMode ? 1 : Math.max(visibleNormalCount, 1);
    const totalWidth = regionCount > 1 ? (regionCount - 1) * settings.regionSpacing3D : 0;
    
    // Object size based on scale and geometry (mobius/torus knot is roughly 2.4 units diameter)
    const objectSize = settings.panelScaleX * 2.4;
    const sceneWidth = Math.max(totalWidth + objectSize, objectSize);
    
    // Use FOV to calculate required distance for 85% screen fill
    const fov = 60 * (Math.PI / 180);
    const aspectRatio = window.innerWidth / window.innerHeight;
    const targetFillRatio = 0.85;
    
    // Calculate distance based on whether scene is wider or taller
    const horizontalFov = 2 * Math.atan(Math.tan(fov / 2) * aspectRatio);
    const distanceForWidth = (sceneWidth / 2) / (Math.tan(horizontalFov / 2) * targetFillRatio);
    const distanceForHeight = (objectSize / 2) / (Math.tan(fov / 2) * targetFillRatio);
    
    // Use the larger distance needed, but keep it close
    const cameraZ = Math.max(distanceForWidth, distanceForHeight, 2);
    
    camera.position.set(0, 0, cameraZ);
  }, [camera, visibleNormalCount, settings.regionSpacing3D, settings.panelScaleX, isPlayMode, settings.centerCamera]);

  // Handle auto-rotate toggle to prevent jumping
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    
    const wasAutoRotating = wasAutoRotatingRef.current;
    const isAutoRotating = settings.autoRotateCamera;
    
    if (wasAutoRotating && !isAutoRotating) {
      // Turning OFF: Save current azimuthal angle
      manualRotationAngleRef.current = controls.getAzimuthalAngle();
    } else if (!wasAutoRotating && isAutoRotating) {
      // Turning ON: Reset the internal auto-rotate time offset
      // OrbitControls uses performance.now() internally, so we need to 
      // manually rotate to match current position before enabling
      // This is done by updating the controls after a microtask
      const currentAngle = controls.getAzimuthalAngle();
      manualRotationAngleRef.current = currentAngle;
    }
    
    wasAutoRotatingRef.current = isAutoRotating;
  }, [settings.autoRotateCamera]);

  // Update OrbitControls target to center of all meshes
  useFrame((_, delta) => {
    if (!controlsRef.current || !meshGroupRef.current) return;
    
    const children = meshGroupRef.current.children;
    const visibleChildren = children.filter((c) => (c as any).visible !== false);
    if (visibleChildren.length === 0) return;
    
    // Only auto-center when centerCamera is enabled
    if (settings.centerCamera) {
      // Calculate center point of all meshes
      let centerX = 0, centerY = 0, centerZ = 0;
      visibleChildren.forEach((child) => {
        centerX += child.position.x;
        centerY += child.position.y;
        centerZ += child.position.z;
      });
      centerX /= visibleChildren.length;
      centerY /= visibleChildren.length;
      centerZ /= visibleChildren.length;
      
      // Smoothly interpolate target to center using reusable Vector3 (prevents memory leak)
      centerTargetRef.current.set(centerX, centerY, centerZ);
      controlsRef.current.target.lerp(centerTargetRef.current, 0.05);
    }
    
    // Handle MIDI camera rotation (takes priority over auto-rotate)
    if (midiCameraAngle !== null && midiCameraAngle !== undefined && controlsRef.current) {
      // MIDI is controlling the camera - update position based on MIDI angle
      const controls = controlsRef.current;
      const distance = camera.position.distanceTo(controls.target);
      const polarAngle = controls.getPolarAngle();
      
      const x = controls.target.x + distance * Math.sin(polarAngle) * Math.sin(midiCameraAngle);
      const y = controls.target.y + distance * Math.cos(polarAngle);
      const z = controls.target.z + distance * Math.sin(polarAngle) * Math.cos(midiCameraAngle);
      
      camera.position.set(x, y, z);
      camera.lookAt(controls.target);
      
      // Sync manual rotation angle so auto-rotate can resume smoothly
      manualRotationAngleRef.current = midiCameraAngle;
      lastMidiAngleRef.current = midiCameraAngle;
    }
    // Turntable stop effect: smoothly decelerate camera rotation when auto-rotate is off or user is dragging.
    // Camera rotation is now INDEPENDENT of individual rotation - both can work simultaneously.
    const isUserDragging = isDraggingRef.current;
    const shouldCameraRotate = settings.autoRotateCamera && !isUserDragging;
    const targetVelocity = shouldCameraRotate ? 1 : 0;
    const friction = isUserDragging ? 0.5 : (shouldCameraRotate ? 0.1 : 0.04); // Instant stop when dragging, faster decay when off
    cameraRotateVelocityRef.current += (targetVelocity - cameraRotateVelocityRef.current) * friction;
    
    // Stop completely when velocity is negligible
    if (cameraRotateVelocityRef.current < 0.001) {
      cameraRotateVelocityRef.current = 0;
    }
    
    // Manual auto-rotation with turntable stop effect (only if MIDI not controlling)
    if (cameraRotateVelocityRef.current > 0 && controlsRef.current) {
      // Apply rotation speed scaled by current velocity
      const rotationSpeed = settings.autoRotateCameraSpeed * delta * 0.5 * cameraRotateVelocityRef.current;
      manualRotationAngleRef.current += rotationSpeed;
      
      // Get current distance and polar angle
      const controls = controlsRef.current;
      const distance = camera.position.distanceTo(controls.target);
      const polarAngle = controls.getPolarAngle();
      
      // Calculate new position based on accumulated angle
      const x = controls.target.x + distance * Math.sin(polarAngle) * Math.sin(manualRotationAngleRef.current);
      const y = controls.target.y + distance * Math.cos(polarAngle);
      const z = controls.target.z + distance * Math.sin(polarAngle) * Math.cos(manualRotationAngleRef.current);
      
      camera.position.set(x, y, z);
      camera.lookAt(controls.target);
    }
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
        {allNormalRegions.map((region) => {
          // IMPORTANT (Play Mode): Keep per-mesh layout inputs stable during transitions.
          // If total/index change when a second mesh becomes temporarily visible,
          // animated modes (orbit/floating/etc.) will "snap" to a new position.
          const total = isPlayMode ? 1 : Math.max(layoutInfo.total, 1);
          const index = isPlayMode ? 0 : (layoutInfo.indexMap.get(region.id) ?? 0);
          return (
          <RegionMesh
            key={region.id}
            region={region}
            index={index}
            totalRegions={total}
            settings={settings}
            audioLevel={audioLevel}
            defaultMode={defaultMode}
            getVideoElement={getVideoElement}
            getCustomGeometry={getCustomGeometry}
            isDraggingRef={isDraggingRef}
          />
        );
        })}
      </group>
      
      <OrbitControls 
        ref={controlsRef}
        enableDamping 
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.5}
        enablePan={true}
        panSpeed={0.5}
        autoRotate={false}
        autoRotateSpeed={0}
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
  getCustomGeometry,
  midiCameraAngle,
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
  
  // Background canvas effect - moved before early return to satisfy hooks rules
  useEffect(() => {
    // Skip if component won't render or doesn't need canvas
    if (!isActive || !hasValidSource) return;
    
    const needsCanvas = settings.backgroundStyle === 'blurred' || 
                        settings.backgroundStyle === 'linearGradient' || 
                        settings.backgroundStyle === 'radialGradient';
    
    if (!needsCanvas || !bgCanvasRef.current) return;
    
    const canvas = bgCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    
    const updateBackground = () => {
      // Only resize canvas when dimensions actually change (avoids reallocating backing store every frame)
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      
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
  }, [isActive, hasValidSource, settings.backgroundStyle, settings.gradientSettings, getVideoElement, regions]);

  if (!isActive || !hasValidSource) {
    return null;
  }
  

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
          getCustomGeometry={getCustomGeometry}
          midiCameraAngle={midiCameraAngle}
        />
      </Canvas>
    </div>
  );
}
